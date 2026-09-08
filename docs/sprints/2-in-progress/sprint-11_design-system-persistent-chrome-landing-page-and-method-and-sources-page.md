---
id: 11
title: "Design system, persistent chrome, landing page, and Method and sources page"
epic: "Front-end Redesign"
status: in_progress
created: 2026-09-07T00:00:00+00:00
---

# Master Controller Sprint Definition — Sprint 11

**Epic:** Front-end Redesign
**Sprint Objective:** Land the design system, the persistent chrome, the new
landing page and the `/about` Method & sources page — plus a fail-closed
statute-citation guard — without touching intake or building `/guide`, and
without regressing the intake accessibility work Sprints 8–10 produced.

### Context

A UI/UX handoff (`docs/design-handoff.md`, `app/classical.css`, `lib/guide.ts`)
specifies a four-screen redesign. Scoping it revealed that the handoff was
drawn against a **different product** than the one that exists: every content
section in its `/guide` reads from `guide.ts`'s `PATHS`, and the built product
produces `IssueGuide { grounds, proceduralChecklist, escalationTriggers,
matches, casesWithheld }`. Four of those five have no section in the new
design, the intake's `Answers` shape has no `dutyToAccommodate`, and the
acknowledgment gate is absent entirely.

Chang's decision is **option B delivered as C**: the rules pipeline stays the
source of truth and the design adapts to it, but the slice that does not touch
the rules ships first while that reconciliation is scoped. **This sprint is
that slice.** Reconciling the design's information architecture with
`IssueGuide` is Sprint 6's rescope; restyling intake while preserving every
question Sprints 8–10 built is its own sprint. Neither is this one.

The one thing that makes this slice less isolated than it looks: importing a
global stylesheet changes every route, including `/intake`. That is why
requirement 8 and gate 3 exist.

### Requirements

1. **`app/classical.css` imported once, globally**, in `app/layout.tsx`. Every
   token resolves; no component re-derives a colour, size or radius that the
   stylesheet already declares. The two font families load (either the
   stylesheet's `@import` or `next/font` — Dev Team's call, documented in Dev
   Notes; if `next/font`, the `:root` font declarations are removed so the
   variables win).
2. **Tailwind and `classical.css` coexist deliberately, and CLAUDE.md records
   it.** `tailwindcss: ^4` is already a dependency; `classical.css` carries a
   full component layer (`.btn`, `.card`, `.input`, `.field`, `.radio`, `.seg`,
   `.tag`, `.hr`, `.nav`). CLAUDE.md's *Project Standards → Stack* forbids a
   competing styling system "unless a sprint explicitly introduces one." **This
   is that sprint**, and per the same section it must update those standards in
   the same diff, stating which system owns what and which wins on conflict.
   A diff that introduces `classical.css` without amending CLAUDE.md is
   incomplete.
3. **Persistent chrome in `app/layout.tsx`:** the disclaimer bar, the nav
   (Overview / Intake / Method, with `aria-current="page"` wired from the
   active route), and the footer. All three carry `.no-print`.
4. **The disclaimer banner persists across every route**, which is the Sprint 1
   guarantee the current `/about` placeholder exists to demonstrate. Replacing
   that placeholder is in scope; losing the behaviour it proves is not.
5. **Landing page at `/`** per `docs/design-handoff.md` §Screens 1, using the
   **reassuring** framing variant. Of the handoff's four toggles, only that one
   is in this sprint's scope; the other three are locked and deferred, recorded
   below so they are not re-litigated later.
6. **`/about` replacing the current placeholder** per §Screens 3, including the
   "Sources consulted" hairline list.
