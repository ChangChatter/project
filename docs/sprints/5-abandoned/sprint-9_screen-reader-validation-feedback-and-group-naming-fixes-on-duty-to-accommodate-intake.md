---
id: 9
title: "Screen-reader validation feedback and group-naming fixes on duty-to-accommodate intake"
epic: "Output and Guardrails"
status: abandoned
created: 2026-09-07T18:02:53+00:00
---

# Master Controller Sprint Definition — Sprint 9

**Epic:** Output and Guardrails
**Sprint Objective:** Make the duty-to-accommodate intake's validation state
perceivable to a screen-reader user at the point of correcting an error, and
stop each question being announced twice, without reintroducing the ARIA
defects that rounds 3 and 4 of Sprint 8 each fixed.

### Context

Sprint 8 closed with requirement 24 — a human assistive-technology pass —
outstanding, on the explicit condition that Sprint 6 blocked on it. That pass
was run on 2026-09-07 by Chang, NVDA with Speech Viewer on Windows, keyboard
navigation against the live site. It found a **functional defect that five
rounds of QA1 static audit and GroundTruth DOM inspection did not and
structurally could not catch**: the `aria-invalid` / `aria-describedby` wiring
those rounds built is present and correct in the DOM, and does not reach an
NVDA user at the moment they navigate back to fix the field.

This is the case CLAUDE.md's "a gate cannot be assigned a check it has no
instrument for" section was written about, and it is the first time the
human-gate decision has paid out. It also means the deferral was not a
shortcut that got away with it — the deferral is the reason this shipped to
`main`. Sprint 6 remains correctly blocked: rendering the issue guide on top
of intake a screen-reader user cannot error-correct would put a legally
substantive output on unreliable input.

### The pass, as recorded

Method: NVDA + Speech Viewer, Windows, keyboard only (Tab + arrow keys),
against the deployed site, Fact narrative step.

1. **Group naming — announced twice.** Each question's text is announced
   correctly as the accessible name, then again immediately: once for the
   outer native `<fieldset><legend>`, once for the inner ARIA radiogroup
   pointing at the same legend via `aria-labelledby`. Reproducible on all
   three visible groups. A consequence of round 5's nested-structure fix that
   no prior gate had an instrument to observe.
2. **Option navigation — clean, no action needed.** Each arrow-key press
   produces one complete atomic announcement: label, "radio button", checked
   state, position ("2 of 5"). No lag, no split. A split "not checked" then
   "checked" appears on *mouse* interaction only, which is not screen-reader
   navigation and is explicitly out of scope below.
3. **Validation feedback fails at the field level.** Submitting with a group
   unanswered correctly speaks a summary ("Missing: alternatives considered")
   and blocks submission. But navigating back into that specific group is
   **indistinguishable by ear from a correctly-answered group** — no
   "invalid", no error text, nothing. The user is told something is wrong and
   then cannot tell which control is the wrong one by listening to it.

**Coverage gap, not a defect: only three of the four questions were tested.**
`visibleProceduralQuestions()` (`lib/intake-validation.ts:104`) gates
`documentationTiming` on `requestStatus === "denied"`, so three visible groups
is correct behaviour, not a discrepancy. But it means the untested question is
`documentationTiming` — the before/after-denial sequencing question that
exists *because* Sprint 5 Amendment 1 established free text cannot settle
sequence deterministically. It is the most legally substantive of the four and
it has never been through an AT pass. Requirement 5 closes this.

### Requirements

1. **A screen-reader user navigating into a group that failed validation
   perceives that it failed, and can hear why, without leaving the group.**
   The mechanism is Dev Team's to choose and defend; the outcome is the
   requirement. Announcement on entry to the group is sufficient — the error
   need not repeat on every option within it.
2. **Each question is announced once, not twice, on arrival at its group.**
   The accessible name must remain the full question text.
