#!/usr/bin/env python3
"""
Fully Completely — sprint lifecycle enforcement script.

This is the ONLY thing that should ever create, move, or edit sprint
state. Slash commands in .claude/commands/ call this script; they do
not touch files directly. See CLAUDE.md at the project root for the
full command reference.

Phases (in order, with the loops):

  dev_build        -> Dev Team 1/2 is building
  qa1_audit        -> QA1 static audit (gate 1). FAIL/CONDITIONAL sends
                       it back to dev_build. QA1 re-reads the sprint file
                       fresh immediately before recording this verdict, so
                       a mid-build requirements amendment doesn't slip
                       through on a stale read. A PASS also records a hash
                       of the sprint file as audited; dev-done mechanically
                       refuses (no override) if the file has changed since,
                       rather than relying only on QA1 remembering to
                       re-read. See dev_agreed_done below.
  dev_agreed_done  -> Dev Team has told Master Controller the coding
                       side is done. NOT the same as sprint complete.
  shipped          -> Pipeman has pushed to remote. The same PASS that
                       records the sprint-file hash also records the
                       audited commit's tree hash (content, not the SHA,
                       so a legitimate rebase/squash/merge before push
                       doesn't trip this); ship refuses, no override, if
                       the commit it's pushing doesn't match. Ship (and
                       reship) also record the full SHA actually pushed,
                       as last_shipped_commit, an identity, not content,
                       fact for groundtruth_live below to check against.
  groundtruth_live -> GroundTruth is live-testing. GroundTruth must pass
                       --deployed-commit, the SHA it actually tested;
                       this has to match last_shipped_commit exactly, no
                       tolerance for a differing SHA the way ship's
                       content check tolerates a rebase, there's no
                       legitimate reason a live test and what was shipped
                       would differ. FAIL/CONDITIONAL means fixes + a
                       reship, then GroundTruth tests again. A recorded
                       PASS here moves straight to complete_ready — there
                       used to be a QA1 "final check" gate here (gate 2),
                       but across ~13 real sprints it never once caught
                       anything gate 1 + GroundTruth's live test hadn't
                       already caught, so it was removed. The one real
                       value it had — a fresh look after mid-build
                       requirement changes — is now QA1's responsibility
                       at gate 1 (see above).
  complete_ready   -> Both gates (QA1 audit + GroundTruth live test) have
                       passed. Waiting for /sprint-complete AND the user's
                       explicit, real-time go-ahead (--user-said) to
                       actually close the sprint.
  complete         -> Closed. Sprint file moved to 3-done/.
  aborted          -> Abandoned. Sprint file moved to 5-abandoned/.

Human verification gates (Sprint 12) sit alongside this phase list rather
than inside it. Two named gates exist — gate3 (a human accessibility pass,
e.g. NVDA) and gate4 (legal-content review) — neither performed by QA1 or
GroundTruth, neither with an instrument either of them has (CLAUDE.md's
"a gate cannot be assigned a check it has no instrument for"). A sprint
declares a gate applies (declare-gate, any phase before complete/aborted,
idempotent, addable mid-sprint) and records its verdict (record-gate,
same VALID_VERDICTS as qa1/groundtruth). cmd_complete refuses to close a
sprint with any declared gate that has no PASS on record — see
cmd_complete's own comment for why there is no override for that check,
same reasoning as the missing-user-said case.

Recording a gate FAIL/CONDITIONAL while the sprint sits at complete_ready
reopens it: phase resets to dev_build (never groundtruth_live — that would
misrepresent a live test that did not actually fail, Sprint 9's exact
defect) and both QA1 hash fields are nulled, same defensive move cmd_qa1's
own FAIL branch already makes, so a later dev-done/ship cannot be
satisfied by a stale PASS from before whatever the gate found. GroundTruth's
own PASS event is never touched or re-labeled; the reopen is its own
distinct history event naming which gate and why. A FAIL/CONDITIONAL
recorded earlier in the loop (the gate was checked mid-build) does not
reopen anything — there is nothing to reopen yet — but still blocks
cmd_complete the same way. A PASS never reopens anything, regardless of
what the notes say: whether a finding violates a sprint's own requirements
(reopen) or is a judgement call that does not (Sprint 11's headline —
closed at its shipped commit, handled as separate work) is a human decision
made at the moment the verdict is recorded, not a distinction the script
evaluates.

A declared gate is not silently removable: there is no "undeclare"
subcommand. The only way to remove one is `override --gate gate3` (or
gate4), which requires the same --confirm OVERRIDE and non-empty --reason
as the hash overrides below, and is permanently logged — at least as
visible as re-stamping a hash, per Sprint 12 Q2's constraint.

The "no override" language above is accurate for every path an agent can
reach: no flag on dev-done or ship bypasses either hash check, and neither
is documented anywhere an agent reads. There is a separate `override`
subcommand below (cmd_override) for the human running this project, not
wired to any slash command, not mentioned in CLAUDE.md or any agent file
on purpose, see docs/HUMAN_OVERRIDE.md before using it. groundtruth's
deployed-commit check has no override at all, in cmd_override or anywhere
else: unlike the QA1-to-ship content check, there's no legitimate
transform (rebase, squash, whatever) that would make a live test and what
was actually shipped differ and still be fine, so there's nothing here to
responsibly re-stamp.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess  # nosec B404
import sys
import tempfile
import time
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import fcntl  # POSIX only (macOS, Linux)
    HAVE_FCNTL = True
except ImportError:
    HAVE_FCNTL = False
    import msvcrt  # Windows only

ROOT = Path(__file__).resolve().parent.parent
SPRINTS_DIR = ROOT / "docs" / "sprints"
STATE_DIR = SPRINTS_DIR / "state"
REGISTRY_PATH = SPRINTS_DIR / "registry.json"
TEMPLATE_PATH = ROOT / "templates" / "sprint-template.md"
LOCK_DIR = SPRINTS_DIR / ".locks"

STATUS_FOLDERS = {
    "backlog": "0-backlog",
    "todo": "1-todo",
    "in_progress": "2-in-progress",
    "done": "3-done",
    "blocked": "4-blocked",
    "abandoned": "5-abandoned",
}

VALID_VERDICTS = {"PASS", "FAIL", "CONDITIONAL"}

# The two named human verification gates this project has actually invented
# (Sprint 8's requirement 24 / gate 3, Sprint 11's gate 4) — see Sprint 12's
# design. Deliberately not a generic plugin system: CLAUDE.md is explicit
# that only these two gates exist and building for hypothetical future ones
# is scope creep. --which on the CLI uses the short keys (gate3/gate4);
# state and history use the long keys, so a reader of the JSON doesn't have
# to memorize what "3" means.
GATE_KEYS = {"gate3": "gate3_nvda", "gate4": "gate4_legal"}
GATE_LABELS = {
    "gate3_nvda": "Gate 3 (human AT pass, e.g. NVDA)",
    "gate4_legal": "Gate 4 (legal-content review)",
}


def default_human_gates() -> dict:
    return {key: {"declared": False, "result": None, "rounds": 0} for key in GATE_KEYS.values()}


def get_gate(state: dict, long_key: str) -> dict:
    """Defensive read for both axes of backward compatibility: a state file
    from before this field existed has no "human_gates" key at all, and a
    state file written by this version but never touched by declare/record
    still has both gates present with safe defaults. Never raises on a
    missing key either way — a missing gate entry is "never declared", the
    normal case for the eleven sprints that predate this field, not an
    error condition."""
    return state.get("human_gates", {}).get(long_key, {"declared": False, "result": None, "rounds": 0})


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "untitled"


def atomic_write(path: Path, content: str) -> None:
    """Write content to path atomically: write to a temp file in the same
    directory, then rename over the target. A crash or interrupt mid-write
    leaves the original file untouched instead of a truncated/corrupt one."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(content)
        os.replace(tmp_path, path)
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def resolve_text(value: Optional[str], file_value: Optional[str]) -> str:
    """Prefer a --*-file value over a raw flag value. Reading free text
    from a file (written by the Write tool) rather than interpolating it
    into a shell command line avoids quote-breakout / injection when a
    slash command builds the invocation from user-supplied text."""
    if file_value:
        return Path(file_value).read_text().strip()
    return value or ""