7. **`STATUTE_REFERENCE_LIBRARY` and a fail-closed statute-citation guard**
   (`lib/statute-citation-guard.ts`, or a second exported function in
   `lib/citation-guard.ts` — Dev Team's call, defended in Dev Notes). A named,
   exported table of every statute and section this app is permitted to cite;
   a guard that verifies any statute reference before it renders and
   **withholds it with a visible notice on mismatch**, never rendering an
   unlisted reference and never failing silently. Same behaviour as the Sprint 2
   case-citation guard, which is the model to follow. `/about`'s sources table
   is its first consumer and must render through it.
8. **No visual or functional regression on `/intake`.** The global stylesheet
   reaches it whether or not its files are edited: `classical.css` sets `body`
   typography and a global `box-sizing` reset. The existing intake must still
   render correctly and, specifically, **the duty-to-accommodate radiogroups
   must retain the naming, validity and error-scoping behaviour Sprints 8, 9
   and 10 produced.** Editing intake markup to *achieve* this is out of scope —
   if the stylesheet breaks intake, that is a finding to raise, not to absorb.
9. **Decorative numerals are hidden from assistive technology.** The landing
   band's ghost Roman numerals (`I`/`II`/`III` at `opacity: .22`) and the
   `01`/`02`/`03` panel ordinals are presentational; they must not be announced
   as content.
10. **No import of `lib/guide.ts` anywhere in this diff.** The file may be
    committed to the repository — it is, at `d735884` — but nothing in this
    sprint may import or wire it. It declares twelve domain-shaped types
    outside `lib/types.ts`, which CLAUDE.md's domain-types rule forbids; those
    must be relocated into `lib/types.ts` and reconciled against `Situation`
    **before** the first sprint that imports the file, not after. `/about`'s
    statute references come from `STATUTE_REFERENCE_LIBRARY`, not from
    `guide.ts`. See Amendment 1 for the presence-versus-import distinction.
11. Vitest coverage for the statute guard: a listed reference passes; an
    unlisted one is withheld rather than rendered; the guard does not throw on
    malformed input.

**Locked variant decisions, deferred to their own sprints:** hairline-rule
stepper (intake), grouped-by-pass intake layout (intake), "Why this path"
section on (`/guide`). Recorded here so they are settled, not re-opened.

### Amendment 1 — 2026-09-08, after QA1 rounds 1–2, Master Controller

QA1 raised this in both audit rounds, which is the signal that it needed
settling in the definition rather than in Dev Notes. Dev Team and QA1 reached
the correct reading independently and recorded their agreement — but two people
agreeing about what a requirement means is not the same as the requirement
saying it, and Sprint 10's Amendment 1 set the precedent that this gets fixed
in the text.

**Requirement 10 governs imports and wiring, not presence in the repository.**
`lib/guide.ts` is committed (`d735884`). That is intended: it is a delivered
handoff artifact that later sprints will draw content from, and keeping it out
of version control to satisfy a rule about type declarations would be worse in
every respect — an untracked file is one `git clean` from gone.

What requirement 10 forbids is any file in this sprint's diff **importing** it,
and nothing does — verified: no `import` of `guide.ts` exists anywhere in the
repository.

**The gate-1 domain-types criterion is scoped to match.** "No domain-shaped
interface is declared outside `lib/types.ts`" applies to files this sprint
creates or modifies. It does **not** fail on `lib/guide.ts`'s twelve
declarations, which arrived as an unmodified third-party artifact and are
quarantined by requirement 10 rather than absolved by it.

**The violation is real and still outstanding.** `lib/guide.ts` declares
`Answers`, `Concern`, `ConcernId`, `PathId`, `FactorId`, `DeadlineKey`,
`PathStep`, `Framework`, `Bullet`, `GuidePath`, `DeadlineRow` and
`Recommendation` outside `lib/types.ts`, and CLAUDE.md's domain-types rule
admits no exception. Nothing here waives it. The file is tolerable in the tree
**only because nothing imports it**, and the moment a sprint wires it up, those
types must move into `lib/types.ts` first — reconciled against `Situation`,
which `Answers` partially duplicates and partially contradicts. That
relocation is a precondition of the first sprint to import the file, not a
follow-up to it.

The narrow rule, stated once so it cannot be stretched: **an unwired,
unmodified handoff artifact does not fail the domain-types audit; the first
diff that imports it does, until its types are relocated.**

### Amendment 2 — 2026-09-08, after GroundTruth round 1 (CONDITIONAL), Master Controller

Three findings, none touching ARIA — so this reship keeps the fast path and
does not need the standing independent-ARIA-review step. Findings 2 and 3 are
one defect with two symptoms.

**Finding 1 — contrast. FIX, in this sprint.**

`.text-muted` measures **3.63:1**, below AA's 4.5:1, and on `/about` it carries
the entire statute section-reference column — "ss. 13, 43", "ss. 63, 74, 83".
Those are not decorative; they are the references a user needs in order to
check a citation. This sprint introduced `STATUTE_REFERENCE_LIBRARY` and a
fail-closed guard precisely so that no statute reference renders unverified.
Rendering them **verified but unreadable** defeats the purpose the guard
exists to serve. Correctness and legibility are both preconditions of a
reference doing its job.

Two changes, and only one is a design change:

- `.text-muted`'s `color-mix` ratio (currently `var(--color-text) 55%`)
  increases until it **measures** ≥4.5:1 on `--color-bg`. Dev Team sets the
  value by measurement, not arithmetic.
- **Accent text at body or small size on light grounds uses
  `--color-accent-700`, not `--color-accent`.** This is not a design change —
  it is applying the design system as documented. The handoff itself assigns
  `--color-accent-700` to "accent-coloured text at body size, caution icons",
  and the dark band already correctly uses `--color-accent-400` (measuring
  8.57:1). Using `--color-accent` for 10.5px kicker text on a light ground was
  a misapplication of the system's own tokens. `--color-accent` remains correct
  for **strokes** — rules, borders, icons — where the 3:1 non-text threshold
  applies.

**For Chang, beyond this sprint:** the handoff specifies `var(--color-accent)`
for the kicker at 10.5px directly (§Screens 1). The design *as written*
produces an AA failure on light grounds, and the same kicker pattern appears on
the intake and `/guide` screens. This is worth correcting at the source rather
than sprint by sprint.

**Finding 2 — the cascade explanation. CORRECTED.**

This is the most consequential of the three, and not because of its visual
impact. CLAUDE.md said a Tailwind utility wins over `classical.css` on a
contested property, by specificity. Both halves were wrong, and the conclusion
was **backwards**: `classical.css` wins.

The mechanism is cascade layers. Tailwind v4 emits its rules inside
`@layer theme, base, components, utilities`; `app/classical.css` declares no
layer; a normal declaration outside any layer beats one inside a layer
regardless of specificity. Verified directly: `classical.css` has no `@layer`,
`app/globals.css` has `@import "tailwindcss"`, and `classical.css:95` is an
unlayered `h1 { font-size: 42px }`.

CLAUDE.md's *Stack* section is corrected in this sprint's diff. The
per-property observation there was right and is kept; only its explanation was
wrong. **Dev Notes must also be corrected** — its claims that the `<h2>`'s
`font-medium` "does still win for weight" (it measures 600) and that the
completion `<h1>`'s `text-2xl` protects it (it does not) are both false, and a
wrong record is worse than no record because future audits check against it.

CLAUDE.md's own standard applies to itself here: *a standard nobody has updated
is worse than no standard, because agents will still be auditing against it.*
A standard that is actively wrong is worse still — it does not merely fail to
help, it produces confident incorrect predictions, which is exactly what
finding 3 is.

**Finding 3 — the completion `<h1>` at 42px. RECORD, do not fix here.**

`components/IntakeFlow.tsx:849` carries `text-2xl` (24px) and renders at 42px,
because `classical.css`'s unlayered `h1` rule beats the layered utility. Dev
Notes recorded it as protected. It was never protected.

It is nonetheless the **same class of finding as the accepted `<h2>`** — a
Tailwind utility losing a contested property to the global stylesheet on a
route this sprint was not permitted to edit. What was wrong was the record, not
the decision. Requirement 8 is explicit: *if the stylesheet breaks intake, that
is a finding to raise, not to absorb.*

Three reasons not to fix it in this loop:

1. **The only fix that works is a global cascade change** — putting
   `classical.css` into a layer, or scoping its element rules. That alters
   precedence on every route including the new ones, and doing it inside a
   CONDITIONAL fix loop, where GroundTruth's retest is the sole remaining gate,
   is the pattern CLAUDE.md warns against for changes a gate cannot fully
   measure.
2. **It is cosmetic and not harmful.** 42px is oversized, not illegible. No
   functional impact, no accessibility impact. Contrast is the opposite on both
   counts, which is why the two findings resolve differently. The asymmetry is
   deliberate: fix what harms and what this sprint owns; record what is
   cosmetic and belongs to another sprint's surface.
3. **The right fix belongs to the intake restyle**, which will set that heading
   deliberately rather than rescuing a Tailwind value by accident.

To keep this a deferral rather than a shrug: **the intake restyle sprint is
scoped next, and the completion `<h1>` is an explicit requirement in it**, named
alongside the `<h2>`. Two recorded regressions on a live route is the ceiling —
a third means the deferral has become a habit and the restyle moves ahead of
everything else.

**GroundTruth's retest scope:** re-measure `.text-muted` and every accent text
instance on light grounds against AA; confirm the `<h1>` and `<h2>` findings are
recorded and unchanged rather than silently altered; confirm no new regression
on `/intake`. The `<h1>` rendering at 42px is an **expected** result on retest,
not a failure.

### Acceptance Criteria

**Gate 1 — QA1 (static, pre-push):**

- QA1 confirms `classical.css` is imported exactly once, globally, and that no
  component hard-codes a hex value or px size the stylesheet already declares
  as a token.
- QA1 confirms **CLAUDE.md's Project Standards were updated in this same diff**
  to record the Tailwind/`classical.css` split. Requirement 2 is not satisfied
  by the stylesheet landing alone.
- QA1 confirms **no file in the diff imports `lib/guide.ts`** (requirement 10).
- QA1 confirms the statute guard **fails closed**: its failure branch withholds
  the reference and surfaces a notice, rather than rendering it, swallowing it,
  or throwing unhandled.
- QA1 confirms `STATUTE_REFERENCE_LIBRARY` is a named export, and that every
  statute reference rendered on `/about` resolves to an entry in it.
- QA1 confirms no domain-shaped interface is declared outside `lib/types.ts`
  **in any file this sprint creates or modifies**. `lib/guide.ts`'s twelve
  declarations are quarantined by requirement 10, not absolved by it — see
  Amendment 1.
- QA1 confirms `aria-current` is wired from the active route, and that the
  decorative numerals in requirement 9 are hidden from assistive technology.
- QA1 runs the Vitest suite, confirms it is green including requirement 11's
  three cases, and that no render-assertion test was added.
- QA1 confirms **no file under `app/intake/` is modified** (requirement 8).

**Gate 2 — GroundTruth (live):**

- GroundTruth navigates `/` → `/intake` → `/about` → `/` and confirms the
  disclaimer banner is present on every route (requirement 4).
- GroundTruth confirms `aria-current="page"` is present in the DOM on the nav
  link matching the current route, and on no other.
- GroundTruth confirms `/about` renders the sources table and that no statute
  reference renders as raw or unguarded text.
- GroundTruth confirms `.no-print` behaviour: with print styles applied, the
  disclaimer bar, nav and footer are hidden.
- **GroundTruth measures colour contrast** on `.text-muted` body copy,
  `--color-neutral-700` footer text at 12px, and the dark-band paragraph text,
  and reports the ratios against WCAG AA (4.5:1 normal, 3:1 large). This is
  measurable in DevTools — it is a DOM-observable check with a real instrument,
  unlike accessible-name computation.
- **GroundTruth walks the existing `/intake` flow end to end** and confirms no
  visual breakage and no functional regression after the global stylesheet
  lands (requirement 8).
- GroundTruth confirms the landing page reflows to a single column at phone
  width without horizontal scroll, with no media queries added.
- **GroundTruth does not attempt to verify announcements or computed
  accessible names.** No instrument exists here; that is gate 3.

**Gate 3 — human AT pass (Chang, NVDA, recorded in Dev Notes):**

- The nav, both landing buttons, and `/about`'s back button are reachable and
  correctly announced by keyboard.
- The decorative numerals are **not** announced (requirement 9).
- **Regression check on `/intake`'s duty-to-accommodate radiogroups**: each
  question still announced once, validation state still audibly distinguishable
  on a failed group, no error text on a correctly-answered group. This is the
  Sprint 10 result re-confirmed under the new stylesheet, and it is the reason
  this sprint has a gate 3 at all.

**Gate 4 — Chang's legal-content review (recorded in Dev Notes):**

This is the merged gate covering disclaimer wording, the statute-reference
table, and `guide.ts`'s legal content. This sprint carries the slice that
actually renders:

- **`STATUTE_REFERENCE_LIBRARY`'s entries** — every statute and section the app
  is permitted to cite, reviewed the way `CONCERN_TO_GROUND` is reviewed.
- **The disclaimer bar wording** — "Informational triage tool only — this is
  not legal advice."
- **`/about`'s method copy and sources table.** Note two inconsistencies found
  at scoping: `/about` cites **ESA s. 74**, which appears nowhere in
  `guide.ts`; `guide.ts` cites **ESA ss. 50–56**, which `/about` omits. Neither
  list matches the other and both predate review.
- **The landing page's reassurance claims.** "Most of these situations are
  workable" is a statement about likely outcomes, and Sprint 5 established that
  no output predicts an outcome or states a likelihood. Landing copy is not
  guide output, so this is a judgement call rather than a violation — but it is
  Chang's judgement call, not Dev Team's.
- **The footer's "Nothing retained" and the landing's "Nothing you type leaves
  your browser."** Both are true today because nothing is persisted. Both must
  survive the sessionStorage decision that a later sprint will make.
- **The disclaimer bar carries `.no-print`**, so a printed page carries no
  disclaimer. On `/` and `/about` that is low stakes; flagged here because the
  same pattern reaches `/guide`, where the printed artifact is meant to be
  handed to counsel.

**This gate is not in `sprint_lifecycle.py`.** Neither is gate 3. The script
tracks `qa1_audit_result` and `groundtruth_result` only, and `cmd_complete`
(line 662) checks those two plus `--user-said`. **It will let this sprint close
with gates 3 and 4 unrecorded.** That is the same hole that made Sprint 9
unclosable and it is now two gates wide. Do not discover it a third time.

### Out of Scope

- **Any change to `/intake`** beyond confirming it did not regress. The restyle
  is its own sprint and must preserve every question Sprints 8–10 built.
- **Building `/guide`.** Blocked on Sprint 6's rescope, which reconciles the
  design's sections with `IssueGuide`.
- **Importing or wiring `lib/guide.ts`**, including `recommend()` and
  `CONCERN_TO_PATH`, which Chang has ruled are not to be wired as-is.
- **Relocating `guide.ts`'s twelve domain types into `lib/types.ts`.** Real and
  required, but it belongs to the sprint that first imports the file.
- **The `monthsFromIncident` `setMonth` overflow bug** (an incident on
  2026-08-31 plus six months yields 3 March 2027, not 28 February). A genuine
  defect in a load-bearing number, recorded at scoping, and owned by the sprint
  that ships the date rows.
- **The acknowledgment gate.** Absent from the handoff, still required by
  Sprint 6 requirements 5 and 6. Sprint 6's rescope owns reconciling that.
- **Adding breakpoints.** The handoff's `auto-fit`/`minmax` approach is
  deliberate; do not add media queries unless something genuinely breaks.
- **Shadows.** `--shadow-*` exist in the stylesheet and the design uses none.

### Dependencies

- Blocks: the intake restyle sprint and Sprint 6's rescope, both of which build
  on this stylesheet and chrome.
- Blocked by: nothing. All three handoff files are in the repo — `app/classical.css` and `lib/guide.ts` committed at `d735884`, `docs/design-handoff.md` alongside them. `lib/guide.ts` is committed but **unwired**; see Amendment 1.
- External: Chang for gate 3 (NVDA) and gate 4 (legal review). Neither is
  enforced by the script.

### Team Assignments

- **Dev Team 1.** Sequential with Sprint 10; no worktree needed.

### Risks & Mitigations

- **The global stylesheet silently breaks `/intake`.** The single most likely
  failure, because "we didn't touch those files" feels like sufficient
  protection and is not — `body` typography and a global `box-sizing` reset
  reach every route. Requirement 8, a GroundTruth walk-through, and a gate-3
  regression check all target it.
- **The Sprint 8–10 radiogroup work is undone by CSS.** Three sprints, five QA1
  rounds and an abort went into those controls. `classical.css` ships its own
  `.radio` and `.seg` styling including `:has(input:checked)` state; if intake
  markup happens to use those class names, its behaviour changes without a line
  of its code being edited. Gate 3 re-confirms Sprint 10's result directly.
- **CLAUDE.md is not updated and the standards silently go stale.** CLAUDE.md
  warns that "a standard nobody has updated is worse than no standard, because
  agents will still be auditing against it." Requirement 2 is an explicit QA1
  check for exactly this reason.
- **The statute guard is built but `/about` renders around it**, leaving a
  fail-closed guard with no live path — the Sprint 6 risk of a guard that
  exists and does nothing, in a new place. Requirement 7 names `/about` as its
  first consumer and gate 1 checks every rendered reference resolves through it.
- **Gates 3 and 4 are skipped because 1 and 2 are green and the script permits
  closing.** Named in the acceptance criteria above rather than only here,
  because this is now a documented, twice-realised failure mode rather than a
  hypothetical.
- **Scope creeps into `/guide` or intake** because the design files are open and
  the remaining screens are right there. Out of Scope names each one and why it
  is deferred, not dropped.

### Dev Notes

**Requirement 1 — font loading.** Kept `classical.css`'s own `@import` for
Cormorant Garamond / Lora rather than switching to `next/font`. Simpler:
zero additional setup, and the stylesheet's own `:root` declarations
(`--font-heading`, `--font-body`) are the tokens every component class
already references — moving to `next/font` would mean deleting those
declarations and re-wiring the same variable names from a different
source for no behavioural difference at this stage. The existing Geist
fonts in `app/layout.tsx` are left loaded, unchanged — nothing in the repo
references `font-sans`/`font-mono`/Geist outside `app/layout.tsx` and
`app/globals.css` (confirmed by grep), so leaving them is inert rather
than risky, and removing them was a larger, unnecessary diff for a sprint
already touching a lot of surface.

**Requirement 2 — the split.** Recorded in CLAUDE.md's Stack section
(`### Stack`, immediately below the table). Summary: `classical.css` owns
global element defaults and its own component-class layer; new
chrome/landing/`/about` markup uses those classes, never Tailwind
utilities; `/intake` keeps Tailwind untouched, which still wins locally on
any element it's explicitly applied to (higher-specificity class
selectors vs. `classical.css`'s bare-element rules) but does not shield
inherited defaults like body font-family, since `classical.css` loads
after `globals.css` in `app/layout.tsx` and reaches every route.

**Requirement 7 — file placement and design.** `lib/statute-citation-guard.ts`
(separate file, not a second export in `lib/citation-guard.ts`) — keeps
each guard's module boundary matching its own domain, same as
`case-matcher.ts` vs. `procedural-checklist-rules.ts` staying separate
elsewhere in this codebase, rather than one file doing two unrelated
verifications. `StatuteReference` lives in `lib/types.ts` per the
domain-types rule; the guard's own result type
(`StatuteCitationGuardResult`) stays beside the guard function, mirroring
where `CitationGuardResult` lives relative to `checkCitationGuard`.

The guard takes a *candidate* object and checks it against
`STATUTE_REFERENCE_LIBRARY` by id **and** by `statute`/`section` text —
the same double-check `checkCitationGuard` performs for case law, so a
candidate whose id matches but whose text has drifted still fails. `/about`
authors its four candidates as independent literals (not imported from the
library), so the guard is actually exercised rather than trivially
self-matching — see `app/about/page.tsx`'s own comment. On success the
component renders `result.reference` (the verified library entry), never
the raw candidate, which is what makes drift unrenderable rather than
merely detectable.

**Requirement 9 — decorative numerals.** `aria-hidden="true"` on the ghost
Roman numerals (landing colophon band) and the `01`/`02`/`03` panel
ordinals (landing hero's "what you get back" panel). Verified in the live
DOM (see Self-verification below) that both render but carry the
attribute.

**Icons.** The handoff specifies `lucide-react`, but no requirement in
this sprint names it, so `components/icons.tsx` holds two small
hand-written SVGs (`InfoIcon`, `ArrowRightIcon`) matching the described
stroke style (currentColor, stroke-width 1.8, round linecap, no fill)
instead of adding a new dependency. Not a byte-for-byte reproduction of
Lucide's paths — a reasonable substitution given nothing tests icon shape,
but flagging the divergence so it isn't mistaken for the real Lucide
icons if `lucide-react` is added in a later sprint.

**Disclaimer wording — kept, not swapped.** The handoff's persistent-chrome
mockup gives the disclaimer bar different copy ("...this is not legal
advice.") than the string Sprint 1 requirement 6 locked and
`components/DisclaimerBanner.test.ts` asserts on character-for-character
("...does not constitute legal advice."). Restyled the component to the
`classical.css` chrome treatment (`.disclaimer`, `.no-print`, the info
icon) but left `DISCLAIMER_TEXT` untouched — swapping in unreviewed mockup
copy for text that's already been through a legal review isn't a call Dev
Team gets to make silently. Flagged for gate 4; if Chang wants the new
wording, that's a one-line change plus updating the locked test.

**Authored copy, not in the handoff verbatim — flagged for gate 4.** The
handoff gives exact copy for the landing hero (kicker, h1, lede, button
labels, panel rows, colophon-band cell copy) and the `/about` sources
table, all used verbatim. It does **not** give verbatim copy for: the
landing page's Band C ("What this guide is careful about," both
paragraphs), the colophon band's kicker text ("The three passes"), or
either `/about` method paragraph. All of that is authored in this diff,
written to stay consistent with Sprint 5's no-outcome-prediction rule and
the existing `/guide`-adjacent tone (see `docs/design-handoff.md`'s
closing-note copy for `/guide`, not built this sprint but reviewed for
register). None of it asserts a statute section number or a specific
legal conclusion. Needs the same gate-4 pass as the hero's "Most of these
situations are workable" framing.

**`lib/guide.ts` is committed in this diff — deliberately, not an
oversight.** It was already on disk when this sprint started (the
handoff's own dependency note), but nobody had committed it yet, and
requirement 10 is silent on whether the *file's presence* is in scope,
only on whether anything *imports* it. Committed it alongside
`docs/design-handoff.md` and `app/classical.css` as the third
already-finished, static sprint input, on the same reasoning as the other
two: it's a real deliverable per the handoff ("real, portable TypeScript
... Drop it in as-is"), a later sprint needs it in version control to
import from, and leaving it permanently untracked would be the actual
oversight. Its presence is knowingly unimported — enforced mechanically
by `lib/guide-import-boundary.test.ts`, not merely asserted — so the guard
against requirement 10 doesn't rely on the file simply not existing yet.

**Pre-existing inconsistency, not resolved here.** Per this sprint's own
gate-4 list: `/about`'s sources table (built to the handoff's spec)
cites ESA s. 74, absent from `guide.ts`; `guide.ts` cites ESA ss. 50–56,
absent from `/about`. `lib/guide.ts` is not imported in this diff
(requirement 10), so nothing here can reconcile the two — recording it so
it isn't rediscovered as new.

**Amendment 2, Finding 1 — contrast fix.** Two changes, both scoped
exactly as the amendment describes.

1. `.text-muted`'s `color-mix` ratio raised from `var(--color-text) 55%`
   to `63%`. Set by measurement, not arithmetic: read the live computed
   color off a rendered `.text-muted` element (`/about`'s "ss. 13, 43"
   reference column) via `getComputedStyle`, composited it against
   `--color-bg` (the browser reports a `color-mix` result as a
   translucent `color(srgb r g b / a)`, not a pre-composited `rgb()`, so
   compositing by hand against the background was necessary before
   computing luminance), and confirmed the WCAG contrast formula gives
   **4.618:1** — above the 4.5:1 floor with a small margin for rounding,
   not shaved to the line. Re-measured after landing the change; not
   inferred from the CSS value alone.

2. Every genuine **text** usage of `var(--color-accent)` on a light
   ground switched to `var(--color-accent-700)`; every **stroke**
   usage (borders, outlines, `<hr>` rules, the radio dot fill, the caret,
   background tints) left as `--color-accent`, per the amendment's
   explicit boundary. Concretely, changed: `classical.css`'s base
   `a { color }`, `.btn-primary`'s and `.btn-ghost`'s `color` (not their
   `border-color`), `.seg-opt:has(input:checked)`'s `color` (not its
   `box-shadow` ring), `.card-kicker`, `.tag-outline`'s `color` (not its
   `border`), and `.nav a:hover`/`[aria-current='page']`'s `color`; plus
   the landing hero kicker, the "what you get back" panel kicker and its
   `01`/`02`/`03` numerals, and `/about`'s and `Nav`'s "Method"/"BC"
   kicker text. Left unchanged: every `<hr>`'s `background` (a rule, not
   text), the dark colophon band's ghost Roman-numeral watermark (already
   `--color-accent`, decorative, and the amendment names the dark band as
   already correct), `:focus-visible` outlines, `::selection`, the radio
   dot's border/background/box-shadow, and the input caret. A
   `replace_all` edit briefly caught the ghost-numeral watermark by
   accident (identical surrounding code shape to the panel numeral it was
   meant to target) — caught by re-diffing before commit, reverted to
   plain `--color-accent`.

   Re-measured live after the change: hero kicker, panel kicker, panel
   numerals, `/about`'s "Method" kicker, and the active nav link all read
   **5.970:1** (`--color-accent-700` `#7d5411` on `--color-bg`), well
   clear of 4.5:1. `figcaption` uses the same 55% ratio `.text-muted` did
   and would fail identically, but nothing in the app renders a
   `<figcaption>` (confirmed by grep) and Amendment 2 names only
   `.text-muted` — left unchanged rather than fixed speculatively.

   `/intake` re-verified unaffected: the duty-to-accommodate scenario
   (Sprint 8–10's regression check) still shows every group as a single
   named element with correctly-scoped `aria-invalid`/`aria-describedby`,
   run fresh against this round's CSS.

**Self-verification.** `tsc --noEmit`, `eslint`, `next build`: all clean.
`vitest run`: 110/110 (up from 63 — the two new statute-guard cases plus
the `guide.ts`-import-boundary sweep), no render-assertion test added.
Live DOM checks (local dev build, not the deployed site):
- `/`: `.nav a[aria-current="page"]` present only on the link matching
  the current route (checked on `/`, then `/about`).
- `/about`: all four sources table rows render through
  `checkStatuteCitationGuard` and resolve to the verified library text
  (none withheld, since the page's candidates match the library — the
  withholding path itself is covered by
  `lib/statute-citation-guard.test.ts`, not exercised live since nothing
  currently drifts).
- `@media print { .no-print {...} }` rule confirmed present in the
  stylesheet via `document.styleSheets`, and all three chrome elements
  (disclaimer, nav, footer) carry `.no-print`.
- **`/intake` regression check (requirement 8), the sprint's central
  risk.** Ran the exact duty-to-accommodate scenario Sprint 10 verified:
  answered three of four questions, left one blank, submitted. Confirmed
  unchanged from Sprint 10: every `fieldset[role="radiogroup"]` is a
  single named element (zero nested `[role="radiogroup"]`/
  `[aria-labelledby]`/`[aria-label]` descendants), `aria-labelledby`
  resolves to its own `<legend>`, `aria-invalid` is scoped per group, and
  `aria-describedby` resolves to error text only on the one group that's
  actually invalid. The Sprint 8–10 work is structurally intact under the
  global stylesheet.
  **Visual finding, not fixed here per requirement 8's explicit
  instruction — corrected under Amendment 2.** `/intake`'s typography
  visibly shifted. The original write-up here explained the shift by
  Tailwind-utility specificity and claimed the `<h2>`'s `font-medium`
  still won for weight and the `<h1>`'s `text-2xl` protected its size.
  **Both claims were false**, and false for the same reason: the
  mechanism is CSS cascade **layers**, not specificity. Tailwind v4 emits
  its rules inside `@layer theme, base, components, utilities`;
  `classical.css` declares no layer at all, and an unlayered normal
  declaration beats a layered one outright, regardless of selector
  specificity — see CLAUDE.md's Stack-section note (corrected in this
  same round) for the full mechanism and the verified case list.

  Two regressions on `/intake`, both accepted and deferred to the intake
  restyle sprint per requirement 8, neither fixed here:
  1. **The duty-to-accommodate `<h2>`** (`components/IntakeFlow.tsx:760`,
     `className="font-medium text-zinc-900 dark:text-zinc-50"`).
     `classical.css`'s unlayered `h1, h2, … { font-weight:
     var(--font-heading-weight) }` beats `font-medium` outright, measured
     live at **600**, not Tailwind's 500. The same unlayered rule's
     `h2 { font-size: 32px }` applies for the same reason. `text-zinc-900`
     *does* still apply, but only because `classical.css`'s heading rule
     sets no `color` at all — an uncontested property kept by default,
     not a contest Tailwind won.
  2. **The completion-screen `<h1>`** (`components/IntakeFlow.tsx:849`,
     `text-2xl font-semibold`). Measured live at **42px**, not 24px —
     `text-2xl` does not protect it; `classical.css`'s unlayered
     `h1 { font-size: 42px }` beats it the same way it beats the
     `<h2>`'s size. Recorded as the same class of finding as the `<h2>`,
     per Amendment 2: cosmetic, not harmful, no accessibility impact, and
     the right fix belongs to the intake restyle sprint, which now names
     both headings explicitly rather than either being rescued by
     accident. Two recorded regressions on this live route is the
     ceiling Amendment 2 sets — a third would mean the deferral has
     become a habit rather than a deliberate call.