3. **Neither fix reintroduces a defect a previous round already fixed.** This
   component has a documented history of exactly that: round 3 dropped
   `role="radiogroup"` to restore legend naming, which removed the role
   `aria-invalid` needs, which round 4 had to restore. A fix for requirement 2
   that simply deletes the radiogroup, or one for requirement 1 that moves
   naming back onto an element that duplicates it, is a regression, not a fix.
   Dev Team states in Dev Notes which prior round each change interacts with
   and why it does not undo it.
4. **No change to intake logic, validation rules, question wording, or
   visibility rules.** Not `visibleProceduralQuestions()`, not the validation
   predicates, not `lib/types.ts`. This sprint changes how existing state is
   *conveyed*, never what the state is. A diff touching a validation rule is a
   FAIL, to be raised and scoped separately.
5. **The human AT pass covers all four questions, including
   `documentationTiming`.** Reaching it requires answering the first question
   "Yes — and it has been turned down". A pass that tests three groups does not
   satisfy this sprint.
6. Vitest coverage for any new pure function extracted in service of
   requirement 1. If the fix is purely markup and adds no decision, this
   requirement is satisfied by stating that in Dev Notes — **not** by adding a
   test that asserts markup, which this project's testing standard forbids.

### Acceptance Criteria

**Gate 1 — QA1 (static, pre-push):**

- QA1 confirms the diff touches no validation rule, no visibility rule, no
  question wording, and no domain type. Per requirement 4, any of those is a
  FAIL.
- QA1 confirms Dev Notes contains the requirement 3 statement: for each ARIA
  change, which prior Sprint 8 round it interacts with and why it does not undo
  that round's fix. A diff without this is not auditable and is a FAIL.
- QA1 confirms every `aria-describedby` target ID exists in the document and
  that `aria-invalid` sits on a role that supports it.
- QA1 confirms no element is named twice — that exactly one of the nested
  `fieldset`/radiogroup structures carries an accessible name per group.
- QA1 runs the Vitest suite and confirms it is green, and that no
  render-assertion test was added (project testing standard).
- **QA1 explicitly does not verify that any of this is announced.** Attribute
  correctness is what a static audit can establish; audibility is not, and
  claiming otherwise is what produced five rounds of this component. State the
  limit in the audit rather than glossing it.

**Gate 2 — GroundTruth (live, DOM-observable only):**

- GroundTruth confirms submitting with a group unanswered still blocks
  submission and still renders the error summary.
- GroundTruth confirms, in the live DOM, that the failed group carries
  `aria-invalid="true"` and an `aria-describedby` resolving to an existing
  element containing the error text.
- GroundTruth confirms answering "Yes — and it has been turned down" reveals
  the `documentationTiming` question and that it carries the same wiring.
- GroundTruth confirms no regression in the Sprint 3 intake flow.
- **GroundTruth does not attempt to verify announcements or computed
  accessible names.** No instrument exists in this environment; two Sprint 8
  rounds proved a third attempt returns a third CONDITIONAL. Reporting the
  DOM half as passing is complete work here, not a partial result.

**Gate 3 — human AT pass (Chang, NVDA, recorded in Dev Notes):**

- All four questions, including `documentationTiming`, reached and tested.
- Navigating into a group that failed validation is **audibly distinguishable**
  from navigating into a correctly-answered one, and the reason is available
  without leaving the group.
- Each question is announced once on arrival.
- No regression to finding 2: arrow-key navigation still produces one complete
  atomic announcement per option.

### Out of Scope

- **The mouse-click split announcement** ("not checked" then "checked").
  Recorded in the pass as a mouse-only artifact of how the browser sequences
  events, not a screen-reader-navigation defect. Chasing it means changing
  event handling — logic — to fix something no keyboard user encounters.
- **Any other surface.** Sprint 6's output view does not exist yet and gets its
  own AT pass when it does. This sprint is the Sprint 8 intake questions only.
- **A general accessibility audit of the app.** Real and worth doing; not this.
  It would be its own sprint with its own scope, and folding it in here is the
  "while we're in there" this project has repeatedly refused.
- **Automating the AT check.** CDP's AX tree is Chromium's computation, not
  what NVDA announces; provisioning it buys partial confidence and leaves the
  real question open. CLAUDE.md settled this. A human pass remains the gate.

### Dependencies

