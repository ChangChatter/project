#!/usr/bin/env bash
# Smoke test for the sprint lifecycle script: exercises the full happy path,
# both fail-loops, the close refusal (both gates, and the user-authorization
# requirement), and the standard edge cases (bad verdict, skipping a phase,
# closing early, empty title). Exits non-zero on the first unexpected result.
#
# Runs entirely inside a throwaway sandbox directory (mktemp -d), never
# against this repo's own docs/sprints/. Note that just `cd`-ing elsewhere
# before invoking the real script would NOT be enough: sprint_lifecycle.py
# resolves ROOT from Path(__file__).resolve().parent.parent, i.e. from
# where the *script file* lives, not the caller's working directory. So
# this test copies the script (and the sprint template) into the sandbox
# and runs that copy, which makes ROOT resolve inside the sandbox instead.
# This is not a style preference: a version of this file that rm -rf'd
# docs/sprints/ directly against the invoking repo has already destroyed a
# real downstream project's sprint history twice. Do not "simplify" this
# back to operating on whatever repo you happen to be standing in.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SANDBOX="$(mktemp -d "${TMPDIR:-/tmp}/fully-completely-smoke.XXXXXX")"
cleanup() { rm -rf "$SANDBOX"; }
trap cleanup EXIT

mkdir -p "$SANDBOX/scripts" "$SANDBOX/templates"
cp "$REPO_ROOT/scripts/sprint_lifecycle.py" "$SANDBOX/scripts/sprint_lifecycle.py"
if [ -f "$REPO_ROOT/templates/sprint-template.md" ]; then
  cp "$REPO_ROOT/templates/sprint-template.md" "$SANDBOX/templates/sprint-template.md"
fi

cd "$SANDBOX"
SCRIPT="python3 scripts/sprint_lifecycle.py"

fail() { echo "SMOKE TEST FAILED: $1" >&2; exit 1; }

# Content hash of every file under docs/sprints/, used to assert a command
# (like `gates`) that claims to be read-only actually didn't write anything.
sprints_hash() {
  find docs/sprints -type f -exec sha256sum {} \; | sort | sha256sum
}

# ship's tree-hash check needs a real git repo to resolve commits against,
# entirely local to the sandbox, never the invoking repo.
git init -q
git config user.email "smoke-test@example.com"
git config user.name "Smoke Test"
git add -A
git commit -q -m "sandbox baseline"

# docs/sprints/ doesn't exist yet at this point in the sandbox, so this also
# covers the "no state directory at all" path, not just "zero completed
# sprints with a state dir present".
echo "== gates: zero completed sprints prints a clean no-data message, not zeroes or a traceback =="
$SCRIPT gates > /tmp/gates_out.txt 2>&1 || fail "gates exited non-zero with no sprint data"
grep -q "Nothing to aggregate" /tmp/gates_out.txt || fail "gates zero-data message missing"
grep -qE "Traceback" /tmp/gates_out.txt && fail "gates raised a traceback on zero completed sprints"
rm -f /tmp/gates_out.txt

# Captures the numeric sprint id `new` just created from its own stdout,
# rather than assuming IDs increment one-per-test. Some tests below create a
# sprint without ever `start`-ing it (the injection regression test), which
# shifts every later hand-counted ID by one; that drift previously caused a
# later test block to accidentally re-`start` (and wipe the history of) an
# unrelated sprint from an earlier block. Reading the real ID back out
# instead of counting by hand makes that class of bug impossible.
new_sprint() {
  local out id
  out=$($SCRIPT new "$@")
  id=$(echo "$out" | grep -oE 'Created sprint [0-9]+' | grep -oE '[0-9]+')
  [ -n "$id" ] || fail "could not parse a sprint id out of 'new' output: $out"
  echo "$id"
}

echo "== happy path with both fail-loops =="
SPRINT_1=$(new_sprint "Smoke test sprint" --epic "CI")
$SCRIPT start "$SPRINT_1" > /dev/null
$SCRIPT qa1 "$SPRINT_1" --verdict FAIL --notes "expected fail" > /dev/null
git commit -q --allow-empty -m "address QA1 feedback for sprint $SPRINT_1"
$SCRIPT qa1 "$SPRINT_1" --verdict PASS --notes "ok" > /dev/null
$SCRIPT dev-done "$SPRINT_1" > /dev/null
AUDITED_COMMIT_1=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_1" --commit "$AUDITED_COMMIT_1" > /dev/null
$SCRIPT groundtruth "$SPRINT_1" --deployed-commit "$AUDITED_COMMIT_1" --verdict FAIL --notes "expected fail" > /dev/null
git commit -q --allow-empty -m "fix for sprint $SPRINT_1"
FIX_COMMIT_1=$(git rev-parse HEAD)
$SCRIPT reship "$SPRINT_1" --commit "$FIX_COMMIT_1" > /dev/null
$SCRIPT groundtruth "$SPRINT_1" --deployed-commit "$FIX_COMMIT_1" --verdict PASS --notes "ok" > /dev/null

echo "== complete refuses (no override) without a non-empty --user-said, even with both gates PASS =="
$SCRIPT complete "$SPRINT_1" > /tmp/out.txt 2>&1 && fail "complete succeeded with no --user-said at all, despite both gates passing" || true
grep -q -- "--user-said is required" /tmp/out.txt || fail "missing --user-said refusal message missing"

$SCRIPT complete "$SPRINT_1" --user-said "   " > /tmp/out.txt 2>&1 && fail "complete succeeded with a whitespace-only --user-said" || true
grep -q -- "--user-said is required" /tmp/out.txt || fail "whitespace-only --user-said refusal message missing"
rm -f /tmp/out.txt

$SCRIPT complete "$SPRINT_1" --user-said "close sprint 1, both gates look good" > /dev/null
STATUS=$($SCRIPT status "$SPRINT_1")
echo "$STATUS" | grep -q "Phase: complete" || fail "sprint $SPRINT_1 did not reach complete"
echo "$STATUS" | grep -q "QA1 audit result: PASS" || fail "qa1 result not recorded"
echo "$STATUS" | grep -q "GroundTruth live result: PASS" || fail "groundtruth result not recorded"
$SCRIPT status "$SPRINT_1" --verbose | grep -q "close sprint 1, both gates look good" || fail "the --user-said text was not recorded in the sprint's history"

echo "== completion actually relocates the file and updates its frontmatter, not just the phase =="
DONE_FILE=$(find docs/sprints/3-done -name "sprint-${SPRINT_1}_*.md" 2>/dev/null)
[ -n "$DONE_FILE" ] || fail "sprint $SPRINT_1's file was not moved to docs/sprints/3-done/"
[ ! -e "docs/sprints/2-in-progress/sprint-${SPRINT_1}_smoke-test-sprint.md" ] || fail "sprint $SPRINT_1's file is still in 2-in-progress/"
grep -q '^status: done$' "$DONE_FILE" || fail "sprint $SPRINT_1's file frontmatter status was not updated to done"

