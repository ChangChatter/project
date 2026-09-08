/**
 * Persistent disclaimer, required by CLAUDE.md and Sprint 1 requirement 6.
 * Rendered once from the root layout — never per-page — so it cannot be
 * silently dropped by a route added later. Sticky so it stays visible on
 * scroll and across client-side navigation.
 *
 * Sprint 11 restyled this to the classical.css chrome treatment
 * (`.disclaimer`) and added `.no-print`, but kept the wording unchanged —
 * the design handoff's mockup copy ("...this is not legal advice.") is a
 * different string from the one Sprint 1 requirement 6 locked and tested
 * character-for-character below. Swapping in unreviewed mockup copy for
 * already-reviewed legal text isn't Dev Team's call; flagged for gate 4.
 */
import { InfoIcon } from "./icons";

/** Exact required wording — Sprint 1 requirement 6. Exported so it can be tested for drift. */
export const DISCLAIMER_TEXT =
  "Informational triage tool only — does not constitute legal advice.";

export default function DisclaimerBanner() {
  return (
    <div className="disclaimer no-print sticky top-0 z-50">
      <InfoIcon />
      <p style={{ margin: 0 }}>{DISCLAIMER_TEXT}</p>
    </div>
  );
}
