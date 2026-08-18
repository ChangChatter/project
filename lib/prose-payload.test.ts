import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "./analysis";
import { buildProsePayload } from "./prose-payload";

const RAW_NARRATIVE_MARKER = "RAW-NARRATIVE-SHOULD-NEVER-APPEAR";

function fixtureAnalysisResult(): AnalysisResult {
  return {
    grounds: [
      {
        ground: "physical or mental disability",
        // A real triggeredBy entry is a closed "concern: X" string, but
        // even if something verbatim-derived slipped in here, the
        // assertions below confirm it cannot reach the payload — the
        // payload builder only ever reads `.ground`, never `.triggeredBy`.
        triggeredBy: [`concern: medical-absence (${RAW_NARRATIVE_MARKER})`],
      },
    ],
    proceduralChecklist: [
      { id: "documentation-requested", label: "Documentation requested", status: "done" },
    ],
    escalationTriggers: [
      {
        kind: "counsel-trigger",
        label: "Formal complaint already lodged",
        description: `A complaint was lodged (${RAW_NARRATIVE_MARKER} — description text, not sent)`,
      },
    ],
  };
}

describe("buildProsePayload", () => {
  it("contains no narrative or raw fact text, and no triggeredBy field at all", () => {
    const payload = buildProsePayload(fixtureAnalysisResult());
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain(RAW_NARRATIVE_MARKER);
    expect(serialized).not.toContain("triggeredBy");
    expect(serialized).not.toContain("narrative");
    expect(serialized).not.toContain("description");
  });

  it("grounds carry only the ground name — no other field", () => {
    const payload = buildProsePayload(fixtureAnalysisResult());
    for (const ground of payload.grounds) {
      expect(Object.keys(ground)).toEqual(["ground"]);
    }
  });

  it("checklist items carry only label and status", () => {
    const payload = buildProsePayload(fixtureAnalysisResult());
    for (const item of payload.checklist) {
      expect(Object.keys(item).sort()).toEqual(["label", "status"]);
    }
  });

  it("triggers carry only kind and label — never the description field", () => {
    const payload = buildProsePayload(fixtureAnalysisResult());
    for (const trigger of payload.triggers) {
      expect(Object.keys(trigger).sort()).toEqual(["kind", "label"]);
    }
  });
});
