import { describe, expect, it } from "vitest";
import type { Situation } from "./types";
import { analyzeSituation } from "./analysis";

function fixtureSituation(overrides: Partial<Situation> = {}): Situation {
  return {
    metadata: {
      province: "BC",
      employmentStatus: "active",
      tenure: "2 years",
      formalComplaintsLodged: true,
      submittedAt: "2026-08-18T00:00:00.000Z",
    },
    concerns: ["medical-absence", "interpersonal-conflict"],
    narrative: "",
    facts: [
      { reported: true, text: "Placed on leave after disclosing a condition." },
      { reported: false },
      { reported: true, text: "Considering termination of employment." },
    ],
    ...overrides,
  };
}

describe("analyzeSituation", () => {
  it("is deterministic across repeated runs", () => {
    const situation = fixtureSituation();
    const first = analyzeSituation(situation);
    const second = analyzeSituation(situation);
    expect(second).toEqual(first);
  });

  it("Amendment 1 requirement 17: the internal-action trigger fires on every result, not suppressed", () => {
    // documentation-requested is insufficient-information for every
    // constructible Situation since Amendment 1 requirement 14 — this is
    // intended to make the internal-action trigger fire more often, not
    // a regression to compensate for.
    const result = analyzeSituation(fixtureSituation());
    expect(
      result.escalationTriggers.some(
        (t) => t.kind === "internal-action" && t.label === "Request a functional abilities form",
      ),
    ).toBe(true);
  });
});
