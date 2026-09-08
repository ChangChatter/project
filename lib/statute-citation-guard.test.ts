import { describe, expect, it } from "vitest";
import type { StatuteReference } from "./types";
import {
  checkStatuteCitationGuard,
  STATUTE_REFERENCE_LIBRARY,
} from "./statute-citation-guard";

function libraryEntry(overrides: Partial<StatuteReference> = {}): StatuteReference {
  return {
    id: "test-statute-1",
    statute: "Human Rights Code, RSBC 1996, c. 210",
    section: "ss. 13, 43",
    ...overrides,
  };
}

describe("checkStatuteCitationGuard", () => {
  it("passes a candidate matching a library entry by id and text", () => {
    const entry = libraryEntry();
    const result = checkStatuteCitationGuard(entry, [entry]);
    expect(result).toEqual({ passed: true, reference: entry });
  });

  it("withholds a candidate whose id is not in the library, rather than rendering it", () => {
    const library = [libraryEntry({ id: "known" })];
    const candidate = libraryEntry({ id: "unknown" });

    const result = checkStatuteCitationGuard(candidate, library);
    expect(result.passed).toBe(false);
  });

  it("withholds a candidate whose text has drifted from the library entry for that id", () => {
    const library = [libraryEntry({ id: "known" })];
    const candidate = libraryEntry({ id: "known", section: "s. 999" });

    const result = checkStatuteCitationGuard(candidate, library);
    expect(result.passed).toBe(false);
  });

  it("does not throw on malformed input — null", () => {
    expect(() => checkStatuteCitationGuard(null, [libraryEntry()])).not.toThrow();
    expect(checkStatuteCitationGuard(null, [libraryEntry()]).passed).toBe(false);
  });

  it("does not throw on malformed input — a string", () => {
    expect(() => checkStatuteCitationGuard("not an object", [libraryEntry()])).not.toThrow();
    expect(checkStatuteCitationGuard("not an object", [libraryEntry()]).passed).toBe(false);
  });

  it("does not throw on malformed input — missing id", () => {
    const candidate = { statute: "Something", section: "s. 1" };
    expect(() => checkStatuteCitationGuard(candidate, [libraryEntry()])).not.toThrow();
    expect(checkStatuteCitationGuard(candidate, [libraryEntry()]).passed).toBe(false);
  });

  it("fails on an empty library", () => {
    const result = checkStatuteCitationGuard(libraryEntry(), []);
    expect(result.passed).toBe(false);
  });

  it("the real STATUTE_REFERENCE_LIBRARY has no duplicate ids", () => {
    const ids = STATUTE_REFERENCE_LIBRARY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
