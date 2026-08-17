import type { ConcernCategory, FactPromptResponse } from "./types";

/**
 * Minimum length (trimmed, in characters) for the "what happened" prompt
 * when reported. This is the core account, so it carries the highest bar
 * of the three prompts — roughly two sentences, enough to distinguish a
 * real situation from noise. A defensible starting value, not a tuned
 * one — Sprint 3's Out of Scope note says this gets adjusted once real
 * scenarios run through it.
 */
export const MIN_WHAT_HAPPENED_LENGTH = 100;

/**
 * Minimum length for the "documentation exchanged" prompt when reported.
 * Lower than `MIN_WHAT_HAPPENED_LENGTH`: per Sprint 3 Amendment 2, this
 * prompt is procedurally decisive but is often legitimately a short,
 * specific factual statement (e.g. "A doctor's note was requested and
 * provided on March 3") rather than a narrative.
 */
export const MIN_DOCUMENTATION_LENGTH = 20;

/** Minimum length for the "employer action" prompt when reported. Same
 * rationale as `MIN_DOCUMENTATION_LENGTH`. */
export const MIN_EMPLOYER_ACTION_LENGTH = 20;

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validates one fact-narrative prompt. Satisfied either by the "nothing
 * yet / not applicable" marker (Sprint 3 Amendment 2 requirement 14) or
 * by reported text meeting `minLength`. Pure.
 */
export function validatePrompt(
  notApplicable: boolean,
  text: string,
  minLength: number,
  label: string,
): ValidationResult {
  if (notApplicable) {
    return { valid: true };
  }
  const trimmedLength = text.trim().length;
  if (trimmedLength < minLength) {
    return {
      valid: false,
      message: `${label}: add more detail — at least ${minLength} characters (currently ${trimmedLength}), or mark "Nothing yet / not applicable".`,
    };
  }
  return { valid: true };
}

/** Validates step 2's concern selection. Pure. */
export function validateConcerns(concerns: ConcernCategory[]): ValidationResult {
  if (concerns.length === 0) {
    return {
      valid: false,
      message: "Select at least one concern to continue.",
    };
  }
  return { valid: true };
}

/**
 * Builds one `FactPromptResponse` from a prompt's raw input. Pure. The
 * type-level distinction requirement 14 asks for — never an empty string
 * standing in for "not applicable".
 */
export function toFactPromptResponse(
  notApplicable: boolean,
  text: string,
): FactPromptResponse {
  if (notApplicable) {
    return { reported: false };
  }
  return { reported: true, text: text.trim() };
}

/** Joins the reported entries of a `facts` tuple for `Situation.narrative`. Pure. */
export function toNarrative(facts: readonly FactPromptResponse[]): string {
  return facts
    .filter((fact): fact is Extract<FactPromptResponse, { reported: true }> => fact.reported)
    .map((fact) => fact.text)
    .join("\n\n");
}
