---
id: 12
title: "Human verification gates in the sprint lifecycle state machine"
epic: "Workflow Tooling"
status: done
created: 2026-09-09T00:00:00+00:00
---

# Master Controller Sprint Definition — Sprint 12

**Epic:** Workflow Tooling
**Sprint Objective:** Teach `scripts/sprint_lifecycle.py` that named human
verification gates exist — so a sprint that declares one cannot close without
its result, and a finding from one has a recorded path forward that is neither
an abort nor a hand-edit.

### Context

This project invented a third and fourth verification gate — Chang's NVDA
accessibility pass, and Chang's legal-content review — because CLAUDE.md
instructs that a check no gate has an instrument for be assigned to a named
human with a recorded artifact. Both gates work. Neither exists in the state
machine. `sprint_lifecycle.py` tracks `qa1_audit_result` and
`groundtruth_result` and nothing else, and `cmd_complete` (line 662) checks
those two plus `--user-said`.

It has now cost two sprints, in opposite directions:

- **Sprint 9** reached `complete_ready`, then gate 3 found a real defect — the
  shared `aria-describedby` leaking error text. `cmd_reship` fires only from
  `groundtruth_live`; `cmd_override` re-stamps hashes and cannot move a phase.
  Pipeman correctly refused to hand-edit state, and the sprint was **aborted**
  and re-run as Sprint 10, because its own gate-3 criterion was unmet at the
  shipped commit and it could not honestly close.
- **Sprint 11** reached `complete_ready`, then gate 4 approved the content with
  one change — a landing headline. Not a defect: every requirement was met at
  the shipped commit. That one closed at its shipped commit and the headline
  went out under the trivial fix fast lane. **It survived because the change
  happened to be one line.** A copy rewrite spanning two screens would have
  faced Sprint 9's abort, for a legal review that worked exactly as designed.

The size of the next finding is not something the process gets to choose. And
`cmd_complete` would have closed Sprint 9 with the defect live — the gap is not
only that findings have no path forward, it is that the gates are not required
at all.

**This is a change to this repository's own tooling**, governed by CLAUDE.md's
`## Changes to this repo's own tooling`, and it is the case that section
anticipates: something sprint-shaped, with recorded requirements and an audit
trail. Note that this sprint is *not* the `groundtruth_live -> qa1_audit` ARIA
reship proposal CLAUDE.md also parks as open. That one revises a deliberate
design decision (`cmd_reship`'s own comment at line 562 says skipping a fresh
QA1 pass is intentional). This one fills an **omission** — nobody ever decided
the state machine should not know about gates 3 and 4 — which is a materially
lower bar for changing it.

### The five questions this sprint must answer

The design is the deliverable, not a by-product. Requirement 1 makes it
auditable. Master Controller is deliberately **not** deciding these; CLAUDE.md
is explicit that this is not a Master Controller decree. What follows is the
question plus the constraint any answer must satisfy.

**Q1 — A real phase, or a back-edge?** Either `complete_ready` gains an edge
back into the fix loop, or a new phase sits between `complete_ready` and
`complete` representing human gates outstanding.
*Constraint:* whichever is chosen, the model must not misrepresent what
happened. A sprint sent back to `groundtruth_live` because a human gate found
something is recorded as having failed a live test it did not fail.

**Q2 — Universal or per-sprint?** Most sprints have no accessibility surface
and no legal content; several ship pure logic. A mandatory human gate would
block them on a pass that does not apply.
*Constraints:* gates are declared per sprint; a gate must be **addable
mid-sprint** (Sprint 8 added requirement 24 during its build, and Sprint 11's
gate 4 was scoped before it started — both must be expressible); and a declared
gate must **not be silently removable** — removing one is at least as visible
as `cmd_override`, with a recorded reason.

**Q3 — What happens to the hash-freezing fields on reopen?**
`qa1_audit_file_hash` and `qa1_audited_tree_hash` are stamped on a QA1 PASS and
checked by `cmd_dev_done` and `cmd_ship`. `last_shipped_commit` is what
`cmd_groundtruth` compares `--deployed-commit` against.
*Constraint:* **no reopen path may leave a stale hash that a later `ship` would
accept.** There is precedent to follow or to deviate from deliberately:
`cmd_qa1`'s FAIL branch already nulls both (lines 481–482).

