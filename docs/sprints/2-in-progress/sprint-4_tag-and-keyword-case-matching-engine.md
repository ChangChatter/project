---
id: 4
title: "Tag and keyword case matching engine"
epic: "Analysis"
status: in_progress
created: 2026-08-15T19:57:28+00:00
---

# Master Controller Sprint Definition — Sprint 4

**Epic:** Analysis
**Sprint Objective:** Deliver a deterministic matcher that bridges intake's operational concern vocabulary to the library's legal fact-pattern vocabulary, selects at most two relevant cases for a given `Situation`, and ships fully tested against placeholder case data.

### Context

This sprint holds the PRD's Technical Notes line: for ten to fifteen cases,
tag matching against a small JSON set is buildable and verifiable inside a
workshop budget, and a vector pipeline is not. It is also where the testing
strategy earns its keep — there are no end-to-end tests in this repo by
design, so matching correctness rests on Vitest, which is affordable
precisely because this component is pure.

**Track H is not done, and this sprint is deliberately scoped so it does
not need to be.** None of the six candidate BC HRT decisions have been
verified against CanLII or bchrt.bc.ca yet, and no verified
disability/accommodation case exists. The library therefore contains four
placeholder records, one per fact pattern, all `isPlaceholder: true`.
**Placeholder data is the expected input for this entire sprint. It is not
a defect, and neither gate should treat it as one.** Real citations arrive
in Sprint 7, a fast-follow whose only job is the swap. What this sprint
proves is that the bridge and the ranking are correct; what it cannot prove
is that match *quality* is good, because quality is a property of the
content, and the content is not here yet.

### Requirements

1. A pure matching function taking a `Situation` and the loaded seed library, returning a ranked `MatchResult[]` typed from `lib/types.ts`.

2. **The concern-to-fact-pattern bridge, which is this sprint's core deliverable.** Intake produces `ConcernCategory` (`medical-absence`, `schedule-flexibility`, `interpersonal-conflict`, `performance-management`). The library is tagged with `FactPatternTag` (`disability-accommodation`, `family-status`, `harassment-poisoned-work-environment`, `age-termination`). The bridge maps the first onto the second and lives in one named, exported, commented constant.

3. **The bridge is many-to-many, not a lookup table.** One concern maps to several plausible fact patterns and several concerns map to one. `medical-absence` is plausibly disability/accommodation *and* family status (an employee caring for a relative) *and* age. `performance-management` is plausibly age/termination *and* disability/accommodation (performance decline arising from a condition). A one-to-one map is a wrong implementation of this requirement, not a simplification of it: collapsing the mapping hands the employer's own guess back to them as an answer, which is the failure mode the vocabulary split in Sprint 3 exists to prevent.

4. **Matching does not use `groundTags`.** Identified Code grounds do not exist at this point in the lifecycle — Sprint 5 produces them, and Sprint 5 runs after this. The matcher's inputs are `Situation.concerns` (via the bridge), `Situation.narrative`, and `Situation.facts`. Using grounds to sharpen matching is a legitimate future enhancement and is explicitly out of scope here; do not design for it speculatively.

5. Keyword matching runs over the narrative and the three `facts` prompt responses, combined with the bridge's tag matching. Prompt responses carrying the Sprint 3 "not reported" marker contribute nothing and must not be treated as empty strings that accidentally match.

6. Ranking is deterministic. The same `Situation` and library always produce the same ordered result, with tie-breaking explicit in the code rather than incidental to object key or array order.

7. At most two matches are returned, per the PRD's "1–2 matched cases".

8. An empty result is returned rather than a weak match when nothing clears a defined relevance threshold. A bad case is worse than no case in a legal tool.

9. The relevance threshold and all scoring weights live in one named, exported, commented configuration object, tunable without touching matching logic.

10. The matcher only ever returns records present in the library it was passed. It never constructs, completes, or infers case content.

11. **The matcher is placeholder-agnostic.** It does not filter, deprioritise, or special-case `isPlaceholder` records. Refusing to render placeholders is Sprint 6's job via Sprint 2's exported placeholder API. Keeping that separation means behaviour does not silently change when Sprint 7 swaps real data in — the matcher's logic is exercised identically before and after.

12. `MatchResult.matchedTags` is retyped from `string[]` to a discriminated shape distinguishing a fact-pattern match from a keyword match — e.g. `{ kind: "fact-pattern"; tag: FactPatternTag } | { kind: "keyword"; term: string }`. Two reasons: an unconstrained `string[]` in this codebase is the same defect QA1 caught on Sprint 1, and Sprint 6 needs to explain *why* a case was surfaced. "Why am I being shown this case" is a fair question from someone making an employment decision.

13. Fix a stale doc comment: `HumanRightsCodeGround` in `lib/types.ts` still states the direct statute check is "still open" before verified case data may enter the library. That check closed on 2026-08-15 and the union was confirmed correct. Update the comment to record the closure. This is folded in here rather than sent through the trivial-fix lane, which it does not qualify for — `lib/types.ts` is not a component or style file, and the lane's criteria are mechanical by design.

14. Modifications to `lib/types.ts` are **bounded to requirements 12 and 13**. No other domain type changes shape. Anything else that looks wrong gets flagged to Master Controller, not fixed in passing.

15. Vitest coverage for: a single-concern situation matching its bridged fact pattern; a multi-concern situation; a situation clearing nothing (returns empty); tie-breaking determinism across repeated runs; an all-placeholder library (the current real state); an empty library; a `facts` entry marked not-reported contributing no keyword matches; and the many-to-many bridge returning multiple fact patterns for a single concern.