- **Blocks: Sprint 6.** Sprint 6's Dependencies block on Sprint 8 requirement
  24's pass. That pass has now run and *failed*, so the condition is not
  satisfied by its mere existence — the gate was there to prevent rendering on
  top of inaccessible intake, and it found inaccessible intake. Sprint 6 starts
  when this closes.
- Blocked by: nothing. All inputs exist; the defect is characterized and the
  test instrument (Chang's NVDA setup) is now working, which it was not for
  any of Sprint 8's five rounds.
- External: Chang's availability for gate 3. This sprint cannot close without
  it, by design — that is the whole lesson of Sprint 8.

### Team Assignments

- **Dev Team 1.** Single surface, single component, sequential with Sprint 6.
  No worktree needed; nothing else is in flight.

### Risks & Mitigations

- **The fix reintroduces round 3's or round 4's defect** — the single most
  likely failure, at three-for-three historically. Requirement 3 makes the
  interaction analysis a written deliverable and an explicit QA1 check, so it
  fails the audit rather than the retro.
- **This is treated as the trivial fix fast lane** because it may well be one
  file of markup. It is not eligible, and the reason is empirical rather than
  formal: the fast lane's justification is that presentational changes have
  never produced a real gate catch, whereas ARIA changes *in this component*
  have produced one every time. CLAUDE.md's "when in doubt, it isn't trivial"
  governs.
- **Gate 3 gets skipped because gates 1 and 2 are green**, exactly as
  requirement 24 was deferred out of Sprint 8. The deferral was justified there
  by Sprint 6 blocking on it; there is no equivalent backstop here, because
  this sprint *is* the backstop. Closing without gate 3 recorded in Dev Notes
  means the sprint verified nothing it was created to verify.
- **Scope grows into a general accessibility pass** once someone is already in
  the component with a screen reader running. Out of Scope names this
  specifically; the AT pass is scoped to four questions and their validation.
- **A "fix" is shipped that satisfies the DOM checks and still does not
  announce** — precisely what happened across Sprint 8's rounds 1–5. Gate 3 is
  the only control for this and is the reason it is a named gate rather than a
  post-close action item.

### Dev Notes

**Requirement 3 — interaction with each prior Sprint 8 round.**

Prior structure (round 5, shipped): an outer `<fieldset><legend id={legendId}>`
carrying no ARIA attributes (name only, from the native legend), wrapping an
inner `<div role="radiogroup" aria-labelledby={legendId} aria-invalid
aria-describedby>` (validity, description, and a second explicit name pointing
at the same legend). Two accessible objects, both named from the same text —
this is the mechanism behind finding 1 (double announcement) in Chang's NVDA
pass. It also puts the invalid/describedby state on a non-focusable wrapper
div rather than the element NVDA treats as "the group" on entry, which is the
most likely mechanism behind finding 3 (validation state not perceived).

New structure (this sprint, revised after QA1's CONDITIONAL PASS on
`4e03bad`): a single `<fieldset role="radiogroup" aria-labelledby={legendId}
aria-invalid={invalid} aria-describedby={describedBy}>` with
`<legend id={legendId}>` — one accessible object, explicitly named via
`aria-labelledby` pointing at its own `<legend>`, carrying validity and
description on that same object. The inner `<div>` around the radio options
remains a plain, role-less layout wrapper (className only).

An intermediate version of this fix (audited as `4e03bad`) dropped
`aria-labelledby` entirely, relying only on native fieldset/legend
accname computation. QA1's CONDITIONAL flagged that as an avoidable risk:
bare `<fieldset role="radiogroup"><legend>` with no explicit name is
exactly the configuration GroundTruth's round-1 live test on Sprint 8
previously reported as nameless (see the round-3 discussion below), so
reinstating `aria-labelledby` — self-referencing the fieldset's own legend
— removes that risk without reintroducing finding 1: finding 1 came from
*two separate accessible objects* naming the same text, not from one
object having both a native legend and an `aria-labelledby` pointing at
it.

- **Round 3** (`325fef2`, dropped `role="radiogroup"` from the fieldset
  entirely) was working around a "no accessible name" finding from
  GroundTruth's browser-extension accessibility-tree reader, reported in
  GroundTruth's round-1 live test on Sprint 8 (CONDITIONAL) — which ran
  *after* QA1's round-2 PASS on Sprint 8, not before. That same live test's
  own calibration controls (five fieldsets injected into the live page)
  showed the instrument under-reports `aria-labelledby`-derived names too
  (control D), so the instrument that produced round 3's "no name" finding
  is not fully reliable evidence either way — but per QA1's CONDITIONAL on
  this sprint, "not fully reliable" is not the same as "safe to omit
  entirely," so this fix restores `role="radiogroup"` **and**
  `aria-labelledby` on the fieldset, rather than relying on native naming
  alone. It does not repeat round 3's regression (losing `aria-invalid`
  support): `role="radiogroup"` supports `aria-invalid` per ARIA (confirmed
  by round 4's own investigation, and by `eslint-plugin-jsx-a11y`'s
  `role-supports-aria-props` rule passing clean on this diff with no
  warning). Round 3 was also never tested against a real screen reader —
  Sprint 9's NVDA pass is the first authoritative signal either way, and it
  confirms names *are* announced by the shipped (round-5) pattern, just
  twice — evidence about the *two-object* structure, not about whether a
  single `role="radiogroup"` element with `aria-labelledby` announces
  correctly, which this revision does not further assume either way.