**Q4 — Should `cmd_complete` refuse to close without a recorded human-gate
result?** Yes in substance; the design decides the mechanics.
*Constraints:* it refuses only for gates the sprint actually declared (Q2); it
**never fabricates a result**, following `cmd_override`'s own stated principle
that an override "never fabricates a QA1 PASS that never happened"; and a
recorded **FAIL** is a legitimate recorded result — the sprint then takes the
consequence rather than the gate being waived.

**Q5 — Does a non-defect finding need a different path from a defect?** This is
Sprint 11's addition and the subtlest of the five. The discriminator that
worked in practice was: *does the shipped commit violate any of this sprint's
requirements or acceptance criteria?* Sprint 9 yes, Sprint 11 no. That is a
human judgement the script cannot evaluate.
*Constraint:* **"close the sprint and handle it as separate work" must remain
available and must not require the reopen path.** It was the correct answer for
Sprint 11 and it must stay correct. The design may conclude that one reopen
path plus human judgement is sufficient, and that conclusion is acceptable —
but it must be reached and recorded, not defaulted into.

### Requirements

1. **A recorded design answering Q1–Q5, with rationale, in this sprint file or
   Dev Notes, reviewed by QA1 as a first-class deliverable.** Where a question
   is answered "no change needed", the reasoning is recorded the same way. The
   implementation must match what the design says; a diff that quietly does
   something else is a FAIL even if the something else is better.
2. **Backward compatibility with the eleven existing state files.** Sprints
   1–11 have state written before any new field existed. Loading, `status`,
   `list`, and `gates` must all keep working on them. A missing new field is
   the normal case, not an error.
3. **`scripts/smoke_test.sh` is extended to cover the new behaviour** — at
   minimum: a sprint declaring a human gate cannot close without its result; a
   sprint declaring none is unaffected; the reopen path leaves no stale hash
   (Q3); and whatever Q1's answer is, its transition is exercised. The existing
   495 lines of coverage keep passing unchanged.
4. **The sandbox discipline in `smoke_test.sh` is preserved exactly.** Its
   header records that an earlier version destroyed a real downstream project's
   sprint history **twice** by operating on the invoking repo. New tests copy
   the script into a `mktemp -d` sandbox and run that copy. No new test touches
   this repository's `docs/sprints/`.
5. **CLAUDE.md is updated in the same diff**: the lifecycle diagram, the
   `## The lifecycle` narrative, and the `Open proposal, not yet decided`
   section, which this sprint partly resolves and must not be left describing
   the gap as open if it is closed.
6. **CLAUDE.md's tooling-sprint guidance is corrected.** It currently says a
   sprint-shaped tooling change is "a case for `/sprint-new` with GroundTruth's
   step explicitly skipped." **That is not executable** — `cmd_complete`
   requires `groundtruth_result == "PASS"`, and `complete_ready` is reachable
   only through `cmd_groundtruth`, so a sprint that skips it can never close.
   This is the same class of error CLAUDE.md already documents about itself
   (the unexecutable "route back through `/sprint-qa1`" instruction). Replace it
   with what this sprint actually does: gate 2 scoped as non-regression plus a
   scope-violation trap.
7. **A slash-command wrapper in `.claude/commands/` for any new command**, and
   an update to every agent file in `.claude/agents/` whose role gains or loses
   a step. A command no role knows to run is not a control.
8. **No product code changes.** Nothing under `app/`, `lib/`, `components/`, or
   `data/`. If the lifecycle change appears to require one, stop and raise it.
9. **No retroactive rewriting of closed sprints' state.** Sprints 1–11 close
   as they closed. Gates 3 and 4 were recorded in Dev Notes for Sprints 8–11;
   they are not backfilled into state files.

### Acceptance Criteria

**Gate 1 — QA1 (static, and the substantive gate for this sprint):**

