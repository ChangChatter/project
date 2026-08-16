---
id: 2
title: "Seed library schema, loader, and citation guard"
epic: "Verified Foundation"
status: todo
created: 2026-08-15T19:57:26+00:00
---

# Master Controller Sprint Definition — Sprint 2

**Epic:** Verified Foundation
**Sprint Objective:** Turn the PRD's grounding constraint from a stated intention into an enforced one, by shipping a validated seed-library schema, a loader that refuses unverified entries, and a citation guard that fails closed on any citation not present in the library.

### Context

The entire value proposition of this product rests on case citations being
real. The PRD records that this has already failed once — `Devine v.
British Columbia, 2022 BCHRT 45` was invented, was plausible enough to
survive into a draft, and was only caught by a verification search. A rule
written in a prompt did not prevent that and would not have. A function
with unit tests will.

This sprint therefore builds the mechanism, not the content. The verified
case data is human-authored on a separate track (Chang, against CanLII and
bchrt.bc.ca) and lands later. What ships here is the schema that data must
satisfy, the loader that rejects it if it doesn't, and the guard that sits
in front of every render.

**Dev Team must not author case data in this sprint, under any
circumstance.** Not real citations, not "realistic examples," not
placeholders that look plausible. See requirement 6 and the risks section.

### Requirements

1. A JSON schema (and matching TypeScript type, imported from `lib/types.ts`, not redeclared) for a seed-library case record containing at minimum: `id`, `title`, `citation`, `groundTags[]`, `factPatternTags[]`, `outcomeType`, `keyFinding`, `sourceUrl`, `verifiedBy`, `verifiedDate`, `isPlaceholder`. Per Sprint 1 Amendment 1, `groundTags` ranges over the full BC Human Rights Code ground union — not only the four grounds v1 can spot — so a verified case turning on religion or place of origin is taggable accurately rather than forced into a v1 bucket. The loader validates `groundTags` against that union and rejects unknown values.
2. `factPatternTags` is constrained to the PRD's four v1 fact patterns: disability/accommodation, family status, harassment/poisoned work environment, age/termination.
3. A loader that reads the seed library and validates every record against the schema at load time.
4. The loader rejects, with a clear error naming the offending record, any entry missing `verifiedBy`, `verifiedDate`, or `sourceUrl`, or having any of them empty.
5. A citation guard: a pure function taking **an `IssueGuide` (the type declared in `lib/types.ts` in Sprint 1, including its `casesWithheld` discriminated union)** and the loaded library, returning a pass/fail result. Do not invent a payload shape — `IssueGuide` is the contract Sprint 6 will render, and the guard must accept exactly that. It fails if the payload references any case `id` or citation string not present in the library. It fails closed — an error, an empty library, or an unparseable payload is a failure, never a pass.
6. The seed library file ships this sprint containing **only** placeholder records. Every placeholder uses the literal title `[VERIFIED CASE CITATION NEEDED]` and an obviously non-real citation of the form `0000 BCHRT 0`. Placeholders must be impossible to mistake for real cases at a glance. Dev Team does not write real or realistic case citations in this sprint; that content arrives from the human verification track.
7. The loader exposes placeholder status as a **typed, exported API** — not a doc comment describing one. At minimum: per-record `isPlaceholder`, plus an exported predicate or count over the loaded library (e.g. `placeholderCount(library)`) that Sprint 6 calls to refuse rendering placeholders in production. QA1 must be able to confirm this by reading an export signature, not prose.
8. Vitest coverage for: loader accepts a valid record; loader rejects a record missing each provenance field in turn; guard passes a payload citing only library cases; guard fails a payload citing an unknown case; guard fails on an empty library; guard fails on a malformed payload.

### Acceptance Criteria

