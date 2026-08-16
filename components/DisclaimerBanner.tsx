/**
 * Persistent disclaimer, required by CLAUDE.md and Sprint 1 requirement 6.
 * Rendered once from the root layout — never per-page — so it cannot be
 * silently dropped by a route added later. Sticky so it stays visible on
 * scroll and across client-side navigation.
 */
/** Exact required wording — Sprint 1 requirement 6. Exported so it can be tested for drift. */
export const DISCLAIMER_TEXT =
  "Informational triage tool only — does not constitute legal advice.";

export default function DisclaimerBanner() {
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-100 border-b border-amber-300 text-amber-900">
      <p className="mx-auto max-w-4xl px-4 py-2 text-center text-sm font-medium">
        {DISCLAIMER_TEXT}
      </p>
    </div>
  );
}
