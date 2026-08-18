import { afterEach, describe, expect, it, vi } from "vitest";

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

/** A real constructor (class), since prose-layer.ts calls `new Anthropic(...)`. */
function mockAnthropicSdk(create: () => Promise<unknown>) {
  vi.doMock("@anthropic-ai/sdk", () => {
    class MockAnthropic {
      messages = { create };
    }
    return { default: MockAnthropic };
  });
}

describe("generateProse", () => {
  it("returns null without an API key, rather than throwing or hanging", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { generateProse } = await import("./prose-layer");
    const result = await generateProse({ grounds: [], checklist: [], triggers: [] });
    expect(result).toBeNull();
  });

  it("returns null and logs (does not swallow silently) when the API call fails", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicSdk(() => Promise.reject(new Error("simulated network failure")));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { generateProse } = await import("./prose-layer");
    const result = await generateProse({ grounds: [], checklist: [], triggers: [] });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns null when the response has no text block (malformed response)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicSdk(() => Promise.resolve({ content: [{ type: "image" }] }));

    const { generateProse } = await import("./prose-layer");
    const result = await generateProse({ grounds: [], checklist: [], triggers: [] });

    expect(result).toBeNull();
  });

  it("returns the text block on a successful response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicSdk(() =>
      Promise.resolve({ content: [{ type: "text", text: "plain language result" }] }),
    );

    const { generateProse } = await import("./prose-layer");
    const result = await generateProse({ grounds: [], checklist: [], triggers: [] });

    expect(result).toBe("plain language result");
  });
});