- **Round 4** (`26787fa`, moved `role="radiogroup"` onto a new inner `<div>`
  to regain `aria-invalid` support without touching the fieldset) is not
  undone in the sense that matters: `aria-invalid` still sits on an element
  with `role="radiogroup"`, exactly as round 4 established was required.
  What changes is *which* element — round 4's two-element split is
  collapsed back into one. That split, not the role choice, is what
  produced finding 1.
- **Round 5** (`37df78b`, unified `aria-describedby` onto the same inner div
  as `aria-invalid`/`aria-labelledby`, added the helper-text id) is preserved
  in full: `aria-invalid`, `aria-describedby` (helper id + error id,
  space-joined) all still live on one element together, satisfying the same
  "don't split across nodes" principle round 5 established — just on the
  fieldset instead of the div. The helper-text-id wiring round 5 added is
  untouched.

**Requirement 6 — no new pure function.** This is a markup-only change:
`RadioQuestion`'s existing `describedBy` computation (helper id + error id,
already extracted in round 5) is unchanged, only *which element* it's
rendered onto moves. No new decision or branch was introduced, so no new
Vitest case applies. `visibleProceduralQuestions()` and every other function
in `lib/intake-validation.ts` are untouched — confirmed via `git diff --stat`
showing only `components/IntakeFlow.tsx` changed.

**Self-verification, commit `4e03bad`** (audited by QA1, CONDITIONAL PASS),
in a local dev build (`npm run dev`), not the deployed site:
- `tsc --noEmit`, `eslint`, `next build`: all clean.
- `vitest run`: 63/63, unchanged from Sprint 8 — no test added or removed.
- Live DOM check (local build, `localhost:3000/intake`, all four questions
  reached by answering Q1 "Yes — and it has been turned down"): confirmed via
  `document.querySelectorAll('fieldset[role="radiogroup"]')` that all four
  groups are single elements with zero nested `[role="radiogroup"]` or
  `[aria-labelledby]`/`[aria-label]` descendants (no duplicate naming
  possible). Triggered validation by submitting with three of four groups
  unanswered: `aria-invalid` flips `true` only on the unanswered groups,
  `aria-describedby` resolves to existing elements on every group (the
  shared error `role="alert"` text, plus the Q2 helper text composing
  correctly when both are present), matching Sprint 8 round 5's documented
  DOM guarantees.

**Self-verification, revised commit** (after QA1's CONDITIONAL PASS on
`4e03bad` asked for `aria-labelledby` reinstated per item A), same local
dev build:
- `tsc --noEmit`, `eslint`, `next build`: all clean.
- `vitest run`: 63/63, unchanged — this revision is markup-only same as the
  first.