- QA1 confirms the requirement 1 design exists, answers all five questions with
  rationale, and that **the diff implements what the design says**.
- QA1 confirms every existing state file in `docs/sprints/state/` still loads:
  `status` on each of sprints 1–11 and `list` both succeed. This is verifiable
  by running the commands, which is static review of a script's behaviour, not
  a live test of a product.
- QA1 confirms `smoke_test.sh` passes in full, that requirement 3's cases are
  present, and that **no test path writes to this repo's `docs/sprints/`**
  (requirement 4).
- QA1 confirms no reopen path can leave a stale `qa1_audit_file_hash`,
  `qa1_audited_tree_hash`, or `last_shipped_commit` that a later `dev_done` or
  `ship` would accept (Q3).
- QA1 confirms `cmd_complete` cannot be satisfied by a fabricated or defaulted
  human-gate result, and that a recorded FAIL is distinguishable from no record
  at all.
- QA1 confirms CLAUDE.md's lifecycle diagram, `Open proposal` section, and
  tooling-sprint guidance were all updated (requirements 5 and 6).
- QA1 confirms the diff touches no product code (requirement 8).
- QA1 confirms a slash-command wrapper and the affected agent files were
  updated (requirement 7).

**Gate 2 — GroundTruth (non-regression plus a scope-violation trap):**

GroundTruth live-tests a deployed product, and this sprint changes a Python
script that no deployed product runs. Its gate is therefore scoped honestly
rather than dressed up — the pattern CLAUDE.md prescribes for logic-only
sprints:

- GroundTruth confirms the deployed app still builds and loads, and that the
  Sprint 3 intake flow and Sprint 11's landing and `/about` still work.
- **Scope-violation trap:** if any of this sprint's output has become
  user-visible, or the diff touched anything under `app/`, `lib/`,
  `components/`, or `data/`, that is a **FAIL**. This sprint has no product
  surface and acquiring one means it did something it was not scoped to do.

**Gates 3 and 4 — not declared for this sprint.** No UI surface, no legal
content, nothing an NVDA pass or a legal review has a referent for. Recorded
explicitly rather than omitted, because "this sprint declares no human gate" is
exactly the state Q2 must make expressible, and this sprint is its own first
test case.

### Out of Scope

- **The `groundtruth_live -> qa1_audit` ARIA-reship proposal.** Related, parked
  by CLAUDE.md, and a revision of a deliberate decision rather than an
  omission. The design must not *foreclose* it, but must not attempt it.
- **Retrofitting human gates onto closed sprints** (requirement 9).
- **Changing QA1's or GroundTruth's own gates**, their ordering, or the
  two-gate design for the parts that already work.
- **Any product code.** Sprint 6's rescope and the intake restyle both wait on
  this sprint; neither is started by it.
- **Generalising to arbitrary user-defined gates.** Two named human gates
  exist. Building a plugin system for hypothetical future ones is scope creep
  wearing an architecture costume.

### Dependencies

- Blocks: nothing mechanically — but it is deliberately sequenced ahead of
  Sprint 6's rescope and the intake restyle, both of which will declare human
  gates and would otherwise hit the same dead end a third and fourth time.
- Blocked by: nothing.
- External: none. This sprint needs no NVDA pass and no legal review, which is
  part of why it is a clean place to make this change.

### Team Assignments

- **Dev Team 1.** Single-file change plus tests and docs; no worktree needed.

### Risks & Mitigations

- **The change breaks the lifecycle for every sprint.** The top risk by a
  distance: `sprint_lifecycle.py` owns all sprint bookkeeping, there are eleven
  live state files, and a regression is not discovered until someone cannot
  ship. Requirements 2 and 3 and two QA1 criteria target it directly.
- **A new test destroys real sprint history.** This has happened twice, per
  `smoke_test.sh`'s own header. Requirement 4 and a QA1 criterion make the
  sandbox discipline explicit rather than assumed.
