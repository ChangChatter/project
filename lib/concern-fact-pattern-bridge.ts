import type { ConcernCategory, FactPatternTag } from "./types";

/**
 * Maps intake's operational concern vocabulary (`ConcernCategory`) onto
 * the seed library's legal fact-pattern vocabulary (`FactPatternTag`).
 * Many-to-many by design — see Sprint 4 requirement 3: a one-to-one map
 * would hand the employer's own framing straight back to them as the
 * tool's analysis, which is exactly the failure mode the Sprint 3
 * vocabulary split exists to prevent.
 *
 * This is a legal judgment encoded as data, not a technical choice.
 * Neither QA1 nor GroundTruth can confirm these mappings are legally
 * sound — only that the constant is many-to-many, exported, and
 * commented. Chang should review this before Sprint 6 renders anything
 * derived from it (see Sprint 4 Dependencies).
 */
export const CONCERN_TO_FACT_PATTERN_BRIDGE: Record<
  ConcernCategory,
  readonly FactPatternTag[]
> = {
  // Absence for medical reasons plausibly implicates the employee's own
  // disability, but also family status (absence to care for a relative)
  // and age (age-linked health conditions).
  "medical-absence": [
    "disability-accommodation",
    "family-status",
    "age-termination",
  ],
  // Requests to adjust a schedule are plausibly a disability
  // accommodation request, or a family-status accommodation request
  // (childcare/eldercare).
  "schedule-flexibility": ["disability-accommodation", "family-status"],
  // Interpersonal conflict is the direct harassment/poisoned-environment
  // fact pattern, but conflict can also arise from friction over an
  // unresolved accommodation request.
  "interpersonal-conflict": [
    "harassment-poisoned-work-environment",
    "disability-accommodation",
  ],
  // A performance-management concern plausibly implicates age (a
  // performance narrative preceding termination near retirement age) or
  // disability (performance decline arising from an unaccommodated
  // condition).
  "performance-management": ["age-termination", "disability-accommodation"],
};