- Live DOM check, same method and route: all four `fieldset[role="radiogroup"]`
  elements now carry `aria-labelledby` resolving (by object identity) to
  that fieldset's own `<legend>`, and still zero nested
  `[role="radiogroup"]`/`[aria-labelledby]`/`[aria-label]` descendants — one
  named object per group, now named explicitly rather than only natively.
  `aria-invalid`/`aria-describedby` behavior re-confirmed unchanged across
  clean, error, and resolved states.
- **Not verified, and cannot be from this environment**: whether NVDA
  actually announces the name once (not twice) and speaks the invalid state
  and error text on entry to a failed group. That is gate 3, owned by Chang,
  per the sprint's own design — this fix is reasoned from ARIA semantics and
  the existing (working) native-fieldset-naming pattern elsewhere in this
  file, not confirmed by ear.

**Round 3 — gate-3 finding, wrong error attached to unrelated groups.**

Chang's NVDA pass over all four questions (gate 3, run against a local
build, `011647a`) found a new defect neither QA1's static audit nor
GroundTruth's DOM checks could have caught, because it only shows up when
exactly one of the four duty questions is unanswered: tabbing into "When
was medical information..." and "Were other options considered..." (both
answered correctly) announced "Missing: written record." — the validation
message for a different, unrelated question. "Has this employee asked..."
was reported clean in that pass; live DOM inspection here found the same
underlying wiring defect present on that group too (see below) — the fix
corrects it uniformly regardless.

**Root cause.** In `StepNarrative`, all four `RadioQuestion` call sites
passed `describedById={dutyToAccommodateError ? dutyToAccommodateErrorId :
undefined}` — gated only on whether *any* duty question is currently
invalid, not on whether *that* question is. `aria-invalid` was already
correctly scoped per question (`requestStatusInvalid`,
`documentationTimingInvalid`, `alternativesExploredInvalid`,
`writtenRecordInvalid` — each `dutyToAccommodateError !== null && x ===
null`). So whenever any one duty question was missing, every group's
`aria-describedby` pointed at the same shared error paragraph, including
groups that were themselves answered correctly — reading as if that group
were the one with the problem.

**Fix.** Changed each `describedById` prop from the global
`dutyToAccommodateError` check to that question's own already-computed
`xInvalid` flag — e.g. `describedById={requestStatusInvalid ?
dutyToAccommodateErrorId : undefined}`, and likewise for the other three.
No new state, no new predicate: reuses the four booleans that already
existed for `aria-invalid`, now driving `aria-describedby` too. Markup/
wiring only — `dutyToAccommodateError`, the four `xInvalid` computations
themselves, and `visibleProceduralQuestions()` are all untouched, so this
stays within the sprint's requirement 4 boundary (conveying existing
state, not changing it).

**Verified live** (local dev build, same method as prior rounds):
reproduced the exact reported scenario (`writtenRecord` blank, the other
three answered, "Yes — turned down" for Q1 so `documentationTiming` is
visible) before and after the fix.
- Before: all four groups' `aria-describedby` resolved to "Missing:
  written record.", including the three correctly-answered ones.
- After: `requestStatus`, `documentationTiming`, `alternativesExplored`
  (all answered) carry no error reference at all (`alternativesExplored`
  still carries its unrelated helper-text id, unaffected); only
  `writtenRecord` (the one actually blank) carries `aria-describedby`
  resolving to "Missing: written record."