- **Phase strings are scattered rather than centralised.** Seven separate
  `state["phase"] = "..."` assignments exist with no single enumeration, so a
  new phase can be introduced in one place and unhandled in another. The
  requirement 1 design must state how phase validity is enforced; whether that
  means introducing a constant is the design's call, not this file's.
- **The design is skipped and the code is written first**, leaving five
  questions answered implicitly by whatever was convenient. Requirement 1 makes
  the design a reviewed deliverable and QA1 checks the diff against it.
- **Scope creeps into the ARIA-reship proposal** because it is adjacent and
  CLAUDE.md discusses both in the same breath. Out of Scope names it.
- **`cmd_complete` gains a check that a future sprint routes around** by simply
  not declaring a gate it should have declared. No mechanism prevents this and
  none is proposed — declaring the right gates stays Master Controller's job at
  scoping time. Stated here so the limit is on record rather than assumed away.

### Dev Notes

**Requirement 1 — the design, answering Q1–Q5.** This is the reviewed
deliverable; the code in `scripts/sprint_lifecycle.py` implements exactly
what follows, nothing more, nothing else.

**Q1 — a back-edge, not a new phase.** `complete_ready` gains an edge:
recording a declared gate's verdict as FAIL/CONDITIONAL while the sprint
sits at `complete_ready` resets `phase` to `dev_build` — not
`groundtruth_live`. That specific exclusion is the constraint's whole
point: `groundtruth_live` would record, in the history a future reader
trusts, that a live test failed when it did not — Sprint 9's actual defect,
not a hypothetical one. `dev_build` carries no such claim; it just means
"back to building." GroundTruth's own `PASS` event is never touched,
re-labeled, or duplicated — the reopen is logged as its own event,
`human_gate_reopened`, naming which gate and why. Considered and rejected:
a dedicated new phase (e.g. `human_gates_pending`) sitting between
`complete_ready` and `complete`. It would need its own entry in every
place a phase is currently matched (7 sites before this diff) and its own
handling in `cmd_status`, in exchange for answering a question `cmd_status`
already answers directly without it: whether any declared gate is still
missing a PASS (see Q4) is printed per-gate regardless of which
phase the sprint is in, so a phase string whose only job would be signaling
"gate results outstanding" duplicates information already visible. Reusing
the existing, already-tested `dev_build` phase is the smaller diff for the
same guarantee, and it directly resolves the Risks section's "phase
strings are scattered" concern in the cheapest possible way: **no new
phase string was introduced**, so nothing was added to the scatter.
Centralising the seven *pre-existing* phase literals into one constant
would be a real improvement but is a refactor of already-working,
already-tested code this
sprint doesn't need to touch to satisfy its own requirements — out of
scope by the same logic Out of Scope already applies to the ARIA-reship
proposal.

A FAIL/CONDITIONAL recorded *before* `complete_ready` (a gate checked
mid-build, which Q2 explicitly allows) does not reopen anything — deliberately
narrower than "any phase." There is nothing to reopen: the sprint hasn't
reached `complete_ready` yet, so resetting to `dev_build` would either be a
no-op (already there) or would discard progress through `qa1_audit` /
`dev_agreed_done` / `groundtruth_live` for a reason unrelated to those
phases' own gates. It still blocks `cmd_complete` once the sprint does
reach `complete_ready`, the same as any other declared gate with no PASS
on record — see Q4.

**Q2 — per-sprint, two fixed gates, not a plugin system.** `human_gates` in
state is a two-key dict (`gate3_nvda`, `gate4_legal`), each
`{"declared": bool, "result": PASS|FAIL|CONDITIONAL|null, "rounds": int}`.
No generic "declare an arbitrary gate" capability exists — `GATE_KEYS`
is a closed, two-entry mapping, and `declare-gate`/`record-gate`'s
`--which` argparse `choices` reject anything else at the CLI level, before
any state is touched. Building for a hypothetical third gate is exactly
what Out of Scope forbids.

`declare-gate` works in any phase except `complete`/`aborted`, and is
idempotent — declaring an already-declared gate prints a message and
changes nothing, rather than erroring, so Dev Team can call it
defensively without checking state first. This is what makes "addable
mid-sprint" real for both of the sprint file's own examples: Sprint 8's
requirement 24 (discovered mid-build) and Sprint 11's gate 4 (declared
before the sprint even started) both fit the same command with no special
casing for timing.