echo "== gates: one completed sprint (with a GT fail after a normal ship) is an audited miss, not a rate =="
GATES_HASH_BEFORE=$(sprints_hash)
GATES_OUT=$($SCRIPT gates)
GATES_HASH_AFTER=$(sprints_hash)
[ "$GATES_HASH_BEFORE" = "$GATES_HASH_AFTER" ] || fail "gates modified docs/sprints/ (should be strictly read-only)"
echo "$GATES_OUT" | grep -q "single data point, not a rate" || fail "gates didn't flag a single completed sprint as non-statistical"
echo "$GATES_OUT" | grep -q "Audited miss.*: 1 — sprints: ${SPRINT_1}$" || fail "gates didn't count sprint $SPRINT_1's GT fail (after a normal ship) as an audited miss"
echo "$GATES_OUT" | grep -q "Unaudited-fix miss.*: 0 " || fail "gates should show zero unaudited-fix misses so far"
echo "$GATES_OUT" | grep -q "GroundTruth: 1 of 1 — sprints: \[${SPRINT_1}\]" || fail "gates didn't record sprint $SPRINT_1 under GroundTruth's non-PASS catch"
echo "$GATES_OUT" | grep -q "QA1: 1 of 1 — sprints: \[${SPRINT_1}\]" || fail "gates should count sprint $SPRINT_1 under QA1's non-PASS catch (it had an initial FAIL round)"

echo "== refusal paths =="
SPRINT_2=$(new_sprint "Edge case sprint")
$SCRIPT start "$SPRINT_2" > /dev/null

$SCRIPT qa1 "$SPRINT_2" --verdict MAYBE > /tmp/out.txt 2>&1 && fail "bad verdict was accepted" || true
grep -q "Verdict must be one of" /tmp/out.txt || fail "bad verdict error message missing"

$SCRIPT ship "$SPRINT_2" --commit x > /tmp/out.txt 2>&1 && fail "shipped before qa1/dev-done" || true
grep -q "Pipeman can't ship yet" /tmp/out.txt || fail "ship-too-early error message missing"

$SCRIPT complete "$SPRINT_2" --user-said "trying to close it early" > /tmp/out.txt 2>&1 && fail "closed before any gate passed" || true
grep -q "not ready to close" /tmp/out.txt || fail "early-complete error message missing"

echo "" > /tmp/blank.txt
$SCRIPT new --title-file /tmp/blank.txt > /tmp/out.txt 2>&1 && fail "empty title was accepted" || true
grep -q "title cannot be empty" /tmp/out.txt || fail "empty-title error message missing"

$SCRIPT status 999 > /tmp/out.txt 2>&1 && fail "nonexistent sprint returned success" || true
grep -q "No state file for sprint 999" /tmp/out.txt || fail "nonexistent-sprint error message missing"

echo "== injection regression: malicious text via --title-file must be inert =="
rm -f /tmp/PWNED
printf 'Fix login"; touch /tmp/PWNED; echo "done' > /tmp/evil.txt
$SCRIPT new --title-file /tmp/evil.txt > /dev/null
[ -f /tmp/PWNED ] && fail "injection payload executed, --title-file did not neutralize it"
rm -f /tmp/evil.txt /tmp/PWNED /tmp/out.txt

echo "== two independent sprints running concurrently =="
SPRINT_A=$(new_sprint "Parallel sprint A")
$SCRIPT start "$SPRINT_A" > /dev/null
SPRINT_B=$(new_sprint "Parallel sprint B")
$SCRIPT start "$SPRINT_B" > /dev/null
$SCRIPT qa1 "$SPRINT_A" --verdict PASS --notes ok > /dev/null
$SCRIPT status "$SPRINT_B" | grep -q "Phase: dev_build" || fail "sprint $SPRINT_B state was affected by sprint $SPRINT_A's transition"

echo "== dev-done refuses (no override) if the sprint file changed since QA1's PASS =="
SPRINT_STALE=$(new_sprint "Stale audit sprint")
$SCRIPT start "$SPRINT_STALE" > /dev/null
$SCRIPT qa1 "$SPRINT_STALE" --verdict PASS --notes "looked good" > /dev/null
STALE_FILE=$(find docs/sprints/2-in-progress -name "sprint-${SPRINT_STALE}_*.md")
echo "### Requirements amended after audit" >> "$STALE_FILE"

$SCRIPT dev-done "$SPRINT_STALE" > /tmp/out.txt 2>&1 && fail "dev-done succeeded despite sprint file changing after QA1's PASS" || true
grep -q "has changed since QA1's PASS" /tmp/out.txt || fail "stale-audit refusal message missing"
grep -q "\-\-override" /tmp/out.txt && fail "refusal message must not offer an override"

$SCRIPT qa1 "$SPRINT_STALE" --verdict PASS --notes "re-audited the amendment" > /dev/null
$SCRIPT dev-done "$SPRINT_STALE" > /dev/null || fail "dev-done still refused after a fresh QA1 PASS on the current file"
rm -f /tmp/out.txt

echo "== ship refuses (no override) if the commit's content differs from what QA1 audited =="
SPRINT_DRIFT=$(new_sprint "Commit drift sprint")
$SCRIPT start "$SPRINT_DRIFT" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_DRIFT initial work"
$SCRIPT qa1 "$SPRINT_DRIFT" --verdict PASS --notes "looked good" > /dev/null
$SCRIPT dev-done "$SPRINT_DRIFT" > /dev/null
# a real content change lands after QA1's PASS, unaudited
echo "sneaky change" > sneaky.txt
git add sneaky.txt
git commit -q -m "unaudited change after QA1 PASS"
DRIFTED_COMMIT=$(git rev-parse HEAD)

$SCRIPT ship "$SPRINT_DRIFT" --commit "$DRIFTED_COMMIT" > /tmp/out.txt 2>&1 && fail "ship succeeded on a commit QA1 never audited" || true
grep -q "doesn't match what QA1 audited" /tmp/out.txt || fail "commit-drift refusal message missing"
grep -q "\-\-override" /tmp/out.txt && fail "commit-drift refusal message must not offer an override"

echo "== ship tolerates a content-preserving amend/rebase after a fresh QA1 PASS (tree hash, not commit SHA) =="
$SCRIPT qa1 "$SPRINT_DRIFT" --verdict PASS --notes "re-audited the sneaky change" > /dev/null
$SCRIPT dev-done "$SPRINT_DRIFT" > /dev/null   # a fresh qa1 PASS resets phase, dev-done must be re-run before ship
# simulate Pipeman's documented squash/rebase step: same file content, new SHA
git commit -q --amend -m "sprint $SPRINT_DRIFT work (squashed for history hygiene)"
AMENDED_COMMIT=$(git rev-parse HEAD)
[ "$AMENDED_COMMIT" != "$DRIFTED_COMMIT" ] || fail "test setup broken: amend did not change the commit SHA"
$SCRIPT ship "$SPRINT_DRIFT" --commit "$AMENDED_COMMIT" > /dev/null || fail "ship refused a content-identical commit just because rebase/amend changed its SHA"
rm -f /tmp/out.txt

echo "== dev-done/ship give a distinct 'nothing recorded' message for a pre-upgrade sprint missing the hash fields =="
SPRINT_LEGACY=$(new_sprint "Legacy sprint")
$SCRIPT start "$SPRINT_LEGACY" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_LEGACY work"
$SCRIPT qa1 "$SPRINT_LEGACY" --verdict PASS --notes "looked good" > /dev/null
LEGACY_STATE="docs/sprints/state/sprint-${SPRINT_LEGACY}.json"
# simulate a sprint that PASSed under a version of this script from before
# the hash fields existed, by stripping them out of an otherwise-valid PASS
python3 -c "
import json
p = '$LEGACY_STATE'
s = json.load(open(p))
del s['qa1_audit_file_hash']
del s['qa1_audited_tree_hash']
json.dump(s, open(p, 'w'), indent=2)
"

