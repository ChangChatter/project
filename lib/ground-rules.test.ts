import { describe, expect, it } from "vitest";
import type { Situation } from "./types";
import { identifyGrounds } from "./ground-rules";

function fixtureSituation(overrides: Partial<Situation> = {}): Situation {
  return {
    metadata: {
      province: "BC",
      employmentStatus: "active",
      tenure: "2 years",
      formalComplaintsLodged: false,
      submittedAt: "2026-08-18T00:00:00.000Z",
    },
    concerns: ["medical-absence"],
    narrative: "",
    facts: [{ reported: false }, { reported: false }, { reported: false }],
    ...overrides,
  };
}

describe("identifyGrounds", () => {
  it("identifies disability for a medical-absence concern", () => {
    const grounds = identifyGrounds(fixtureSituation({ concerns: ["medical-absence"] }));
    expect(grounds.map((g) => g.ground)).toContain("physical or mental disability");
  });

  it("identifies multiple grounds for a multi-concern situation", () => {
    const grounds = identifyGrounds(
      fixtureSituation({ concerns: ["medical-absence", "interpersonal-conflict"] }),
    );
    const groundNames = grounds.map((g) => g.ground);
    expect(groundNames).toContain("physical or mental disability");
    expect(groundNames).toContain("sex");
    expect(groundNames.length).toBeGreaterThan(1);
  });

  it("identifies no ground and asserts nothing for a schedule-flexibility-only situation", () => {
    // schedule-flexibility deliberately maps to no ground on its own — a
    // scheduling preference is routinely unrelated to any protected
    // characteristic, and asserting one anyway would be the over-eager
    // pattern requirement 9 forbids.
    const grounds = identifyGrounds(fixtureSituation({ concerns: ["schedule-flexibility"] }));
    expect(grounds).toEqual([]);
  });

  it("traces every ground to the triggering concern, never to narrative text", () => {
    const grounds = identifyGrounds(
      fixtureSituation({
        concerns: ["medical-absence"],
        narrative: "some free text that must never appear in triggeredBy",
      }),
    );
    for (const ground of grounds) {
      for (const trigger of ground.triggeredBy) {
        expect(trigger.startsWith("concern: ")).toBe(true);
      }
    }
  });
});