### Acceptance Criteria

**Read this first, both gates: placeholder case data is expected.** The
library contains four `isPlaceholder: true` records with `0000 BCHRT 0`
citations, because Track H has not finished verifying any real decisions.
That is the intended state for this sprint. Neither QA1 nor GroundTruth
should record a finding about missing, fake, or unverified case content —
Sprint 7 swaps it. What *is* still a hard failure is Dev Team authoring
case data: any new or edited entry in `data/seed-library.json` in this
sprint's diff, and any citation that looks like a real BC HRT decision,
remains an automatic FAIL under Sprint 2's standing rule.

- QA1 confirms `data/seed-library.json` is unchanged by this diff.
- QA1 confirms the bridge is a single named exported constant, and that it is **many-to-many** — at least one concern mapping to two or more fact patterns. A one-to-one map fails requirement 3.
- QA1 confirms the matcher reads `Situation.concerns`, `.narrative`, and `.facts`, and does **not** read `groundTags`.
- QA1 confirms not-reported prompt responses are excluded from keyword matching rather than treated as empty strings.
- QA1 confirms no embeddings library, vector store, or model call appears in the diff or in `package.json`, and that no new dependency was added for matching.
- QA1 confirms the matcher is pure — no network, no filesystem, no `Date.now()`, no randomness — by reading the implementation.
- QA1 confirms tie-breaking is explicit in code, not left to iteration order.
- QA1 confirms the threshold and weights are one named exported config with comments.
- QA1 confirms the matcher does not branch on `isPlaceholder` anywhere.
- QA1 confirms `MatchResult.matchedTags` is the discriminated shape from requirement 12, and that `lib/types.ts` changes are bounded to requirements 12 and 13.
- QA1 confirms the `HumanRightsCodeGround` doc comment no longer describes the statute check as open.
- QA1 runs the Vitest suite, confirms all eight cases in requirement 15 exist and pass, and re-runs it to confirm determinism.

**GroundTruth** — this sprint ships pure logic with no user-visible surface;
matching is not wired into the UI until Sprint 6. Gate 2's honest scope here
is non-regression, stated as such rather than dressed up as a matching check:

- The deployed app still builds and loads at the recorded URL with no console errors.
- The full Sprint 3 intake flow still completes end to end, including per-prompt validation, the "nothing yet" affordance, and back-navigation preserving data.
- The Sprint 1 disclaimer banner is still present throughout.
- **No case content of any kind is user-visible.** If matched cases have appeared in the UI, that is a scope violation and a FAIL — Sprint 6 owns rendering, and rendering placeholders to a user is exactly what Sprint 2's placeholder API exists to prevent.

### Out of Scope

- Ground identification and the procedural checklist. Sprint 5 owns those. This sprint answers "which cases resemble this situation", not "what is legally at issue here".
- Rendering matched cases. Sprint 6 owns display and the citation guard call.
- Filtering placeholders out of results — requirement 11, deliberately Sprint 6's concern.
- Swapping in verified case data. That is Sprint 7, and it needs Track H finished, not engineering.
- Using identified grounds to improve matching. Requires Sprint 5 and is a v2 refinement.
- Vector search or embeddings, deferred per the PRD and CLAUDE.md. If tag matching proves imprecise, that is a finding that earns its own sprint, not an in-flight substitution.
- Tuning weights against Chang's benchmark scenarios. That set still does not exist. This sprint ships a defensible default and the config object that makes tuning cheap.

### Dependencies

- Blocks: Sprint 5, Sprint 6, Sprint 7.
- Blocked by: Sprints 2 and 3, both closed. The parallel-work constraint is lifted — `lib/types.ts` is no longer in motion.
- External, **open but non-blocking**: Track H. Requirement 15's all-placeholder test case is the current production state, so this sprint runs to completion without it.
- External, **open**: the bridge mapping in requirement 2 is a legal judgment encoded as data, not a technical choice. QA1 can confirm it is many-to-many, exported, and commented; QA1 cannot confirm that `performance-management` plausibly implicates age/termination, because that is law, not code. **Chang should review the bridge constant before Sprint 6 renders anything derived from it.** Same limitation flagged on Sprint 5's ground rules, and it is the standing boundary of what these two gates can tell you.

### Team Assignments

- **Dev Team 1, running alone. No worktree** — a worktree isolates concurrent sprints and nothing is concurrent. Sprint 5 is blocked by this sprint, so there is no parallel candidate.

### Risks & Mitigations

- The bridge is built one-to-one because it is simpler, quietly returning the employer's own framing as the tool's analysis — requirement 3 states it, an acceptance criterion tests it, and requirement 15 covers it with a unit test.
- Scope creep into embeddings, the time-budget risk the PRD names explicitly — requirement 4's boundary plus a QA1 check on `package.json`.
- The matcher special-cases placeholders "to make results look right", so behaviour changes silently when real data lands — requirement 11 forbids it and QA1 checks for any `isPlaceholder` branch.
- Match quality looks poor against placeholder content and is misread as a logic defect — the acceptance criteria state placeholders are expected; quality assessment waits for Sprint 7 and the benchmark set.
- Non-deterministic ordering makes tests flaky and hides ranking bugs — explicit tie-breaking plus a re-run check.
- The bridge encodes a legal error that no gate can catch — flagged as an external dependency above; needs Chang, before Sprint 6.
