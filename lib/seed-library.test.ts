import { describe, expect, it } from "vitest";
import type { CaseExcerpt } from "./types";
import { validateSeedLibrary } from "./seed-library";

function validRecord(): CaseExcerpt {
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
  };
}

describe("validateSeedLibrary", () => {
  it("accepts a valid record", () => {
    const result = validateSeedLibrary([validRecord()]);
    expect(result).toEqual([validRecord()]);
  });

  it("rejects a record missing each provenance field in turn", () => {
    const provenanceFields = ["verifiedBy", "verifiedDate", "sourceUrl"] as const;

    for (const field of provenanceFields) {
      const record: Record<string, unknown> = { ...validRecord() };
      delete record[field];

      expect(
        () => validateSeedLibrary([record]),
        `expected rejection when "${field}" is missing`,
      ).toThrowError(/test-case-1/);
    }

    for (const field of provenanceFields) {
      const record: Record<string, unknown> = { ...validRecord(), [field]: "" };

      expect(
        () => validateSeedLibrary([record]),
        `expected rejection when "${field}" is empty`,
      ).toThrowError(/test-case-1/);
    }
  });
});
