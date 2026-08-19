import { describe, expect, it } from "vitest";
import type { ProceduralCheckItem, Situation } from "./types";
import { identifyEscalationTriggers } from "./escalation-trigger-rules";

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
    dutyToAccommodate: {
      requestStatus: "not-sure",
      documentationTiming: null,
      alternativesExplored: "not-sure",
      writtenRecord: "not-sure",
    },
    ...overrides,
  };
}

const noChecklist: ProceduralCheckItem[] = [];

describe("identifyEscalationTriggers", () => {
  it("produces a counsel trigger when a formal complaint has been lodged", () => {
    const triggers = identifyEscalationTriggers(
      fixtureSituation({
        metadata: {
          province: "BC",
          employmentStatus: "active",
          tenure: "2 years",
          formalComplaintsLodged: true,
          submittedAt: "2026-08-18T00:00:00.000Z",
        },
      }),
      noChecklist,
    );

    expect(
      triggers.some(
        (t) => t.kind === "counsel-trigger" && t.label === "Formal complaint already lodged",
      ),
    ).toBe(true);
  });

  it("produces a counsel trigger for termination considered on a medical-absence concern", () => {
    const triggers = identifyEscalationTriggers(
      fixtureSituation({
        concerns: ["medical-absence"],
        facts: [
          { reported: false },
          { reported: false },
          { reported: true, text: "We are considering termination of employment." },
        ],
      }),
      noChecklist,
    );

    expect(triggers.some((t) => t.kind === "counsel-trigger")).toBe(true);
  });

  it("produces an internal-action trigger when documentation-requested is not done", () => {
    const triggers = identifyEscalationTriggers(fixtureSituation(), [
      { id: "documentation-requested", label: "x", status: "insufficient-information" },
    ]);

    expect(
      triggers.some((t) => t.kind === "internal-action" && t.label.includes("functional abilities")),
    ).toBe(true);
  });

  it("Sprint 8 requirement 13: fires for a not-done status but not for a done status", () => {
    const nonCompliant = identifyEscalationTriggers(fixtureSituation(), [
      { id: "documentation-requested", label: "x", status: "not-done" },
    ]);
    expect(
      nonCompliant.some((t) => t.kind === "internal-action" && t.label.includes("functional abilities")),
    ).toBe(true);

    // A fully compliant, otherwise-quiet situation (no complaint lodged,
    // no termination under consideration) now correctly produces an
    // empty trigger list — Sprint 6 requirement 4's standing counsel
    // trigger provides the "at least one" guarantee at render time.
    const compliant = identifyEscalationTriggers(fixtureSituation(), [
      { id: "documentation-requested", label: "x", status: "done" },
    ]);
    expect(compliant).toEqual([]);
  });

  it("Sprint 8 requirement 20: does not fire when documentation-requested is not-applicable", () => {
    const triggers = identifyEscalationTriggers(fixtureSituation(), [
      { id: "documentation-requested", label: "x", status: "not-applicable" },
    ]);

    expect(triggers.some((t) => t.kind === "internal-action")).toBe(false);
  });
});
