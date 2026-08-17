import { describe, expect, it } from "vitest";
import type { CaseExcerpt, Situation } from "./types";
import { matchCases } from "./case-matcher";
import { loadSeedLibrary } from "./seed-library";

function fixtureSituation(overrides: Partial<Situation> = {}): Situation {
  return {
    metadata: {
      province: "BC",
      employmentStatus: "active",
      tenure: "2 years",
      formalComplaintsLodged: false,
      submittedAt: "2026-08-17T00:00:00.000Z",
    },
    concerns: ["medical-absence"],
    narrative: "",
    facts: [{ reported: false }, { reported: false }, { reported: false }],
    ...overrides,
  };
}

function fixtureCase(overrides: Partial<CaseExcerpt> = {}): CaseExcerpt {
  return {
    id: "test-case-1",
    title: "Test fixture case",
    citation: "TEST-FIXTURE-1",
    groundTags: ["physical or mental disability"],
    factPatternTags: ["disability-accommodation"],
    outcomeType: "test",
    keyFinding: "test finding",
    sourceUrl: "https://example.invalid/test",
    verifiedBy: "test",
    verifiedDate: "2026-01-01",
    isPlaceholder: true,
    ...overrides,
  };
}

describe("matchCases", () => {
  it("matches a single-concern situation to its bridged fact pattern", () => {
    // medical-absence bridges to disability-accommodation.
    const situation = fixtureSituation({ concerns: ["medical-absence"] });
    const library = [fixtureCase({ id: "a", factPatternTags: ["disability-accommodation"] })];

    const results = matchCases(situation, library);

    expect(results).toHaveLength(1);
    expect(results[0].case.id).toBe("a");
    expect(results[0].matchedTags).toContainEqual({
      kind: "fact-pattern",
      tag: "disability-accommodation",
    });
  });

  it("matches a multi-concern situation against cases from either concern's bridged patterns", () => {
    const situation = fixtureSituation({
      concerns: ["medical-absence", "interpersonal-conflict"],
    });
    const library = [
      fixtureCase({ id: "a", factPatternTags: ["family-status"] }), // via medical-absence
      fixtureCase({
        id: "b",
        factPatternTags: ["harassment-poisoned-work-environment"],
      }), // via interpersonal-conflict
    ];

    const results = matchCases(situation, library);

    expect(results.map((r) => r.case.id).sort()).toEqual(["a", "b"]);
  });

  it("returns empty when nothing clears the relevance threshold", () => {
    const situation = fixtureSituation({ concerns: ["medical-absence"] });
    const library = [
      // harassment-poisoned-work-environment is not among
      // medical-absence's bridged patterns, and there is no keyword
      // overlap either, so this scores zero.
      fixtureCase({
        id: "a",
        factPatternTags: ["harassment-poisoned-work-environment"],
        title: "Unrelated",
        keyFinding: "Nothing in common with the situation text.",
      }),
    ];

    expect(matchCases(situation, library)).toEqual([]);
  });

  it("returns empty for a score strictly between zero and the threshold", () => {
    // No fact-pattern overlap at all (case has none), and exactly four
    // shared keywords at keywordWeight 2 each = 8, one weight short of
    // MATCH_CONFIG.relevanceThreshold (10) — pins the boundary itself,
    // not just the zero and comfortably-above-threshold cases.
    const situation = fixtureSituation({
      narrative: "boundarywordone boundarywordtwo boundarywordthree boundarywordfour",
    });
    const library = [
      fixtureCase({
        id: "a",
        factPatternTags: [],
        title: "boundarywordone boundarywordtwo",
        keyFinding: "boundarywordthree boundarywordfour",
      }),
    ];

    expect(matchCases(situation, library)).toEqual([]);
  });

  it("ranks deterministically, with explicit id tie-breaking, across repeated runs", () => {
    const situation = fixtureSituation({ concerns: ["medical-absence"] });
    const library = [
      fixtureCase({ id: "zzz", factPatternTags: ["disability-accommodation"] }),
      fixtureCase({ id: "aaa", factPatternTags: ["family-status"] }),
    ];

    const first = matchCases(situation, library).map((r) => r.case.id);
    const second = matchCases(situation, library).map((r) => r.case.id);

    expect(first).toEqual(second);
    // Equal scores (one fact-pattern hit each) -> id ascending.
    expect(first).toEqual(["aaa", "zzz"]);
  });

  it("runs correctly against the real, current all-placeholder library", () => {
    const library = loadSeedLibrary();
    expect(library.every((record) => record.isPlaceholder)).toBe(true);

    const situation = fixtureSituation({ concerns: ["medical-absence"] });
    const results = matchCases(situation, library);

    // medical-absence bridges to disability-accommodation, family-status,
    // and age-termination — three of the four seeded placeholders.
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.case.isPlaceholder)).toBe(true);
  });

  it("matches on an empty library", () => {
    expect(matchCases(fixtureSituation(), [])).toEqual([]);
  });

  it("excludes a not-reported facts entry from keyword matching", () => {
    // Fact-pattern match clears the threshold on its own, isolating the
    // keyword-matching assertion below from the threshold entirely.
    const situation = fixtureSituation({
      concerns: ["medical-absence"],
      facts: [
        { reported: true, text: "distinctivewordalpha" },
        { reported: false },
        { reported: false },
      ],
    });
    const library = [
      fixtureCase({
        id: "a",
        factPatternTags: ["disability-accommodation"],
        title: "distinctivewordalpha",
        keyFinding: "distinctivewordalpha",
      }),
    ];

    const results = matchCases(situation, library);
    expect(results).toHaveLength(1);
    // Exactly one keyword tag, from the single reported entry — a
    // not-reported entry has no `.text` to contribute a phantom match.
    const keywordTags = results[0].matchedTags.filter((tag) => tag.kind === "keyword");
    expect(keywordTags).toEqual([{ kind: "keyword", term: "distinctivewordalpha" }]);
  });

  it("bridges one concern to multiple fact patterns (many-to-many)", () => {
    // medical-absence alone bridges to disability-accommodation,
    // family-status, and age-termination.
    const situation = fixtureSituation({ concerns: ["medical-absence"] });
    const library = [
      fixtureCase({ id: "disability", factPatternTags: ["disability-accommodation"] }),
      fixtureCase({ id: "family", factPatternTags: ["family-status"] }),
    ];

    const results = matchCases(situation, library);
    const matchedFactPatterns = new Set(
      results.flatMap((r) =>
        r.matchedTags
          .filter((tag) => tag.kind === "fact-pattern")
          .map((tag) => tag.tag),
      ),
    );

    expect(matchedFactPatterns.size).toBeGreaterThanOrEqual(2);
  });
});
