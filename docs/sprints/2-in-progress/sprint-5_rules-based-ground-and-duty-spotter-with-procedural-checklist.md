---
id: 5
title: "Rules-based ground and duty spotter with procedural checklist"
epic: "Analysis"
status: in_progress
created: 2026-08-15T19:57:29+00:00
---

# Master Controller Sprint Definition — Sprint 5

**Epic:** Analysis
**Sprint Objective:** Deliver the deterministic rules engine that maps a `Situation` to plausible Code grounds, duty-to-accommodate procedural gaps, and escalation triggers, with an LLM used only to phrase the finished result in plain language.

### Context

The PRD calls this the most legally substantive part of the product and says
it is worth getting right over adding surface features. It is also where the
project's central architectural decision lands: ground identification, the
procedural checklist, and escalation triggers are **rules**, and the model
only rewrites the finished result into readable prose. The model never
decides which ground applies, never selects a case, and never sees the
library.

That split is what makes everything else coherent. Rules are unit-testable,
so the Vitest standard is satisfiable. Rules are auditable, so QA1 can read
the logic rather than assess a prompt. And because citations are attached
after the model runs, the model is never positioned to paraphrase a case
into a citation — the failure that already happened once in this project's
own PRD.

**This sprint was revised at pre-review on 2026-08-18** against the code
Sprints 3 and 4 actually shipped. Nine defects were corrected; the three
that mattered are called out where they land — requirement 6 (personal data
leaving the system), requirement 4 (escalation triggers were unowned by any
sprint), and the GroundTruth criteria (which tested a UI that does not exist
until Sprint 6).

### Requirements

1. A pure rules function taking a `Situation` and returning identified grounds, each carrying the specific intake facts that triggered it. Every ground is traceable to its inputs.

2. **Ground identification is its own mapping, not a reuse of Sprint 4's bridge.** Sprint 4 shipped `lib/concern-fact-pattern-bridge.ts`, which answers "which kinds of case resemble this situation". This sprint answers "which protected grounds are plausibly engaged". They are different questions and the second must not be derived by chaining the first. Routing concern → fact pattern → ground would be lossy and wrong: `harassment-poisoned-work-environment` implies no particular ground, since harassment under the Code is discrimination *on the basis of* a ground and can attach to any of them. Build a separate, named, exported, commented mapping from `Situation` inputs to grounds.

3. A pure rules function returning `ProceduralCheckItem[]` for duty-to-accommodate line items — at minimum: whether medical or functional-abilities documentation was requested before a request was denied, whether alternative arrangements were explored, and whether the accommodation analysis was documented.

4. **A pure rules function returning `EscalationTrigger[]`**, split by the existing `EscalationTriggerKind` into internal actions and counsel triggers. The PRD names concrete examples that are directly rule-derivable: a formal complaint already lodged (available in `IntakeMetadata`), and termination being considered for an employee on medical leave (available from the concern selection plus the third fact prompt). *This was missing entirely. Sprint 6 requirement 4 says "if the rules produce none, display the standing trigger", which assumes this function exists — but no sprint required anyone to build it. Sprint 6 owns rendering triggers; this sprint owns producing them.*

5. The three-state `ProceduralCheckStatus` is driven by the mechanism Sprint 3 built for it: a `FactPromptResponse` with `reported: false` yields `insufficient-information`, never `not-done`. The tool must never assert an employer failed a duty when the employer simply was not asked or declined to answer. An empty or whitespace-only `text` on a `reported: true` response is also `insufficient-information`, not a gap.

6. **The prose payload is structured and de-identified.** The model receives the identified ground names, the checklist item labels and statuses, and the trigger labels. It does **not** receive `Situation.narrative`, the raw `facts` text, or `triggeredBy` strings derived verbatim from them.

   *This is the most consequential change at pre-review.* The narrative describes a real, named, non-consenting employee's medical condition, family circumstances, or alleged conduct, written by their employer. Sending it to a third-party API is a disclosure of third-party personal data, and it is irreversible in a way a database row is not. CLAUDE.md's open security question covers what a `SessionRecord` may *store*; nobody has decided what may be *transmitted*, and this sprint is where that would silently happen first. A structured payload also improves output quality by shrinking the surface the model can drift from.

7. Rules functions are deterministic and pure: no model call, no network, no clock, no randomness. Same input, same output, always.

