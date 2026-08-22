---
id: 8
title: "Structured duty-to-accommodate intake questions"
epic: "Intake"
status: in_progress
created: 2026-08-18T00:00:00+00:00
---

# Master Controller Sprint Definition — Sprint 8

**Epic:** Intake
**Sprint Objective:** Add the structured intake questions the duty-to-accommodate checklist needs to distinguish a compliant employer from a non-compliant one, and wire Sprint 5's checklist rules to them.

### Context

Sprint 5's procedural checklist cannot currently answer any of its three
items. Two were hardcoded to `insufficient-information` because nothing in
intake could establish them, and the third was worse — it marked itself
`done` on any non-empty documentation answer, so an employer describing
documentation received *after* a denial was told the step was satisfied.
Sprint 5 Amendment 1 made that item honest; this sprint makes the checklist
actually work.

The root cause was a mismatch in the original breakdown, not a coding
error. Sprint 3's intake asks three narrative prompts, which establish
*what* happened but not *when* relative to a decision. The checklist needs
sequence and yes/no facts. Free text cannot supply those deterministically,
and the rules path is correctly barred from calling a model to infer them.
Structured questions are the only route.

This matters more than its size suggests. The PRD's rationale for the whole
product is that BC HRT disputes usually turn on procedural compliance
rather than on whether a ground applies, and it says this checklist is
worth getting right ahead of more surface features. A checklist that can
only say "I don't know" does not deliver that.

### Requirements

1. Intake gains structured, closed-answer questions sufficient to establish each of Sprint 5's three checklist items. At minimum:
   - Whether an accommodation request has been denied, refused, or is still open.
   - If a request was denied: whether medical or functional-abilities documentation was requested **before** that denial.
   - Whether alternative working arrangements were explored.
   - Whether the accommodation analysis was recorded in writing.
2. **Every question offers an explicit "not sure" / "does not apply" answer**, following the Sprint 3 "nothing yet" pattern. These map to `insufficient-information`, never to `not-done`. The tool must never convert a gap in the employer's knowledge into an assertion about their conduct.
3. Answers are modelled as closed unions in `lib/types.ts`, not booleans and not free text. A boolean cannot carry the third state, and this is the specific failure this sprint exists to correct.
4. The questions are conditional where the law is conditional: the "before denial" question only appears when a denial or refusal has been indicated. Asking an employer who has denied nothing whether they requested documentation before denying is incoherent and will produce noise.
5. Sprint 5's checklist rules are rewired to these fields, and the requirement 14 guard from Sprint 5 Amendment 1 is removed along with its comment. Each of the three items must now be capable of returning all three states.
6. Sprint 5's requirement 16 test — asserting no item can return `done` — is **deleted and replaced** by tests proving each item can now return `done`, `not-done`, and `insufficient-information`. That test existed to pin a known limitation; removing it is the point of this sprint, and it should go out deliberately rather than be quietly edited.
7. The requirement 15 after-denial fixture from Sprint 5 still passes, now returning `not-done` rather than `insufficient-information`: an employer who denied first and received documentation afterwards has a real procedural gap, and the tool should say so.
8. Existing Sprint 3 intake behaviour is preserved: per-prompt validation, the "nothing yet" affordance, back-navigation without data loss, keyboard navigability, labelled inputs, and `role="alert"` / `aria-describedby` / `aria-invalid` on the new questions as well.
9. Changes to `lib/types.ts` are bounded to the new answer unions and the `Situation` / `IntakeMetadata` fields carrying them. No other domain type changes shape.
10. Vitest coverage: each checklist item returning each of its states; a "not sure" answer producing `insufficient-information` and never `not-done`; and the Sprint 5 after-denial fixture now returning `not-done`. **Question visibility is tested through the requirement 23 pure function, not by rendering a component.**

### Pre-review adjustments — 2026-08-18, against Sprint 5 as shipped

Checked against `a91e5b4`. Five items, two of which are real cross-sprint
problems created by Sprint 5's shipped code rather than by this definition.

**The intake stays three steps.** The PRD specifies a "3-step guided flow"
and Sprint 3 requirement 1 repeats it; `IntakeFlow.tsx` types the step as
`1 | 2 | 3` and renders "Step {step} of 3". The structured questions go
into **step 3**, alongside the existing narrative prompts — they ask what
the employer has already done, which is what step 3 is about. Do not add a
fourth step; that silently contradicts two upstream specifications and
would invalidate GroundTruth's existing "completes all three steps" check.

