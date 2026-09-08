---
id: 10
title: "Per-group error scoping and screen-reader validation feedback on duty-to-accommodate intake"
epic: "Output and Guardrails"
status: in_progress
created: 2026-09-07T00:00:00+00:00
---

# Master Controller Sprint Definition — Sprint 10

**Epic:** Output and Guardrails
**Sprint Objective:** Land the duty-to-accommodate intake's screen-reader
validation feedback so that a failed group is audibly distinguishable from a
correctly-answered one — in both directions — and each question is announced
once, without reintroducing any defect a prior round already fixed.

### Context

**This sprint is the successor to aborted Sprint 9.** Sprint 9 reached
`complete_ready` on QA1 PASS ×2 and a GroundTruth PASS at `011647a`, and then
its own gate 3 — Chang's NVDA pass — found that the shared `aria-describedby`
leaked error text onto correctly-answered groups. A correct group therefore
sounded like a failed one, which is Sprint 9's gate-3 criterion unmet at the
shipped commit. Dev Team fixed it in `93d1090` (markup-only) and QA1 gave the
independent out-of-band review the standing ARIA rule requires, but there is
no scripted path back into the fix loop from `complete_ready`, so the sprint
was aborted rather than closed falsely or forced through by hand-editing
state. The full reasoning is in Sprint 9's abort reason, permanently recorded
in its history.

**`93d1090` already exists and QA1 has already looked at it.** That review was
against *Sprint 9's* requirements. This sprint file is not that file — it adds
requirement 3 below — so gate 1 here is a **real, fresh audit against this
document**, not a re-confirmation. The sprint-file hash check enforces the
mechanics; the risk it cannot enforce is a human one, and it is named in Risks.

