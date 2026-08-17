---
id: 3
title: "Three-step guided intake with minimum-detail validation"
epic: "Intake"
status: in_progress
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
3. **Step 2 — Primary concern:** multi-select across the PRD's four intake concerns — medical/absence, schedule flexibility, interpersonal conflict, performance management. At least one selection is required to proceed. These are *operational* categories phrased as an employer would describe the situation, **not** legal characterizations. See requirement 10.
4. **Step 3 — Fact narrative:** guided free text with three distinct prompts, not one open box — what happened and over what timeframe; what documentation or medical information has been exchanged; what action the employer is considering.
5. Minimum-detail validation blocks progression to analysis until the narrative meets a defined threshold. The threshold is defined in one named, exported constant with a comment explaining the number, so it can be tuned without hunting through components.
6. Validation failure produces a specific, plain-language message telling the user what is missing — not a generic "invalid input", and never a message that shames the user for a short answer.
7. Completing the flow produces a `Situation` object conforming to the `lib/types.ts` definition, with no local type redefinition anywhere in the diff.
8. The flow is keyboard-navigable end to end, and every input has an associated label.
9. Vitest coverage for the validation logic: passes at threshold, fails below it, fails on whitespace-only input, and correctly requires at least one concern category.

### Amendment 1 — 2026-08-16, pre-start, Master Controller

Two defects in this sprint definition, both found by reading it against the
code Sprints 1 and 2 actually shipped rather than against what the planning
session assumed. Both would have blocked Dev Team on day one.

**Defect 1 — the intake and library vocabularies were unified, and must not
be.** Sprint 1 shipped `ConcernCategory` doing double duty: intake's concern
selection *and* `CaseExcerpt.factPatternTags`, with legal values
(`disability-accommodation`, `family-status`,
`harassment-poisoned-work-environment`, `age-termination`). Requirement 3
specifies the PRD's intake list, which is a different vocabulary. The PRD
keeps them separate deliberately, and the separation is the product: intake
captures what the employer *observes*, the library tags what a case is
*about*, and mapping the first onto the second is the issue-spotting this
tool exists to do. An employer who can correctly choose
"disability-accommodation" from a menu did not need the tool, and asking
them to choose it primes a legal characterization before any analysis runs.

**Defect 2 — an acceptance criterion contradicted the sprint's own job.**
"QA1 confirms `lib/types.ts` is unmodified" was written when Sprints 2 and 3
were to run in parallel and the file had to stay frozen. Sprint 2 is closed,
and `IntakeMetadata` shipped as an explicit stub whose own doc comment says
Sprint 3 owns its final field list. This sprint therefore *must* modify
`lib/types.ts`, and the criterion is replaced below rather than waived.

10. Split the two vocabularies in `lib/types.ts`:
    - `ConcernCategory` is redefined to the four **intake** concerns from requirement 3: medical/absence, schedule flexibility, interpersonal conflict, performance management.
    - A new `FactPatternTag` union carries the four **legal** fact patterns currently in `ConcernCategory`: `disability-accommodation`, `family-status`, `harassment-poisoned-work-environment`, `age-termination`.
    - `CaseExcerpt.factPatternTags` retypes to `FactPatternTag[]`, and `lib/seed-library-schema.ts`'s `Record<ConcernCategory, true>` exhaustiveness check retypes to `Record<FactPatternTag, true>`.
    - **`data/seed-library.json` values do not change.** Sprint 2 already tagged placeholders with the legal fact patterns, so this is a type split, not a data migration. Track H's in-flight case tagging is unaffected and needs no rework.
    - Update the two affected test files (`lib/seed-library.test.ts`, `lib/citation-guard.test.ts`) to the new type names. No behavioural change to the loader or guard.
11. Finalize `IntakeMetadata` with the requirement 2 fields — employment status (active / suspended / terminated), tenure, and formal complaints lodged to date — replacing the Sprint 1 stub. Update its doc comment to drop the "stubbed" note.
12. Modifications to `lib/types.ts` are **bounded to requirements 10, 11, and 14**. No other domain type changes shape in this sprint. If something else looks wrong, flag it to Master Controller rather than fixing it in passing. *(Bound widened by Amendment 2 to include requirement 14.)*

### Amendment 2 — 2026-08-16, after QA1 round 1 (CONDITIONAL), Master Controller

QA1 raised two items as non-blocking and correctly escalated the second as
Master Controller's call. Both are taken. Dev Team is already in this code
fixing round-1 findings, so the marginal cost now is near zero and rises
steeply once this closes.

**The threshold is per-prompt, not combined.** The shipped implementation
joins all three requirement-4 prompts and validates the total against 100
characters, so an employer can write a paragraph about what happened, leave
"what documentation has been exchanged" and "what action are you
considering" entirely blank, and proceed. That is not a tuning preference —
the documentation prompt is the procedurally decisive one. The PRD's own
rationale for this product is that BC HRT disputes usually turn on
procedural compliance, and a combined threshold optimises for the prompt
users find easiest to answer while letting the legally load-bearing one go
empty.

It also breaks something already decided upstream. Sprint 5 requires
`ProceduralCheckStatus` to distinguish "not done" from "insufficient
information" precisely so the tool never asserts an employer failed a duty
the intake never established. That three-state distinction is unreachable
if intake cannot tell "no documentation was exchanged" — a real, legally
significant fact — from "the employer skipped the question." Hence
requirement 14.