**Sprint 5 requirement 17 is superseded by this sprint.** That requirement,
and a matching comment in `lib/escalation-trigger-rules.ts`, say the
internal-action trigger firing on *every* result is intended and that no
compensating condition may be added to quiet it. That was correct while
`documentation-requested` could never be `done`. Once this sprint makes
`done` reachable, the trigger correctly goes silent for a compliant
employer — which is the desired behaviour, not a regression, and QA1 will
otherwise be reading a live instruction that says the opposite.

11. The structured questions are added to **step 3**. `Step` stays `1 | 2 | 3` and the "of 3" label is unchanged.

12. Sprint 5 requirement 17 no longer applies. The internal-action trigger is expected to fire only when `documentation-requested` is not `done`. Update the doc comment in `lib/escalation-trigger-rules.ts` that currently states it "fires on every result" and instructs against quieting it — leaving a stale instruction in the code is how the next reader gets it wrong. Do **not** otherwise change the trigger logic; the condition itself was always right.

13. Vitest, both directions of the transition: a compliant `Situation` (documentation requested before denial) produces **no** internal-action trigger; a non-compliant one still produces it. Note that a fully compliant situation with no formal complaint and no termination under consideration will now produce an **empty** trigger list. That is correct here — Sprint 6 requirement 4's standing counsel trigger provides the "at least one" guarantee at render time, and adding a compensating trigger in this sprint would duplicate it.

14. Remove every artefact of the Sprint 5 limitation, not just the per-item guard comment:
    - the `eslint-disable-next-line @typescript-eslint/no-unused-vars` above `buildProceduralChecklist` and the note explaining why `situation` is unused — the parameter is used now;
    - the function-level doc comment stating "All three items are currently `insufficient-information` for every constructible `Situation`";
    - the per-item comments on all three items, including the two saying no intake signal exists.

15. The new answer fields must **not** be added to the prose payload. Sprint 5 requirement 6's boundary is that the model receives the decided output, never the intake — that holds regardless of whether a given field happens to be non-identifying. `buildProsePayload` takes an `AnalysisResult` and must keep taking only that.

*Note: `ProceduralCheckItem` was finalized by Sprint 5 and needs no change here. Requirement 9's bound covers the new answer unions and the `Situation` fields carrying them.*

### Approved wording and fourth status — 2026-08-18, Chang

Question wording reviewed and approved as drafted. `not-applicable`
approved as a fourth `ProceduralCheckStatus`. Both land here.

*Noted and deliberately deferred:* whether Q2 should ask if alternatives
were **discussed with the employee** rather than merely considered. Chang
weighed it and chose not to block this sprint; it belongs to a later
review pass. Do not implement the stronger version now.

16. The four questions ship with **exactly this wording and these options**. Wording changes are Master Controller's, not Dev Team's — these were reviewed for leading and ambiguous phrasing, and small edits can undo that.

    **Q0 — Request status** (always shown, step 3)
    > Has this employee asked for a change to their job, schedule, duties, or working conditions?
    > - Yes — and it has been agreed to
    > - Yes — and it has been turned down
    > - Yes — and no decision has been made yet
    > - No request has been made
    > - Not sure / I don't have that information

    **Q1 — Documentation timing** (shown only when Q0 = "turned down")
    > When was medical information or a functional abilities form requested, if at all?
    > - Before the decision was made
    > - Only after the decision was made
    > - It was never requested
    > - Not sure / I don't have that information

    **Q2 — Alternatives** (always shown, step 3)
    > Were other options considered — such as different duties, adjusted hours, equipment, or a different location?
    > - Yes, other options were considered
    > - No, other options were not considered
    > - Not sure / I don't have that information
    >
    > Helper text: *This is about what has happened so far, not whether it was the right call.*

    **Q3 — Written record** (always shown, step 3)
    > Is there a written record of how this request was assessed — for example notes, an email, or a file entry?
    > - Yes, there is a written record
    > - No, nothing was written down
    > - Not sure / I don't have that information

17. `ProceduralCheckStatus` gains a fourth member, `not-applicable`, for the case where the item has no answer because the precondition never occurred — distinct from `insufficient-information`, which means the answer exists but is unknown. Mapping "no request was ever turned down" to `insufficient-information` would claim ignorance of something we actually know, the same collapse the three-state design exists to prevent.

18. Answer-to-status mapping:
    - **documentation-requested:** *before* → `done`; *only after* or *never* → `not-done`; *not sure* → `insufficient-information`; Q1 not shown because Q0 is *agreed* / *no decision yet* / *no request made* → `not-applicable`; Q0 = *not sure* → `insufficient-information`, **never** `not-applicable`, because an unknown request status cannot establish that a precondition did not occur.
    - **alternatives-explored:** *yes* → `done`; *no* → `not-done`; *not sure* → `insufficient-information`.
    - **analysis-documented:** same pattern as alternatives-explored.
    - **`not-applicable` applies only to documentation-requested in v1.** Q2 and Q3 are always asked and therefore always have an answer, so those two items can never be `not-applicable`.

