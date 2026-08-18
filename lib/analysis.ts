import type {
  EscalationTrigger,
  IdentifiedGround,
  ProceduralCheckItem,
  Situation,
} from "./types";
import { identifyGrounds } from "./ground-rules";
import { buildProceduralChecklist } from "./procedural-checklist-rules";
import { identifyEscalationTriggers } from "./escalation-trigger-rules";

export interface AnalysisResult {
  grounds: IdentifiedGround[];
  proceduralChecklist: ProceduralCheckItem[];
  escalationTriggers: EscalationTrigger[];
}

/**
 * Runs all three rules functions against a Situation. Pure: no model
 * call, no network, no clock, no randomness — this module and everything
 * it imports never import the prose layer (Sprint 5 requirement 10).
 */
export function analyzeSituation(situation: Situation): AnalysisResult {
  const grounds = identifyGrounds(situation);
  const proceduralChecklist = buildProceduralChecklist(situation);
  const escalationTriggers = identifyEscalationTriggers(situation, proceduralChecklist);
  return { grounds, proceduralChecklist, escalationTriggers };
}