**What is deliberately not in this sprint:** the reason Sprint 9 became
unclosable. Gate 3 exists in CLAUDE.md and in sprint files and has never been
represented in `sprint_lifecycle.py`'s state machine, so the script believed
Sprint 9 was finished and `cmd_complete` would have closed it. That is a real
tooling gap, it is an omission rather than a deliberate design decision being
revised, and it gets its own sprint with its own independent review under
CLAUDE.md's `## Changes to this repo's own tooling`. It is not fixed here, and
it is not designed under this sprint's clock.

### The pass this sprint answers to

Chang, NVDA + Speech Viewer, Windows, keyboard only, live site. Carried
forward from Sprint 9 unchanged except where noted:

1. **Group naming — announced twice.** Each question's text is announced as
   the accessible name, then again: once for the outer native
   `<fieldset><legend>`, once for the inner ARIA radiogroup pointing at the
   same legend via `aria-labelledby`. Reproducible on all three visible groups.
2. **Option navigation — clean, no action needed.** One complete atomic
   announcement per arrow-key press: label, "radio button", checked state,
   position. A split "not checked"/"checked" appears on *mouse* interaction
   only and is out of scope below.
3. **Validation feedback fails at the field level.** Submitting with a group
   unanswered speaks a summary and blocks submission, but navigating back into
   that group is indistinguishable by ear from a correctly-answered one.
4. **NEW — error text leaks onto correct groups.** The fix for finding 3
   shared one `aria-describedby` across groups, so correctly-answered groups
   also announce the error text. This is finding 3's failure mode inverted:
   the two states are still indistinguishable, now because *everything*
   sounds failed rather than nothing does.

**Coverage gap, unchanged from Sprint 9 and still open:**
`visibleProceduralQuestions()` (`lib/intake-validation.ts:104`) gates
`documentationTiming` on `requestStatus === "denied"`, so only three groups
are visible by default. The untested fourth is the before/after-denial
sequencing question — the most legally substantive of the four, and the reason
Sprint 5 Amendment 1 exists. Requirement 6 closes it.

### Requirements

1. **A screen-reader user navigating into a group that failed validation
   perceives that it failed, and can hear why, without leaving the group.**
   Mechanism is Dev Team's to choose and defend; the outcome is the
   requirement. Announcement on entry to the group is sufficient — the error
   need not repeat on every option within it.
2. **Each question is announced once, not twice, on arrival at its group.**
   The accessible name remains the full question text.
3. **Error text is scoped per group and reaches no group that did not fail.**
   A correctly-answered group announces no error text. Requirements 1 and 3
   are a matched pair: satisfying either alone leaves failed and correct
   groups indistinguishable, which is the defect in both directions.
4. **Neither fix reintroduces a defect a previous round already fixed.** This
   component has a documented history of exactly that: Sprint 8 round 3
   dropped `role="radiogroup"` to restore legend naming, removing the role
   `aria-invalid` needs, which round 4 had to restore; Sprint 9's own fix for
   finding 3 produced finding 4. Dev Team states in Dev Notes which prior
   round each change interacts with and why it does not undo it.
5. **No change to intake logic, validation rules, question wording, or
   visibility rules.** Not `visibleProceduralQuestions()`, not the validation
   predicates, not `lib/types.ts`. This sprint changes how existing state is
   *conveyed*, never what the state is. A diff touching a validation rule is a
   FAIL, to be raised and scoped separately.
6. **The human AT pass covers all four questions, including
   `documentationTiming`.** Reaching it requires answering the first question
   "Yes — and it has been turned down". A pass covering three groups does not
   satisfy this sprint.
7. Vitest coverage for any new pure function extracted in service of
   requirement 1 or 3. If the fix is purely markup and adds no decision, this
   is satisfied by stating that in Dev Notes — **not** by adding a test that
   asserts markup, which this project's testing standard forbids.

### Acceptance Criteria

**Gate 1 — QA1 (static, pre-push):**

- QA1 confirms the diff touches no validation rule, no visibility rule, no
  question wording, and no domain type. Per requirement 5, any of those is a
  FAIL.
- QA1 confirms **each group's `aria-describedby` resolves only to elements
  belonging to that group**, and that no error-text element is referenced by
  more than one group. This is requirement 3 and it is the specific defect
  that ended Sprint 9.
- QA1 confirms Dev Notes contains the requirement 4 statement: for each ARIA
  change, which prior round it interacts with and why it does not undo that
  round's fix. A diff without this is not auditable and is a FAIL.
- QA1 confirms every `aria-describedby` target ID exists in the document and
  that `aria-invalid` sits on a role that supports it.
- QA1 confirms no element is named twice — exactly one of the nested
  `fieldset`/radiogroup structures carries an accessible name per group.
- QA1 runs the Vitest suite and confirms it is green, and that no
  render-assertion test was added.
- **QA1 explicitly does not verify that any of this is announced.** Attribute
  correctness is what a static audit establishes; audibility is not. Claiming
  otherwise is what produced five rounds of Sprint 8 and one abort. State the
  limit in the audit rather than glossing it.

**Gate 2 — GroundTruth (live, DOM-observable only):**

- GroundTruth confirms submitting with a group unanswered still blocks
  submission and still renders the error summary.
- GroundTruth confirms the failed group carries `aria-invalid="true"` and an
  `aria-describedby` resolving to an existing element containing the error
  text.
- GroundTruth confirms **a correctly-answered group's `aria-describedby` does
  not resolve to any error-text element** — requirement 3's DOM-observable
  half.
- GroundTruth confirms answering "Yes — and it has been turned down" reveals
  the `documentationTiming` question with the same wiring.
- GroundTruth confirms no regression in the Sprint 3 intake flow.
- **GroundTruth does not attempt to verify announcements or computed
  accessible names.** No instrument exists in this environment. Reporting the
  DOM half as passing is complete work here, not a partial result.

**Gate 3 — human AT pass (Chang, NVDA, recorded in Dev Notes):**

- All four questions, including `documentationTiming`, reached and tested.
- A group that failed validation is **audibly distinguishable** from a
  correctly-answered one, and the reason is available without leaving the
  group.
- **A correctly-answered group announces no error text** — finding 4, checked
  directly rather than inferred from requirement 1 passing.
- Each question is announced once on arrival.
- No regression to finding 2: arrow-key navigation still produces one complete
  atomic announcement per option.

### Out of Scope

- **The state-machine gap that made Sprint 9 unclosable.** Its own tooling
  sprint, per CLAUDE.md. Fixing it here would mean designing a lifecycle
  change under the clock of the sprint that needs it — the specific thing
  CLAUDE.md warns against.
- **The mouse-click split announcement** ("not checked" then "checked"). A
  mouse-only artifact of browser event sequencing, not a screen-reader
  navigation defect. Fixing it means changing event handling — logic — for
  something no keyboard user encounters.
- **Any other surface.** Sprint 6's output view does not exist yet and gets
  its own AT pass when it does. This sprint is the Sprint 8 intake questions
  only.
- **A general accessibility audit of the app.** Real and worth doing; not
  this. Folding it in is the "while we're in there" this project has
  repeatedly refused.
- **Automating the AT check.** CDP's AX tree is Chromium's computation, not
  what NVDA announces. CLAUDE.md settled this; a human pass remains the gate.

### Dependencies

- **Blocks: Sprint 6.** Sprint 6 blocks on a passing human AT pass over the
  intake. Sprint 9's pass ran and failed; this sprint is where it passes.
- Blocked by: nothing. `93d1090` exists, the defect is characterized, and
  Chang's NVDA setup works.
- External: Chang's availability for gate 3. This sprint cannot close without
  it, by design — that is the whole lesson of Sprint 8 and Sprint 9.

### Team Assignments

- **Dev Team 1.** Single surface, single component, sequential with Sprint 6.
  No worktree needed; nothing else is in flight.

### Risks & Mitigations

- **QA1 rubber-stamps gate 1 because it already reviewed `93d1090`
  out-of-band.** That review was against Sprint 9's requirements; this file
  adds requirement 3. The hash check forces a fresh stamp but cannot force a
  fresh *read*. QA1 audits this document, not its memory of the last one.
- **The fix reintroduces a prior round's defect** — four-for-four
  historically, counting Sprint 9's own. Requirement 4 makes the interaction
  analysis a written deliverable and an explicit QA1 check, so it fails the
  audit rather than the retro.
- **Requirements 1 and 3 are treated as separable** and one ships without the
  other, leaving failed and correct groups indistinguishable in whichever
  direction was missed. They are stated as a matched pair and gate 3 checks
  both directions explicitly.
- **This is treated as the trivial fix fast lane** because the diff may be one
  file of markup. Not eligible: the fast lane's justification is that
  presentational changes have never produced a real gate catch, whereas ARIA
  changes in this component have produced one every time — including the one
  that ended Sprint 9.
- **Gate 3 gets skipped because gates 1 and 2 are green.** There is no
  backstop after it; this sprint *is* the backstop. Closing without a recorded
  gate-3 result means the sprint verified nothing it was created to verify.
  Note that the script will not stop this — gate 3 is not in the state
  machine, which is exactly the gap deferred to the tooling sprint.
- **The abort is read later as Sprint 9 having failed.** It did not: it passed
  both mechanized gates and its third gate did its job. The abort was a
  tooling limitation, recorded in full in Sprint 9's history.

### Dev Notes

**Current state of the code.** `93d1090` (built and QA1-reviewed under
Sprint 9, out-of-band) is unchanged on `main` since Sprint 9's abort — the
abort only moved sprint bookkeeping (`docs/sprints/`), it touched no
application code. `git diff 93d1090 HEAD -- components/IntakeFlow.tsx` is
empty. This sprint's job is a fresh audit of that same diff against *this*
document's requirements (notably requirement 3, new here), not a rebuild.

**Requirement 4 — interaction with each prior round, restated against this
document.** `RadioQuestion`'s `<fieldset>` is a single element:
`role="radiogroup"`, `aria-labelledby={legendId}` pointing at its own
`<legend id={legendId}>`, `aria-invalid={invalid}`, and
`aria-describedby={describedBy}`, where `describedBy` joins the question's
own helper-text id (if any) with its own error id (if *that* question is
invalid). The inner `<div>` around the radio options is a plain, role-less
layout wrapper.

- **Sprint 8 round 3** (`325fef2`, dropped `role="radiogroup"` entirely to
  restore legend naming) is not repeated: `role="radiogroup"` is present
  and supports `aria-invalid` per ARIA 1.2, confirmed by
  `eslint-plugin-jsx-a11y`'s `role-supports-aria-props` rule passing clean
  (`eslint components/IntakeFlow.tsx` exits 0, no warning). Round 3's
  underlying "no accessible name" finding came from GroundTruth's Sprint 8
  round-1 browser-extension accessibility-tree reader, which that same live
  test's own calibration control (probe D) showed under-reports
  `aria-labelledby`-derived names — not reliable evidence either way. This
  markup makes the name explicit via `aria-labelledby` rather than
  depending on native fieldset/legend inheritance surviving the role
  override, removing the question rather than relying on either round's
  unverified assumption.
- **Sprint 8 round 4** (`26787fa`, moved `role="radiogroup"` onto a new
  inner `<div>` to regain `aria-invalid` support without touching the
  fieldset) is honored in substance, not form: `aria-invalid` still sits
  on an element with `role="radiogroup"`, which is what round 4
  established was required. The two-element split round 4 introduced is
  gone — collapsed to one element — because that split, not the role
  choice, is what produced Sprint 9's finding 1 (double announcement).
- **Sprint 8 round 5** (`37df78b`, unified `aria-describedby` onto the same
  inner div as `aria-invalid`/`aria-labelledby`, added the helper-text id)
  is preserved and, on this document's requirement 3, tightened further:
  round 5 established "don't split name, validity and description across
  nodes" — this markup keeps all four on one element. What changes from
  round 5 is *scope*, not placement: `describedBy` now composes only the
  current question's own error id (gated on that question's own `invalid`
  flag), not a globally-shared one. The helper-text-id wiring round 5 added
  is untouched.
- **Sprint 9's naming fix** (`4e03bad` → `011647a`, collapsed the outer
  fieldset/inner div into one element, then added `aria-labelledby`) is
  fully preserved — this is that same markup, unedited by `93d1090`. Swept
  the whole file: `role="radiogroup"` and `aria-labelledby` each appear
  exactly once per group, `aria-label` appears nowhere, zero nested
  `[role="radiogroup"]`/`[aria-labelledby]`/`[aria-label]` descendants.
  Verified live (below) that this sprint's requirement 3 fix did not touch
  naming.
- **Sprint 9's finding 4** (the defect that ended Sprint 9: all four
  `RadioQuestion` call sites in `StepNarrative` gated `describedById` on
  the *global* `dutyToAccommodateError` — any duty question invalid —
  rather than on that question's own invalid flag, so an answered group
  still referenced the shared error text) is what `93d1090` fixes and what
  this sprint's requirement 3 formalizes as an acceptance criterion. Each
  call site now reads `describedById={xInvalid ? dutyToAccommodateErrorId
  : undefined}` using the same per-question boolean already driving
  `aria-invalid` (`requestStatusInvalid`, `documentationTimingInvalid`,
  `alternativesExploredInvalid`, `writtenRecordInvalid`) — no new state, no
  new predicate, just the existing per-question flag now gating both
  attributes identically instead of only one of them.

**Requirement 7 — no new pure function.** Markup-only, same as Sprint 9's
prior two rounds: `describedBy`'s composition inside `RadioQuestion` is
unchanged; only which per-question flag the parent passes into
`describedById` moved. `visibleProceduralQuestions()`, the four `xInvalid`
computations, `dutyToAccommodateError`, and `lib/types.ts` are all
untouched — confirmed via `git diff --stat 4e03bad 93d1090`, which shows
only `components/IntakeFlow.tsx`.

**Self-verification, this sprint**, local dev build (`localhost:3000`),
not the deployed site:
- `tsc --noEmit`, `eslint`, `next build`, `vitest run` (63/63): all clean.
- Live DOM check, requirement 3's exact bar — a correctly-answered group's
  `aria-describedby` must not resolve to *any* error-text element (not
  merely "not to that error's specific text"): answered `requestStatus`
  ("Yes — turned down", revealing `documentationTiming`),
  `documentationTiming`, and `alternativesExplored`; left `writtenRecord`
  blank; submitted. Checked, per group, whether any id in its
  `aria-describedby` resolves to an element with `role="alert"`:
  - `requestStatus`, `documentationTiming`: no `aria-describedby` at all.
  - `alternativesExplored`: `aria-describedby` resolves only to its own
    helper `<p>` (no `role`, not an error element).
  - `writtenRecord` (the one actually blank): `aria-invalid="true"`,
    `aria-describedby` resolves to the one `role="alert"` element, text
    "Missing: written record."
  Zero correctly-answered groups resolve to any error element. Requirement
  1's mechanical half (failed group carries `aria-invalid`/
  `aria-describedby` resolving to existing error text) reconfirmed
  unchanged.
- **Not verified, and cannot be from this environment**: gate 3 in full —
  whether NVDA announces each name once, speaks the invalid state and
  error text on entry to a failed group, and stays silent on a correct
  one. That is Chang's pass, per this sprint's own design.
