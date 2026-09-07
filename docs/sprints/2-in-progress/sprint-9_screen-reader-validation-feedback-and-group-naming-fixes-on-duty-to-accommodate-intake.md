---
id: 9
title: "Screen-reader validation feedback and group-naming fixes on duty-to-accommodate intake"
epic: "Output and Guardrails"
status: in_progress
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

New structure (this sprint): a single `<fieldset role="radiogroup"
aria-invalid={invalid} aria-describedby={describedBy}>` with a plain
`<legend>` child and no `aria-labelledby` — one accessible object, named by
the browser's native fieldset/legend accname computation, carrying validity
and description on that same object. The inner `<div>` around the radio
options is now a plain, role-less layout wrapper (className only).

- **Round 3** (`325fef2`, dropped `role="radiogroup"` from the fieldset
  entirely) was working around a "no accessible name" finding from
  GroundTruth's browser-extension accessibility-tree reader. QA1's own
  round-2 audit (recorded on Sprint 8) later ran a calibration control
  through that same instrument and found it under-reports
  `aria-labelledby`-derived names too — the instrument that produced round
  3's finding is not reliable evidence either way. This round restores
  `role="radiogroup"` directly on the fieldset. It does not repeat round 3's
  regression (losing `aria-invalid` support): `role="radiogroup"` supports
  `aria-invalid` per ARIA (confirmed by round 4's own investigation, and by
  `eslint-plugin-jsx-a11y`'s `role-supports-aria-props` rule passing clean on
  this diff with no warning). Round 3 was also never tested against a real
  screen reader — Sprint 9's NVDA pass is the first authoritative signal
  either way, and it confirms names *are* announced by the shipped
  (round-5) pattern, just twice; nothing in that finding suggests the name
  would fail to announce once the duplicate is removed, since the same
  native fieldset+legend naming path is used elsewhere in this file (Step
  1's employment-status and formal-complaints fieldsets) and was not flagged
  as silent by this pass.
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

**Self-verification performed**, in a local dev build (`npm run dev`), not
the deployed site:
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
- **Not verified, and cannot be from this environment**: whether NVDA
  actually announces the name once (not twice) and speaks the invalid state
  and error text on entry to a failed group. That is gate 3, owned by Chang,
  per the sprint's own design — this fix is reasoned from ARIA semantics and
  the existing (working) native-fieldset-naming pattern elsewhere in this
  file, not confirmed by ear.