13. Minimum-detail validation is **per-prompt**. Each of requirement 4's three prompts carries its own minimum, expressed as named exported constants, each with a comment explaining its value. The single combined `MIN_NARRATIVE_LENGTH` gate is replaced, not supplemented.
14. Each prompt offers an explicit **"nothing yet / not applicable"** affordance that satisfies validation for that prompt. `Situation` records the three prompt responses discretely, each either supplied text or an explicit not-reported marker. The distinction must be representable in the type — not inferred from an empty string — so Sprint 5 can reach all three `ProceduralCheckStatus` states. The exact shape is Dev Team's call; that the distinction is type-level is not.
15. Validation messages are announced to assistive technology: `role="alert"` on the message container, `aria-describedby` linking each input to its message, and `aria-invalid` on the failing input. Requirement 6 mandates a specific plain-language message, and a message a screen-reader user never receives delivers half of that requirement. This is a human-rights compliance tool whose subject matter includes disability accommodation; an intake form that silently blocks disabled users is a real barrier before it is an embarrassment.

### Acceptance Criteria

- QA1 confirms `Situation`, `IntakeMetadata`, and `ConcernCategory` are imported from `lib/types.ts`, and that the diff contains no locally declared domain type, including inline near-copies and `Pick<>`/`Omit<>` aliases standing in for a domain shape.
- QA1 confirms `lib/types.ts` changes are **bounded to requirements 10, 11, and 14** — the `ConcernCategory`/`FactPatternTag` split, the `IntakeMetadata` finalization, and the discrete per-prompt responses. Any other domain type changing shape in this diff is a FAIL. *(Supersedes the original "lib/types.ts is unmodified" criterion, which contradicted requirement 11 — see Amendments 1 and 2.)*
- QA1 confirms validation is per-prompt: three named exported constants with explanatory comments, and no single combined gate remaining. A test that passes 100 characters in one prompt with the other two empty must fail validation.
- QA1 confirms the "nothing yet" state is representable in `Situation` as a distinct marker, **not** as an empty string or absent field — read the type, since an empty string is exactly what makes Sprint 5's three-state checklist unreachable.
- QA1 confirms `role="alert"`, `aria-describedby`, and `aria-invalid` are present on the validation path.
- QA1 confirms `ConcernCategory` now holds the four **intake** concerns and `FactPatternTag` the four **legal** fact patterns, and that no intake component references a legal fact pattern directly. The bridge between the two vocabularies belongs to the analysis layer, not the form — specifically to Sprint 4 (concern → fact pattern, for selecting cases) and Sprint 5 (situation → Code ground, for issue spotting). Those are two distinct mappings and neither is Sprint 3's.
- QA1 confirms `data/seed-library.json` is unchanged by this diff. A data edit here means the split was done as a migration instead of a retype.
- QA1 confirms `lib/seed-library-schema.ts`'s exhaustiveness check retyped to `FactPatternTag` and still fails to compile if a fact pattern is added without updating it.
- QA1 confirms the loader and citation guard have no behavioural change — type names only — and that Sprint 2's existing tests still pass unmodified except for the type rename.
- QA1 confirms the minimum-detail threshold is a single named exported constant with an explanatory comment, not a magic number inline.
- QA1 runs the Vitest suite and confirms the four validation cases in requirement 9 exist and pass.
- GroundTruth completes all three steps on the deployed app with realistic input and confirms a `Situation` is produced.
- GroundTruth navigates backward from step 3 to step 1 and confirms previously entered data is still present.
- GroundTruth attempts to proceed from step 2 with no concern selected and confirms it is blocked with a specific message.
- GroundTruth submits a two-word narrative and confirms analysis does not run, and that the message names what is missing.
- GroundTruth writes a detailed answer to the first prompt only, leaves the other two blank, and confirms it is **blocked** — this is the specific case the combined threshold let through.
- GroundTruth uses the "nothing yet / not applicable" affordance on the documentation prompt and confirms the flow proceeds, so an employer who genuinely has exchanged no documentation is not stuck behind a wall they cannot honestly clear.
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

- ~~**Dev Team 2**, running in parallel with Dev Team 1 on Sprint 2, in a worktree.~~ **Superseded 2026-08-16.** Sprint 2 is closed, so there is no parallel sprint to isolate from.
- **Dev Team 1, running alone. No worktree required** — a worktree isolates concurrent sprints, and nothing is concurrent.
- **Nothing runs in parallel with this sprint.** Requirement 10 retypes `CaseExcerpt.factPatternTags` and requirement 11 rewrites `IntakeMetadata`, so `lib/types.ts` is in motion for the whole sprint. Sprint 4 is otherwise unblocked and looks like a natural parallel candidate — it is not one. Its matcher consumes `Situation` and the seed-library types, both of which change here. Run Sprint 4 after this closes.

### Risks & Mitigations

- Dev Team 2 works in the main checkout and collides with Sprint 2's uncommitted work — `/sprint-worktree 3` first, enforced as requirement zero in the team assignment above.
- A needed field turns out to be missing from `Situation`, tempting an edit to `lib/types.ts` mid-sprint — flag it to Master Controller instead; a genuine gap is an amendment to Sprint 1's type surface, coordinated across both in-flight sprints, not a unilateral edit from a worktree.
- Validation threshold set so high the flow is unusable in a live demo — GroundTruth tests with realistic input, and the named constant makes a correction a one-line change rather than a refactor.
