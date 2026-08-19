import type { EscalationTrigger, ProceduralCheckItem, Situation } from "./types";

/** Simple, auditable substring check — no NLP, matches Sprint 4's precedent. */
function mentionsTermination(text: string): boolean {
  return /terminat/i.test(text);
}

/**
 * Identifies escalation triggers for a Situation, split into internal
 * actions and counsel triggers by `EscalationTriggerKind`. Pure: no
 * model call, no network, no clock, no randomness.
 *
 * Two rules directly from the PRD (Sprint 5 requirement 4):
 * 1. A formal complaint already lodged — `IntakeMetadata.formalComplaintsLodged`.
 * 2. Termination being considered for an employee connected to a
 *    medical-absence concern — the `medical-absence` concern plus the
 *    third fact prompt ("what action is the employer considering")
 *    mentioning termination. A simple substring check, not semantic
 *    inference — the same precedent Sprint 4 established for keyword
 *    matching.
 *
 * One internal-action trigger, tied to this sprint's own procedural
 * checklist rather than the PRD's counsel examples: if the
 * "documentation-requested" item is `not-done` or
 * `insufficient-information`, suggest requesting a functional abilities
 * form — Sprint 6 requirement 3's own worked example for an internal
 * action. Deliberately excludes `not-applicable` (Sprint 8 requirement
 * 20): an employer who never had a request to deny has no accommodation
 * question to clarify, so firing this trigger there would be noise, not
 * help.
 */
export function identifyEscalationTriggers(
  situation: Situation,
  proceduralChecklist: readonly ProceduralCheckItem[],
): EscalationTrigger[] {
  const triggers: EscalationTrigger[] = [];

  if (situation.metadata.formalComplaintsLodged) {
    triggers.push({
      kind: "counsel-trigger",
      label: "Formal complaint already lodged",
      description:
        "A formal complaint has already been lodged in connection with this situation — consult counsel before taking further action.",
    });
  }

  const actionPrompt = situation.facts[2];
  const consideringTermination = actionPrompt.reported && mentionsTermination(actionPrompt.text);
  if (situation.concerns.includes("medical-absence") && consideringTermination) {
    triggers.push({
      kind: "counsel-trigger",
      label: "Termination being considered for a medical-absence concern",
      description:
        "Termination is being considered for an employee connected to a medical-absence concern — consult counsel before proceeding with any termination or discipline decision.",
    });
  }

  const documentationItem = proceduralChecklist.find(
    (item) => item.id === "documentation-requested",
  );
  if (
    documentationItem &&
    (documentationItem.status === "not-done" ||
      documentationItem.status === "insufficient-information")
  ) {
    triggers.push({
      kind: "internal-action",
      label: "Request a functional abilities form",
      description:
        "Request a functional abilities form or medical documentation to clarify the accommodation request before proceeding.",
    });
  }

  return triggers;
}