$SCRIPT dev-done "$SPRINT_LEGACY" > /tmp/out.txt 2>&1 && fail "dev-done succeeded on a sprint with no recorded audit hash" || true
grep -q "no QA1-audited sprint-file hash on record" /tmp/out.txt || fail "legacy-sprint dev-done message missing"
grep -q "has changed since QA1's PASS" /tmp/out.txt && fail "legacy sprint should not be told the file 'changed', nothing was ever recorded to compare against"

$SCRIPT qa1 "$SPRINT_LEGACY" --verdict PASS --notes "re-audited under the upgraded script" > /dev/null
$SCRIPT dev-done "$SPRINT_LEGACY" > /dev/null || fail "dev-done still failed after a fresh QA1 PASS backfilled the hash fields"

# repeat the same distinction one step later, for ship's tree-hash field
python3 -c "
import json
p = '$LEGACY_STATE'
s = json.load(open(p))
del s['qa1_audited_tree_hash']
json.dump(s, open(p, 'w'), indent=2)
"
LEGACY_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_LEGACY" --commit "$LEGACY_COMMIT" > /tmp/out.txt 2>&1 && fail "ship succeeded on a sprint with no recorded audited commit" || true
grep -q "no QA1-audited commit on record" /tmp/out.txt || fail "legacy-sprint ship message missing"
grep -q "doesn't match what QA1 audited" /tmp/out.txt && fail "legacy sprint should not be told the commit 'doesn't match', nothing was ever recorded to compare against"
rm -f /tmp/out.txt

echo "== a custom template containing literal braces doesn't break sprint creation =="
printf '\n### Example config\n```json\n{ "key": "value" }\n```\n' >> templates/sprint-template.md
$SCRIPT new "Brace test sprint" > /dev/null || fail "sprint creation broke on a template containing literal { }"

echo "== concurrent writes to the same sprint don't corrupt state or lose an update (file locking) =="
SPRINT_RACE=$(new_sprint "Race sprint")
$SCRIPT start "$SPRINT_RACE" > /dev/null
( $SCRIPT qa1 "$SPRINT_RACE" --verdict FAIL --notes "race A" > /dev/null 2>&1 ) &
RACE_PID1=$!
( $SCRIPT qa1 "$SPRINT_RACE" --verdict CONDITIONAL --notes "race B" > /dev/null 2>&1 ) &
RACE_PID2=$!
wait "$RACE_PID1" "$RACE_PID2"
RACE_STATUS=$($SCRIPT status "$SPRINT_RACE" --verbose)
echo "$RACE_STATUS" | grep -q "rounds: 2" || fail "concurrent qa1 writes lost an update, expected audit_rounds: 2"
python3 -c "import json; json.load(open('docs/sprints/state/sprint-${SPRINT_RACE}.json'))" || fail "sprint $SPRINT_RACE state file is corrupted JSON after concurrent writes"

echo "== override refuses without the exact --confirm value, and without a --reason =="
SPRINT_OVR_REFUSAL=$(new_sprint "Override refusal sprint")
$SCRIPT start "$SPRINT_OVR_REFUSAL" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_OVR_REFUSAL work"
$SCRIPT qa1 "$SPRINT_OVR_REFUSAL" --verdict PASS --notes "looked good" > /dev/null

$SCRIPT override "$SPRINT_OVR_REFUSAL" --gate dev-done-hash --reason "test" --confirm YES > /tmp/out.txt 2>&1 && fail "override succeeded with the wrong --confirm value" || true
grep -q "must be exactly the literal word OVERRIDE" /tmp/out.txt || fail "wrong-confirm refusal message missing"

$SCRIPT override "$SPRINT_OVR_REFUSAL" --gate dev-done-hash --confirm OVERRIDE > /tmp/out.txt 2>&1 && fail "override succeeded with an empty --reason" || true
grep -q -- "--reason is required" /tmp/out.txt || fail "empty-reason refusal message missing"
rm -f /tmp/out.txt

echo "== override unsticks a stale sprint-file hash, and is permanently logged with the given reason =="
STALE_FILE_OVR=$(find docs/sprints/2-in-progress -name "sprint-${SPRINT_OVR_REFUSAL}_*.md")
echo "### amendment after audit" >> "$STALE_FILE_OVR"
$SCRIPT dev-done "$SPRINT_OVR_REFUSAL" > /tmp/out.txt 2>&1 && fail "dev-done succeeded despite a stale hash (test setup broken)" || true
grep -q "has changed since QA1's PASS" /tmp/out.txt || fail "expected stale-hash refusal did not occur"

$SCRIPT override "$SPRINT_OVR_REFUSAL" --gate dev-done-hash --reason "reviewed the amendment personally, cosmetic only" --confirm OVERRIDE > /dev/null || fail "override refused despite a valid --confirm and --reason"
$SCRIPT dev-done "$SPRINT_OVR_REFUSAL" > /dev/null || fail "dev-done still refused after a valid override re-stamped the hash"
OVERRIDE_STATUS=$($SCRIPT status "$SPRINT_OVR_REFUSAL" --verbose)
echo "$OVERRIDE_STATUS" | grep -q "human-override" || fail "override was not recorded in the sprint's history"
echo "$OVERRIDE_STATUS" | grep -q "reviewed the amendment personally" || fail "override reason was not recorded in the sprint's history"
rm -f /tmp/out.txt

echo "== dev-done-hash override refuses on the right sprint but the wrong phase, with an accurate message (not 'no PASS') =="
$SCRIPT override "$SPRINT_OVR_REFUSAL" --gate dev-done-hash --reason "trying to re-use this gate after dev-done already succeeded" --confirm OVERRIDE > /tmp/out.txt 2>&1 && fail "dev-done-hash override succeeded on a sprint already past qa1_audit phase" || true
grep -q "no QA1 PASS on record" /tmp/out.txt && fail "wrong-phase refusal must not claim there's no PASS on record, this sprint has one"
grep -q "not qa1_audit" /tmp/out.txt || fail "wrong-phase refusal message missing or not phase-specific"
rm -f /tmp/out.txt

echo "== override on a sprint QA1 never actually passed still refuses (it overrides drift, not a missing PASS) =="
SPRINT_NEVER_AUDITED=$(new_sprint "Never audited sprint")
$SCRIPT start "$SPRINT_NEVER_AUDITED" > /dev/null
$SCRIPT override "$SPRINT_NEVER_AUDITED" --gate dev-done-hash --reason "trying to skip QA1 entirely" --confirm OVERRIDE > /tmp/out.txt 2>&1 && fail "override let a sprint bypass QA1 entirely" || true
grep -q "no QA1 PASS on record" /tmp/out.txt || fail "no-real-PASS refusal message missing"
rm -f /tmp/out.txt

echo "== ship-hash override refuses in the wrong phase (the precondition that keeps it from bypassing QA1) =="
SPRINT_SHIP_WRONG_PHASE=$(new_sprint "Ship override wrong phase sprint")
$SCRIPT start "$SPRINT_SHIP_WRONG_PHASE" > /dev/null
$SCRIPT override "$SPRINT_SHIP_WRONG_PHASE" --gate ship-hash --reason "trying to stamp a ship hash before dev work is even agreed done" --confirm OVERRIDE > /tmp/out.txt 2>&1 && fail "ship-hash override succeeded on a sprint not yet dev_agreed_done" || true
grep -q "not ready to ship" /tmp/out.txt || fail "ship-hash wrong-phase refusal message missing"
rm -f /tmp/out.txt