19. **Q1 is the only conditional question.** Q0, Q2, and Q3 are always shown. *An earlier draft of this requirement also made Q2 and Q3 conditional on a request existing; Chang vetoed that on 2026-08-18 and it is reverted. Do not reintroduce it — the incoherence argument for hiding them was considered and rejected.*

20. **The internal-action escalation trigger must not fire on `not-applicable`.** `escalation-trigger-rules.ts` currently fires it whenever the documentation item is `!== "done"`, and `not-applicable !== "done"` is true — so an employer who has had no request to deny would be told to request a functional abilities form. Narrow the condition to `not-done` or `insufficient-information` explicitly. This is a new correctness requirement introduced by requirement 17, not a change of heart about Sprint 5 requirement 17's substance.

21. Requirement 9's bound widens to include `ProceduralCheckStatus`. `lib/types.ts` changes are bounded to the new answer unions, the `Situation` fields carrying them, and this status member. Nothing else.

22. Vitest additions: documentation-requested returning `not-applicable` when Q1 is not shown; Q0 = *not sure* yielding `insufficient-information` and never `not-applicable`; alternatives-explored and analysis-documented **never** returning `not-applicable` for any input; the internal-action trigger absent when the documentation item is `not-applicable`; and — via the requirement 23 function, not a render test — Q2 and Q3 being visible for every Q0 answer, including *no request has been made*.

23. **Question visibility is a pure function, not a render-time conditional.** Export a named function from `lib/` — e.g. `visibleProceduralQuestions(q0Answer)` — returning which of Q1/Q2/Q3 to show. The component consumes it and does nothing else with visibility. This is how every other decision in this codebase is structured (matching, the bridge, ground rules, validation), it is what QA1 can audit by reading, and it means the requirement 10 and 22 visibility cases are ordinary unit tests. **Do not add `@testing-library/react`, `jsdom`, or `happy-dom`** — see the decision recorded in CLAUDE.md.

24. **Accessible-name verification is a human step, owned by Chang.** GroundTruth verifies ARIA wiring in the DOM; a person verifies what a screen reader actually announces for each of the four new questions and their validation messages, using a real assistive technology. Record the result as a short note in Dev Notes — which AT, which questions, what was announced. This must be done before Sprint 6 renders, and it is a genuine gate on that: a form whose subject matter is disability accommodation, silently unusable by a screen-reader user, is a failure this project should be least willing to ship. See CLAUDE.md on why CDP's AX tree was not provisioned instead.

### Acceptance Criteria

- QA1 confirms every new question has an explicit "not sure" / "not applicable" option, and that it maps to `insufficient-information` in the rules.
- QA1 confirms answers are closed unions in `lib/types.ts`, not booleans — a boolean here is an automatic FAIL, since it structurally cannot carry the third state.
- QA1 confirms the Sprint 5 requirement 14 guard and its comment are gone, and that all three checklist items can now reach all three states.
- QA1 confirms the Sprint 5 requirement 16 test was deleted and replaced per requirement 6, rather than weakened or skipped.
- QA1 confirms the after-denial fixture now returns `not-done`.
- QA1 confirms the conditional-question logic in requirement 4.
- QA1 confirms `lib/types.ts` changes are bounded to requirement 9.
- QA1 confirms the intake is still three steps: `Step` is `1 | 2 | 3` and the "of 3" label is unchanged.
- QA1 confirms the stale `escalation-trigger-rules.ts` comment about firing on every result is updated, and that the trigger condition itself is otherwise unchanged.
- QA1 confirms every artefact listed in requirement 14 is gone — the eslint-disable, the function doc comment, and all three per-item comments.
- QA1 confirms `buildProsePayload` still takes only an `AnalysisResult` and that no new intake answer field reaches the prose layer.
- QA1 confirms the requirement 13 tests exist and cover both directions of the trigger transition.
- QA1 confirms all four questions match requirement 16's wording and options **exactly**, including helper text.
- QA1 confirms `not-applicable` is distinct from `insufficient-information` in both the type and the mapping, and that Q0 = "not sure" never produces `not-applicable`.
- QA1 confirms Q2 and Q3 render regardless of Q0's answer, and that only Q1 is conditional.
- QA1 confirms alternatives-explored and analysis-documented can never return `not-applicable`.
- QA1 confirms the internal-action trigger does **not** fire when the documentation item is `not-applicable`.
- QA1 confirms `lib/types.ts` changes are bounded to requirement 21.
- QA1 runs the Vitest suite and confirms requirement 10's cases exist and pass.
**GroundTruth** — this sprint ships intake UI, which is real and testable, but
**not** the checklist output, which Sprint 6 renders. The three criteria that
required a rendered checklist have moved to Sprint 6. Verify what exists:

