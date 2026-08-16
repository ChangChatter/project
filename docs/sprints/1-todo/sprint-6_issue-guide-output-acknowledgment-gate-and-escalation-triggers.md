---
id: 6
title: "Issue guide output, acknowledgment gate, and escalation triggers"
epic: "Output and Guardrails"
status: todo
created: 2026-08-15T19:57:30+00:00
---

# Master Controller Sprint Definition — Sprint 6

**Epic:** Output and Guardrails
**Sprint Objective:** Render the complete issue guide — grounds, procedural checklist, matched cases, and next steps split into internal actions versus counsel triggers — behind a required disclaimer acknowledgment, with the citation guard enforced on every render.

### Context

This sprint assembles everything the previous five produced into the artifact
the employer actually reads, and it is where the PRD's non-negotiable
guardrails become enforced behaviour rather than stated policy. The
acknowledgment gate is the mitigation for the PRD's highest-impact risk —
a user mistaking this output for legal advice — and the citation guard from
Sprint 2 is wired in here, at the render path, which is the only place it
can actually prevent an unverified citation reaching a human.

Sprints 1 through 6 constitute a complete, demonstrable product. If the
workshop clock runs short, this is where the line is drawn: persistence and
export are Sprint 7 and can be dropped without the product ceasing to work.

### Requirements

1. A results view rendering the `IssueGuide`: identified grounds with plain-language explanation, the procedural checklist with its three-state status, matched cases, and next steps.
2. Matched cases display title, citation, core fact pattern, and key finding, per the PRD.
3. Next steps are visually and structurally separated into **internal actions** (e.g. request a functional abilities form) and **counsel triggers** (e.g. a complaint has already been filed; termination of an employee on medical leave is being considered). The separation must be unmistakable, not a subheading in a single list.
4. Every generated guide displays at least one escalation trigger. If the rules produce none, the guide displays the standing trigger that counsel should be consulted before any termination or discipline decision connected to a protected ground.
5. **Acknowledgment gate:** the user must explicitly acknowledge the disclaimer before any output is displayed. The output is not rendered behind a scroll, not blurred, not present in the DOM — it is not delivered to the client view until acknowledgment.
6. The acknowledgment is an affirmative action, not a pre-checked box, and its wording states that the tool is informational triage and does not constitute legal advice.
7. **The citation guard from Sprint 2 runs on every render.** If it fails, the guide renders without the case section and displays a clear notice that case references were withheld. It never renders an unverified citation, and never fails silently.
8. Placeholder case records are never rendered as though verified. Using the Sprint 2 flag, a guide whose matches are placeholders shows the case section as pending verification rather than showing `0000 BCHRT 0` to a user.
9. The Sprint 1 disclaimer banner remains visible on the results view, in addition to the acknowledgment gate. The two are separate controls and neither replaces the other.
10. Vitest coverage for: the guard being invoked on the render path; the withheld-cases path when the guard fails; the standing escalation trigger appearing when rules produce none; and placeholder records not rendering as verified.

### Acceptance Criteria

- QA1 confirms the citation guard is called on the render path and that its failure branch withholds cases rather than rendering them or throwing an unhandled error.
- QA1 confirms output content is not present in the client payload before acknowledgment — a CSS-hidden or blurred implementation is a FAIL.
- QA1 confirms the acknowledgment control is not pre-checked and requires an affirmative action.
- QA1 confirms internal actions and counsel triggers are separate structures in the data and the markup, not one list with a heading.
- QA1 runs the Vitest suite and confirms all four cases in requirement 10 exist and pass.
- GroundTruth loads the results route directly by URL without completing acknowledgment and confirms no guide content is visible or retrievable from the page source.
- GroundTruth completes a full intake, acknowledges, and confirms the guide renders with all four sections present.
- GroundTruth confirms internal actions and counsel triggers are visually distinguishable at a glance, without reading closely.
- GroundTruth confirms at least one escalation trigger appears, including on a scenario chosen to be as benign as the intake allows.
- GroundTruth confirms **every citation displayed traces to an entry in the seed library** — this is a PRD success metric and is checked, not assumed.
- GroundTruth confirms placeholder records render as pending verification rather than as case citations.
- GroundTruth confirms the disclaimer banner is present on the results view alongside the acknowledgment already given.

### Out of Scope

- Session persistence and PDF/text export. Sprint 7 owns both and is currently blocked pending privacy decisions.
- Print stylesheet work. It belongs with export in Sprint 7; recommended there over a PDF dependency.
- Editing or overriding the generated guide. Not a v1 feature and not in the PRD.
- Visual polish beyond the requirement 3 distinction and general legibility. The counsel-trigger separation is a safety requirement and gets real design attention; the rest does not need it this sprint.

### Dependencies

- Blocks: Sprint 7.
- Blocked by: Sprints 2, 4, and 5.
- External: Chang's review of Sprint 5's rules output before this is shown to anyone outside the workshop, and the PRD's open question on whether a liability/disclaimer review is required before real-situation use. Requirement 6's wording is a candidate legal artifact, not just copy — if that review is happening, its output lands here.

### Risks & Mitigations

- Acknowledgment implemented as a visual overlay with content already in the DOM, defeating the gate — requirement 5 states it explicitly, QA1 checks the client payload, and GroundTruth attempts direct URL access.
- Citation guard wired in but failing open under error, so the one mechanism protecting the product's core integrity constraint does nothing — requirement 7 mandates the withheld-cases path and requirement 10 tests it.
- Placeholder citations shown in a demo and taken as real — requirement 8 plus the deliberately absurd `0000 BCHRT 0` format from Sprint 2.
- A guide renders with no escalation trigger, leaving an employer with no counsel off-ramp — requirement 4's standing trigger guarantees one, and GroundTruth tests the most benign scenario available.
