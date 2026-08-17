---
id: 7
title: "Swap verified BC HRT case data into the seed library"
epic: "Verified Foundation"
status: todo
created: 2026-08-17T17:02:27+00:00
---

# Master Controller Sprint Definition — Sprint 7

**Epic:** Verified Foundation
**Sprint Objective:** Replace the four placeholder records in the seed library with Chang-verified BC HRT decisions, and prove the swap changed nothing but data.

### Context

Sprints 2 and 4 were deliberately scoped to run on placeholder data so that
the schema, loader, guard, and matcher could all be built and verified while
Track H — Chang's verification of candidate decisions against CanLII and
bchrt.bc.ca — ran on human time in parallel. This sprint is where that
parallelism gets cashed in. It exists as its own sprint rather than as a
quiet content drop because the moment real citations enter this product is
the moment its central integrity claim becomes live, and that deserves a
gate rather than a commit message.

**This sprint cannot start until Track H is finished.** As of 2026-08-17
none of the six candidate decisions are verified and there is no
disability/accommodation candidate at all. The blocker is legal review
capacity, not engineering, and no amount of sprint planning moves it.

**Dev Team does not author case content in this sprint either.** The rule
from Sprint 2 stands unchanged: the data arrives from Chang, and Dev Team
integrates it. The distinction that matters is authorship, not whether the
data happens to be real this time.

### Requirements

1. Every placeholder record in `data/seed-library.json` is replaced with a Chang-verified BC HRT decision. No record retains `isPlaceholder: true` at the end of this sprint.
2. Each record carries complete provenance per Sprint 2's schema: `verifiedBy`, `verifiedDate` in ISO 8601, and a `sourceUrl` resolving to CanLII or bchrt.bc.ca for that specific decision.
3. All four fact patterns are represented: disability/accommodation, family status, harassment/poisoned work environment, age/termination. **The disability/accommodation gap is the known long pole** — it is the PRD's leading use case and the one fact pattern with no candidate as of this writing.
4. `groundTags` on each record are drawn from the 15-member `HumanRightsCodeGround` union, reflecting what the decision actually turned on rather than what the intake vocabulary can produce.
5. The loader accepts every record with no validation errors, and `placeholderCount(library)` returns zero.
6. **No logic changes.** Not the loader, not the citation guard, not the matcher, not the bridge. If real data cannot load without a code change, that is a schema defect to surface and fix deliberately, not to absorb inside this sprint.
7. Existing Sprint 2 and Sprint 4 test suites pass unmodified, except where a test fixture legitimately referenced placeholder identifiers.
8. A Vitest case asserting the shipped library contains zero placeholder records, so a future partial swap cannot pass silently.
9. Match quality is assessed for the first time against real content, and any weak or wrong match is recorded as a finding for tuning — **not** fixed by editing case data to suit the matcher. Tuning weights is Sprint 4's config object; if the bridge or weights need adjusting, that is a follow-on sprint with its own gates.

### Acceptance Criteria

- QA1 confirms no record has `isPlaceholder: true` and that `0000 BCHRT 0` appears nowhere in the repo.
- QA1 confirms every record has non-empty `verifiedBy`, ISO 8601 `verifiedDate`, and a `sourceUrl` pointing at CanLII or bchrt.bc.ca.
- QA1 confirms all four fact patterns are present.
- QA1 confirms `groundTags` values are all members of the `HumanRightsCodeGround` union.
- QA1 confirms **the diff contains no logic changes** — data and test fixtures only. A change to the loader, guard, matcher, or bridge in this diff is a FAIL, to be raised and scoped rather than absorbed.
- QA1 confirms the requirement 8 test exists and fails if a placeholder is reintroduced.
- QA1 runs the full suite and confirms Sprint 2 and Sprint 4 tests pass.
- **QA1 does not verify that the citations are real.** That is Chang's verification, recorded in `verifiedBy`, and it is outside what a static code audit can establish. QA1 confirms provenance fields are *present and well-formed*; it cannot confirm they are *true*. This limit is deliberate and should be stated in the audit rather than glossed.
- GroundTruth confirms the deployed app still builds, loads, and completes the Sprint 3 intake flow with no regression.
- GroundTruth confirms no case content is user-visible unless Sprint 6 has shipped. If Sprint 6 has shipped, GroundTruth confirms every citation displayed traces to a library entry — the PRD success metric, checked rather than assumed — and that no placeholder text appears.

### Out of Scope

- Growing the library beyond the PRD's 10–15 target. Four cases, one per fact pattern, is the floor that proves the pipeline; more is content work, not a sprint.
- Tuning matching weights or the concern-to-fact-pattern bridge against real content. Requirement 9 records findings; acting on them is a separate sprint with its own gates.
- Vector search. Still deferred, and a larger library is not by itself a reason to revisit it.
- Any schema change. If real data does not fit the schema, stop and raise it — do not widen the schema mid-sprint to make an entry fit.

### Dependencies

- Blocks: nothing structurally. But the product cannot be shown to anyone outside the workshop as a working triage tool until this closes, because until then every case it can surface is fake.
- Blocked by: Sprints 2 and 4 (mechanism), and **Track H (Chang's verification), which is the real gate**.
- External: Chang's verification capacity, and the PRD's open question on whether a second reviewer signs off on each case before it ships. That question is still unanswered and should be settled before this sprint starts, not during it — a single-reviewer bottleneck is a different risk profile than a two-reviewer one, and it changes how long this takes.

### Team Assignments

- **Dev Team 1.** Integration only. The data comes from Chang.

### Risks & Mitigations

- Dev Team fills a gap — most likely the missing disability/accommodation case — by generating a plausible citation to complete the set. This is the project's original failure, and a half-filled library is exactly the pressure that reproduces it — Sprint 2's standing rule applies unchanged; a real-looking citation Chang did not verify is an automatic FAIL, and `verifiedBy` makes the claim explicit rather than implied.
- The swap is treated as a content drop and skips gates, so the first real citations reach users unaudited — it is a sprint precisely to prevent that.
- Schema turns out not to fit a real decision, and gets widened in-flight to make it fit — requirement 6 and the Out of Scope section make that a stop-and-raise, not a judgment call.
- Match quality disappoints against real content and case data gets edited to improve results — requirement 9 forbids it. The library describes what decisions say; it is not a tuning surface.