"Not silently removable": there is no `undeclare-gate` subcommand at all.
The only way to remove a declared gate is `override --gate gate3` (or
`gate4`) — reusing `cmd_override`'s existing `--confirm OVERRIDE` /
required `--reason` / permanent-history machinery verbatim, rather than
inventing a quieter parallel path. This satisfies the constraint by
construction: removing a gate is *exactly* as visible as re-stamping a
hash, because it is the same command. The prior recorded result and round
count are preserved on undeclare — history stays true even after the
requirement stops applying.

**Q3 — clear both QA1 hash fields, mirroring `cmd_qa1`'s own FAIL branch.**
On reopen, `qa1_audit_file_hash` and `qa1_audited_tree_hash` are set to
`None`. This is not a new pattern: it is the *exact* defensive move
`cmd_qa1`'s FAIL branch already makes (lines documented in that function's
own comment), applied at a second call site for the same reason — a stale
hash from before the finding must not let a later `dev_done`/`ship`
through on a PASS that predates whatever the gate found. `qa1_audit_result`
itself is deliberately **not** reset to `null` — unlike the hash fields, it
is a true historical fact ("QA1 passed this code," which it did) rather
than a freshness token, and `cmd_dev_done`'s own phase check
(`phase != "qa1_audit"`) already blocks progress on its own once phase
resets to `dev_build`, without needing the result field cleared too. Two
fields considered and rejected for resetting: `last_shipped_commit`
(unconditionally overwritten by the next `cmd_ship` call regardless of
whether it's stale — nulling it first would only produce a confusing
"no ship on record" message for a few commands during the reopen loop,
correcting nothing) and `groundtruth_result` (same reasoning — the next
`cmd_groundtruth` call overwrites it, and it must NOT be nulled early,
since that would be indistinguishable from Q1's rejected `groundtruth_live`
back-edge in effect if read carelessly).

**Q4 — `cmd_complete` checks every declared gate's latest result, no
override.** Extends the existing `missing` list (already checking QA1 and
GroundTruth) with one entry per declared gate whose `result` isn't `PASS`
— distinguishing, in the message itself, "declared but has no recorded
result" from "last recorded {FAIL|CONDITIONAL}, needs a PASS recorded," so
the person reading the refusal knows which case they're in rather than
being told a flat "not ready." There is no override for this check, for
the identical reason `cmd_complete` already has none for a missing
`--user-said`: this isn't drift to unstick, and fabricating a result
would violate the same principle `cmd_override`'s own docstring states for
the hash gates — "never fabricates... the underlying requirement still
has to be true first." The only sanctioned way to stop a gate from
blocking completion is `override --gate gate3`/`gate4` (Q2's answer, an
explicit act with its own audit trail), never a special case inside
`cmd_complete` itself.

**Q4's limitation, stated plainly (found by QA1's round-1 audit,
reproduced: declare gate3, record a PASS, make a substantial further
code change, run `complete` — it still reports the gate confirmed).**
`cmd_complete` checks only whether a gate's *last recorded* result is
`PASS`; it does not check *when* that PASS was recorded relative to the
code, because nothing in this design binds a gate result to a commit the
way `qa1_audit_file_hash`/`qa1_audited_tree_hash` bind a QA1 PASS to a
specific sprint-file content and tree hash. This is Q3's own choice,
correctly extended from `last_shipped_commit` and `qa1_audit_result` (see
Q3: both are true historical facts, not freshness tokens, and neither
gets nulled on reopen) — applied here to gate results too, just not stated
outright until now. A gate PASS recorded once stays valid regardless of
what happens to the code afterward, until someone records a new
FAIL/CONDITIONAL over it (or undeclares the gate via `override`).
Building commit-binding for gate results — the accessibility/legal
equivalent of QA1's hash mechanism — is a real, separate design question,
and is deliberately **not** attempted here: it is not required by any of
this sprint's five questions, and building it now, unasked, is exactly
the in-scope-creep this project's own discipline exists to catch. If this
gap needs closing, that is Master Controller's call to scope as its own
requirement, not something to improvise into this diff.