- Re-checked the multi-missing-field case (three blank, one answered) to
  confirm the fix didn't regress it: the three invalid groups still share
  one summary message naming all three ("Missing: documentation timing,
  alternatives considered, written record."), and the one correctly
  answered group (`requestStatus`) now carries no error reference —
  previously it incorrectly did.
- `tsc --noEmit`, `eslint`, `next build`, `vitest run` (63/63, unchanged):
  all clean.

**Process note, corrected.** An earlier draft of this note (written before
re-checking `sprint-9.json`) argued the scripted `/sprint-qa1` path was
still available because the sprint hadn't shipped. That was wrong: by the
time this fix was written, Pipeman had already shipped `011647a`
(`cdcd134`), GroundTruth's live test had already recorded a PASS, and the
sprint was at phase `complete_ready` — both gates green, awaiting the
user's explicit authorization to `/sprint-complete`. `cmd_qa1` accepts only
`dev_build`/`qa1_audit`/`dev_agreed_done`; `complete_ready` isn't one of
them, so a scripted re-audit genuinely isn't available from here, and
CLAUDE.md's standing rule — an ARIA-touching fix gets an independent QA1
review recorded in Dev Notes, not the fast reship path — is the correct
route after all, for the reason the rule actually states (the script
refuses), not the reason the first draft of this note gave.

Worth recording precisely because GroundTruth's own PASS report predicted
this: its "OBSERVATIONS FOR GATE 3" section flagged that the shared error
element was referenced by every visible group, not just the failed one,
and named the exact risk — "if the error text is announced on every group,
then the only thing distinguishing the failed group by ear is the invalid
state itself, not the error text" — as unblocking at gate 2 but worth
listening for at gate 3. Chang's NVDA pass is what confirmed it. Gates 1
and 2 did their job; gate 3 caught what only gate 3 could.

This fix needs, in order: an independent QA1 review of this diff (recorded
here, per the standing rule), Pipeman reshipping, GroundTruth re-verifying
(new commit, new DOM), and Chang re-confirming via NVDA that no group's
`aria-describedby` now leaks into an unrelated group — before the sprint
returns to `complete_ready`.

---

**Independent QA1 review — 2026-09-08, commit `93d1090` (diff against
`011647a`). Out-of-band, per CLAUDE.md's standing rule on ARIA-touching
fixes. Not a scripted verdict: the sprint is at `complete_ready`, and
`cmd_qa1` accepts only `dev_build`/`qa1_audit`/`dev_agreed_done`, so no
lifecycle state changed as a result of this review and none should.**

**Result: no objection. This diff is correct and may reship.**

Reviewed independently against the diff, not against Dev Notes' account of
it. Where Dev Team's claims are repeated below, they were re-derived from
the source before being recorded as confirmed.

*Scope limit, unchanged from rounds 1 and 2: this is attribute correctness
only. Whether the corrected wiring is audible — that a failed group now
announces its error and a correctly-answered one announces nothing — is
gate 3, Chang's, and remains open. Nothing here is evidence about how any
of it sounds.*

**1. Per-question gating — confirmed.** All four `describedById` props in
`StepNarrative` now read `describedById={xInvalid ? dutyToAccommodateErrorId
: undefined}` against that question's own flag: `requestStatusInvalid` (775),
`documentationTimingInvalid` (786), `alternativesExploredInvalid` (798),
`writtenRecordInvalid` (808). The code delta is exactly those four lines,
+4/-4, nothing else. Each group's `aria-describedby` and `aria-invalid` are
now driven by the same predicate, which is the property that was missing:
before this, a group could be `aria-invalid="false"` while pointing at an
error message, which is the defect Chang heard.

**2. Nothing under requirement 4 moved — confirmed by path filter, not by
reading.** `git diff --stat 011647a 93d1090` restricted to non-`docs/` paths
returns `components/IntakeFlow.tsx` alone; restricted to `lib/`, `app/` and
`package.json` it returns empty. Grepping the diff's own changed lines for
the `xInvalid` computations, `setDutyToAccommodateError`, the `useState`
declaration and `visibleProceduralQuestions` returns nothing — none of those
lines appear in the diff in either direction. `dutyToAccommodateError` is
still set only at 253 (the `Missing: …` message) and 256/168/173/178/183
(null). The four `xInvalid` computations at 725-730 are byte-identical to
`011647a`. Requirement 4 holds: this conveys existing state, it does not
change it.

**3. Rounds 1 and 2 not regressed — confirmed.** `RadioQuestion`'s body is
untouched by this diff; the change is entirely at the call sites. Full-file
sweep: `role="radiogroup"` appears exactly once, `aria-labelledby` exactly
once, `aria-label` zero times. The fieldset at 637-645 still carries role,
`aria-labelledby={legendId}`, `aria-invalid` and `aria-describedby` together
with `<legend id={legendId}>`. One accessible object per group, still named
explicitly. This is the check Sprint 8 round 3 failed — an ARIA fix that
introduced a new ARIA regression — and it is why the standing rule exists.
It passes here.

**4. The multi-missing-field case — checked in the code path myself, not
taken from Dev Notes' live check.** Traced with three blank and
`requestStatus` answered "denied" (so `documentationTiming` is visible):
`dutyToAccommodateError` is the single string "Missing: documentation
timing, alternatives considered, written record."; `requestStatusInvalid`
evaluates false because `requestStatus !== null`, so that group emits no
`describedById` at all; the other three evaluate true and each reference the
one shared error paragraph, which renders once at 812-819. That matches Dev
Team's reported result, derived independently.

The invariant that makes this safe is worth recording, because the fix moved
the reference onto a *different* predicate than the one that renders the
target: `xInvalid` is `dutyToAccommodateError !== null && x === null`, so
`xInvalid` true implies `dutyToAccommodateError` is non-null, which is what
renders `<p id={dutyToAccommodateErrorId}>`. The reference therefore cannot
outlive its target. The one theoretical gap — `xInvalid` tests `!== null`
while the render guard tests truthiness, so an empty-string error would
produce a dangling `aria-describedby` where the old truthiness-gated code was
safe — is unreachable: `setDutyToAccommodateError` is only ever passed `null`
or a template literal beginning "Missing: " under
`missingDutyToAccommodate.length > 0`. Recording it because it is a real
asymmetry that a future change to that setter would activate silently.

**5. Suite green.** `vitest run` 14 files / 63 passing, unchanged. No test
file in the diff. `eslint components/IntakeFlow.tsx` exits 0 silent, with
`jsx-a11y/role-supports-aria-props` active. Correctly no new test: this
reuses four existing booleans and introduces no new decision, so there is no
pure function to cover — the same requirement-6 reasoning as rounds 1 and 2,
and adding a test that asserts markup would violate the project's testing
standard.

**One thing for gate 3 to listen for, not a defect and not blocking.** The
error message remains a shared summary. With three groups failing, all three
now reference the same paragraph naming all three, so the text announced on
entry to "alternatives considered" also names documentation timing and
written record. Requirement 1 is satisfied — the group's own failure is named
in what the user hears, and `aria-invalid` distinguishes it — but the
description alone no longer uniquely identifies which group is which when
several fail together. This is GroundTruth's original gate-2 observation
narrowed from "every visible group" to "every failed group," which is a much
smaller residual and is arguably correct behaviour for a summary. Worth
listening for at gate 3 rather than fixing blind; a per-field message would
be a new requirement, not an in-flight substitution.

**Process, for the record.** Dev Notes' corrected process note is accurate:
the scripted path is genuinely unavailable from `complete_ready`, and this
review is the control CLAUDE.md specifies in its place. Two consequences
follow that are not this review's to decide:

- The sprint's recorded `qa1_audited_tree_hash` is `011647a`'s tree, and
  `last_shipped_commit` is `011647a`. `93d1090` is neither audited by the
  script nor shipped. This review is the independent check the standing rule
  requires before Pipeman reships; it is not a substitute for the reship, and
  it does not make `93d1090` the audited commit in the state file.
- Gates 2 and 3 both need re-running against the new commit, as Dev Notes
  already says. GroundTruth can observe the DOM-level half of this fix
  directly — that a correctly-answered group carries no `aria-describedby`
  while a failed one resolves to the error text — which makes this an unusual
  case where gate 2 *can* measure most of what changed. The part it cannot
  measure is the part that produced the bug in the first place, so Chang's
  re-pass is still required, and closing on gates 1 and 2 alone would repeat
  the exact mistake this sprint exists to correct.

Nothing further from me on this diff. It is a four-line fix that reuses state
that already existed, does not touch a single thing it was told not to touch,
and leaves rounds 1 and 2 intact. The kids found the right fix for what Chang
heard and did not go looking for adjacent things to improve while they were
in there.
