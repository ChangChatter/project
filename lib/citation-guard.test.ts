import { describe, expect, it } from "vitest";
import type { CaseExcerpt, IssueGuide } from "./types";
import { checkCitationGuard } from "./citation-guard";

function libraryCase(overrides: Partial<CaseExcerpt> = {}): CaseExcerpt {
  return {
    id: "test-case-1",
    title: "[VERIFIED CASE CITATION NEEDED]",
    citation: "0000 BCHRT 0",
    groundTags: ["physical or mental disability"],
    factPatternTags: ["disability-accommodation"],
    outcomeType: "[PENDING VERIFICATION]",
    keyFinding: "[PENDING VERIFICATION]",
    sourceUrl: "https://example.invalid/pending-verification",
    verifiedBy: "[PENDING VERIFICATION]",
    verifiedDate: "0001-01-01",
    isPlaceholder: true,
    ...overrides,
  };
}

function guideWithMatch(caseExcerpt: CaseExcerpt): IssueGuide {
  return {
    casesWithheld: false,
    matches: [{ case: caseExcerpt, score: 1, matchedTags: [] }],
    grounds: [],
    proceduralChecklist: [],
    escalationTriggers: [],
  };
}

describe("checkCitationGuard", () => {
  it("passes a payload citing only library cases", () => {
    const library = [libraryCase()];
    const guide = guideWithMatch(libraryCase());

    expect(checkCitationGuard(guide, library)).toEqual({ passed: true });
  });

  it("fails a payload citing an unknown case", () => {
    const library = [libraryCase({ id: "known-case" })];
    const guide = guideWithMatch(libraryCase({ id: "unknown-case" }));

    const result = checkCitationGuard(guide, library);
    expect(result.passed).toBe(false);
  });

  it("fails on an empty library", () => {
    const guide = guideWithMatch(libraryCase());

    const result = checkCitationGuard(guide, []);
    expect(result.passed).toBe(false);
  });

  it("fails on a malformed payload", () => {
    const library = [libraryCase()];
    const malformed = {
      casesWithheld: false,
      matches: "not-an-array",
      grounds: [],
      proceduralChecklist: [],
      escalationTriggers: [],
    } as unknown as IssueGuide;

    const result = checkCitationGuard(malformed, library);
    expect(result.passed).toBe(false);
  });
});