- The four new questions render in step 3 with the requirement 16 wording and options, character for character, including Q2's helper text.
- Q1 appears only after Q0 = "it has been turned down", and disappears if Q0 is changed to any other answer.
- Q2 and Q3 render for every Q0 answer, including "No request has been made".
- Every new question offers its "Not sure / I don't have that information" option and it is selectable.
- The new questions are keyboard-navigable, and every input has a `<label for>` that resolves.
- **DOM-observable ARIA only:** `aria-invalid` and `aria-describedby` are present on each new question, `role="alert"` is on the message container, and every `aria-describedby` target ID exists in the document. **Do not attempt to verify computed accessible names** — that check has moved to a human step (see Requirements) after two rounds of returning CONDITIONAL for want of an instrument. Reporting the DOM half as passing is complete work here, not a partial result.
- The intake is still three steps, labelled "Step N of 3".
- The Sprint 3 flow still works end to end — per-prompt validation, the "nothing yet" affordance, back-navigation preserving data — and the disclaimer banner is present throughout.
- **No checklist, grounds, or trigger output is user-visible.** Rendering belongs to Sprint 6; if analysis output has appeared, that is a scope violation and a FAIL.

### Out of Scope

- Expanding the checklist beyond Sprint 5's three items. More duty-to-accommodate line items is a later sprint; this one makes the existing three functional.
- Any change to ground identification, case matching, or the prose layer.
- Rendering. Sprint 6 still owns the results view; this sprint feeds it.
- Inferring sequence from narrative text by any means, including a model call. That is the approach this sprint exists to replace, and it remains forbidden in the rules path.

### Dependencies

- Blocks: **Sprint 6.** Sprint 6 is the first point at which a human sees the checklist, and it should not render a wholly inert one. Run this before Sprint 6.
- Blocked by: Sprint 5.
- External, **open**: Chang's review of the question wording. These questions ask an employer to characterise their own legal compliance, and a leading or ambiguous question produces a confidently wrong checklist from a technically correct rules engine. QA1 can verify the answer unions and the mapping; it cannot verify that "was documentation requested before the denial" is the right question to ask. Same standing limit as Sprint 5's ground rules.

### Team Assignments

- **Dev Team 1, running alone. No worktree** — Sprint 6 is blocked by this, so nothing is concurrent.

### Risks & Mitigations

- Questions are modelled as booleans because it is simpler, silently recreating the two-state collapse this sprint exists to fix — requirement 3 forbids it and QA1 fails the sprint on any boolean answer field.
- A "not sure" answer is mapped to `not-done`, converting the employer's uncertainty into an assertion about their conduct — requirement 2, tested in requirement 10, and checked live by GroundTruth answering "not sure" throughout.
- The intake becomes long enough that employers abandon it — only Q1 is conditional (requirement 19), so length is real; GroundTruth walks the full flow and Chang sees it rendered in Sprint 6.
- Question wording leads the employer toward the answer that makes them look compliant — flagged as an open external dependency needing Chang; no gate can catch it.
- Sprint 5's limitation test is quietly edited rather than deliberately removed, losing the record that this was a known gap — requirement 6 and a matching acceptance criterion make its removal explicit.

### Dev Notes

Free-form log for records that don't fit the Requirements/Acceptance
Criteria structure above: QA1 out-of-band reviews, the requirement 24
human assistive-technology pass, and anything else worth a paper trail
for the next person auditing this sprint.

- **2026-08-21, QA1 out-of-band review of commit 26787fa (round-3 ARIA
  regression fix).** Verdict: closed, cleared to reship, contingent on
  two small additions folded into the reship commit itself: (1)
  `aria-describedby` moved from the outer `<fieldset>` onto the inner
  `<div role="radiogroup">` alongside `aria-invalid` and
  `aria-labelledby`, so name/description/validity live on one node
  instead of split across two; (2) the helper `<p>` (Q2's "This is about
  what has happened so far...") given an id and added to that same
  `aria-describedby`, closing a gap open since round 1 where
  requirement-16-reviewed helper wording was never announced to screen
  readers. Both landed in the round-5 commit. No further QA1 round
  required after these.
- **Requirement 24 (human assistive-technology pass) — outstanding.**
  Not yet recorded. Needs a real screen-reader pass (NVDA/VoiceOver) by
  Chang over the four duty-to-accommodate questions and their
  validation messages, since GroundTruth has no accname-measurement
  instrument in this environment (see CLAUDE.md). Must land before
  Sprint 6 renders the checklist — Sprint 6's Dependencies section
  blocks on it too.
