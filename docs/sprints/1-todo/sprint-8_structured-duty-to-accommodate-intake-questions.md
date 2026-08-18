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

### Acceptance Criteria

- QA1 confirms every new question has an explicit "not sure" / "not applicable" option, and that it maps to `insufficient-information` in the rules.
- QA1 confirms answers are closed unions in `lib/types.ts`, not booleans — a boolean here is an automatic FAIL, since it structurally cannot carry the third state.
- QA1 confirms the Sprint 5 requirement 14 guard and its comment are gone, and that all three checklist items can now reach all three states.
- QA1 confirms the Sprint 5 requirement 16 test was deleted and replaced per requirement 6, rather than weakened or skipped.
- QA1 confirms the after-denial fixture now returns `not-done`.
- QA1 confirms the conditional-question logic in requirement 4.
- QA1 confirms `lib/types.ts` changes are bounded to requirement 9.
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
