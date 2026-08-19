import { describe, expect, it } from "vitest";
import type { DutyToAccommodateAnswers, Situation } from "./types";
import { buildProceduralChecklist } from "./procedural-checklist-rules";

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

function withAnswers(answers: Partial<DutyToAccommodateAnswers>): Situation {
  return fixtureSituation({
    dutyToAccommodate: {
      requestStatus: "not-sure",
      documentationTiming: null,
      alternativesExplored: "not-sure",
      writtenRecord: "not-sure",
      ...answers,
    },
  });
}

function documentationItem(situation: Situation) {
  return buildProceduralChecklist(situation).find((item) => item.id === "documentation-requested");
}

describe("buildProceduralChecklist — documentation-requested", () => {
  it("returns done when documentation was requested before the decision", () => {
    const item = documentationItem(
      withAnswers({ requestStatus: "denied", documentationTiming: "before-decision" }),
    );
    expect(item?.status).toBe("done");
  });

  it(
    "Sprint 8 requirement 7 (was Sprint 5 requirement 15): documentation received after a denial returns not-done",
    () => {
      // QA1's original wording, carried forward from Sprint 5: "She gave
      // us a doctor's note after we'd already denied the request."
      const item = documentationItem(
        withAnswers({ requestStatus: "denied", documentationTiming: "after-decision" }),
      );
      expect(item?.status).toBe("not-done");
    },
  );

  it("returns not-done when documentation was never requested despite a denial", () => {
    const item = documentationItem(
      withAnswers({ requestStatus: "denied", documentationTiming: "never-requested" }),
    );
    expect(item?.status).toBe("not-done");
  });

  it("returns insufficient-information when the timing answer is not sure", () => {
    const item = documentationItem(
      withAnswers({ requestStatus: "denied", documentationTiming: "not-sure" }),
    );
    expect(item?.status).toBe("insufficient-information");
  });

  it("returns not-applicable when no request was ever denied", () => {
    for (const requestStatus of ["agreed", "pending", "no-request"] as const) {
      const item = documentationItem(withAnswers({ requestStatus, documentationTiming: null }));
      expect(item?.status).toBe("not-applicable");
    }
  });

  it("returns insufficient-information, never not-applicable, when the request status itself is not sure", () => {
    const item = documentationItem(
      withAnswers({ requestStatus: "not-sure", documentationTiming: null }),
    );
    expect(item?.status).toBe("insufficient-information");
    expect(item?.status).not.toBe("not-applicable");
  });
});

describe("buildProceduralChecklist — alternatives-explored and analysis-documented", () => {
  it("map yes/no/not-sure to done/not-done/insufficient-information, never not-applicable", () => {
    const cases: Array<["yes" | "no" | "not-sure", string]> = [
      ["yes", "done"],
      ["no", "not-done"],
      ["not-sure", "insufficient-information"],
    ];
    for (const [answer, expected] of cases) {
      const items = buildProceduralChecklist(
        withAnswers({ alternativesExplored: answer, writtenRecord: answer }),
      );
      const alternatives = items.find((item) => item.id === "alternatives-explored");
      const analysis = items.find((item) => item.id === "analysis-documented");
      expect(alternatives?.status).toBe(expected);
      expect(analysis?.status).toBe(expected);
      expect(alternatives?.status).not.toBe("not-applicable");
      expect(analysis?.status).not.toBe("not-applicable");
    }
  });
});

describe("buildProceduralChecklist", () => {
  it("always includes all three requirement-3 line items", () => {
    const items = buildProceduralChecklist(fixtureSituation());
    expect(items.map((item) => item.id).sort()).toEqual([
      "alternatives-explored",
      "analysis-documented",
      "documentation-requested",
    ]);
  });
});
