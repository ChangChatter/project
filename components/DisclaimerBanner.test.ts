import { describe, expect, it } from "vitest";
import { DISCLAIMER_TEXT } from "./DisclaimerBanner";

describe("DisclaimerBanner", () => {
  it("matches the required wording exactly, character for character", () => {
    expect(DISCLAIMER_TEXT).toBe(
      "Informational triage tool only — does not constitute legal advice.",
    );
  });
});
