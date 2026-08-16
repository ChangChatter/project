---
id: 1
title: "App skeleton, domain types, and deployed disclaimer shell"
epic: "Verified Foundation"
status: done
created: 2026-08-15T19:57:25+00:00
---

# Master Controller Sprint Definition — Sprint 1

**Epic:** Verified Foundation
**Sprint Objective:** Stand up a deployed Next.js application on Vercel that renders the persistent legal disclaimer and declares the complete domain type surface every later sprint imports from.

### Context

This is the "prove the pipeline" sprint. Nothing in this sprint is a product
feature. Its job is to make every subsequent sprint possible: a real
deployment GroundTruth can open in a browser, and a single source of truth
for domain types so that Sprints 2 and 3 can run in parallel without
colliding.

The type surface is landed all at once, here, on purpose. Sprints 2 and 3
are scheduled to run at the same time in separate worktrees, and
`lib/types.ts` is the one file both would otherwise need to edit. Declaring
every domain type up front means every later sprint only ever *imports*
from it. That is what makes CLAUDE.md's no-local-redefinition rule
mechanically enforceable rather than a style preference, and on an app whose
job is mapping situations onto protected grounds, two drifting definitions
of `CodeGround` is a correctness bug that presents as a UI bug.

### Requirements

1. Next.js (App Router) + TypeScript project initialized at the repo root, with Tailwind CSS configured and working.
2. The app builds clean (`next build`), lints clean, and TypeScript compiles with no errors and no `any` in `lib/types.ts`.
3. Vitest is installed and configured, with at least one passing test proving the runner works. No product logic is tested this sprint because none exists yet.
4. `lib/types.ts` declares the complete v1 domain type surface, exported, with a short doc comment on each: `Situation`, `CodeGround`, `CaseExcerpt`, `SessionRecord`, `IntakeMetadata`, `ConcernCategory`, `ProceduralCheckItem`, `EscalationTrigger`, `IssueGuide`, `MatchResult`. Types may be stubs where a later sprint owns the detail, but the name and shape must exist here.
5. `CaseExcerpt` includes verification provenance fields as non-optional: `verifiedBy: string`, `verifiedDate: string`, `sourceUrl: string`. A case record that cannot say who verified it is not representable in the type system.
6. A persistent disclaimer banner renders on every route: "Informational triage tool only — does not constitute legal advice." It is part of the root layout, not a per-page component.
7. The disclaimer banner remains visible when the user scrolls and when the user navigates between routes.
8. ~~The app is deployed to Vercel at a URL the team can reach, and that URL is recorded in the sprint's dev notes for GroundTruth.~~ **Superseded by Amendment 2 — see requirements 18 and 19. Do not audit against this wording.**
9. At least two routes exist (a landing route and one placeholder route) so that banner persistence across navigation is actually observable.

### Amendment 1 — 2026-08-15, after QA1 round 1 (CONDITIONAL)

Raised by QA1 as findings 1, 2, 3, and 6 plus the `Situation.concern`
observation, all correctly escalated to Master Controller rather than
decided inside the sprint. These are additions to the requirements above,
not replacements. Requirements 1–9 stand unchanged.

The governing distinction for requirement 10: the set of grounds that
**exist in the BC Human Rights Code** and the set of grounds the **v1
spotter can identify** are two different sets, and the type system must
model the first, not the second. `CaseExcerpt` describes real,
human-verified Tribunal decisions. If the ground type only admits v1's four
fact patterns, a verified case turning on religion or place of origin
cannot be tagged accurately, and the verification track starts distorting
real decisions to fit the code. That corrupts the one dataset this
product's integrity rests on. Rules coverage is a separate fact, expressed
as a subset constant.

10. `CodeGround.ground` is a closed union type over the prohibited grounds of employment discrimination under the BC Human Rights Code. **Provenance: verified by Chang against the live in-force text of section 13(1) on 2026-08-15.** This supersedes both the original unverified draft of this requirement (which omitted Indigenous identity and mis-grouped criminal conviction) and the interim secondary-source verification. **The 15 members below are unchanged from the secondary-source list QA1 already verified 15/15 against `lib/types.ts` in round 2 — only this provenance sentence changed. No re-verification of the enumeration is required.** The union has exactly 15 members:

    *Section 13(1) protected grounds (14):* Indigenous identity, race, colour, ancestry, place of origin, political belief, religion, marital status, family status, physical or mental disability, sex, sexual orientation, gender identity or expression, age.

    *Separate prohibited ground (1):* criminal or summary conviction unrelated to the employment.

    Both categories belong in the one union, because `CaseExcerpt.groundTags` must be able to tag any decision the seed library holds. The structural distinction is recorded in a doc comment rather than a split type — a triage tool gains nothing at match time from two ground types, and the split would add friction to every consumer. "Physical or mental disability" stays a single member, matching the statute's own phrasing; if Sprint 5's accommodation rules turn out to need physical and mental separated, that is an amendment at that point, not a pre-emptive split now.

    **Harassment is not a ground and must not appear in this union** — under the Code, harassment is discrimination on the basis of a ground, and it is already correctly modelled as a `factPatternTag` in Sprint 2.
