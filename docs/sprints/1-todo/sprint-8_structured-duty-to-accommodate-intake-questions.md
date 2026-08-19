---
id: 8
title: "Structured duty-to-accommodate intake questions"
epic: "Intake"
status: todo
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
10. Vitest coverage: each checklist item returning each of its three states; the conditional question not appearing when no denial is indicated; a "not sure" answer producing `insufficient-information` and never `not-done`; and the Sprint 5 after-denial fixture now returning `not-done`.

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

22. Vitest additions: documentation-requested returning `not-applicable` when Q1 is not shown; Q0 = *not sure* yielding `insufficient-information` and never `not-applicable`; alternatives-explored and analysis-documented **never** returning `not-applicable` for any input; the internal-action trigger absent when the documentation item is `not-applicable`; and Q2 and Q3 rendering for every Q0 answer, including *no request has been made*.

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
- GroundTruth completes intake answering the new questions as a **compliant** employer — documentation requested before denial, alternatives explored, analysis written down — and confirms the checklist reports `done` on those items rather than "insufficient information".
- GroundTruth completes intake as a **non-compliant** employer — denied first, documentation after — and confirms the checklist reports the gap, and that an escalation trigger appears.
- GroundTruth answers "not sure" throughout and confirms the checklist reports missing information and **never** asserts the employer failed a step.
- GroundTruth confirms the new questions are keyboard-navigable, labelled, and announce validation errors to assistive technology.
- GroundTruth confirms the Sprint 3 flow still works end to end and the disclaimer banner is present throughout.

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
- The intake becomes long enough that employers abandon it — requirement 4's conditional display keeps irrelevant questions off screen; GroundTruth walks the full flow in all three postures.
- Question wording leads the employer toward the answer that makes them look compliant — flagged as an open external dependency needing Chang; no gate can catch it.
- Sprint 5's limitation test is quietly edited rather than deliberately removed, losing the record that this was a known gap — requirement 6 and a matching acceptance criterion make its removal explicit.
