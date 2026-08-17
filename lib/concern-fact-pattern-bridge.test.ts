import { describe, expect, it } from "vitest";
import { CONCERN_TO_FACT_PATTERN_BRIDGE } from "./concern-fact-pattern-bridge";

describe("CONCERN_TO_FACT_PATTERN_BRIDGE", () => {
  it("is many-to-many: at least one concern maps to two or more fact patterns", () => {
    const multiValued = Object.values(CONCERN_TO_FACT_PATTERN_BRIDGE).filter(
      (tags) => tags.length >= 2,
    );
    expect(multiValued.length).toBeGreaterThan(0);
  });

  it("is many-to-many: at least one fact pattern is reached by two or more concerns", () => {
    const counts = new Map<string, number>();
    for (const tags of Object.values(CONCERN_TO_FACT_PATTERN_BRIDGE)) {
      for (const tag of tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    expect([...counts.values()].some((count) => count >= 2)).toBe(true);
  });

  it("maps every concern to at least one fact pattern", () => {
    for (const tags of Object.values(CONCERN_TO_FACT_PATTERN_BRIDGE)) {
      expect(tags.length).toBeGreaterThan(0);
    }
  });
});
