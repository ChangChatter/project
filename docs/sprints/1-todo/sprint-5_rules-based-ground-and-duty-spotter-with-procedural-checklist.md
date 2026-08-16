---
id: 5
title: "Rules-based ground and duty spotter with procedural checklist"
epic: "Analysis"
status: todo
created: 2026-08-15T19:57:29+00:00
---

# Master Controller Sprint Definition — Sprint 5

**Epic:** Analysis
**Sprint Objective:** Deliver the deterministic rules engine that maps a `Situation` to plausible BC Human Rights Code grounds and to duty-to-accommodate procedural gaps, with an LLM used only to phrase the result in plain language.

### Context

The PRD calls this the most legally substantive part of the product and says
it is worth getting right over building more surface features. It is also
the sprint where the project's central architectural decision lands: ground
identification and the procedural checklist are **rules**, and the model
only rewrites the finished result into readable prose. The model never
decides which ground applies and never selects a case.

That split is what makes the rest of the standards coherent. Rules are
unit-testable, so the Vitest requirement is satisfiable. Rules are
auditable, so QA1 can read the logic and check it against the Code rather
than assessing a prompt. And because citations are attached after the model
runs, the model is never in a position to paraphrase a case into a citation
— the failure mode that already occurred once in this project's own PRD.

### Requirements

1. A pure rules function taking a `Situation` and returning identified `CodeGround[]` with, for each, the specific intake facts that triggered it. Every ground is traceable to its inputs.
2. A pure rules function returning a `ProceduralCheckItem[]` covering duty-to-accommodate line items — including, at minimum, whether medical or functional-abilities documentation was requested before a request was denied, whether alternative arrangements were explored, and whether the accommodation analysis was documented.
3. Procedural items carry a status distinguishing "done", "not done", and "not enough information provided", so the output never asserts a gap the intake did not actually establish.
4. Both functions are deterministic and pure: no model call, no network, no clock, no randomness. Same input, same output, always.
5. Ground identification operates over the `V1_SPOTTED_GROUNDS` constant defined in Sprint 1 Amendment 1 — disability, family status, sex, and age — not over the full statutory union. Harassment is a fact pattern, not a ground, and a poisoned-work-environment situation is identified through the sex (or other applicable) ground plus the harassment `factPatternTag`. Grounds are expressed as plausible and worth examining, never as established or as a finding of liability.
6. The LLM is used **only** to convert the completed rules output into plain-language prose. It receives the already-decided grounds and checklist as input. It does not receive the seed library, does not select grounds, does not select cases, and does not generate citations.
7. The prose layer is isolated behind a single module boundary, so QA1 can verify by reading imports that no model call exists inside the rules path.
8. If the prose layer fails or is unavailable, the app degrades to the structured rules output rather than failing the request. The legal content must not depend on model availability.
9. No output from this sprint states a likelihood of liability, a predicted outcome, or a percentage. This is a PRD out-of-scope item and is treated here as a correctness requirement.
10. Vitest coverage for: each of the four fact patterns identifying its expected ground; a situation with insufficient information producing "not enough information" items rather than asserted gaps; a situation identifying multiple grounds; determinism across repeated runs; and a test asserting the rules module has no dependency on the prose module.

### Acceptance Criteria

- QA1 confirms by reading imports that the rules modules contain no model call, no network call, and no import of the prose module — requirement 7's boundary is real, not conventional.
- QA1 confirms every identified ground carries traceability to the intake facts that triggered it.
- QA1 confirms the three-state procedural status exists and that "not enough information" is genuinely distinct from "not done" in both the type and the logic.
- QA1 reads the ground rules against the four fact patterns and confirms the mapping is defensible and that no rule asserts a legal conclusion.
- QA1 greps the diff for liability, likelihood, probability, and percentage language in generated output and confirms none is present.
- QA1 runs the Vitest suite and confirms all cases in requirement 10 exist and pass.
- GroundTruth runs a disability/accommodation scenario through the deployed app and confirms a disability ground is identified with plain-language explanation.
- GroundTruth runs a scenario with deliberately sparse facts and confirms the procedural checklist reports missing information rather than asserting the employer failed a step.
- GroundTruth confirms no output anywhere predicts an outcome or states a likelihood.
- GroundTruth confirms the disclaimer banner remains present throughout.

### Out of Scope

- Rendering the issue guide, the acknowledgment gate, and escalation triggers. Sprint 6 owns all of that; this sprint produces the structured content it renders.
- Attaching matched cases to the output. Sprint 4 produces matches and Sprint 6 renders them; the spotter does not touch the library.
- Exhaustive coverage of every protected ground in the BC Human Rights Code. Four fact patterns is the PRD's v1 scope; more grounds is a later sprint.
- Tuning rules against Chang's benchmark set, which does not exist yet. The PRD is explicit that a benchmark miss is a labelled example for improving the tag set, not a shipped defect — so tuning is expected follow-on work, not a gate on this sprint.

### Dependencies

- Blocks: Sprint 6.
- Blocked by: Sprint 1 (types), Sprint 3 (`Situation`), Sprint 4 (matching, so Sprint 6 can combine both).
- External: an LLM API key and provider for the prose layer only. Requirement 8's degradation path means a missing key does not block the sprint's legal content.

### Risks & Mitigations

- The model quietly acquires decision-making authority — "just let it suggest grounds too" — collapsing the architecture this sprint exists to establish — Requirements 6 and 7 make it a structural boundary, requirement 10 tests the dependency direction, and QA1 verifies by reading imports rather than trusting the description.
- Rules assert a procedural failure the intake never established, producing a confidently wrong statement about an employer's conduct — requirement 3's three-state status, tested in requirement 10 and verified live by GroundTruth with sparse input.
- Legal rules encoded incorrectly. QA1 is a code auditor, not counsel, and this is the limit of what the gates can catch — QA1 verifies structure, traceability, and absence of legal conclusions; substantive legal correctness of the rules needs Chang's review, which should happen against this sprint's output before Sprint 6 renders it to anyone.
- Prose layer rewrites a hedged statement into a confident one — the structured rules output is the source of truth and remains available per requirement 8; GroundTruth checks the rendered wording for asserted conclusions.
