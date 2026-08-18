import type { AnalysisResult } from "./analysis";

export interface ProsePayloadGround {
  ground: string;
}

export interface ProsePayloadChecklistItem {
  label: string;
  status: string;
}

export interface ProsePayloadTrigger {
  kind: string;
  label: string;
}

/**
 * The exact shape handed to the prose layer. Built only from the rules'
 * structured output (`AnalysisResult`) — this function does not take a
 * `Situation` as an argument at all, so `narrative`, raw `facts` text,
 * and verbatim-derived strings are structurally impossible to include,
 * not merely omitted by convention. Sprint 5 requirement 6, the most
 * consequential change at this sprint's pre-review: the narrative
 * describes a real, non-consenting employee, and sending it to a
 * third-party API is an irreversible disclosure nobody has decided to
 * make.
 *
 * Ground `triggeredBy` entries are safe to have used as an input to
 * building this (they were never here to begin with) — they are
 * `"concern: <ConcernCategory>"` strings, a closed vocabulary, not
 * anything derived from free text.
 */
export interface ProsePayload {
  grounds: ProsePayloadGround[];
  checklist: ProsePayloadChecklistItem[];
  triggers: ProsePayloadTrigger[];
}

/** Pure. No I/O. */
export function buildProsePayload(result: AnalysisResult): ProsePayload {
  return {
    grounds: result.grounds.map((g) => ({ ground: g.ground })),
    checklist: result.proceduralChecklist.map((item) => ({
      label: item.label,
      status: item.status,
    })),
    triggers: result.escalationTriggers.map((trigger) => ({
      kind: trigger.kind,
      label: trigger.label,
    })),
  };
}