echo "== override unsticks a commit-content mismatch at ship time, and is permanently logged with the given reason =="
SPRINT_SHIP_OVR=$(new_sprint "Ship override sprint")
$SCRIPT start "$SPRINT_SHIP_OVR" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_SHIP_OVR initial work"
$SCRIPT qa1 "$SPRINT_SHIP_OVR" --verdict PASS --notes "looked good" > /dev/null
$SCRIPT dev-done "$SPRINT_SHIP_OVR" > /dev/null
echo "unaudited" > "sprint${SPRINT_SHIP_OVR}-sneaky.txt"
git add "sprint${SPRINT_SHIP_OVR}-sneaky.txt"
git commit -q -m "unaudited change after PASS"
SHIP_OVERRIDE_COMMIT=$(git rev-parse HEAD)

$SCRIPT ship "$SPRINT_SHIP_OVR" --commit "$SHIP_OVERRIDE_COMMIT" > /tmp/out.txt 2>&1 && fail "ship succeeded despite a content mismatch (test setup broken)" || true
grep -q "doesn't match what QA1 audited" /tmp/out.txt || fail "expected ship-time content-mismatch refusal did not occur"

$SCRIPT override "$SPRINT_SHIP_OVR" --gate ship-hash --reason "reviewed the extra commit personally, safe to ship" --confirm OVERRIDE > /dev/null || fail "ship-hash override refused despite a valid --confirm and --reason"
$SCRIPT ship "$SPRINT_SHIP_OVR" --commit "$SHIP_OVERRIDE_COMMIT" > /dev/null || fail "ship still refused after a valid ship-hash override"
SHIP_OVERRIDE_STATUS=$($SCRIPT status "$SPRINT_SHIP_OVR" --verbose)
echo "$SHIP_OVERRIDE_STATUS" | grep -q "human-override" || fail "ship-hash override was not recorded in the sprint's history"
echo "$SHIP_OVERRIDE_STATUS" | grep -q "reviewed the extra commit personally" || fail "ship-hash override reason was not recorded in the sprint's history"
rm -f /tmp/out.txt

echo "== gates: a GT fail after a reship is an unaudited-fix miss, never folded into the audited bucket =="
SPRINT_UNAUDITED=$(new_sprint "Unaudited fix miss sprint")
$SCRIPT start "$SPRINT_UNAUDITED" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_UNAUDITED work"
$SCRIPT qa1 "$SPRINT_UNAUDITED" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_UNAUDITED" > /dev/null
UNAUDITED_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_UNAUDITED" --commit "$UNAUDITED_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_UNAUDITED" --deployed-commit "$UNAUDITED_COMMIT" --verdict FAIL --notes "first fail, audited miss" > /dev/null
git commit -q --allow-empty -m "fix1 for sprint $SPRINT_UNAUDITED"
FIX1_COMMIT=$(git rev-parse HEAD)
$SCRIPT reship "$SPRINT_UNAUDITED" --commit "$FIX1_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_UNAUDITED" --deployed-commit "$FIX1_COMMIT" --verdict FAIL --notes "second fail, unaudited miss" > /dev/null
git commit -q --allow-empty -m "fix2 for sprint $SPRINT_UNAUDITED"
FIX2_COMMIT=$(git rev-parse HEAD)
$SCRIPT reship "$SPRINT_UNAUDITED" --commit "$FIX2_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_UNAUDITED" --deployed-commit "$FIX2_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT complete "$SPRINT_UNAUDITED" --user-said "close it, both misses are understood" > /dev/null

echo "== gates: a completed sprint that needed a dev-done-hash override is counted under hash-drift, not miscounted as a gate override =="
SPRINT_GATES_OVR=$(new_sprint "Gates override sprint")
$SCRIPT start "$SPRINT_GATES_OVR" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_GATES_OVR work"
$SCRIPT qa1 "$SPRINT_GATES_OVR" --verdict PASS --notes ok > /dev/null
GATES_OVR_FILE=$(find docs/sprints/2-in-progress -name "sprint-${SPRINT_GATES_OVR}_*.md")
echo "### amended after audit" >> "$GATES_OVR_FILE"
$SCRIPT override "$SPRINT_GATES_OVR" --gate dev-done-hash --reason "reviewed, cosmetic only" --confirm OVERRIDE > /dev/null
$SCRIPT dev-done "$SPRINT_GATES_OVR" > /dev/null
GATES_OVR_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_GATES_OVR" --commit "$GATES_OVR_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_GATES_OVR" --deployed-commit "$GATES_OVR_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT complete "$SPRINT_GATES_OVR" --user-said "close it" > /dev/null

echo "== gates: a GT fail after a ship-hash-overridden ship is NOT an audited miss (content that shipped was never QA1's) =="
SPRINT_SHIP_OVR_MISS=$(new_sprint "Ship override miss sprint")
$SCRIPT start "$SPRINT_SHIP_OVR_MISS" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_SHIP_OVR_MISS initial work"
$SCRIPT qa1 "$SPRINT_SHIP_OVR_MISS" --verdict PASS --notes "looked good" > /dev/null
$SCRIPT dev-done "$SPRINT_SHIP_OVR_MISS" > /dev/null
echo "unaudited content" > "sprint${SPRINT_SHIP_OVR_MISS}-drift.txt"
git add "sprint${SPRINT_SHIP_OVR_MISS}-drift.txt"
git commit -q -m "unaudited change after PASS"
DRIFT_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_SHIP_OVR_MISS" --commit "$DRIFT_COMMIT" > /tmp/out.txt 2>&1 && fail "ship succeeded on drifted content (test setup broken)" || true
$SCRIPT override "$SPRINT_SHIP_OVR_MISS" --gate ship-hash --reason "reviewed the drift personally, safe to ship" --confirm OVERRIDE > /dev/null
$SCRIPT ship "$SPRINT_SHIP_OVR_MISS" --commit "$DRIFT_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_SHIP_OVR_MISS" --deployed-commit "$DRIFT_COMMIT" --verdict FAIL --notes "GT caught what QA1 never actually saw" > /dev/null
git commit -q --allow-empty -m "fix for sprint $SPRINT_SHIP_OVR_MISS"
SHIP_OVR_MISS_FIX_COMMIT=$(git rev-parse HEAD)
$SCRIPT reship "$SPRINT_SHIP_OVR_MISS" --commit "$SHIP_OVR_MISS_FIX_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_SHIP_OVR_MISS" --deployed-commit "$SHIP_OVR_MISS_FIX_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT complete "$SPRINT_SHIP_OVR_MISS" --user-said "close it" > /dev/null
rm -f /tmp/out.txt

echo "== gates: final aggregate across every completed sprint, still strictly read-only =="
FINAL_HASH_BEFORE=$(sprints_hash)
FINAL_GATES_OUT=$($SCRIPT gates)
FINAL_HASH_AFTER=$(sprints_hash)
[ "$FINAL_HASH_BEFORE" = "$FINAL_HASH_AFTER" ] || fail "gates modified docs/sprints/ on the multi-sprint aggregate (should be strictly read-only)"