11. A separate exported constant (e.g. `V1_SPOTTED_GROUNDS`) declares the subset the v1 rules engine can identify: disability, family status, sex, and age. It is typed as a subset of the requirement 10 union, so a typo or a ground outside the statute fails to compile. Sprint 5's rules operate over this constant, not over the full union.
12. `CaseExcerpt.groundTags` is typed as an array of the requirement 10 union, not `string[]`. The matcher in Sprint 4 must not be joining two unconstrained string spaces.
13. `CaseExcerpt.isPlaceholder` is **required, not optional**. An omitted field is falsy and would default a record to appearing verified, which is the inverse of the safe default on precisely the failure mode this project has already hit once.
14. `IssueGuide` uses a discriminated union such that "cases withheld" and "cases present" are mutually exclusive states. A `casesWithheld: true` alongside a populated `matches` array must not compile — it is the exact state the citation guard exists to prevent, and a doc comment asserting the invariant is not enforcement.
15. `CaseExcerpt.verifiedDate` documents and constrains its format as ISO 8601, matching `IntakeMetadata.submittedAt`. Two date conventions in one seed library is a Sprint 2 problem prevented cheaply here.
16. `Situation` holds **one or more** `ConcernCategory` values, not exactly one. Sprint 3 requirement 3 specifies multi-select and the PRD specifies multi-select; a single-value field contradicts both, and a situation involving disability and family status together is a core case for this product, not an edge case.
17. The sprint file carries a `### Dev Notes` section, and Dev Team records the deployed Vercel URL there. Requirement 8 already mandates the URL; this gives it a defined location so GroundTruth's gate is not blocked on hunting for it. *(Amended by Amendment 2: the section requirement stands; the URL's timing and owner move to requirement 19.)*

### Amendment 2 — 2026-08-15, after QA1 round 2 (CONDITIONAL on requirement 8 only)

Requirement 8 was unsatisfiable as written, and that is a defect in this
sprint definition, not in Dev Team's work. It required a deployed URL as a
condition of gate 1, but nothing can be deployed until Pipeman pushes,
Pipeman cannot ship until `/sprint-dev-done`, and `dev-done` cannot run
until QA1 records a PASS. Gate 1 was made to depend on an artifact that
only exists after gate 1 clears. QA1 correctly refused both to pass it and
to waive it — waiving is Master Controller's call, and a PASS would have
frozen the sprint-file hash against a definition already known to be broken.

Requirement 8 is therefore split by timing and owner: what is verifiable
before the push stays at gate 1, and the URL check moves to GroundTruth,
whose gate already runs against the deployed app and already carries an
acceptance criterion for it. **No code change is required by this
amendment.** Dev Team's existing Dev Notes entry already satisfies
requirement 18 as written.

**Timing constraint, important.** The sprint file's hash is recorded when
QA1 records a PASS and is checked in exactly one place — `dev_done`, which
refuses outright if the file changed since. It is not re-checked by `ship`,
`groundtruth`, or `complete`. So the URL must **not** be added to Dev Notes
between QA1's PASS and `/sprint-dev-done`; doing so makes dev-done refuse
for reasons that will look unrelated to whoever hits it. Adding it after
`/sprint-ship`, which is where it becomes knowable anyway, is safe.

18. **Pre-push, verifiable at gate 1:** the Vercel project is connected to this repository, deploy access is confirmed, and the build configuration is in place such that a push by Pipeman produces a deployment carrying this sprint's work. Dev Team records the evidence in Dev Notes — project connection, deploy trigger, and any blocker encountered. This is what QA1 audits in place of the superseded requirement 8.
19. **Post-ship, before GroundTruth's gate runs:** the deployed Vercel URL is recorded in Dev Notes. Owner is whoever is in the session at that moment — Pipeman at ship time, or Dev Team immediately after — and it must be recorded before `/sprint-groundtruth` runs, because GroundTruth's entire gate is opening that URL. Per the timing constraint above, this edit happens after `/sprint-ship`, never between QA1's PASS and `/sprint-dev-done`.

### Acceptance Criteria

