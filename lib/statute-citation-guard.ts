import type { StatuteReference } from "./types";

/**
 * The named table of every statute and section this app is permitted to
 * cite. Reviewed by Chang (Sprint 11 gate 4) the same way
 * `CONCERN_TO_GROUND` is reviewed. Adding a citation anywhere in the app
 * means adding it here first — nothing renders that isn't listed.
 */
export const STATUTE_REFERENCE_LIBRARY: readonly StatuteReference[] = [
  {
    id: "hrc-ss-13-43",
    statute: "Human Rights Code, RSBC 1996, c. 210",
    section: "ss. 13, 43",
  },
  {
    id: "esa-ss-63-74-83",
    statute: "Employment Standards Act, RSBC 1996, c. 113",
    section: "ss. 63, 74, 83",
  },
  {
    id: "wca-ohs-d3-115-2",
    statute: "Workers Compensation Act — OHS bullying policies",
    section: "D3-115-2",
  },
  {
    id: "bchrt-rules-filing",
    statute: "BC Human Rights Tribunal — Rules of Practice",
    section: "Filing & screening",
  },
] as const;

/**
 * The statute-citation guard's verdict. Fails closed by construction, same
 * as `CitationGuardResult`: every failure path carries a reason, and there
 * is no `passed: true` branch reachable except by the candidate actually
 * matching a library entry by id AND by text.
 */
export type StatuteCitationGuardResult =
  | { passed: true; reference: StatuteReference }
  | { passed: false; reason: string };

function fail(reason: string): StatuteCitationGuardResult {
  return { passed: false, reason };
}

/**
 * Verifies a candidate statute reference against the library, by `id` and
 * by `statute`/`section` text — the same double-check `checkCitationGuard`
 * performs for case law, which catches a reference whose id coincidentally
 * matches a library entry but whose text has drifted, been mistyped, or
 * been fabricated. Fails closed: an empty library, a malformed candidate,
 * or an id absent from the library are all failures, never a pass. Pure,
 * no I/O.
 *
 * A caller should render `result.reference` (the verified library entry)
 * on success, never the raw candidate — that is what makes drift
 * unrenderable rather than merely detectable.
 */
export function checkStatuteCitationGuard(
  candidate: unknown,
  library: readonly StatuteReference[] = STATUTE_REFERENCE_LIBRARY,
): StatuteCitationGuardResult {
  if (library.length === 0) {
    return fail("the statute reference library is empty");
  }

  if (candidate === null || typeof candidate !== "object") {
    return fail("the statute reference candidate is not an object");
  }

  const c = candidate as Record<string, unknown>;

  if (typeof c.id !== "string" || c.id.length === 0) {
    return fail("the statute reference candidate has no id");
  }

  const entry = library.find((libraryEntry) => libraryEntry.id === c.id);
  if (!entry) {
    return fail(
      `statute reference id "${c.id}" is not present in the statute reference library`,
    );
  }

  if (c.statute !== entry.statute) {
    return fail(
      `statute reference id "${c.id}" statute text does not match the library's statute text for that id`,
    );
  }

  if (c.section !== entry.section) {
    return fail(
      `statute reference id "${c.id}" section text does not match the library's section text for that id`,
    );
  }

  return { passed: true, reference: entry };
}
