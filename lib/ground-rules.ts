import type { ConcernCategory, IdentifiedGround, Situation, V1SpottedGround } from "./types";
import { V1_SPOTTED_GROUNDS } from "./types";

/**
 * Maps intake concerns to plausibly-engaged v1 Code grounds. This is a
 * separate, purpose-built mapping — NOT derived by chaining Sprint 4's
 * `CONCERN_TO_FACT_PATTERN_BRIDGE`. Chaining would be lossy and wrong in
 * general: the fact-pattern bridge answers "which cases resemble this",
 * this answers "which grounds are plausibly engaged", and collapsing the
 * two loses the harassment case specifically — harassment under the Code
 * is discrimination *on the basis of* a ground, not a ground itself, so
 * the `harassment-poisoned-work-environment` fact pattern by itself
 * implies no particular ground. `interpersonal-conflict` still maps to
 * `sex` below, not because harassment fixes a ground, but because sex is
 * the ground most commonly underlying a poisoned-work-environment
 * complaint absent more specific information — a plausible starting
 * point, not an inference from the fact pattern.
 *
 * `schedule-flexibility` deliberately maps to nothing: unlike the other
 * three concerns, a scheduling request is routinely pure preference with
 * no connection to a protected characteristic at all, and asserting one
 * anyway would be the exact over-eager pattern requirement 9 forbids.
 * This is also what makes `identifyGrounds` genuinely able to return
 * empty for a real concern, not just an unreachable type.
 *
 * This mapping is a legal judgment; see Sprint 5 Dependencies for the
 * standing Chang-review note.
 */
export const CONCERN_TO_GROUND: Record<ConcernCategory, readonly V1SpottedGround[]> = {
  "medical-absence": ["physical or mental disability", "family status", "age"],
  "schedule-flexibility": [],
  "interpersonal-conflict": ["sex"],
  "performance-management": ["age", "physical or mental disability"],
};

/**
 * Identifies plausible v1 Code grounds for a Situation. Pure: no model
 * call, no network, no clock, no randomness. Every ground is traceable to
 * the concern(s) that triggered it — never to raw narrative or facts
 * text, which keeps traceability itself safe to include in the prose
 * payload (Sprint 5 requirement 6).
 */
export function identifyGrounds(situation: Situation): IdentifiedGround[] {
  const byGround = new Map<V1SpottedGround, string[]>();

  for (const concern of situation.concerns) {
    for (const ground of CONCERN_TO_GROUND[concern]) {
      const triggeredBy = byGround.get(ground) ?? [];
      triggeredBy.push(`concern: ${concern}`);
      byGround.set(ground, triggeredBy);
    }
  }

  // Deterministic order: iterate V1_SPOTTED_GROUNDS's own declared order
  // (lib/types.ts) rather than Map insertion order, which would depend on
  // situation.concerns' order. Importing the constant rather than
  // duplicating it means a fifth v1 ground added there is included here
  // automatically instead of silently dropped by a stale local copy.
  return V1_SPOTTED_GROUNDS.filter((ground) => byGround.has(ground)).map((ground) => ({
    ground,
    triggeredBy: byGround.get(ground)!,
  }));
}