- QA1 confirms `CodeGround.ground` is a closed union with **exactly the 15 members** listed in requirement 10 — no more, no fewer. Count them. An omitted ground silently makes real cases untaggable; an invented one is fabricated law in the type system.
- QA1 confirms Indigenous identity is present, and that criminal/summary conviction is documented as structurally distinct from the s.13(1) grounds rather than silently listed among them.
- QA1 confirms `"harassment"` or any other conduct-type value does not appear in the union.
- QA1 confirms `V1_SPOTTED_GROUNDS` exists, contains exactly the four v1 grounds, and is typed as a subset of the requirement 10 union such that an invalid member fails to compile.
- QA1 confirms `CaseExcerpt.groundTags` is typed to the union rather than `string[]`.
- QA1 confirms `isPlaceholder` is a required field.
- QA1 confirms the contradictory `IssueGuide` state does not compile — verified by reading the union, not by reading a comment.
- QA1 confirms `verifiedDate` documents ISO 8601.
- QA1 confirms `Situation` admits multiple concern categories.
- QA1 confirms Dev Notes records the Vercel deploy configuration and trigger per requirement 18 — project connection, how a Pipeman push reaches a deployment, and any blocker. **QA1 does not check for a live URL; that is structurally impossible at gate 1 and is GroundTruth's check, below.**
- QA1 reads `lib/types.ts` and confirms all ten named types are declared and exported, each with a doc comment, and that no domain type is declared anywhere else in the diff.
- QA1 confirms `CaseExcerpt.verifiedBy`, `.verifiedDate`, and `.sourceUrl` are required (not optional) fields.
- QA1 confirms the disclaimer lives in the root layout, not duplicated per page.
- QA1 confirms Vitest is wired and the build/lint/typecheck scripts exist in `package.json`.
- GroundTruth reads the deployed Vercel URL from Dev Notes (recorded post-ship per requirement 19), opens it, and confirms the page renders without console errors. If no URL is recorded, GroundTruth's gate cannot run and the sprint is not ready for a live test — that is a blocker to raise, not a verdict to record.
- GroundTruth confirms the disclaimer text is visible on first paint, still visible after scrolling to the bottom of the page, and still visible after navigating to the second route.
- GroundTruth confirms the disclaimer wording matches requirement 6 exactly, character for character.

### Out of Scope

- Any intake form, matching logic, or output rendering — those are Sprints 3, 4, and 5. This sprint is deliberately not a feature.
- The acknowledgment gate (requiring the user to click through the disclaimer before seeing output). That is Sprint 6, because there is no output to gate yet. This sprint delivers the *banner* only.
- Supabase connection, schema, or any database work. Sprint 2 owns the seed library; session persistence is Sprint 7 and is currently blocked.
- Any case data, real or placeholder. The `CaseExcerpt` type is declared here; zero instances of it are created here.
- Visual design beyond legibility. A styled, branded UI is not what this sprint proves.

### Dependencies

- Blocks: every other sprint. Sprints 2 and 3 both import from `lib/types.ts` and cannot start until it exists.
- Blocked by: nothing. This is the first sprint.
- External: a Vercel account with deploy access to this repo. If that is not already provisioned, it is the one thing that can stall this sprint, and it should be confirmed before `/sprint-start`.
- External, **CLOSED 2026-08-15**: Chang's check of the requirement 10 ground list against the live in-force text of BC Human Rights Code s.13(1). Result: the 15-member union is confirmed correct as implemented — 14 s.13(1) grounds plus criminal or summary conviction unrelated to the employment as a separate protected ground. No change to `lib/types.ts` required. This also clears Sprint 2's hard start condition on seeding verified case data.

### Risks & Mitigations

- Type surface turns out incomplete, forcing Sprint 2 or 3 to edit `lib/types.ts` mid-flight and reintroducing the collision this sprint exists to prevent — Dev Team flags any missing type to Master Controller rather than adding it silently; a genuinely missing type is a small amendment to this sprint, not an improvisation inside another one.
- Vercel deploy is not provisioned and the sprint stalls at the last requirement — confirm deploy access before `/sprint-start`, not after the build is done.
- Disclaimer implemented per-page, so a route added in a later sprint silently ships without it — requirement 6 puts it in the root layout, and requirement 9 plus the GroundTruth navigation check make a per-page implementation fail the gate.

### Dev Notes

- Vercel is confirmed already linked to this repo (`bc-employer-issue-guide` project), auto-deploying on push to `main`.
- **Deployed URL: https://bc-employer-issue-guide.vercel.app/** — recorded 2026-08-16, per requirement 19. GroundTruth's round 1 FAIL (see Dependencies/state history) traced to the Vercel project's Framework Preset being set to "Other" instead of "Next.js", so the build succeeded but the output-collection step failed looking for a `public/` directory a Next.js App Router build never produces. Framework Preset has been corrected and the project redeployed. I verified directly (not on report): opened this URL, confirmed the disclaimer banner on first paint, navigated to `/about`, confirmed the banner persists, and confirmed no console errors on either route.
