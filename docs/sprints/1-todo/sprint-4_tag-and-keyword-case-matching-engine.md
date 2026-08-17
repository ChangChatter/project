---
id: 4
title: "Tag and keyword case matching engine"
epic: "Analysis"
status: todo
created: 2026-08-15T19:57:28+00:00
---

# Master Controller Sprint Definition — Sprint 4

**Epic:** Analysis
**Sprint Objective:** Deliver a deterministic tag and keyword matcher that selects one to two relevant cases from the verified seed library for a given `Situation`, with full unit-test coverage.

### Context

The PRD's Technical Notes are explicit: for a library of ten to fifteen
cases, a vector search pipeline is more infrastructure than the problem
needs and is a real risk to the workshop time budget. Tag matching against
a small JSON set is something that can actually be finished and actually be
verified. This sprint holds that line.

It is also the sprint where the project's testing strategy earns its keep.
There are no end-to-end tests in this repo, by design, so the correctness of
matching rests on Vitest. That is affordable precisely because this
component is pure: a `Situation` and a library in, a ranked list out, no
network, no model, no clock.

### Requirements

1. A pure matching function taking a `Situation` and the loaded seed library, returning a ranked `MatchResult[]` typed from `lib/types.ts`.
2. Matching operates on the structured tags defined in Sprint 2 — `groundTags` and `factPatternTags` — combined with keyword matching over the narrative text. No embeddings, no vector search, no model call. This is a hard scope boundary per CLAUDE.md.
3. The ranking is deterministic: the same `Situation` and library always produce the same ordered result, including tie-breaking, which must be explicit rather than incidental to object key order.
4. The function returns at most two matches, per the PRD's "1–2 matched cases".
5. The function returns an empty result rather than a weak match when nothing clears a defined relevance threshold. A bad case is worse than no case in a legal tool.
6. The relevance threshold and any scoring weights live in one named, exported, commented configuration object, tunable without editing matching logic.
7. Matching never invents a case. It only ever returns records present in the library it was passed.
8. Vitest coverage for: an exact single-ground match; a multi-ground situation; a situation matching nothing (returns empty); tie-breaking determinism across repeated runs; a library containing only placeholder records; an empty library.
9. Matching runs correctly against the Sprint 2 placeholder library, so this sprint is not blocked on the human verification track.

### Acceptance Criteria

- QA1 confirms no embeddings library, vector store, or model call appears anywhere in the diff or in `package.json`, and that no new dependency was added for matching.
- QA1 confirms the matcher is pure — no network, no filesystem, no `Date.now()`, no randomness — by reading the implementation.
- QA1 confirms tie-breaking is explicit in the code, not left to object or array iteration order.
- QA1 confirms the threshold and weights are a single named exported config with comments.
- QA1 runs the Vitest suite and confirms all six cases in requirement 8 exist and pass, and re-runs the suite to confirm determinism.
- QA1 confirms the matcher's return values are drawn from the passed library and that no case content is constructed inside the matcher.
- GroundTruth, once matching is surfaced in Sprint 6, will verify displayed cases trace to library entries. This sprint is primarily a QA1 gate; GroundTruth confirms the deployed app still builds, loads, and completes the Sprint 3 intake flow without regression.

### Out of Scope

- Ground identification and the procedural checklist. Sprint 5 owns those. This sprint answers "which cases resemble this situation", not "what is legally at issue here".
- Rendering matched cases in the UI. Sprint 6 owns display, including calling the citation guard.
- Vector search or embeddings, deferred to v2 per the PRD and CLAUDE.md. If tag matching proves imprecise, that is a finding that earns its own sprint, not an in-flight substitution.
- Tuning weights against Chang's benchmark scenarios. The benchmark set does not exist yet; this sprint ships a defensible default and the config object that makes tuning cheap later.

### Dependencies

- Blocks: Sprint 5, Sprint 6.
- Blocked by: Sprint 2 (schema and loader) **and Sprint 3**. Sprint 3 is not just an upstream producer of `Situation` — its Amendment 1 splits `ConcernCategory` into intake concerns and a new `FactPatternTag`, and retypes `CaseExcerpt.factPatternTags`. Both are inputs to this matcher. Do not start this sprint in parallel with Sprint 3; the types it matches on are being rewritten there.
- Note for the matcher's design: after Sprint 3, intake produces `ConcernCategory` (operational) while the library is tagged with `FactPatternTag` (legal). Bridging those two vocabularies is part of what this sprint's tag matching does, alongside keyword matching over the narrative — it is not a mismatch to be normalized away.
- External: none. Real case content improves match quality but is not required — requirement 9 keeps this sprint runnable against placeholders.

### Risks & Mitigations

- Scope creep into embeddings, the exact risk the PRD names as a time-budget threat — requirement 2 and the Out of Scope section make it a gate failure rather than a judgment call, and QA1 checks `package.json` for new dependencies.
- Matcher returns a weak, misleading case because something must be shown — requirement 5 mandates an empty result below threshold, and requirement 8 tests it.
- Non-deterministic ordering makes unit tests flaky and hides ranking bugs — requirement 3 mandates explicit tie-breaking and QA1 re-runs the suite to confirm.
- Match quality looks poor when tested against placeholder data and is misread as a logic defect — placeholders are for exercising the code paths, not for judging relevance; quality assessment waits for verified content and the benchmark set.
