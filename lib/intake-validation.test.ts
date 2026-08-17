import { describe, expect, it } from "vitest";
import {
  MIN_DOCUMENTATION_LENGTH,
  MIN_EMPLOYER_ACTION_LENGTH,
  MIN_WHAT_HAPPENED_LENGTH,
  toFactPromptResponse,
  toNarrative,
  validateConcerns,
  validatePrompt,
} from "./intake-validation";

describe("validatePrompt", () => {
  it("passes at the threshold", () => {
    const text = "a".repeat(MIN_WHAT_HAPPENED_LENGTH);
    expect(validatePrompt(false, text, MIN_WHAT_HAPPENED_LENGTH, "What happened")).toEqual({
      valid: true,
    });
  });

  it("fails below the threshold", () => {
    const text = "a".repeat(MIN_WHAT_HAPPENED_LENGTH - 1);
    const result = validatePrompt(false, text, MIN_WHAT_HAPPENED_LENGTH, "What happened");
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it("fails on whitespace-only input", () => {
    const text = " \n\t ".repeat(MIN_WHAT_HAPPENED_LENGTH);
    const result = validatePrompt(false, text, MIN_WHAT_HAPPENED_LENGTH, "What happened");
    expect(result.valid).toBe(false);
  });

  it("passes when marked not applicable, regardless of text", () => {
    expect(validatePrompt(true, "", MIN_DOCUMENTATION_LENGTH, "Documentation exchanged")).toEqual(
      { valid: true },
    );
  });

  it("the QA1 round-1 scenario: a detailed first prompt does not excuse the other two", () => {
    // Previously a single combined 100-char threshold let this through.
    // Each prompt is now checked independently.
    const whatHappened = validatePrompt(
      false,
      "a".repeat(MIN_WHAT_HAPPENED_LENGTH),
      MIN_WHAT_HAPPENED_LENGTH,
      "What happened",
    );
    const documentation = validatePrompt(false, "", MIN_DOCUMENTATION_LENGTH, "Documentation exchanged");
    const employerAction = validatePrompt(false, "", MIN_EMPLOYER_ACTION_LENGTH, "Employer action");

    expect(whatHappened.valid).toBe(true);
    expect(documentation.valid).toBe(false);
    expect(employerAction.valid).toBe(false);
  });
});

describe("validateConcerns", () => {
  it("correctly requires at least one concern category", () => {
    expect(validateConcerns([]).valid).toBe(false);
    expect(validateConcerns(["medical-absence"]).valid).toBe(true);
  });
});

describe("toFactPromptResponse", () => {
  it("returns an explicit not-reported marker, never an empty string", () => {
    const response = toFactPromptResponse(true, "");
    expect(response).toEqual({ reported: false });
    expect(response).not.toHaveProperty("text");
  });

  it("returns trimmed reported text", () => {
    expect(toFactPromptResponse(false, "  hello  ")).toEqual({
      reported: true,
      text: "hello",
    });
  });
});

describe("toNarrative", () => {
  it("joins only the reported entries", () => {
    const facts = [
      { reported: true as const, text: "first" },
      { reported: false as const },
      { reported: true as const, text: "third" },
    ];
    expect(toNarrative(facts)).toBe("first\n\nthird");
  });
});