echo "$FINAL_GATES_OUT" | grep -q "Gates aggregate over 4 completed sprints" || fail "gates should count exactly 4 completed sprints (sprints in other phases, aborted, or mid-loop must be excluded)"
echo "$FINAL_GATES_OUT" | grep -q "Audited miss.*sprints: ${SPRINT_1}, ${SPRINT_UNAUDITED}\$" || fail "gates' audited-miss bucket should list only sprint $SPRINT_1 and sprint $SPRINT_UNAUDITED's first GT fail — a ship-hash-overridden ship must NOT count as audited"
echo "$FINAL_GATES_OUT" | grep -q "Unaudited-fix miss.*sprints: ${SPRINT_UNAUDITED}\$" || fail "gates' unaudited-fix-miss bucket should list only sprint $SPRINT_UNAUDITED, never sprint $SPRINT_1 or sprint $SPRINT_SHIP_OVR_MISS"
echo "$FINAL_GATES_OUT" | grep -q "UNCLASSIFIED" || fail "gates should flag the ship-hash-overridden sprint's GT fail as unclassified, not silently fold it into audited miss"
echo "$FINAL_GATES_OUT" | grep -q "sprint ${SPRINT_SHIP_OVR_MISS}: .*ship-hash.*was human-overridden" || fail "gates' unclassified note for sprint $SPRINT_SHIP_OVR_MISS should explain why (ship-hash override), not just flag it"
echo "$FINAL_GATES_OUT" | grep -q "dev-done-hash overrides: 1 — sprints: ${SPRINT_GATES_OVR}" || fail "gates should count sprint $SPRINT_GATES_OVR's dev-done-hash override under hash-drift frequency"
echo "$FINAL_GATES_OUT" | grep -q "ship-hash overrides: 1 — sprints: ${SPRINT_SHIP_OVR_MISS}" || fail "gates should count sprint $SPRINT_SHIP_OVR_MISS's ship-hash override under hash-drift frequency"
echo "$FINAL_GATES_OUT" | grep -qE "sprint ${SPRINT_GATES_OVR}: audit_rounds=1, live_test_rounds=1" || fail "gates' round-count distribution for sprint $SPRINT_GATES_OVR is wrong"

echo "== gates: an unparseable verdict format is flagged and excluded, never silently counted as a catch =="
SPRINT_CORRUPT_VERDICT=$(new_sprint "Corrupt verdict sprint")
$SCRIPT start "$SPRINT_CORRUPT_VERDICT" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_CORRUPT_VERDICT work"
$SCRIPT qa1 "$SPRINT_CORRUPT_VERDICT" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_CORRUPT_VERDICT" > /dev/null
CORRUPT_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_CORRUPT_VERDICT" --commit "$CORRUPT_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_CORRUPT_VERDICT" --deployed-commit "$CORRUPT_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT complete "$SPRINT_CORRUPT_VERDICT" --user-said "close it" > /dev/null

# Simulate hand-corrupted state (or a future format change) rather than
# anything sprint_lifecycle.py itself would ever write.
CORRUPT_STATE="docs/sprints/state/sprint-${SPRINT_CORRUPT_VERDICT}.json"
python3 -c "
import json
p = '$CORRUPT_STATE'
s = json.load(open(p))
for h in s['history']:
    if h['event'] == 'audit':
        h['detail'] = 'garbled text with no leading verdict token'
json.dump(s, open(p, 'w'), indent=2)
"

CORRUPT_GATES_OUT=$($SCRIPT gates 2>&1)
echo "$CORRUPT_GATES_OUT" | grep -q "Traceback" && fail "gates crashed on an unparseable verdict format"
echo "$CORRUPT_GATES_OUT" | grep -q "WARNING: sprint ${SPRINT_CORRUPT_VERDICT} has a 'audit' event with an unrecognized verdict format" \
  || fail "gates should warn about the unparseable verdict instead of silently guessing"
