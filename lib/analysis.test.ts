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
    dutyToAccommodate: {
      requestStatus: "not-sure",
      documentationTiming: null,
      alternativesExplored: "not-sure",
      writtenRecord: "not-sure",
    },
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
});
