import { describe, expect, it } from "vitest";
import type { Situation } from "./types";
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
    ...overrides,
  };
}

describe("buildProceduralChecklist", () => {
  it("yields insufficient-information, never not-done, for every reported: false prompt", () => {
    const items = buildProceduralChecklist(
      fixtureSituation({
        facts: [{ reported: false }, { reported: false }, { reported: false }],
      }),
    );

    for (const item of items) {
      expect(item.status).not.toBe("not-done");
    }
    const documentationItem = items.find((item) => item.id === "documentation-requested");
    expect(documentationItem?.status).toBe("insufficient-information");
  });

  it("yields insufficient-information for a whitespace-only reported response", () => {
    const items = buildProceduralChecklist(
      fixtureSituation({
        facts: [{ reported: false }, { reported: true, text: "   \n\t  " }, { reported: false }],
      }),
    );

    const documentationItem = items.find((item) => item.id === "documentation-requested");
    expect(documentationItem?.status).toBe("insufficient-information");
  });

  it(
    "Amendment 1 requirement 15: documentation received after a denial does not yield done",
    () => {
      // QA1 round 1's exact wording, used verbatim as the fixture per
      // Amendment 1 requirement 15 — this was the concrete reachable
      // failure the finding identified.
      const items = buildProceduralChecklist(
        fixtureSituation({
          facts: [
            { reported: false },
            {
              reported: true,
              text: "She gave us a doctor's note after we'd already denied the request.",
            },
            { reported: false },
          ],
        }),
      );

      const documentationItem = items.find((item) => item.id === "documentation-requested");
      expect(documentationItem?.status).not.toBe("done");
      expect(documentationItem?.status).toBe("insufficient-information");
    },
  );

  it("Amendment 1 requirement 16: no item returns done for any constructible Situation", () => {
    // Pins the present limitation deliberately (Amendment 1 requirement
    // 16) so Sprint 8 removing it is a visible, intentional change. Sweeps
    // a representative spread, including the most compliance-favorable
    // text an employer could plausibly write, since the old (rejected)
    // "any non-empty text = done" behaviour is exactly what this guards
    // against reintroducing.
    const concernOptions: Situation["concerns"][number][] = [
      "medical-absence",
      "schedule-flexibility",
      "interpersonal-conflict",
      "performance-management",
    ];
    const employmentStatusOptions: Situation["metadata"]["employmentStatus"][] = [
      "active",
      "suspended",
      "terminated",
    ];
    const factsOptions: Situation["facts"][] = [
      [{ reported: false }, { reported: false }, { reported: false }],
      [
        { reported: true, text: "   " },
        { reported: true, text: "   " },
        { reported: true, text: "   " },
      ],
      [
        {
          reported: true,
          text: "Documentation was requested before any denial, alternative arrangements were fully explored, and the accommodation analysis was documented in writing.",
        },
        {
          reported: true,
          text: "Documentation was requested before any denial, alternative arrangements were fully explored, and the accommodation analysis was documented in writing.",
        },
        {
          reported: true,
          text: "Documentation was requested before any denial, alternative arrangements were fully explored, and the accommodation analysis was documented in writing.",
        },
      ],
    ];

    for (const concern of concernOptions) {
      for (const employmentStatus of employmentStatusOptions) {
        for (const formalComplaintsLodged of [true, false]) {
          for (const facts of factsOptions) {
            const items = buildProceduralChecklist(
              fixtureSituation({
                concerns: [concern],
                metadata: {
                  province: "BC",
                  employmentStatus,
                  tenure: "2 years",
                  formalComplaintsLodged,
                  submittedAt: "2026-08-18T00:00:00.000Z",
                },
                facts,
              }),
            );
            for (const item of items) {
              expect(item.status).not.toBe("done");
            }
          }
        }
      }
    }
  });

  it("always includes all three requirement-3 line items", () => {
    const items = buildProceduralChecklist(fixtureSituation());
    expect(items.map((item) => item.id).sort()).toEqual([
      "alternatives-explored",
      "analysis-documented",
      "documentation-requested",
    ]);
  });
});