- QA1 confirms the case record type is imported from `lib/types.ts` and not redeclared locally, per CLAUDE.md's domain-types rule.
- QA1 reads the seed library file and confirms every record is a placeholder in the exact form required by requirement 6. **Any citation in this sprint's diff that looks like a real BC HRT decision is an automatic FAIL**, regardless of whether it happens to be real.

  *Clarification, 2026-08-15, after the statute check cleared seeding:* this rule is about **who authored the diff**, not about whether verified data may exist. Chang's verified case data is a separate, Chang-authored content drop that lands **after Sprint 2 completes** — not inside this sprint's diff. Sprint 2 remains a mechanism sprint: schema, loader, guard, placeholders. Keeping the bright line means QA1's check stays trivially auditable (real-looking citation in a Dev Team diff = fail, no judgment call required), and it does not delay anything, because collecting and verifying cases is human work already running in parallel.
- QA1 confirms the guard fails closed by reading the error and empty-input paths, not only the happy path.
- QA1 runs the Vitest suite and confirms all six test cases in requirement 8 exist and pass.
- QA1 confirms no network call, no model call, and no filesystem write exists anywhere in the loader or guard — both are pure over their inputs.
- **GroundTruth, read this before testing.** This sprint ships loader and guard logic with **no user-visible surface** — UI is explicitly out of scope and belongs to Sprint 6. So the honest scope of gate 2 here is non-regression, and it is stated that way rather than dressed up as a content check. Verify:
  - The deployed app still builds and loads at the recorded URL, with no console errors. *(Falsifiable: the deploy can break, and on Sprint 1 it did.)*
  - Sprint 1's criteria still hold — disclaimer visible on first paint, after scroll, and across navigation between both routes.
  - **No case content of any kind is user-visible.** If a case surface has appeared, that is a scope violation and a FAIL, not a pass — Sprint 2 was not supposed to render anything.

  A criterion phrased as "confirm no case content is visible" on an app that has no case UI would pass whether or not the sprint did anything, which is the same unfalsifiable-check problem GroundTruth raised against Sprint 1's requirement 18. Stated as non-regression plus a scope-violation trap, it can actually fail.

### Out of Scope

- The real verified case content. That is human-authored on the verification track and is not a code deliverable; it lands as a content drop once Chang has confirmed each entry against CanLII or bchrt.bc.ca.
- Tag *matching* logic — selecting which case fits a situation is Sprint 4. This sprint only defines, loads, and guards the library.
- Supabase storage of the library. The library loads from JSON in the repo this sprint; moving it into Supabase is a later decision and does not change the schema or the guard.
- Any UI for browsing or displaying cases. Sprint 6 owns rendering.

### Dependencies

- Blocks: Sprint 4 (matching needs the schema), Sprint 6 (rendering must call the guard).
- Blocked by: Sprint 1 (`lib/types.ts` must exist).
- External: none for the mechanism. The real case content depends on Chang's verification track, which runs in parallel and does not block this sprint.
- ~~**Hard start condition on seeding:** Chang's direct check of the 15-member ground union against the live BC Human Rights Code text must be closed before any *verified* case data is entered into the library.~~ **CLEARED 2026-08-15.** Chang verified the union against the live in-force text of s.13(1); the 15 members are confirmed correct as implemented, with no change to `lib/types.ts`. Seeding verified case data may begin.

### Risks & Mitigations

- **Dev Team generates plausible case citations to "fill in" the library.** This is the single highest-probability failure in the project — it has already happened once in the PRD, and an LLM asked for BC HRT cases produces exactly this, confidently — Requirement 6 forbids it explicitly, the placeholder format makes a violation visible at a glance, and QA1 is instructed to fail the sprint outright on any realistic-looking citation.
- Guard is written to fail open on error, so a malformed payload silently renders — requirement 5 states fail-closed and requirement 8 tests the error paths specifically.
- Placeholder records leak into a demo and read as real — the `0000 BCHRT 0` format and the literal `[VERIFIED CASE CITATION NEEDED]` title make this immediately obvious, and requirement 7 gives Sprint 6 the hook to refuse them.