**Q5 — no separate mechanism; the verdict recording IS the judgement
call.** A PASS never reopens anything and is never blocked, regardless of
what the notes say — recording "approved with one change, handled
separately" (Sprint 11's shape) is simply what a PASS already does. The
discriminator the sprint file names (*does the shipped commit violate a
requirement?*) isn't evaluated by the script anywhere — it can't be, it's
a human judgement — it's evaluated by whoever calls `record-gate`, at the
moment they choose which verdict to pass. Recording that reasoning here,
per the constraint that it "must be reached and recorded, not defaulted
into": building a second code path for "PASS, but actually significant"
vs. "PASS, truly clean" would be distinguishing something the script has
no way to verify and no need to — the verdict already carries the
consequence (blocks or doesn't) that matters mechanically. Anything finer
belongs in `--notes`, which is free text for exactly this.

**Requirement 2 — backward compatibility.** `get_gate()` never assumes
`human_gates` exists on a loaded state dict; `cmd_status` calls it per gate
and skips any gate that isn't declared (which is what an absent
`human_gates` key produces for both gates, indistinguishably from an
explicitly-initialized-but-undeclared one). `cmd_complete`'s new checks use
the same accessor, so a sprint from before this field existed sees zero
gate-related entries in `missing` and closes exactly as it did before this
sprint. `declare-gate`/`record-gate` both call
`state.setdefault("human_gates", default_human_gates())` before touching a
specific gate, so even *invoking a Sprint 12 command* on a pre-Sprint-12
state file backfills the field safely rather than raising a `KeyError`.
Verified directly (not assumed): `smoke_test.sh` strips the key from a
freshly-created state file the same way the existing `SPRINT_LEGACY`
scenario strips the hash fields, then exercises `status`, `status
--verbose`, `list`, `gates`, `complete`, and — a step further than the
existing legacy scenarios go — `declare-gate` and `record-gate` themselves,
against that stripped file.