echo "$CORRUPT_GATES_OUT" | grep "^   QA1:" > /tmp/qa1_catch_line.txt
FOUND=$(python3 -c "
import re
line = open('/tmp/qa1_catch_line.txt').read()
print('MATCH' if re.search(r'\b${SPRINT_CORRUPT_VERDICT}\b', line) else 'NOMATCH')
")
[ "$FOUND" = "NOMATCH" ] || fail "gates should not count sprint ${SPRINT_CORRUPT_VERDICT} under QA1's catch rate from an unparseable verdict alone"
rm -f /tmp/qa1_catch_line.txt

echo "== groundtruth refuses a --deployed-commit that doesn't match what Pipeman actually shipped =="
SPRINT_GT_CHECK=$(new_sprint "Deployed commit check sprint")
$SCRIPT start "$SPRINT_GT_CHECK" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_GT_CHECK work"
$SCRIPT qa1 "$SPRINT_GT_CHECK" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_GT_CHECK" > /dev/null
GT_SHIPPED_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_GT_CHECK" --commit "$GT_SHIPPED_COMMIT" > /dev/null

git commit -q --allow-empty -m "an unrelated later commit, never shipped for this sprint"
UNSHIPPED_COMMIT=$(git rev-parse HEAD)
$SCRIPT groundtruth "$SPRINT_GT_CHECK" --deployed-commit "$UNSHIPPED_COMMIT" --verdict PASS --notes "tested the wrong thing" \
  > /tmp/out.txt 2>&1 && fail "groundtruth accepted a --deployed-commit that was never shipped for this sprint" || true
grep -q "doesn't match what Pipeman actually shipped" /tmp/out.txt || fail "deployed-commit mismatch refusal message missing"
grep -q "$GT_SHIPPED_COMMIT" /tmp/out.txt || fail "mismatch refusal should name the commit that was actually shipped"
grep -q "$UNSHIPPED_COMMIT" /tmp/out.txt || fail "mismatch refusal should name the commit that was actually tested"
rm -f /tmp/out.txt

echo "== groundtruth refuses a --deployed-commit that doesn't resolve to a real commit =="
$SCRIPT groundtruth "$SPRINT_GT_CHECK" --deployed-commit not-a-real-commit --verdict PASS --notes ok \
  > /tmp/out.txt 2>&1 && fail "groundtruth accepted a --deployed-commit that doesn't resolve" || true
grep -q "does not resolve to a real commit" /tmp/out.txt || fail "unresolvable deployed-commit refusal message missing"
rm -f /tmp/out.txt

echo "== groundtruth succeeds once --deployed-commit actually matches what was shipped =="
$SCRIPT groundtruth "$SPRINT_GT_CHECK" --deployed-commit "$GT_SHIPPED_COMMIT" --verdict FAIL --notes "real bug found" > /dev/null || \
  fail "groundtruth refused a --deployed-commit that genuinely matched the shipped commit"

echo "== status: no stale-test line right after a fresh verdict against the current ship =="
$SCRIPT status "$SPRINT_GT_CHECK" 2>/dev/null | grep -q "not yet re-tested" && \
  fail "status showed the stale-test line when the recorded verdict is current"

echo "== status: stale-test line appears once a reship lands after the last recorded verdict =="
git commit -q --allow-empty -m "fix for sprint $SPRINT_GT_CHECK"
GT_FIX_COMMIT=$(git rev-parse HEAD)
$SCRIPT reship "$SPRINT_GT_CHECK" --commit "$GT_FIX_COMMIT" > /dev/null
$SCRIPT status "$SPRINT_GT_CHECK" 2>/dev/null | grep -q "Code has changed since the last recorded GroundTruth verdict — not yet re-tested." || \
  fail "status did not show the stale-test line after a reship with no fresh verdict yet"

echo "== status: stale-test line clears once a fresh verdict is recorded against the reshipped commit =="
$SCRIPT groundtruth "$SPRINT_GT_CHECK" --deployed-commit "$GT_FIX_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT status "$SPRINT_GT_CHECK" 2>/dev/null | grep -q "not yet re-tested" && \
  fail "status still showed the stale-test line after a fresh verdict against the current ship"

echo "== groundtruth refuses distinctly when no ship has ever been recorded for this sprint =="
SPRINT_GT_NOSHIP=$(new_sprint "No ship recorded sprint")
$SCRIPT start "$SPRINT_GT_NOSHIP" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_GT_NOSHIP work"
$SCRIPT qa1 "$SPRINT_GT_NOSHIP" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_GT_NOSHIP" > /dev/null
NOSHIP_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_GT_NOSHIP" --commit "$NOSHIP_COMMIT" > /dev/null
# Simulate a pre-upgrade sprint (or a hand-edited state file) with no
# last_shipped_commit on record, same technique as the existing
# SPRINT_LEGACY scenario above for the other hash fields.
NOSHIP_STATE="docs/sprints/state/sprint-${SPRINT_GT_NOSHIP}.json"
python3 -c "
import json
p = '$NOSHIP_STATE'
s = json.load(open(p))
s['last_shipped_commit'] = None
json.dump(s, open(p, 'w'), indent=2)
"
$SCRIPT groundtruth "$SPRINT_GT_NOSHIP" --deployed-commit "$NOSHIP_COMMIT" --verdict PASS --notes ok \
  > /tmp/out.txt 2>&1 && fail "groundtruth succeeded with no last_shipped_commit on record" || true
grep -q "has no shipped commit on record" /tmp/out.txt || fail "no-ship-recorded refusal message missing"
grep -q "doesn't match what Pipeman actually shipped" /tmp/out.txt && \
  fail "no-ship-recorded refusal must be a distinct message from the mismatch refusal, not reuse it"
rm -f /tmp/out.txt

# ============================================================================
# Sprint 12: human verification gates (declare-gate / record-gate / the
# complete_ready -> dev_build reopen edge). Everything below still runs
# inside the same sandbox as everything above — no new test here writes to
# the invoking repo's docs/sprints/, same discipline as the rest of this file.
# ============================================================================

echo "== a sprint that never declares a human gate is completely unaffected =="
SPRINT_NO_GATE=$(new_sprint "No gate sprint")
$SCRIPT start "$SPRINT_NO_GATE" > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_NO_GATE work"
$SCRIPT qa1 "$SPRINT_NO_GATE" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_NO_GATE" > /dev/null
NO_GATE_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_NO_GATE" --commit "$NO_GATE_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_NO_GATE" --deployed-commit "$NO_GATE_COMMIT" --verdict PASS --notes ok > /dev/null
NO_GATE_STATUS=$($SCRIPT status "$SPRINT_NO_GATE")
echo "$NO_GATE_STATUS" | grep -qi "gate 3" && fail "status printed a gate 3 line for a sprint that never declared one"
echo "$NO_GATE_STATUS" | grep -qi "gate 4" && fail "status printed a gate 4 line for a sprint that never declared one"
$SCRIPT complete "$SPRINT_NO_GATE" --user-said "close it, no human gates apply" > /dev/null || \
  fail "complete refused a sprint with zero declared human gates"

echo "== declare-gate / record-gate reject a bad --which or --verdict =="
SPRINT_GATE_BAD=$(new_sprint "Bad gate args sprint")
$SCRIPT start "$SPRINT_GATE_BAD" > /dev/null
$SCRIPT declare-gate "$SPRINT_GATE_BAD" --which gate5 > /tmp/out.txt 2>&1 && fail "declare-gate accepted an invalid --which" || true
grep -qi "invalid choice" /tmp/out.txt || fail "declare-gate bad --which error message missing"
$SCRIPT declare-gate "$SPRINT_GATE_BAD" --which gate3 > /dev/null
$SCRIPT record-gate "$SPRINT_GATE_BAD" --which gate3 --verdict MAYBE > /tmp/out.txt 2>&1 && fail "record-gate accepted a bad verdict" || true
grep -q "Verdict must be one of" /tmp/out.txt || fail "record-gate bad-verdict error message missing"
rm -f /tmp/out.txt

echo "== record-gate refuses a gate that was never declared =="
SPRINT_UNDECLARED=$(new_sprint "Undeclared gate sprint")
$SCRIPT start "$SPRINT_UNDECLARED" > /dev/null
$SCRIPT record-gate "$SPRINT_UNDECLARED" --which gate4 --verdict PASS --notes "trying to skip declaring it" \
  > /tmp/out.txt 2>&1 && fail "record-gate accepted a verdict for an undeclared gate" || true
grep -q "has not been declared" /tmp/out.txt || fail "record-gate undeclared-gate refusal message missing"
rm -f /tmp/out.txt

echo "== declare-gate is idempotent: declaring twice does not double-log or error =="
SPRINT_IDEMPOTENT=$(new_sprint "Idempotent declare sprint")
$SCRIPT start "$SPRINT_IDEMPOTENT" > /dev/null
$SCRIPT declare-gate "$SPRINT_IDEMPOTENT" --which gate3 > /dev/null || fail "first declare-gate call failed"
$SCRIPT declare-gate "$SPRINT_IDEMPOTENT" --which gate3 > /tmp/out.txt 2>&1 || fail "second declare-gate call on an already-declared gate should not error"
grep -q "already declared" /tmp/out.txt || fail "idempotent declare-gate should say it's already declared"
IDEMPOTENT_DECLARE_COUNT=$($SCRIPT status "$SPRINT_IDEMPOTENT" --verbose | grep -c "human_gate_declared")
[ "$IDEMPOTENT_DECLARE_COUNT" = "1" ] || fail "declare-gate called twice should log exactly one human_gate_declared event, got $IDEMPOTENT_DECLARE_COUNT"
rm -f /tmp/out.txt

echo "== declare-gate / record-gate are addable mid-build, before qa1 has even run =="
SPRINT_MIDBUILD=$(new_sprint "Mid-build gate sprint")
$SCRIPT start "$SPRINT_MIDBUILD" > /dev/null
$SCRIPT declare-gate "$SPRINT_MIDBUILD" --which gate4 > /dev/null || fail "declare-gate refused during dev_build"
$SCRIPT status "$SPRINT_MIDBUILD" | grep -qi "gate 4" || fail "status did not show the mid-build-declared gate 4"

echo "== a declared gate with no recorded result blocks /sprint-complete, naming the gate =="
git commit -q --allow-empty -m "sprint $SPRINT_MIDBUILD work"
$SCRIPT qa1 "$SPRINT_MIDBUILD" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_MIDBUILD" > /dev/null
MIDBUILD_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_MIDBUILD" --commit "$MIDBUILD_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_MIDBUILD" --deployed-commit "$MIDBUILD_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT complete "$SPRINT_MIDBUILD" --user-said "trying to close with gate 4 unrecorded" \
  > /tmp/out.txt 2>&1 && fail "complete succeeded with a declared gate that has no recorded result" || true
grep -qi "Gate 4" /tmp/out.txt || fail "complete's refusal should name Gate 4 specifically"
grep -q "no recorded result" /tmp/out.txt || fail "complete's refusal should say the gate has no recorded result"

echo "== recording a PASS for the last outstanding declared gate lets /sprint-complete proceed =="
$SCRIPT record-gate "$SPRINT_MIDBUILD" --which gate4 --verdict PASS --notes "Chang approved, one copy change" > /dev/null
$SCRIPT complete "$SPRINT_MIDBUILD" --user-said "close it, gate 4 approved" > /dev/null || \
  fail "complete still refused after the only declared gate recorded a PASS"
$SCRIPT status "$SPRINT_MIDBUILD" --verbose | grep -q "Chang approved, one copy change" || \
  fail "the gate-4 notes were not recorded in the sprint's history"
rm -f /tmp/out.txt

echo "== a gate FAIL recorded before complete_ready blocks completion but does not reopen anything (nothing to reopen yet) =="
SPRINT_EARLY_FAIL=$(new_sprint "Early gate fail sprint")
$SCRIPT start "$SPRINT_EARLY_FAIL" > /dev/null
$SCRIPT declare-gate "$SPRINT_EARLY_FAIL" --which gate3 > /dev/null
$SCRIPT record-gate "$SPRINT_EARLY_FAIL" --which gate3 --verdict FAIL --notes "early check, found an issue" > /tmp/out.txt 2>&1 || \
  fail "record-gate refused a FAIL verdict recorded during dev_build"
grep -q "nothing to reopen" /tmp/out.txt || fail "record-gate should say there's nothing to reopen when recorded before complete_ready"
$SCRIPT status "$SPRINT_EARLY_FAIL" | grep -q "Phase: dev_build" || fail "phase should still be dev_build, an early gate FAIL must not invent a phase change"
rm -f /tmp/out.txt

echo "== THE REOPEN EDGE: a gate FAIL recorded at complete_ready sends the sprint back to dev_build, not groundtruth_live =="
SPRINT_REOPEN=$(new_sprint "Reopen sprint")
$SCRIPT start "$SPRINT_REOPEN" > /dev/null
$SCRIPT declare-gate "$SPRINT_REOPEN" --which gate3 > /dev/null
git commit -q --allow-empty -m "sprint $SPRINT_REOPEN initial work"
$SCRIPT qa1 "$SPRINT_REOPEN" --verdict PASS --notes "looked good" > /dev/null
$SCRIPT dev-done "$SPRINT_REOPEN" > /dev/null
REOPEN_COMMIT_1=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_REOPEN" --commit "$REOPEN_COMMIT_1" > /dev/null
$SCRIPT groundtruth "$SPRINT_REOPEN" --deployed-commit "$REOPEN_COMMIT_1" --verdict PASS --notes "GT looks clean" > /dev/null
$SCRIPT status "$SPRINT_REOPEN" | grep -q "Phase: complete_ready" || fail "sprint should be complete_ready before the gate 3 check runs"

$SCRIPT record-gate "$SPRINT_REOPEN" --which gate3 --verdict FAIL --notes "NVDA found a real regression" > /tmp/out.txt 2>&1 || \
  fail "record-gate refused a FAIL verdict at complete_ready"
grep -q "reopened" /tmp/out.txt || fail "record-gate should announce the reopen"
# Not a fragile substring match on the print message here — the precise
# checks below (GroundTruth's PASS still on record, zero live_test FAIL
# entries in history) are what actually prove this property.

REOPEN_STATUS=$($SCRIPT status "$SPRINT_REOPEN")
echo "$REOPEN_STATUS" | grep -q "Phase: dev_build" || fail "sprint should be back in dev_build after the reopen, not groundtruth_live or any other phase"
echo "$REOPEN_STATUS" | grep -q "GroundTruth live result: PASS" || \
  fail "GroundTruth's original PASS must stay on record after a reopen — it never actually failed a live test"

REOPEN_VERBOSE=$($SCRIPT status "$SPRINT_REOPEN" --verbose)
echo "$REOPEN_VERBOSE" | grep -q "human_gate_reopened" || fail "reopen must be logged as its own distinct event, human_gate_reopened"
REOPEN_LIVE_TEST_FAILS=$(echo "$REOPEN_VERBOSE" | grep "live_test" | grep -c "FAIL" || true)
[ "$REOPEN_LIVE_TEST_FAILS" = "0" ] || fail "reopen must never be recorded as a fabricated live_test FAIL entry"

echo "== Q3: the reopen clears both QA1 hash fields directly (checked in the state file, not inferred from a refusal message dominated by the phase check) =="
$SCRIPT dev-done "$SPRINT_REOPEN" > /tmp/out.txt 2>&1 && fail "dev-done succeeded right after a reopen, with no fresh QA1 audit" || true
grep -q "needs a QA1 PASS on the first audit" /tmp/out.txt || fail "post-reopen dev-done should refuse on phase (it's dev_build now), same as any other dev_build sprint"
REOPEN_STATE="docs/sprints/state/sprint-${SPRINT_REOPEN}.json"
python3 -c "
import json, sys
s = json.load(open('$REOPEN_STATE'))
assert s['qa1_audit_file_hash'] is None, f\"qa1_audit_file_hash should be null after reopen, got {s['qa1_audit_file_hash']!r}\"
assert s['qa1_audited_tree_hash'] is None, f\"qa1_audited_tree_hash should be null after reopen, got {s['qa1_audited_tree_hash']!r}\"
assert s['qa1_audit_result'] == 'PASS', \"qa1_audit_result is history, not a hash field, and must NOT be reset by the reopen\"
" || fail "reopen did not correctly null both QA1 hash fields while leaving qa1_audit_result alone"
rm -f /tmp/out.txt

echo "== completing the reopened sprint: fresh QA1, ship, GroundTruth, then a fresh gate-3 PASS =="
git commit -q --allow-empty -m "fix for sprint $SPRINT_REOPEN, addresses the NVDA finding"
$SCRIPT qa1 "$SPRINT_REOPEN" --verdict PASS --notes "re-audited the fix" > /dev/null
$SCRIPT dev-done "$SPRINT_REOPEN" > /dev/null || fail "dev-done still refused after a fresh QA1 PASS post-reopen"
REOPEN_COMMIT_2=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_REOPEN" --commit "$REOPEN_COMMIT_2" > /dev/null
$SCRIPT groundtruth "$SPRINT_REOPEN" --deployed-commit "$REOPEN_COMMIT_2" --verdict PASS --notes "re-tested, clean" > /dev/null
$SCRIPT status "$SPRINT_REOPEN" | grep -q "Phase: complete_ready" || fail "sprint should reach complete_ready again after the full post-reopen loop"

$SCRIPT complete "$SPRINT_REOPEN" --user-said "trying to close before gate 3 is re-verified" \
  > /tmp/out.txt 2>&1 && fail "complete succeeded while gate 3's last recorded result was still the old FAIL" || true
grep -qi "Gate 3" /tmp/out.txt || fail "complete's refusal should still name gate 3 (its last result is FAIL, not PASS)"
grep -q "needs a PASS recorded" /tmp/out.txt || fail "complete should distinguish 'recorded FAIL, needs a PASS recorded' from 'never recorded'"

$SCRIPT record-gate "$SPRINT_REOPEN" --which gate3 --verdict PASS --notes "NVDA re-verified clean" > /dev/null
$SCRIPT complete "$SPRINT_REOPEN" --user-said "close it, gate 3 re-verified clean" > /dev/null || \
  fail "complete still refused after gate 3's new PASS superseded the old FAIL"
REOPEN_RECORD_COUNT=$($SCRIPT status "$SPRINT_REOPEN" --verbose | grep -c "human_gate_recorded")
[ "$REOPEN_RECORD_COUNT" = "2" ] || \
  fail "gate 3 should have exactly two human_gate_recorded events on record (the FAIL and the later PASS), got $REOPEN_RECORD_COUNT"
rm -f /tmp/out.txt

echo "== declare-gate / record-gate refuse once a sprint is complete or aborted =="
$SCRIPT declare-gate "$SPRINT_REOPEN" --which gate4 > /tmp/out.txt 2>&1 && fail "declare-gate succeeded on an already-complete sprint" || true
grep -qi "nothing to declare" /tmp/out.txt || fail "declare-gate-on-complete refusal message missing"
$SCRIPT record-gate "$SPRINT_REOPEN" --which gate3 --verdict PASS --notes "trying again" \
  > /tmp/out.txt 2>&1 && fail "record-gate succeeded on an already-complete sprint" || true
grep -qi "nothing to record" /tmp/out.txt || fail "record-gate-on-complete refusal message missing"

SPRINT_ABORTED_GATE=$(new_sprint "Aborted gate sprint")
$SCRIPT start "$SPRINT_ABORTED_GATE" > /dev/null
$SCRIPT abort "$SPRINT_ABORTED_GATE" --reason "test" > /dev/null
$SCRIPT declare-gate "$SPRINT_ABORTED_GATE" --which gate3 > /tmp/out.txt 2>&1 && fail "declare-gate succeeded on an aborted sprint" || true
grep -qi "nothing to declare" /tmp/out.txt || fail "declare-gate-on-aborted refusal message missing"
rm -f /tmp/out.txt

echo "== override un-declares a gate (not silently removable): requires --confirm OVERRIDE and --reason, permanently logged =="
SPRINT_UNDECLARE=$(new_sprint "Undeclare override sprint")
$SCRIPT start "$SPRINT_UNDECLARE" > /dev/null
$SCRIPT declare-gate "$SPRINT_UNDECLARE" --which gate4 > /dev/null

$SCRIPT override "$SPRINT_UNDECLARE" --gate gate4 --confirm OVERRIDE > /tmp/out.txt 2>&1 && fail "gate override succeeded with an empty --reason" || true
grep -q -- "--reason is required" /tmp/out.txt || fail "gate-undeclare empty-reason refusal message missing"
$SCRIPT override "$SPRINT_UNDECLARE" --gate gate4 --reason "test" --confirm YES > /tmp/out.txt 2>&1 && fail "gate override succeeded with the wrong --confirm value" || true
grep -q "must be exactly the literal word OVERRIDE" /tmp/out.txt || fail "gate-undeclare wrong-confirm refusal message missing"

$SCRIPT override "$SPRINT_UNDECLARE" --gate gate4 --reason "scope changed, no legal content in this sprint after all" --confirm OVERRIDE > /dev/null || \
  fail "gate override refused despite a valid --confirm and --reason"
$SCRIPT status "$SPRINT_UNDECLARE" | grep -qi "gate 4" && fail "status should no longer show gate 4 after it was undeclared"
UNDECLARE_VERBOSE=$($SCRIPT status "$SPRINT_UNDECLARE" --verbose)
echo "$UNDECLARE_VERBOSE" | grep -q "human_gate_undeclared" || fail "undeclare was not recorded in the sprint's history"
echo "$UNDECLARE_VERBOSE" | grep -q "scope changed, no legal content in this sprint after all" || fail "undeclare reason was not recorded in the sprint's history"
git commit -q --allow-empty -m "sprint $SPRINT_UNDECLARE work"
$SCRIPT qa1 "$SPRINT_UNDECLARE" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_UNDECLARE" > /dev/null
UNDECLARE_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_UNDECLARE" --commit "$UNDECLARE_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_UNDECLARE" --deployed-commit "$UNDECLARE_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT complete "$SPRINT_UNDECLARE" --user-said "close it, gate 4 no longer applies" > /dev/null || \
  fail "complete refused even though the only declared gate was cleanly undeclared"
rm -f /tmp/out.txt

echo "== override refuses to undeclare a gate that was never declared =="
SPRINT_UNDECLARE_NEVER=$(new_sprint "Undeclare never-declared sprint")
$SCRIPT start "$SPRINT_UNDECLARE_NEVER" > /dev/null
$SCRIPT override "$SPRINT_UNDECLARE_NEVER" --gate gate3 --reason "trying to undeclare something never declared" --confirm OVERRIDE \
  > /tmp/out.txt 2>&1 && fail "gate override undeclared a gate that was never declared" || true
grep -q "is not declared" /tmp/out.txt || fail "undeclare-never-declared refusal message missing"
rm -f /tmp/out.txt

echo "== backward compatibility: a state file predating human_gates loads cleanly through status, list, and gates =="
SPRINT_PRE_GATES=$(new_sprint "Pre-gates sprint")
$SCRIPT start "$SPRINT_PRE_GATES" > /dev/null
PRE_GATES_STATE="docs/sprints/state/sprint-${SPRINT_PRE_GATES}.json"
# Simulate a state file written by a version of this script from before
# human_gates existed at all, same technique as SPRINT_LEGACY above.
python3 -c "
import json
p = '$PRE_GATES_STATE'
s = json.load(open(p))
del s['human_gates']
json.dump(s, open(p, 'w'), indent=2)
"
$SCRIPT status "$SPRINT_PRE_GATES" > /dev/null || fail "status crashed on a state file with no human_gates key at all"
$SCRIPT status "$SPRINT_PRE_GATES" --verbose > /dev/null || fail "status --verbose crashed on a state file with no human_gates key"
$SCRIPT list > /dev/null || fail "list crashed with a pre-human_gates state file present"
$SCRIPT gates > /dev/null 2>&1 || fail "gates crashed with a pre-human_gates state file present"
git commit -q --allow-empty -m "sprint $SPRINT_PRE_GATES work"
$SCRIPT qa1 "$SPRINT_PRE_GATES" --verdict PASS --notes ok > /dev/null
$SCRIPT dev-done "$SPRINT_PRE_GATES" > /dev/null
PRE_GATES_COMMIT=$(git rev-parse HEAD)
$SCRIPT ship "$SPRINT_PRE_GATES" --commit "$PRE_GATES_COMMIT" > /dev/null
$SCRIPT groundtruth "$SPRINT_PRE_GATES" --deployed-commit "$PRE_GATES_COMMIT" --verdict PASS --notes ok > /dev/null
$SCRIPT complete "$SPRINT_PRE_GATES" --user-said "close it, this sprint predates human gates entirely" > /dev/null || \
  fail "complete refused a sprint whose state file predates the human_gates field"
echo "== backward compatibility: declare-gate/record-gate also work on a state file predating the field =="
SPRINT_PRE_GATES_2=$(new_sprint "Pre-gates sprint 2")
$SCRIPT start "$SPRINT_PRE_GATES_2" > /dev/null
PRE_GATES_STATE_2="docs/sprints/state/sprint-${SPRINT_PRE_GATES_2}.json"
python3 -c "
import json
p = '$PRE_GATES_STATE_2'
s = json.load(open(p))
del s['human_gates']
json.dump(s, open(p, 'w'), indent=2)
"
$SCRIPT declare-gate "$SPRINT_PRE_GATES_2" --which gate3 > /dev/null || fail "declare-gate crashed on a state file with no human_gates key"
$SCRIPT record-gate "$SPRINT_PRE_GATES_2" --which gate3 --verdict PASS --notes ok > /dev/null || fail "record-gate crashed on a state file with no human_gates key"

echo "ALL SMOKE TESTS PASSED"