8. Grounds identified by the rules are constrained to `V1_SPOTTED_GROUNDS` at the **type** level, not by convention. `CodeGround.ground` stays typed as the full `HumanRightsCodeGround` union — that models the domain correctly and `CaseExcerpt` depends on it — but this sprint's rules function returns a narrowed type (e.g. `CodeGround & { ground: V1SpottedGround }`) so a rule emitting `religion` fails to compile rather than reaching a user.

9. Grounds are expressed as plausible and worth examining, never as established, and never as a finding of liability. No output states a likelihood, a predicted outcome, or a percentage — a PRD out-of-scope item treated here as a correctness requirement.

10. The prose layer sits behind a single module boundary. The rules modules do not import it, and that direction is verified by reading imports.

11. If the prose layer fails, times out, or has no API key, the app degrades to the structured rules output rather than failing the request. Legal content never depends on model availability.

12. Modifications to `lib/types.ts` are **bounded to finalizing `ProceduralCheckItem`** (currently a Sprint 5-owned stub) **and adding the narrowed rules return type from requirement 8**. No other domain type changes shape. Anything else that looks wrong gets flagged to Master Controller, not fixed in passing.

13. Vitest coverage for: a `medical-absence` concern identifying disability; a concern set identifying multiple grounds; a situation identifying no ground (returns empty, asserts nothing); every `reported: false` prompt yielding `insufficient-information` rather than `not-done`; a whitespace-only reported response also yielding `insufficient-information`; a formal-complaint-lodged situation producing a counsel trigger; determinism across repeated runs; a test asserting the rules modules do not import the prose module; and a test asserting the prose payload contains no narrative or raw fact text.

### Amendment 1 — 2026-08-18, after QA1 round 1 (CONDITIONAL), Master Controller

QA1's HIGH finding is correct and the root cause is this sprint's
definition, not Dev Team's implementation. Requirement 3 asked for a
"documentation requested before denial" check, and Sprint 3's intake asks a
narrative question that establishes *what* was exchanged but never *when*
relative to a denial. Free text cannot settle sequence deterministically,
and the rules path is correctly forbidden from calling a model, so there is
no route from the current intake to a defensible "done". That gap is
Master Controller's, from the original breakdown.

The consequence is worse than a missing feature. An employer describing
"she gave us a doctor's note after we had already denied the request" is
describing the precise procedural gap this product exists to spot, and the
tool answers that the step is satisfied — then suppresses the one internal
action that would have helped, because the trigger only fires when the
status is not "done". Confident and inverted is the worst output this
product can produce.

**Decision: both of QA1's paths, sequenced.** The safety fix lands here.
The intake question lands in Sprint 8, which is created and must close
before Sprint 6 renders a checklist to any human. Shipping the inert
version to users and changing it afterwards is worse than spending the
sprint first, and the PRD is explicit that this checklist is worth getting
right ahead of more surface features.

Note that "inert" overstates it. With item 1 no longer claiming "done", the
internal-action trigger fires correctly, so v1 output becomes "not enough
information on these three items" plus "request a functional abilities
form". That is honest triage, not a blank.

14. The "documentation requested before denial" item returns `insufficient-information` in all cases, because no current intake field establishes sequence. Implement this as an **explicit, commented guard naming the reason and referencing Sprint 8** — not as a silent fallthrough, and not by deleting the item. Sprint 8 replaces the guard with a real mapping; a reader must be able to see that this is a known limitation with an owner, not an oversight.
15. Vitest: a `Situation` whose documentation response describes documentation received *after* a denial must not yield `done`. Use QA1's wording as the fixture — it is the exact failure found in round 1.
16. Vitest: assert that no checklist item can return `done` for any `Situation` constructible from the current intake surface. This pins the present limitation deliberately, so Sprint 8 removing it is a visible, intentional change rather than a silent behaviour shift.
17. The internal-action escalation trigger firing as a result of requirement 14 is **intended**, not a regression. Do not add a compensating condition to keep it quiet.

### Acceptance Criteria