def yaml_escape(value: str) -> str:
    """Make a string safe to sit inside a double-quoted YAML scalar:
    escape backslashes and quotes, and collapse newlines so a pasted
    multi-line title can't break the frontmatter block."""
    value = value.replace("\\", "\\\\").replace('"', '\\"')
    value = re.sub(r"\s*\n\s*", " ", value)
    return value


def load_registry() -> dict:
    if REGISTRY_PATH.exists():
        return json.loads(REGISTRY_PATH.read_text())
    return {"next_id": 1, "sprints": {}}


def save_registry(reg: dict) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    atomic_write(REGISTRY_PATH, json.dumps(reg, indent=2) + "\n")


def state_path(sprint_id: int) -> Path:
    return STATE_DIR / f"sprint-{sprint_id}.json"


def load_state(sprint_id: int) -> dict:
    p = state_path(sprint_id)
    if not p.exists():
        die(f"No state file for sprint {sprint_id}. Run /sprint-start {sprint_id} first.")
    return json.loads(p.read_text())


def save_state(sprint_id: int, state: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    atomic_write(state_path(sprint_id), json.dumps(state, indent=2) + "\n")


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def log_event(state: dict, actor: str, event: str, detail: str = "") -> None:
    state.setdefault("history", []).append(
        {"ts": now(), "actor": actor, "event": event, "detail": detail}
    )


LOCK_TIMEOUT_SECONDS = 30


@contextmanager
def locked(name: str):
    """Hold an exclusive OS file lock for the duration of the with-block.
    Every command's read-modify-write span (load_state/load_registry,
    mutate, save_state/save_registry) must run inside this, otherwise two
    invocations racing against the same sprint (or the registry's next_id
    counter) can interleave and silently lose one side's update, the last
    save wins and the other simply vanishes. Always acquire "registry"
    before any "sprint-<id>" lock (the convention every command below
    follows) so two locks are never taken in conflicting orders.

    Cross-platform: fcntl.flock on macOS/Linux (a real blocking exclusive
    lock), msvcrt.locking on Windows (no blocking mode, so this polls a
    non-blocking lock attempt instead, bounded by LOCK_TIMEOUT_SECONDS so
    a wedged process can't hang every future invocation forever)."""
    LOCK_DIR.mkdir(parents=True, exist_ok=True)
    lock_path = LOCK_DIR / f"{name}.lock"
    fd = os.open(str(lock_path), os.O_CREAT | os.O_RDWR)
    try:
        if HAVE_FCNTL:
            fcntl.flock(fd, fcntl.LOCK_EX)
        else:
            if os.fstat(fd).st_size < 1:
                os.write(fd, b"\0")  # msvcrt locks a byte range; needs >=1 byte to exist
                os.lseek(fd, 0, os.SEEK_SET)
            deadline = time.monotonic() + LOCK_TIMEOUT_SECONDS
            while True:
                try:
                    msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
                    break
                except OSError:
                    if time.monotonic() >= deadline:
                        os.close(fd)
                        die(f"Timed out waiting {LOCK_TIMEOUT_SECONDS}s for the '{name}' lock, "
                            "another sprint_lifecycle.py invocation may be stuck.")
                    time.sleep(0.1)
        yield
    finally:
        if HAVE_FCNTL:
            fcntl.flock(fd, fcntl.LOCK_UN)
        else:
            try:
                os.lseek(fd, 0, os.SEEK_SET)
                msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
            except OSError:
                pass
        os.close(fd)


def git_tree_hash(ref: str) -> Optional[str]:
    """Resolve a git ref (branch, tag, commit hash, HEAD) to its tree hash,
    the content-addressed hash of the files at that commit, independent of
    commit metadata or history. Used to compare what QA1 audited against
    what actually ships, in a way that tolerates Pipeman's legitimate
    squash/rebase/merge (those change the commit SHA without changing any
    file content, so the tree hash stays the same) while still catching
    real content drift, new changes landed after the audit. Returns None
    if the ref doesn't resolve (not a git repo, bad ref, etc.)."""
    try:
        # Fixed argument list, no shell=True, nothing concatenated into a
        # shell string; "git" resolved via PATH is the same trust model
        # every other tool in this repo already uses.
        result = subprocess.run(  # nosec B603 B607
            ["git", "rev-parse", f"{ref}^{{tree}}"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        return None


def git_commit_sha(ref: str) -> Optional[str]:
    """Resolve a git ref to its full commit SHA, not the tree hash. Used to
    record exactly which commit Pipeman shipped, and later to check that
    GroundTruth's live test ran against that same commit. This is an
    identity check, not a content check like the QA1-to-ship tree-hash
    comparison: there's no legitimate rebase/squash/merge step between
    shipping and deploying that would need tolerating here, a mismatch
    always means GroundTruth tested something other than what actually
    went out. Returns None if the ref doesn't resolve."""
    try:
        result = subprocess.run(  # nosec B603 B607
            ["git", "rev-parse", ref],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        return None


def file_hash(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def registry_sprint_file(sprint_id: int) -> Optional[Path]:
    reg = load_registry()
    entry = reg["sprints"].get(str(sprint_id))
    if not entry:
        return None
    return ROOT / entry["file"]


def find_sprint_file(sprint_id: int) -> Optional[Path]:
    for folder in STATUS_FOLDERS.values():
        d = SPRINTS_DIR / folder
        if not d.exists():
            continue
        for f in d.glob(f"sprint-{sprint_id}_*.md"):
            return f
    return None


def update_frontmatter_status(path: Path, new_status: str) -> None:
    """Rewrite the `status:` line in a sprint file's YAML frontmatter so the
    file itself agrees with registry.json instead of only the registry
    being updated. Every command that moves a sprint file between status
    folders must call this on the file's new path."""
    if not path.exists():
        return
    text = path.read_text()
    updated, count = re.subn(
        r"(?m)^status:\s*\S+\s*$", f"status: {new_status}", text, count=1
    )
    if count == 0:
        return
    atomic_write(path, updated)


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------

def cmd_new(args) -> None:
    title = Path(args.title_file).read_text().strip() if args.title_file else args.title
    epic = Path(args.epic_file).read_text().strip() if args.epic_file else (args.epic or "")
    if not title:
        die("Sprint title cannot be empty.")

    with locked("registry"):
        reg = load_registry()
        sprint_id = reg["next_id"]
        slug = slugify(title)
        folder = SPRINTS_DIR / STATUS_FOLDERS["todo"]
        folder.mkdir(parents=True, exist_ok=True)
        dest = folder / f"sprint-{sprint_id}_{slug}.md"

        template = TEMPLATE_PATH.read_text() if TEMPLATE_PATH.exists() else (
            "# Master Controller Sprint Definition — Sprint {id}\n\n"
            "**Epic:** {epic}\n**Sprint Objective:** \n\n"
            "### Context\n\n### Requirements\n\n### Acceptance Criteria\n\n"
            "### Out of Scope\n\n### Dependencies\n\n### Risks & Mitigations\n"
        )
        # Targeted substitution, not str.format(): a custom template can
        # legitimately contain literal { } (a JSON/CSS example block), and
        # .format() would raise on those instead of leaving them alone.
        content = template.replace("{id}", str(sprint_id)).replace("{epic}", epic or "(none)")
        frontmatter = (
            "---\n"
            f"id: {sprint_id}\n"
            f"title: \"{yaml_escape(title)}\"\n"
            f"epic: \"{yaml_escape(epic)}\"\n"
            "status: todo\n"
            f"created: {now()}\n"
            "---\n\n"
        )
        atomic_write(dest, frontmatter + content)

        reg["next_id"] = sprint_id + 1
        reg["sprints"][str(sprint_id)] = {
            "title": title,
            "epic": epic,
            "status": "todo",
            "file": str(dest.relative_to(ROOT)),
        }
        save_registry(reg)
    print(f"Created sprint {sprint_id}: {dest.relative_to(ROOT)}")
    print("Master Controller: fill in Requirements, Acceptance Criteria, and "
          "Out of Scope in that file before running /sprint-start.")


def cmd_start(args) -> None:
    sprint_id = args.id
    with locked("registry"), locked(f"sprint-{sprint_id}"):
        reg = load_registry()
        entry = reg["sprints"].get(str(sprint_id))
        if not entry:
            die(f"Sprint {sprint_id} not found in registry.")

        src = ROOT / entry["file"]
        dest_dir = SPRINTS_DIR / STATUS_FOLDERS["in_progress"]
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / src.name
        if src.exists() and src != dest:
            shutil.move(str(src), str(dest))
            entry["file"] = str(dest.relative_to(ROOT))
        update_frontmatter_status(dest, "in_progress")

        entry["status"] = "in_progress"
        save_registry(reg)

        state = {
            "id": sprint_id,
            "title": entry["title"],
            "phase": "dev_build",
            "qa1_audit_result": None,
            "qa1_audit_file_hash": None,
            "qa1_audited_tree_hash": None,
            "last_shipped_commit": None,
            "groundtruth_result": None,
            "audit_rounds": 0,
            "live_test_rounds": 0,
            "human_gates": default_human_gates(),
            "started": now(),
            "completed": None,
            "history": [],
        }
        log_event(state, "system", "sprint_started")
        save_state(sprint_id, state)
    print(f"Sprint {sprint_id} started. Phase: dev_build.")
    print("Dev Team: build the sprint, then run /sprint-qa1 when ready for audit.")


def cmd_status(args) -> None:
    if args.id is None:
        reg = load_registry()
        if not reg["sprints"]:
            print("No sprints yet. Use /sprint-new to create one.")
            return
        for sid, entry in sorted(reg["sprints"].items(), key=lambda kv: int(kv[0])):
            print(f"Sprint {sid}: {entry['title']} — {entry['status']}")
        return

    state = load_state(args.id)
    print(f"Sprint {state['id']}: {state['title']}")
    print(f"Phase: {state['phase']}")
    print(f"QA1 audit result: {state['qa1_audit_result']} (rounds: {state['audit_rounds']})")
    print(f"GroundTruth live result: {state['groundtruth_result']} (rounds: {state['live_test_rounds']})")
    for long_key, label in GATE_LABELS.items():
        gate = get_gate(state, long_key)
        if not gate["declared"]:
            continue  # Not declared for this sprint — most sprints have no
            # accessibility surface and no legal content, so silence here is
            # the normal case, not a gap. cmd_complete only checks declared
            # gates too; an undeclared gate blocks nothing.
        print(f"{label}: {gate['result']} (rounds: {gate['rounds']})")
    if state["phase"] == "groundtruth_live":
        # Pure observability, doesn't gate anything: a ship/reship that
        # landed after the last recorded live_test verdict means whatever
        # verdict is on record was tested against older code. cmd_groundtruth
        # already refuses a mismatched --deployed-commit when someone tries
        # to record a new verdict, this just makes that already-mechanically-
        # enforced fact legible to whoever reads status, instead of it only
        # surfacing as a refusal message at the moment someone tries.
        history = state.get("history", [])
        ship_indices = [i for i, h in enumerate(history) if h["event"] in ("shipped", "reshipped")]
        test_indices = [i for i, h in enumerate(history) if h["event"] == "live_test"]
        if ship_indices and test_indices and ship_indices[-1] > test_indices[-1]:
            print("Code has changed since the last recorded GroundTruth verdict — not yet re-tested.")
    if args.verbose:
        print("\nHistory:")
        for h in state["history"]:
            print(f"  [{h['ts']}] {h['actor']}: {h['event']} {h['detail']}")


def cmd_qa1(args) -> None:
    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        # dev_agreed_done is included so a sprint can get a fresh audit
        # after dev-done already succeeded once, this is the recovery path
        # ship's tree-hash check sends people to when a new, unaudited
        # commit lands after dev-done. Without it that check's own error
        # message ("run /sprint-qa1 again") would be a dead end.
        if state["phase"] not in ("dev_build", "qa1_audit", "dev_agreed_done"):
            die(f"Sprint {args.id} is in phase '{state['phase']}', not ready for QA1's first audit.")
        verdict = args.verdict.upper()
        if verdict not in VALID_VERDICTS:
            die(f"Verdict must be one of {sorted(VALID_VERDICTS)}.")

        notes = resolve_text(args.notes, args.notes_file)
        state["qa1_audit_result"] = verdict
        state["audit_rounds"] += 1
        log_event(state, "qa1", "audit", f"{verdict}: {notes}")

        if verdict == "PASS":
            state["phase"] = "qa1_audit"
            state["qa1_audit_file_hash"] = file_hash(registry_sprint_file(args.id))
            state["qa1_audited_tree_hash"] = git_tree_hash("HEAD")
            print(f"QA1 audit PASSED (round {state['audit_rounds']}).")
            print("Dev Team: run /sprint-dev-done when ready to tell Master Controller "
                  "the coding side is agreed done. This does NOT mark the sprint complete.")
        else:
            state["phase"] = "dev_build"
            state["qa1_audit_file_hash"] = None
            state["qa1_audited_tree_hash"] = None
            print(f"QA1 audit {verdict} (round {state['audit_rounds']}). Back to Dev Team for fixes.")

        save_state(args.id, state)


def cmd_dev_done(args) -> None:
    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        if state["phase"] != "qa1_audit" or state["qa1_audit_result"] != "PASS":
            die(f"Sprint {args.id} needs a QA1 PASS on the first audit before dev work can be "
                f"marked agreed-done. Current phase: {state['phase']}, "
                f"QA1 result: {state['qa1_audit_result']}.")

        current_hash = file_hash(registry_sprint_file(args.id))
        audited_hash = state.get("qa1_audit_file_hash")
        if audited_hash is None:
            # Same distinction as cmd_ship's tree-hash check: a sprint that
            # PASSed under a version of this script from before the hash
            # field existed has nothing recorded to verify against, "has
            # changed" would misleadingly imply a real, detected drift.
            die(f"Sprint {args.id} has no QA1-audited sprint-file hash on record to check "
                "against (this sprint predates the stale-file check). Run /sprint-qa1 now "
                "so there's something real to check dev-done against. No override.")
        if current_hash != audited_hash:
            die(f"Sprint {args.id}'s sprint file has changed since QA1's PASS "
                f"(round {state['audit_rounds']}), requirements may have been amended after "
                "the audit. Run /sprint-qa1 again against the current file before marking dev "
                "work done. No override, re-audit is the only path past this.")

        state["phase"] = "dev_agreed_done"
        log_event(state, "dev-team", "dev_agreed_done")
        save_state(args.id, state)
    print(f"Sprint {args.id}: dev work agreed done (not yet complete).")
    print("Pipeman: run /sprint-ship when ready to push to remote.")


def cmd_ship(args) -> None:
    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        if state["phase"] != "dev_agreed_done":
            die(f"Sprint {args.id} is in phase '{state['phase']}', Pipeman can't ship yet, "
                "dev work must be agreed done first.")

        shipped_tree = git_tree_hash(args.commit) if args.commit else None
        audited_tree = state.get("qa1_audited_tree_hash")
        if shipped_tree is None:
            die(f"'{args.commit or ''}' does not resolve to a real commit in this repo. "
                "--commit must be an actual commit hash Pipeman is about to push.")
        if audited_tree is None:
            # Distinct from a real mismatch below: this fires either for a
            # sprint that reached dev_agreed_done before this check existed
            # (an older state file has no qa1_audited_tree_hash key at all)
            # or one where QA1 never actually PASSed. Either way nothing
            # was recorded to verify against, so "doesn't match" would be
            # a misleading thing to tell Pipeman here.
            die(f"Sprint {args.id} has no QA1-audited commit on record to verify this "
                "ship against (either QA1 hasn't PASSed yet, or this sprint predates the "
                "commit-content check). Run /sprint-qa1 now so there's something real to "
                "check the ship against. No override.")
        if shipped_tree != audited_tree:
            die(f"Sprint {args.id}: the commit being shipped doesn't match what QA1 audited "
                "(its file contents differ, even accounting for a rebase/squash/merge that "
                "preserves content). New changes landed after QA1's PASS need a fresh "
                "/sprint-qa1 audit before they can ship. No override.")

        shipped_commit = git_commit_sha(args.commit)
        if shipped_commit is None:
            die(f"'{args.commit}' resolved a tree hash but not a full commit SHA — "
                "unexpected, please investigate before shipping.")

        state["phase"] = "groundtruth_live"
        state["last_shipped_commit"] = shipped_commit
        log_event(state, "pipeman", "shipped", f"commit={args.commit or ''}")
        save_state(args.id, state)
    print(f"Sprint {args.id}: shipped (commit {args.commit or '?'}). Phase: groundtruth_live.")
    print("GroundTruth: run /sprint-groundtruth once you've live-tested the deploy.")


def cmd_reship(args) -> None:
    # No tree-hash check here, unlike cmd_ship: a reship's whole purpose is
    # pushing a fix GroundTruth's live test found and QA1 never re-audited
    # (that's intentional in this two-gate design, GroundTruth's retest
    # after reship is the check for this code, not a fresh QA1 pass). So
    # this commit is *expected* to differ in content from what QA1 audited.
    # It still has to resolve to a real commit: last_shipped_commit is what
    # cmd_groundtruth's --deployed-commit check compares against, and an
    # unresolved ref would leave nothing real recorded to check.
    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        if state["phase"] != "groundtruth_live":
            die(f"Sprint {args.id} is in phase '{state['phase']}', reship only applies during "
                "the GroundTruth live-test fix loop.")
        reshipped_commit = git_commit_sha(args.commit) if args.commit else None
        if reshipped_commit is None:
            die(f"'{args.commit or ''}' does not resolve to a real commit in this repo. "
                "--commit must be an actual commit hash Pipeman is about to push.")
        state["last_shipped_commit"] = reshipped_commit
        log_event(state, "pipeman", "reshipped", f"commit={args.commit or ''}")
        save_state(args.id, state)
    print(f"Sprint {args.id}: fix reshipped (commit {args.commit or '?'}). "
          "GroundTruth: re-test and run /sprint-groundtruth again.")


def cmd_groundtruth(args) -> None:
    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        if state["phase"] != "groundtruth_live":
            die(f"Sprint {args.id} is in phase '{state['phase']}', not ready for a GroundTruth live test.")

        # Identity check, not a content check: unlike the QA1-to-ship
        # tree-hash comparison, there's no legitimate rebase/squash step
        # between shipping and deploying that would need tolerating here —
        # a mismatch always means this live test ran against something
        # other than what Pipeman actually shipped.
        deployed_commit = git_commit_sha(args.deployed_commit)
        if deployed_commit is None:
            die(f"'{args.deployed_commit}' does not resolve to a real commit in this repo. "
                "--deployed-commit must be the actual commit hash you tested live.")
        last_shipped = state.get("last_shipped_commit")
        if last_shipped is None:
            # Same distinction as ship's tree-hash check: either this sprint
            # predates the deployed-commit field, or ship/reship never
            # actually ran, either way nothing was recorded to verify
            # against, so a "doesn't match" message would be misleading.
            die(f"Sprint {args.id} has no shipped commit on record to verify this live test "
                "against (either this sprint predates the deployed-commit check, or Pipeman "
                "hasn't actually run /sprint-ship yet). Run /sprint-ship (or /sprint-reship) "
                "first so there's something real to check this against. No override.")
        if deployed_commit != last_shipped:
            die(f"Sprint {args.id}: the commit you tested ({deployed_commit}) doesn't match "
                f"what Pipeman actually shipped ({last_shipped}). Re-test against what was "
                "actually deployed, or if the wrong thing went out, Pipeman needs a fresh "
                "/sprint-ship or /sprint-reship first. No override.")

        verdict = args.verdict.upper()
        if verdict not in VALID_VERDICTS:
            die(f"Verdict must be one of {sorted(VALID_VERDICTS)}.")

        notes = resolve_text(args.notes, args.notes_file)
        state["groundtruth_result"] = verdict
        state["live_test_rounds"] += 1
        log_event(state, "groundtruth", "live_test", f"{verdict}: {notes}")

        if verdict == "PASS":
            state["phase"] = "complete_ready"
            print(f"GroundTruth live test PASSED (round {state['live_test_rounds']}). "
                  f"Sprint {args.id} is complete-ready.")
            print("Dev Team: tell the user the sprint is ready and wait. "
                  "/sprint-complete requires the user's explicit, real-time "
                  "go-ahead (--user-said) — both gates passing is not that.")
        else:
            print(f"GroundTruth live test {verdict} (round {state['live_test_rounds']}). "
                  "Dev Team: fix, then Pipeman: /sprint-reship.")

        save_state(args.id, state)


def cmd_declare_gate(args) -> None:
    """Declares that one of the two named human verification gates applies
    to this sprint. Works in any phase before complete/aborted — Sprint 8
    added its human gate mid-build, Sprint 11's was scoped before it
    started, and both must be expressible (Sprint 12 Q2). Idempotent:
    declaring an already-declared gate is a no-op, not an error, since
    Dev Team may call this defensively without checking state first.

    There is deliberately no "undeclare" subcommand. Removing a declared
    gate is possible only through `override --gate gate3/gate4` (see
    cmd_override), which is at least as visible as re-stamping a hash: a
    literal --confirm OVERRIDE, a required --reason, and a permanent
    history entry. A gate a sprint declared cannot quietly stop applying."""
    which = GATE_KEYS[args.which]
    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        if state["phase"] in ("complete", "aborted"):
            die(f"Sprint {args.id} is {state['phase']}, nothing to declare a gate against.")
        state.setdefault("human_gates", default_human_gates())
        gate = state["human_gates"].setdefault(which, {"declared": False, "result": None, "rounds": 0})
        if gate["declared"]:
            print(f"{GATE_LABELS[which]} is already declared for sprint {args.id}. No change.")
            return
        gate["declared"] = True
        log_event(state, "dev-team", "human_gate_declared", GATE_LABELS[which])
        save_state(args.id, state)
    print(f"{GATE_LABELS[which]} declared for sprint {args.id}.")
    print(f"/sprint-complete will now refuse to close this sprint until a PASS is recorded "
          f"for it via /sprint-record-gate.")


def cmd_record_gate(args) -> None:
    """Records a verdict for a declared human gate. Mirrors cmd_qa1 and
    cmd_groundtruth's shape deliberately (--verdict, --notes/--notes-file,
    same VALID_VERDICTS, same "{verdict}: {notes}" history detail format)
    so the same tooling and conventions apply.

    FAIL/CONDITIONAL while the sprint sits at complete_ready is Sprint 12's
    Q1 answer: the "reopen" edge. Phase resets to dev_build — not
    groundtruth_live, which would misrepresent a live test that never
    actually failed (Sprint 9's exact problem) — and both QA1 hash fields
    are nulled, the same defensive move cmd_qa1's own FAIL branch already
    makes, so a later dev-done/ship cannot be satisfied by a stale PASS
    from before whatever this gate found. GroundTruth's own PASS event
    stays untouched in history; the reopen is logged as its own distinct
    event, human_gate_reopened, naming which gate and why — never folded
    into a fabricated live_test entry.

    A FAIL/CONDITIONAL recorded before complete_ready (the gate was
    checked early, mid-build) does not reopen anything — there is nothing
    to reopen, the sprint's normal loop hasn't reached complete_ready yet.
    It still blocks cmd_complete once that point is reached, same as any
    other declared gate with no PASS on record.

    A PASS is always available regardless of what the notes say — Sprint
    12 Q5's answer. Whether a finding is a defect (Sprint 9: violates a
    requirement, must reopen) or a judgement call that doesn't (Sprint 11:
    the headline preference, closed at its shipped commit and handled as
    separate work) is decided by the human recording the verdict, at the
    moment they record it: PASS if it doesn't, FAIL/CONDITIONAL if it
    does. No separate mechanism is needed for the non-defect path — not
    reopening is simply what recording a PASS already does."""
    which = GATE_KEYS[args.which]
    verdict = args.verdict.upper()
    if verdict not in VALID_VERDICTS:
        die(f"Verdict must be one of {sorted(VALID_VERDICTS)}.")

    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        if state["phase"] in ("complete", "aborted"):
            die(f"Sprint {args.id} is {state['phase']}, nothing to record a gate result against.")
        state.setdefault("human_gates", default_human_gates())
        gate = state["human_gates"].setdefault(which, {"declared": False, "result": None, "rounds": 0})
        if not gate["declared"]:
            die(f"{GATE_LABELS[which]} has not been declared for sprint {args.id}. "
                "Run /sprint-declare-gate first if this gate actually applies to this sprint.")

        notes = resolve_text(args.notes, args.notes_file)
        gate["result"] = verdict
        gate["rounds"] += 1
        log_event(state, "dev-team", "human_gate_recorded", f"{which}: {verdict}: {notes}")

        reopened = False
        if verdict in ("FAIL", "CONDITIONAL") and state["phase"] == "complete_ready":
            state["phase"] = "dev_build"
            state["qa1_audit_file_hash"] = None
            state["qa1_audited_tree_hash"] = None
            log_event(state, "dev-team", "human_gate_reopened",
                      f"{GATE_LABELS[which]} recorded {verdict}, reopening from complete_ready "
                      "to dev_build. QA1 hash fields cleared — a fresh /sprint-qa1 audit is "
                      "required before this can reach dev_agreed_done again.")
            reopened = True
        save_state(args.id, state)

    print(f"{GATE_LABELS[which]}: {verdict} recorded for sprint {args.id} (round {gate['rounds']}).")
    if reopened:
        print(f"Sprint {args.id} reopened: phase is back to dev_build. GroundTruth's earlier "
              "PASS stays on record — this was not a live-test failure. Fix the finding, then "
              "run /sprint-qa1 again (a fresh audit is required, the old hash was cleared) and "
              "continue through the normal loop.")
    elif verdict == "PASS":
        print("If this was the last declared gate without a PASS on record, "
              f"/sprint-complete may now proceed once the user authorizes it.")
    else:
        print(f"{verdict} recorded but the sprint isn't at complete_ready, so nothing to reopen "
              "— it's already earlier in the loop. This will still block /sprint-complete "
              "until a PASS is recorded for this gate.")


def cmd_complete(args) -> None:
    # Both gates passing is necessary but never sufficient on its own to
    # close a sprint, that only tells you the code is ready, not that the
    # human has actually decided, right now, to close it. This check runs
    # before the lock and before the gate checks below on purpose, same as
    # override's --confirm/--reason: it's argument validation, independent
    # of sprint state, and it should refuse before touching anything else.
    # No override exists for this, unlike the hash gates: this isn't
    # drift to unstick, it's the one place in the lifecycle a human's
    # real-time word is the actual requirement, not a proxy for one.
    user_said = resolve_text(args.user_said, args.user_said_file)
    if not user_said.strip():
        die("--user-said is required and must be non-empty. Quote what the "
            "user actually told you, in this session, that authorizes closing "
            "this sprint right now. Both QA1 and GroundTruth passing means the "
            "code is ready to close, not that you're authorized to close it, "
            "don't infer authorization from gate status alone, wait for the "
            "user to actually say so.")

    with locked("registry"), locked(f"sprint-{args.id}"):
        state = load_state(args.id)
        missing = []
        if state["qa1_audit_result"] != "PASS":
            missing.append("QA1 first audit has not passed")
        if state["groundtruth_result"] != "PASS":
            missing.append("GroundTruth live test has not passed")
        # Never fabricates or defaults a human-gate result, same principle
        # cmd_override's own docstring states for the hash gates: the real
        # precondition (a PASS actually on record) has to be true first.
        # There is no override for this check, same as the rest of
        # cmd_complete — a recorded FAIL/CONDITIONAL is a legitimate
        # result, not something to wave through, distinguished below from
        # "never recorded at all" so the message tells you which case
        # you're in.
        for long_key, label in GATE_LABELS.items():
            gate = get_gate(state, long_key)
            if not gate["declared"]:
                continue
            if gate["result"] is None:
                missing.append(f"{label} is declared but has no recorded result")
            elif gate["result"] != "PASS":
                missing.append(f"{label} last recorded {gate['result']}, needs a PASS recorded")
        if state["phase"] != "complete_ready" or missing:
            die("Sprint is not ready to close:\n  - " + "\n  - ".join(missing or [f"phase is '{state['phase']}'"]))

        reg = load_registry()
        entry = reg["sprints"][str(args.id)]
        src = ROOT / entry["file"]
        dest_dir = SPRINTS_DIR / STATUS_FOLDERS["done"]
        dest_dir.mkdir(parents=True, exist_ok=True)
        if src.exists():
            new_name = src.stem + "--done" + src.suffix
            dest = dest_dir / new_name
            shutil.move(str(src), str(dest))
            entry["file"] = str(dest.relative_to(ROOT))
            update_frontmatter_status(dest, "done")
        entry["status"] = "done"
        save_registry(reg)

        declared_gate_labels = [
            label for long_key, label in GATE_LABELS.items() if get_gate(state, long_key)["declared"]
        ]

        state["phase"] = "complete"
        state["completed"] = now()
        log_event(state, "dev-team", "sprint_closed", f"user_said={user_said}")
        save_state(args.id, state)
    confirmed = ["QA1 audit", "GroundTruth live test", "user authorization"] + declared_gate_labels
    print(f"Sprint {args.id} closed. Confirmed: {', '.join(confirmed)}.")


def cmd_abort(args) -> None:
    reason = resolve_text(args.reason, args.reason_file)
    with locked("registry"), locked(f"sprint-{args.id}"):
        reg = load_registry()
        entry = reg["sprints"].get(str(args.id))
        if entry:
            src = ROOT / entry["file"]
            dest_dir = SPRINTS_DIR / STATUS_FOLDERS["abandoned"]
            dest_dir.mkdir(parents=True, exist_ok=True)
            if src.exists():
                dest = dest_dir / src.name
                shutil.move(str(src), str(dest))
                entry["file"] = str(dest.relative_to(ROOT))
                update_frontmatter_status(dest, "abandoned")
            entry["status"] = "abandoned"
            save_registry(reg)

        if state_path(args.id).exists():
            state = load_state(args.id)
            state["phase"] = "aborted"
            log_event(state, "human", "aborted", reason)
            save_state(args.id, state)
    print(f"Sprint {args.id} aborted. Reason: {reason or '(none given)'}")


def cmd_override(args) -> None:
    """Human-only escape hatch. Deliberately absent from .claude/commands/ (no
    slash command wraps this) and never mentioned in CLAUDE.md or any agent
    file, see docs/HUMAN_OVERRIDE.md. QA1's and Pipeman's hash checks refuse
    outright with no override by design, that's what makes them mean
    something; this exists for the human ultimately accountable to force
    past drift they've personally reviewed, not for any of the six roles to
    reach for. It never fabricates a QA1 PASS that never happened, only
    re-stamps the hash a gate compares against, so the underlying
    requirement (a real PASS on record) still has to be true first."""
    if args.confirm != "OVERRIDE":
        die("Refusing: --confirm must be exactly the literal word OVERRIDE, typed "
            "deliberately. This command exists for a human who has personally "
            "reviewed the drift and is taking explicit responsibility for it.")
    reason = resolve_text(args.reason, args.reason_file)
    if not reason.strip():
        die("--reason is required and must be non-empty. State exactly what you "
            "reviewed and why it's safe to proceed despite the mismatch, this is "
            "written permanently into the sprint's history.")

    with locked(f"sprint-{args.id}"):
        state = load_state(args.id)

        if args.gate == "dev-done-hash":
            if state["qa1_audit_result"] != "PASS":
                die(f"Sprint {args.id} has no QA1 PASS on record. This overrides drift "
                    "since a real PASS, it does not substitute for one, QA1 still has "
                    "to actually pass this sprint first.")
            if state["phase"] != "qa1_audit":
                die(f"Sprint {args.id} is in phase '{state['phase']}', not qa1_audit. "
                    "dev-done-hash only re-stamps the sprint-file hash /sprint-dev-done "
                    "checks, and only makes sense before that command has run. If you're "
                    "trying to unstick a mismatch at ship time instead, use --gate ship-hash.")
            current_hash = file_hash(registry_sprint_file(args.id))
            if current_hash is None:
                die(f"Sprint {args.id}'s sprint file could not be read, nothing to stamp.")
            old_hash = state.get("qa1_audit_file_hash")
            state["qa1_audit_file_hash"] = current_hash
            log_event(state, "human-override", "dev_done_hash_override",
                      f"reason={reason} | old_hash={old_hash} | new_hash={current_hash}")
            save_state(args.id, state)
            print(f"Sprint {args.id}: sprint-file hash re-stamped to current content.")
            print("/sprint-dev-done will now proceed normally. This override is "
                  "permanently recorded in the sprint's history.")

        elif args.gate == "ship-hash":
            if state["phase"] != "dev_agreed_done":
                die(f"Sprint {args.id} is in phase '{state['phase']}', not ready to ship, "
                    "override doesn't change that, dev work must be agreed done first.")
            target_ref = args.commit or "HEAD"
            current_tree = git_tree_hash(target_ref)
            if current_tree is None:
                die(f"'{target_ref}' does not resolve to a real commit in this repo, "
                    "nothing to stamp.")
            old_tree = state.get("qa1_audited_tree_hash")
            state["qa1_audited_tree_hash"] = current_tree
            log_event(state, "human-override", "ship_hash_override",
                      f"reason={reason} | old_tree={old_tree} | new_tree={current_tree}")
            save_state(args.id, state)
            print(f"Sprint {args.id}: audited commit re-stamped to '{target_ref}'s current content.")
            print("/sprint-ship will now proceed normally for a commit matching that "
                  "content. This override is permanently recorded in the sprint's history.")

        elif args.gate in ("gate3", "gate4"):
            # The only sanctioned way to un-declare a human gate (Sprint 12
            # Q2): "not silently removable" means removing one must be at
            # least as visible as re-stamping a hash, so this reuses the
            # exact same --confirm OVERRIDE / --reason / permanent-history
            # machinery rather than inventing a separate, quieter path.
            # Deliberately does not clear the gate's recorded result or
            # round count — that history stays true even after the gate
            # stops being required.
            which = GATE_KEYS[args.gate]
            state.setdefault("human_gates", default_human_gates())
            gate = state["human_gates"].setdefault(which, {"declared": False, "result": None, "rounds": 0})
            if not gate["declared"]:
                die(f"{GATE_LABELS[which]} is not declared for sprint {args.id}. Nothing to undeclare.")
            gate["declared"] = False
            log_event(state, "human-override", "human_gate_undeclared",
                      f"reason={reason} | gate={GATE_LABELS[which]} | "
                      f"prior_result={gate['result']} | prior_rounds={gate['rounds']}")
            save_state(args.id, state)
            print(f"Sprint {args.id}: {GATE_LABELS[which]} undeclared.")
            print("/sprint-complete no longer requires a result for it. This override is "
                  "permanently recorded in the sprint's history, including the gate's prior "
                  "recorded result, if any.")

        else:
            die(f"Unknown --gate '{args.gate}'. Valid gates: dev-done-hash, ship-hash, gate3, gate4.")


def cmd_list(args) -> None:
    reg = load_registry()
    if not reg["sprints"]:
        print("No sprints yet.")
        return
    for sid, entry in sorted(reg["sprints"].items(), key=lambda kv: int(kv[0])):
        print(f"{sid:>3}  {entry['status']:<12} {entry['title']}")


def cmd_gates(args) -> None:
    """Read-only cross-sprint aggregate over every completed sprint's
    history[]. Never writes to state, the registry, or any sprint file,
    this only reads docs/sprints/state/*.json and prints. Scoped to
    phase == "complete" only: an aborted sprint or one still mid-loop
    isn't a verdict on the gates yet, so it's excluded rather than
    counted as some kind of non-event.

    Every number below is followed by the sprint IDs that produced it,
    on purpose, so any of this is checkable by hand against the state
    files instead of having to trust the aggregate.
    """
    if not STATE_DIR.exists():
        print("No sprint state yet. Nothing to aggregate.")
        return

    completed = []
    for path in sorted(STATE_DIR.glob("sprint-*.json")):
        try:
            state = json.loads(path.read_text())
        except (json.JSONDecodeError, OSError) as exc:
            print(f"WARNING: skipping unreadable state file {path}: {exc}", file=sys.stderr)
            continue
        if not isinstance(state, dict) or "id" not in state:
            print(f"WARNING: skipping malformed state file {path}: not a sprint state object", file=sys.stderr)
            continue
        if state.get("phase") == "complete":
            completed.append(state)
    completed.sort(key=lambda s: s["id"])

    if not completed:
        print("No completed sprints yet (phase == 'complete'). Nothing to aggregate. "
              "This counts only sprints that finished /sprint-complete, not ones still "
              "mid-loop or aborted.")
        return

    n = len(completed)
    ids = [s["id"] for s in completed]
    print(f"Gates aggregate over {n} completed sprint{'s' if n != 1 else ''}: {ids}")
    if n == 1:
        print("Only one completed sprint on record — treat every number below as a "
              "single data point, not a rate.")
    print()

    def verdict_of(event: dict) -> Optional[str]:
        # Matched against VALID_VERDICTS rather than trusting whatever sits
        # before the first colon: if cmd_qa1/cmd_groundtruth's "{verdict}:
        # {notes}" detail format ever changes, this returns None instead of
        # silently treating garbage as a real verdict.
        token = event["detail"].split(":", 1)[0].strip()
        return token if token in VALID_VERDICTS else None

    def counts_str(sids: list) -> str:
        tally = Counter(sids)
        return ", ".join(f"{sid}(x{tally[sid]})" if tally[sid] > 1 else str(sid)
                          for sid in sorted(tally)) or "(none)"

    # --- 1. Crossover: did GroundTruth catch something QA1's audit had
    # already passed, or something QA1 never got a second look at? Walk
    # each sprint's history in order; for every live_test FAIL/CONDITIONAL,
    # find the shipped/reshipped event immediately before it, then check
    # whether a qa1 audit PASS landed between that ship and the ship before
    # it. A "reshipped" ship never has one by design (cmd_reship skips the
    # hash/audit check on purpose), so those always land in the unaudited
    # bucket. A "shipped" ship normally does, since cmd_ship refuses to
    # record one without it — UNLESS a ship-hash override (cmd_override
    # --gate ship-hash) also landed in that same window: that means the
    # content Pipeman actually pushed differs from what QA1's PASS covered,
    # a human vouched for it, not QA1, so it must not be counted as an
    # audited miss either. Anything that doesn't fit one of these shapes is
    # flagged rather than guessed into a bucket.
    #
    # This assumes at most one "shipped" event per sprint, true for every
    # reachable state today (cmd_ship only fires from dev_agreed_done, and
    # nothing currently routes groundtruth_live back to dev_agreed_done —
    # every ship after the first is necessarily a reship). If that ever
    # changes, this window math needs to change with it.
    audited_miss = []
    unaudited_fix_miss = []
    unclassified = []

    for state in completed:
        sid = state["id"]
        history = state.get("history", [])
        ship_positions = [i for i, h in enumerate(history) if h["event"] in ("shipped", "reshipped")]
        for i, h in enumerate(history):
            if h["event"] != "live_test":
                continue
            verdict = verdict_of(h)
            if verdict is None:
                unclassified.append((sid, f"history[{i}] live_test has an unrecognized verdict format: {h['detail']!r}"))
                continue
            if verdict not in ("FAIL", "CONDITIONAL"):
                continue
            prior_ships = [sp for sp in ship_positions if sp < i]
            if not prior_ships:
                unclassified.append((sid, f"history[{i}] live_test has no preceding shipped/reshipped event"))
                continue
            ship_idx = prior_ships[-1]
            ship_event = history[ship_idx]
            if ship_event["event"] == "reshipped":
                unaudited_fix_miss.append(sid)
                continue
            earlier_ships = [sp for sp in ship_positions if sp < ship_idx]
            window_start = (earlier_ships[-1] + 1) if earlier_ships else 0
            window = history[window_start:ship_idx]
            audited_in_window = any(e["event"] == "audit" and verdict_of(e) == "PASS" for e in window)
            overridden_in_window = any(e["actor"] == "human-override" and e["event"] == "ship_hash_override"
                                        for e in window)
            if overridden_in_window:
                unclassified.append((sid, f"history[{i}] live_test followed a 'shipped' event whose ship-hash "
                                          "was human-overridden — the content that actually shipped was not "
                                          "vetted by QA1's own audit, needs a human look, not an automatic bucket"))
            elif audited_in_window:
                audited_miss.append(sid)
            else:
                unclassified.append((sid, f"history[{i}] live_test followed a 'shipped' event "
                                          "with no qa1 audit PASS found in the preceding window"))

    print("1. Crossover (GroundTruth catching what shipped, split by audit provenance):")
    print(f"   Audited miss — QA1 passed fresh, GroundTruth still caught it: "
          f"{len(audited_miss)} — sprints: {counts_str(audited_miss)}")
    print(f"   Unaudited-fix miss — fix reshipped without a fresh QA1 re-audit, not evidence "
          f"QA1 missed anything: {len(unaudited_fix_miss)} — sprints: {counts_str(unaudited_fix_miss)}")
    if unclassified:
        print("   UNCLASSIFIED (doesn't match the expected shipped/reshipped state machine, "
              "check by hand):")
        for sid, note in unclassified:
            print(f"     sprint {sid}: {note}")
    print()

    # --- 2. Per-gate catch rate: did each gate ever return non-PASS on a
    # completed sprint, and how many rounds did it take? Independent of the
    # crossover bucketing above.
    def sprints_with_non_pass(event_name: str) -> list:
        # An unparseable verdict (verdict_of returns None) must not silently
        # count as "caught something" just because None != "PASS" — that's
        # the same guessing this function's crossover section above refuses
        # to do. Flag it and exclude it instead, same as a malformed state
        # file gets a WARNING rather than being silently included or crashing.
        result = []
        for s in completed:
            found_non_pass = False
            for h in s.get("history", []):
                if h["event"] != event_name:
                    continue
                verdict = verdict_of(h)
                if verdict is None:
                    print(f"WARNING: sprint {s['id']} has a '{event_name}' event with an "
                          f"unrecognized verdict format, excluded from the catch-rate count: "
                          f"{h['detail']!r}", file=sys.stderr)
                    continue
                if verdict != "PASS":
                    found_non_pass = True
            if found_non_pass:
                result.append(s["id"])
        return result

    qa1_catch = sprints_with_non_pass("audit")
    gt_catch = sprints_with_non_pass("live_test")

    print("2. Per-gate catch rate (completed sprints where the gate ever returned non-PASS):")
    print(f"   QA1: {len(qa1_catch)} of {n} — sprints: {qa1_catch or '(none)'}")
    print(f"   GroundTruth: {len(gt_catch)} of {n} — sprints: {gt_catch or '(none)'}")
    print("   Round-count distribution (audit_rounds / live_test_rounds), per completed sprint:")
    for state in completed:
        print(f"     sprint {state['id']}: audit_rounds={state.get('audit_rounds', 0)}, "
              f"live_test_rounds={state.get('live_test_rounds', 0)}")
    print()

    # --- 3. Hash-drift override frequency: how often did a human have to
    # clear the content-drift safety net (cmd_override), grouped by which
    # gate's hash it re-stamped. This is not "QA1/GroundTruth overridden" —
    # no such override exists in this codebase, only the hash checks do.
    def override_event_sprints(event_name: str) -> list:
        return [s["id"] for s in completed for h in s.get("history", [])
                if h["actor"] == "human-override" and h["event"] == event_name]

    dev_done_hash_events = override_event_sprints("dev_done_hash_override")
    ship_hash_events = override_event_sprints("ship_hash_override")

    print("3. Hash-drift override frequency (content-drift safety net manually cleared, "
          "NOT a QA1/GroundTruth override — no such override exists):")
    print(f"   dev-done-hash overrides: {len(dev_done_hash_events)} — sprints: {counts_str(dev_done_hash_events)}")
    print(f"   ship-hash overrides: {len(ship_hash_events)} — sprints: {counts_str(ship_hash_events)}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="sprint_lifecycle.py")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("new")
    s.add_argument("title", nargs="?", default=None,
                    help="Sprint title. Prefer --title-file for text pasted from elsewhere.")
    s.add_argument("--title-file", help="Read the title from this file instead of the command line.")
    s.add_argument("--epic")
    s.add_argument("--epic-file", help="Read the epic name from this file instead of the command line.")
    s.set_defaults(func=cmd_new)

    s = sub.add_parser("start"); s.add_argument("id", type=int); s.set_defaults(func=cmd_start)

    s = sub.add_parser("status"); s.add_argument("id", type=int, nargs="?"); s.add_argument("--verbose", action="store_true"); s.set_defaults(func=cmd_status)

    s = sub.add_parser("qa1")
    s.add_argument("id", type=int); s.add_argument("--verdict", required=True)
    s.add_argument("--notes", default="")
    s.add_argument("--notes-file", help="Read notes from this file instead of the command line.")
    s.set_defaults(func=cmd_qa1)

    s = sub.add_parser("dev-done"); s.add_argument("id", type=int); s.set_defaults(func=cmd_dev_done)

    s = sub.add_parser("ship"); s.add_argument("id", type=int); s.add_argument("--commit", default=""); s.set_defaults(func=cmd_ship)

    s = sub.add_parser("reship"); s.add_argument("id", type=int); s.add_argument("--commit", default=""); s.set_defaults(func=cmd_reship)

    s = sub.add_parser("groundtruth")
    s.add_argument("id", type=int); s.add_argument("--verdict", required=True)
    s.add_argument("--deployed-commit", required=True,
                    help="The commit SHA you actually tested live. Must match the commit "
                    "Pipeman's most recent /sprint-ship or /sprint-reship recorded — an "
                    "exact identity match, not a content/tree-hash comparison.")
    s.add_argument("--notes", default="")
    s.add_argument("--notes-file", help="Read notes from this file instead of the command line.")
    s.set_defaults(func=cmd_groundtruth)

    s = sub.add_parser("declare-gate")
    s.add_argument("id", type=int)
    s.add_argument("--which", required=True, choices=["gate3", "gate4"],
                    help="gate3 = human AT pass (NVDA etc.); gate4 = legal-content review.")
    s.set_defaults(func=cmd_declare_gate)

    s = sub.add_parser("record-gate")
    s.add_argument("id", type=int)
    s.add_argument("--which", required=True, choices=["gate3", "gate4"])
    s.add_argument("--verdict", required=True)
    s.add_argument("--notes", default="")
    s.add_argument("--notes-file", help="Read notes from this file instead of the command line.")
    s.set_defaults(func=cmd_record_gate)

    s = sub.add_parser("complete")
    s.add_argument("id", type=int)
    s.add_argument("--user-said", default="",
                    help="Required. Quote what the user actually told you, in this "
                    "session, that authorizes closing this sprint right now. Both "
                    "gates passing is not authorization on its own.")
    s.add_argument("--user-said-file", help="Read --user-said from this file instead of the command line.")
    s.set_defaults(func=cmd_complete)

    s = sub.add_parser("abort")
    s.add_argument("id", type=int)
    s.add_argument("--reason", default="")
    s.add_argument("--reason-file", help="Read the reason from this file instead of the command line.")
    s.set_defaults(func=cmd_abort)

    # Deliberately not wired to any .claude/commands/*.md slash command, and
    # never mentioned in CLAUDE.md or any agent file, see cmd_override's
    # docstring and docs/HUMAN_OVERRIDE.md. Keeping it CLI-only, undiscoverable
    # via / autocomplete, is intentional.
    s = sub.add_parser("override")
    s.add_argument("id", type=int)
    s.add_argument("--gate", required=True, choices=["dev-done-hash", "ship-hash", "gate3", "gate4"])
    s.add_argument("--reason", default="")
    s.add_argument("--reason-file", help="Read the reason from this file instead of the command line.")
    s.add_argument("--confirm", required=True, help="Must be exactly the literal word OVERRIDE.")
    s.add_argument("--commit", default="", help="ship-hash only: which commit to stamp as audited (defaults to HEAD).")
    s.set_defaults(func=cmd_override)

    s = sub.add_parser("list"); s.set_defaults(func=cmd_list)

    s = sub.add_parser("gates", help="Read-only cross-sprint gate aggregate over completed sprints.")
    s.set_defaults(func=cmd_gates)

    return p


def main() -> None:
    # Printed on every invocation so a wrong-script situation (a stale
    # global command, a same-named script earlier on PATH, a different
    # repo's copy of this tool) is obvious immediately instead of
    # discovered after acting on plausible-looking but wrong output.
    print(f"[sprint_lifecycle] repo={ROOT} script={Path(__file__).resolve()}", file=sys.stderr)
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
