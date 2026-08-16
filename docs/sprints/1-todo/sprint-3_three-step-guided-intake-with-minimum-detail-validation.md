---
id: 3
title: "Three-step guided intake with minimum-detail validation"
epic: "Intake"
status: todo
created: 2026-08-15T19:57:27+00:00
---

# Master Controller Sprint Definition — Sprint 3

**Epic:** Intake
**Sprint Objective:** Deliver the PRD's three-step hybrid intake flow — metadata, concern selection, and guided fact narrative — producing a validated `Situation` object that later sprints analyse.

### Context

This sprint runs in parallel with Sprint 2, owned by Dev Team 2, in its own
git worktree. The two sprints touch different features, but CLAUDE.md is
explicit that "independent" sprints on a small app routinely collide on
shared files anyway, so the worktree is mandatory rather than a judgment
call. Sprint 1 having landed the full type surface is what makes the
parallelism safe: this sprint imports `Situation`, `IntakeMetadata`, and
`ConcernCategory` and does not modify `lib/types.ts`.

The minimum-detail validation is a PRD guardrail, not a form nicety. The
stated risk is that an employer types two words and receives an
authoritative-looking legal document. Validation is what prevents the
product from generating a confident answer out of nothing.

### Requirements

1. A three-step guided flow with visible progress, where the user can move back to a previous step without losing entered data.
2. **Step 1 — Context and metadata:** employment status (active / suspended / terminated), tenure, and whether formal complaints have been lodged to date.
3. **Step 2 — Primary concern:** multi-select across medical/absence, schedule flexibility, interpersonal conflict, performance management. At least one selection is required to proceed.
4. **Step 3 — Fact narrative:** guided free text with three distinct prompts, not one open box — what happened and over what timeframe; what documentation or medical information has been exchanged; what action the employer is considering.
5. Minimum-detail validation blocks progression to analysis until the narrative meets a defined threshold. The threshold is defined in one named, exported constant with a comment explaining the number, so it can be tuned without hunting through components.
6. Validation failure produces a specific, plain-language message telling the user what is missing — not a generic "invalid input", and never a message that shames the user for a short answer.
7. Completing the flow produces a `Situation` object conforming to the `lib/types.ts` definition, with no local type redefinition anywhere in the diff.
8. The flow is keyboard-navigable end to end, and every input has an associated label.
9. Vitest coverage for the validation logic: passes at threshold, fails below it, fails on whitespace-only input, and correctly requires at least one concern category.

### Acceptance Criteria

- QA1 confirms `Situation`, `IntakeMetadata`, and `ConcernCategory` are imported from `lib/types.ts`, and that the diff contains no locally declared domain type, including inline near-copies and `Pick<>`/`Omit<>` aliases standing in for a domain shape.
- QA1 confirms `lib/types.ts` is unmodified by this sprint's diff.
- QA1 confirms the minimum-detail threshold is a single named exported constant with an explanatory comment, not a magic number inline.
- QA1 runs the Vitest suite and confirms the four validation cases in requirement 9 exist and pass.
- GroundTruth completes all three steps on the deployed app with realistic input and confirms a `Situation` is produced.
- GroundTruth navigates backward from step 3 to step 1 and confirms previously entered data is still present.
- GroundTruth attempts to proceed from step 2 with no concern selected and confirms it is blocked with a specific message.
- GroundTruth submits a two-word narrative and confirms analysis does not run, and that the message names what is missing.
- GroundTruth completes the entire flow using only the keyboard.
- GroundTruth confirms the Sprint 1 disclaimer banner is still visible on every step of the flow.

### Out of Scope

- Any analysis, ground identification, matching, or output. This sprint ends at a validated `Situation` object. Sprints 4 and 5 consume it.
- Saving or resuming an in-progress intake. Session persistence is Sprint 7 and is currently blocked pending privacy decisions.
- File or document upload. The PRD asks what documentation has been *exchanged*, which is a narrative question, not an upload feature.
- Tuning the validation threshold to a research-backed number. Pick a defensible starting value, name it, comment it, move on — it is meant to be adjusted once real scenarios run through it.

### Dependencies

- Blocks: Sprint 5 (the spotter consumes `Situation`).
- Blocked by: Sprint 1 (`lib/types.ts`).
- External: none.

### Team Assignments

- **Dev Team 2**, running in parallel with Dev Team 1 on Sprint 2.
- **`/sprint-worktree 3` must be run before any file is touched**, and Dev Team 2 stays in that worktree for the whole sprint. This is not conditional on whether the sprints look independent.

### Risks & Mitigations

- Dev Team 2 works in the main checkout and collides with Sprint 2's uncommitted work — `/sprint-worktree 3` first, enforced as requirement zero in the team assignment above.
- A needed field turns out to be missing from `Situation`, tempting an edit to `lib/types.ts` mid-sprint — flag it to Master Controller instead; a genuine gap is an amendment to Sprint 1's type surface, coordinated across both in-flight sprints, not a unilateral edit from a worktree.
- Validation threshold set so high the flow is unusable in a live demo — GroundTruth tests with realistic input, and the named constant makes a correction a one-line change rather than a refactor.
