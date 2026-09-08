import Link from "next/link";
import { checkStatuteCitationGuard } from "@/lib/statute-citation-guard";

/**
 * Method & sources — docs/design-handoff.md §Screens 3, replacing the
 * disclaimer-persistence placeholder (that behaviour now lives in the root
 * layout regardless of this route's content — requirement 4).
 *
 * The sources table's candidates are typed independently here, as an
 * author would hand-type a citation, rather than imported from
 * STATUTE_REFERENCE_LIBRARY directly — importing the library entries
 * verbatim would make checkStatuteCitationGuard a no-op, since nothing
 * could ever drift from itself. This is Sprint 11 requirement 7's "first
 * consumer": every row renders only after passing the guard, and a row
 * whose text doesn't match the library renders a visible withheld notice
 * instead of the raw candidate, per the fail-closed model.
 *
 * The method paragraphs below are authored here — the handoff specifies
 * this section's structure but not its copy — flagged in Dev Notes for
 * gate 4 alongside the landing page's copy.
 */
const REQUESTED_SOURCES = [
  { id: "hrc-ss-13-43", statute: "Human Rights Code, RSBC 1996, c. 210", section: "ss. 13, 43" },
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
];

export default function About() {
  const guardedSources = REQUESTED_SOURCES.map((candidate) => ({
    candidateId: candidate.id,
    result: checkStatuteCitationGuard(candidate),
  }));

  return (
    <div style={{ maxWidth: "740px", margin: "0 auto", padding: "56px 30px 70px" }}>
      <p
        style={{
          fontSize: "10.5px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--color-accent-700)",
          marginBottom: "12px",
        }}
      >
        Method
      </p>
      <h1 style={{ fontSize: "42px", fontWeight: 400 }}>How the recommendation is built</h1>
      <hr className="hr" style={{ background: "var(--color-accent)" }} />

      <p style={{ fontSize: "15px", lineHeight: 1.72, textAlign: "justify", hyphens: "auto" }}>
        Your answers run through a fixed set of rules, not a language model. The
        rules map what you describe onto the specific grounds and procedural
        obligations they engage; nothing about the recommendation is generated or
        inferred beyond what those rules explicitly encode. A model is used only
        to turn an already-decided result into plain language, after the rules
        have run — it never chooses a ground, a case, or a citation.
      </p>
      <p style={{ fontSize: "15px", lineHeight: 1.72, textAlign: "justify", hyphens: "auto" }}>
        Case law referenced anywhere in this tool is checked against a verified
        library before it can render; a citation that doesn&apos;t match is
        withheld rather than shown. The statute references below go through the
        same kind of check — see the table for what that check confirmed.
      </p>

      <h3 style={{ fontSize: "19px", fontWeight: 600, marginTop: "var(--space-6)" }}>
        Sources consulted
      </h3>
      <div>
        {guardedSources.map(({ candidateId, result }) => (
          <div
            key={candidateId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: "1px solid var(--color-divider)",
              fontSize: "14px",
              gap: "12px",
            }}
          >
            {result.passed ? (
              <>
                <span>{result.reference.statute}</span>
                <span className="text-muted">{result.reference.section}</span>
              </>
            ) : (
              <span className="text-muted">
                Reference withheld — verification mismatch ({result.reason}).
              </span>
            )}
          </div>
        ))}
      </div>

      <Link href="/" className="btn btn-secondary" style={{ marginTop: "var(--space-6)" }}>
        Back to overview
      </Link>
    </div>
  );
}
