import { afterEach, describe, expect, it, vi } from "vitest";
import type { Situation } from "./types";

function fixtureSituation(overrides: Partial<Situation> = {}): Situation {
  return {
    metadata: {
      province: "BC",
      employmentStatus: "active",
      tenure: "2 years",
      formalComplaintsLodged: true,
      submittedAt: "2026-08-18T00:00:00.000Z",
    },
    concerns: ["medical-absence"],
    narrative: "",
    facts: [{ reported: false }, { reported: false }, { reported: false }],
    ...overrides,
  };
}

const originalKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = originalKey;
  }
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("analyzeAndPhrase", () => {
  it("degrades to a null prose with a complete structured result when the prose layer is unavailable", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { analyzeAndPhrase } = await import("./issue-analysis");

    const result = await analyzeAndPhrase(fixtureSituation());

    expect(result.prose).toBeNull();
    // Requirement 11: legal content never depends on model availability —
    // the structured fields must still be complete.
    expect(result.grounds.length).toBeGreaterThan(0);
    expect(result.proceduralChecklist).toHaveLength(3);
    expect(result.escalationTriggers.length).toBeGreaterThan(0);
  });

  it("includes prose text when the prose layer succeeds", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    // A real constructor (class), since prose-layer.ts calls `new Anthropic(...)`.
    vi.doMock("@anthropic-ai/sdk", () => {
      class MockAnthropic {
        messages = {
          create: () =>
            Promise.resolve({ content: [{ type: "text", text: "plain language result" }] }),
        };
      }
      return { default: MockAnthropic };
    });

    const { analyzeAndPhrase } = await import("./issue-analysis");
    const result = await analyzeAndPhrase(fixtureSituation());

    expect(result.prose).toBe("plain language result");
  });
});