- QA1 confirms by reading imports that the rules modules contain no model call, no network call, and no import of the prose module.
- QA1 confirms the ground mapping is a separate named export and does **not** import or chain `lib/concern-fact-pattern-bridge.ts`.
- QA1 confirms the rules return type narrows `ground` to `V1SpottedGround`, and that a rule emitting a non-v1 ground would fail to compile.
- **QA1 inspects the exact object handed to the prose layer and confirms it carries no `narrative`, no raw `facts` text, and no verbatim-derived `triggeredBy` strings.** Personal data reaching a third-party API is a FAIL regardless of how well the rest of the sprint is built.
- QA1 confirms `insufficient-information` is genuinely distinct from `not-done` in both the type and the logic, including the whitespace case.
- QA1 confirms an `EscalationTrigger[]` producer exists and splits by `EscalationTriggerKind`.
- QA1 confirms the requirement 14 guard is explicit and commented, references Sprint 8, and that the checklist item was not deleted to make the problem disappear.
- QA1 confirms the requirements 15 and 16 tests exist and pass, including the after-denial fixture.
- QA1 confirms no compensating logic was added to suppress the internal-action trigger.
- QA1 confirms every identified ground carries traceability to the intake facts that triggered it.
- QA1 reads the ground rules and confirms no rule asserts a legal conclusion, and greps the diff for liability, likelihood, probability, and percentage language in generated output.
- QA1 confirms `lib/types.ts` changes are bounded to requirement 12.
- QA1 runs the Vitest suite and confirms all nine cases in requirement 13 exist and pass, re-running to confirm determinism.

**GroundTruth** — this sprint ships pure logic with no user-visible surface.
Rules output is not rendered until Sprint 6, so a scenario cannot be run
through the deployed app here. *The previous draft asked GroundTruth to do
exactly that, which was untestable — the same defect as Sprint 1's
requirement 8, pointed the other way.* Gate 2's honest scope is
non-regression, and the scenario-based checks move to Sprint 6:

- The deployed app still builds and loads at the recorded URL with no console errors.
- The full Sprint 3 intake flow still completes, including per-prompt validation, the "nothing yet" affordance, and back-navigation preserving data.
- The Sprint 1 disclaimer banner is present throughout.
- **No grounds, checklist, or trigger output is user-visible.** If analysis output has appeared in the UI, that is a scope violation and a FAIL — Sprint 6 owns rendering, behind an acknowledgment gate that does not exist yet.

### Out of Scope

- Rendering anything. Sprint 6 owns the results view, the acknowledgment gate, and displaying triggers. This sprint produces the structured content Sprint 6 renders.
- Attaching matched cases to output. Sprint 4 produces matches, Sprint 6 combines them; the spotter never touches the library.
- Exhaustive coverage of all fifteen Code grounds. Four is the PRD's v1 scope, enforced by requirement 8.
- Tuning rules against Chang's benchmark set, which still does not exist. A benchmark miss is a labelled example for improving the rules, not a shipped defect.
- Deciding what may be stored about a session. That is the open CLAUDE.md question blocking Sprint 8. Requirement 6 constrains *transmission* only and does not settle storage.

### Dependencies

- Blocks: Sprint 6.
- Blocked by: Sprints 1, 3, and 4, all closed. *(The previous draft justified the Sprint 4 dependency as "so Sprint 6 can combine both", which is not a dependency of this sprint at all — the spotter never consumes matches. Corrected for accuracy.)*
- External: an LLM API key for the prose layer only. Requirement 11's degradation path means a missing key does not block this sprint's legal content or its gates.
- External, **open**: Chang's review of the ground rules and the procedural checklist items. QA1 verifies structure, traceability, and the absence of legal conclusions; QA1 cannot verify the rules are *legally correct*, because that is law, not code. This is the standing limit of both gates, and it matters more here than anywhere else in the project. **Chang should review this sprint's rules output before Sprint 6 renders it to anyone.**

### Team Assignments

- **Dev Team 1, running alone. No worktree** — Sprint 6 is blocked by this sprint, so nothing is concurrent.

### Risks & Mitigations

- Employee personal data is sent to a third-party model API before anyone decided it could be — requirement 6 constrains the payload structurally and QA1 inspects the actual object, not the intent.
- The model quietly acquires decision authority — "just let it suggest grounds too" — collapsing the architecture this sprint exists to establish — requirements 6, 8, and 10 make it structural; requirement 13 tests the import direction.
- Rules assert a procedural failure the intake never established, telling an employer they breached a duty when the question was never asked — requirement 5's three-state mapping, tested including the whitespace case.
- Ground rules are legally wrong and no gate can catch it — flagged as an open external dependency; needs Chang before Sprint 6 renders anything.
- The prose layer rewrites a hedged statement into a confident one — structured output remains the source of truth per requirement 11, and Sprint 6's GroundTruth pass checks rendered wording.
- Escalation triggers get skipped because Sprint 6 appears to own them — requirement 4 assigns production here explicitly, with a Vitest case and an acceptance criterion.
