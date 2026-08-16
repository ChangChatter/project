import type { CaseExcerpt, IssueGuide } from "./types";

/**
 * The citation guard's verdict. Fails closed by construction: every
 * failure path carries a reason, and there is no "pass" branch reachable
 * except by every referenced case actually matching a library entry.
 */
export type CitationGuardResult =
  | { passed: true }
  | { passed: false; reason: string };

function fail(reason: string): CitationGuardResult {
  return { passed: false, reason };
}

/**
 * Checks one match's embedded case against the library by both `id` and
 * `citation`. Checking citation as well as id catches a case whose id
 * coincidentally matches a library entry but whose citation text has
 * drifted or been fabricated — the guard exists specifically to prevent
 * an unverified citation from reaching a render.
 */
function findLibraryMismatch(
  embeddedCase: CaseExcerpt,
  library: readonly CaseExcerpt[],
): string | null {
  const byId = library.find((entry) => entry.id === embeddedCase.id);
  if (!byId) {
    return `case id "${embeddedCase.id}" is not present in the seed library`;
  }
  if (byId.citation !== embeddedCase.citation) {
    return `case id "${embeddedCase.id}" citation "${embeddedCase.citation}" does not match the library's citation "${byId.citation}" for that id`;
  }
  return null;
}

/**
 * The citation guard: a pure function taking an `IssueGuide` and the
 * loaded seed library, returning pass/fail. Fails if the guide references
 * any case `id` or citation not present in the library. Fails closed — an
 * empty library, a malformed payload, or any unexpected shape is a
 * failure, never a pass. No I/O of any kind.
 *
 * The parameter is typed `IssueGuide` because that is the real contract
 * (Sprint 6 renders exactly this shape), but the guard still validates
 * the runtime shape defensively: a TypeScript type is erased at runtime,
 * and a payload that arrived via `JSON.parse` or an unsafe cast can violate
 * it despite the annotation.
 */
export function checkCitationGuard(
  guide: IssueGuide,
  library: readonly CaseExcerpt[],
): CitationGuardResult {
  if (library.length === 0) {
    return fail("the seed library is empty");
  }

  if (guide === null || typeof guide !== "object") {
    return fail("the guide payload is not an object");
  }

  if (typeof guide.casesWithheld !== "boolean") {
    return fail("the guide payload's casesWithheld is not a boolean");
  }

  if (guide.casesWithheld) {
    if (!Array.isArray(guide.matches) || guide.matches.length !== 0) {
      return fail(
        "the guide payload has casesWithheld: true but matches is not an empty array",
      );
    }
    return { passed: true };
  }

  if (!Array.isArray(guide.matches)) {
    return fail("the guide payload's matches is not an array");
  }

  for (const match of guide.matches) {
    if (
      match === null ||
      typeof match !== "object" ||
      match.case === null ||
      typeof match.case !== "object" ||
      typeof match.case.id !== "string" ||
      typeof match.case.citation !== "string"
    ) {
      return fail("the guide payload contains a malformed match entry");
    }
    const mismatch = findLibraryMismatch(match.case, library);
    if (mismatch) {
      return fail(mismatch);
    }
  }

  return { passed: true };
}