**Requirement 6 — CLAUDE.md's tooling-sprint guidance.** Corrected in this
diff (see `## Changes to this repo's own tooling`): the old text prescribed
routing a tooling sprint through `/sprint-new` with GroundTruth's step
"explicitly skipped," which `cmd_complete`'s own `groundtruth_result ==
"PASS"` requirement makes structurally impossible to execute. Replaced
with what this sprint's own gate 2 actually does — non-regression plus a
scope-violation trap — matching the pattern CLAUDE.md already prescribes
for a logic-only *product* sprint, applied here to a *tooling* sprint for
the same underlying reason: the thing gate 2 would need to measure doesn't
exist for this diff to violate.

**Requirement 9 — no closed sprint's state touched.** Confirmed by
`git status`/`git diff` over `docs/sprints/state/*.json` for sprints 1–11
before every commit in this sprint: none of them appear. Gates 3/4 for
Sprints 8–11 stay exactly where CLAUDE.md put them — in each sprint's own
Dev Notes, in prose, never backfilled into `human_gates`.

**Self-verification.** `python -c "import ast; ast.parse(...)"` and
`sprint_lifecycle.py --help` both clean immediately after every edit.
`scripts/smoke_test.sh` extended with the new coverage requirement 3 asks
for (declaring mid-build, a declared-and-unrecorded gate blocking
`/sprint-complete` by name, the reopen edge with an explicit assertion
that GroundTruth's original PASS event and zero fabricated `live_test`
FAIL entries survive it, Q3's hash-nulling checked directly against the
state JSON rather than inferred from a refusal message, the override
undeclare path, and the backward-compatibility scenarios above) — full
run, sandboxed exactly like every existing test in the file, **all 495
pre-existing lines plus the new coverage pass, unchanged in behavior**.
Two environment-only frictions surfaced while running this locally on
Windows (an em-dash encoding mismatch between this machine's `python3` and
its console pipe, and a `/tmp` path-translation mismatch between Git
Bash's MSYS layer and a native Windows Python) — both predate this sprint
entirely (reproduced identically against the unmodified, already-committed
script before touching anything), affect the harness only, not
`sprint_lifecycle.py` or `smoke_test.sh`'s logic, and were worked around
locally (`PYTHONIOENCODING=utf-8`, a `C:\tmp` junction) without editing
either file — fixing a local Windows console/MSYS quirk is not this
sprint's job and isn't reflected in any diff.

**Round 2, after QA1's CONDITIONAL.** QA1 found and reproduced (declare
gate3, PASS it, make a substantial further change, `complete` still
reports the gate confirmed) that "a fresh PASS on record" overstated what
`cmd_complete` enforces — nothing invalidates a gate PASS when the code
changes further after it, which was Q3's own deliberate choice for
`last_shipped_commit`/`qa1_audit_result`, correctly extended to gate
results here, just not disclosed accurately in the wording used to
describe it. Fixed by rewording every site making that implication —
four in `scripts/sprint_lifecycle.py` (the module docstring, both
`cmd_record_gate` messages, and `cmd_complete`'s refusal text), one each
in `dev-team-1.md`/`master-controller.md`, two in `dev-team-2.md` — to
"a PASS on record" or equivalent, dropping "fresh" everywhere it implied
commit-currency. Also reworded, for the same reason though not named in
the four sites: both `.claude/commands/sprint-declare-gate.md` and
`sprint-record-gate.md` (left inconsistent otherwise), and the sprint
file's own Q1 prose (two mentions, above) — left `smoke_test.sh`'s
assertion on `cmd_complete`'s exact refusal text in sync with the
reworded code (`"needs a fresh PASS"` → `"needs a PASS recorded"`), since
that assertion would otherwise have failed against the corrected message.
Not touched: the four other "fresh" instances in `sprint_lifecycle.py`
(all "a fresh QA1 audit/pass") — those describe a guarantee that
genuinely is hash-enforced (Q3 for QA1 audits, not for gate results), so
"fresh" is accurate there and rewording it would itself introduce an
inaccuracy. Added the limitation statement to Q4 above, explicitly, per
QA1's request. Did not build commit-binding for gate results — out of
scope per QA1's own explicit instruction, a separate design question for
Master Controller.

Re-verified: `python -c "import ast; ast.parse(...)"` and
`sprint_lifecycle.py --help` clean; `scripts/smoke_test.sh`'s updated
assertion matches the reworded message; full suite re-run, sandboxed,
same as round 1 — all 495 pre-existing lines plus every round-1 and
round-2 addition pass, unchanged in behavior (wording only, no logic
touched by this round).

**Round 3, after QA1's second CONDITIONAL.** Two survivors, both outside
`sprint_lifecycle.py` and the three agent files round 2 searched, and both
missed by a `grep` that only matches within a single line: `CLAUDE.md`'s
own introduction of human gates ("A declared gate blocks
`/sprint-complete` until it has a fresh\nPASS on record") had the word
"fresh" and "PASS" split across a line wrap, so a literal `"fresh PASS"`
search passed straight over it — QA1 named this the highest-traffic
survivor, since it is the paragraph every role reads at session start, not
a corner of the design doc. `docs/HUMAN_OVERRIDE.md`'s undeclare section
had a grammatically distinct form, "requires a fresh one," which doesn't
contain the substring "fresh PASS" at all. Both fixed by dropping "fresh"
(CLAUDE.md: "until it has a\nPASS on record"; HUMAN_OVERRIDE.md: "requires
one at all"). No code changed this round — re-ran only
`python -c "import ast; ast.parse(...)"` and confirmed by direct read that
neither remaining quoted instance of "fresh PASS" in this Dev Notes
section (round 2's own write-up, describing the *old* wording as
historical record of what was fixed) is a live overstatement; the full
smoke suite wasn't re-run since `sprint_lifecycle.py`/`smoke_test.sh`
are unchanged since round 2's already-verified state.
