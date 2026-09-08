# Handoff: BC Employer Issue Guide — UI

## Overview

A redesign of the front end of **bc-employer-issue-guide** (Next.js App Router, deployed at
`https://bc-employer-issue-guide.vercel.app/`). It covers four screens: a landing page, a
three-pass intake flow, a "Method & sources" page, and the guide output — the last of which
does not exist upstream yet and is specified here for the first time.

Primary users: British Columbia employers and HR managers handling a workplace complaint,
plus advocates and paralegals triaging on a client's behalf. Copy is deliberately
plain-language and reassuring, not legalistic.

## About the design files

The files in this bundle are **design references created in HTML** — a working prototype
that shows the intended look, copy, and behaviour. They are **not production code to copy
verbatim**. The task is to recreate these designs in the existing Next.js codebase using
its established patterns (App Router, React Server/Client Components, whatever styling
approach the repo already uses).

The one exception is `lib/guide.ts`, which is **real, portable TypeScript** — pure data and
logic with no UI. Drop it in as-is.

- `BC Employer Issue Guide.dc.html` — the prototype. Open it in a browser to click through
  the whole flow. It is a single file; markup and logic are both inside it.
- `support.js` — runtime the prototype needs in order to open. Not part of the deliverable.
- `classical/styles.css` — **the design system stylesheet. This is a real deliverable.**
  Every colour, font, spacing and radius value in the design comes from it, and it carries
  the component classes (`.btn`, `.card`, `.input`, `.seg`, `.radio`, `.table`, `.tag`,
  `.hr`, `.nav`). Copy it into the app and import it globally rather than re-deriving the
  values.
- `classical/readme.md` — the design system's own guide: the rules the visual language
  follows (colour as stroke not fill, outlined buttons, hairline dividers, no bold).
  Read this before adding anything the prototype doesn't already show.
- `lib/guide.ts` — extracted logic: the question set, the recommendation paths, the
  deadline arithmetic, and the validation rules.

## Fidelity

**High fidelity.** Colours, typography, spacing, copy, and interaction states are final and
have been reviewed. Recreate the UI faithfully. All values resolve from
`classical/styles.css` tokens — if you find yourself typing a hex code or a px value, check
the stylesheet first, because it is almost certainly already a variable.

Two things are intentionally *not* final:

1. **Persistence.** The prototype keeps intake answers in React state only, so a refresh
   loses them. You need to decide how answers survive navigation — see *State management*.
2. **The legal content.** Limitation windows, statute references, and the recommended steps
   are a careful but unreviewed first draft. **A BC employment lawyer must review
   `lib/guide.ts` before this ships.** Every number in it is load-bearing.

---

## Setup

### 1. The stylesheet

Copy `classical/styles.css` into the app (e.g. `app/classical.css`) and import it once in
`app/layout.tsx`. It contains an `@import` for the Google Fonts; if you prefer `next/font`,
delete that first line and load the two families yourself:

```ts
import { Cormorant_Garamond, Lora } from 'next/font/google';

const heading = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '600'],
  variable: '--font-heading' });
const body = Lora({ subsets: ['latin'], weight: ['400', '600'],
  variable: '--font-body' });
```

If you do that, remove the `--font-heading` / `--font-body` declarations from the
stylesheet's `:root` so the `next/font` variables win.

The stylesheet also sets `body { margin: 0; background: var(--color-bg); color:
var(--color-text); font-family: var(--font-body); font-size: 15px; line-height: 1.55 }` and
a global `* { box-sizing: border-box }`. Check these don't fight an existing reset.

### 2. Routes

| Route | Screen | Notes |
| --- | --- | --- |
| `/` | Landing | Static; server component |
| `/intake` | Intake, three passes | Client component (holds answer state) |
| `/about` | Method & sources | Static; server component. Replaces the current placeholder route |
| `/guide` | Guide output | New. Renders from the answers |

The prototype is a single-page app that switches screens in state; the real app should use
real routes. The nav (`Overview` / `Intake` / `Method`) and the disclaimer bar sit in
`app/layout.tsx` so they persist — the existing site already proves the disclaimer banner
survives navigation, and that behaviour must be kept.

---

## Design tokens

All of these are already declared in `classical/styles.css`. Listed here so the
documentation is self-sufficient; **use the variable, never the literal.**

### Colour

| Token | Value | Used for |
| --- | --- | --- |
| `--color-bg` | `#f3f2f2` | Page ground |
| `--color-surface` | `#eae9e9` | Image mats, dialog fill |
| `--color-text` | `#201f1d` | Body ink |
| `--color-accent` | `#b68235` | The single accent (gold). Stroke and small marks only |
| `--color-divider` | `color-mix(in srgb, #201f1d 16%, transparent)` | Every hairline rule and input border |
| `--color-neutral-100` | `#f8f4f4` | Tinted panel fills (the "what you get back" card, the narrative sidebar) |
| `--color-neutral-200` | `#eae7e7` | Disclaimer bar ground |
| `--color-neutral-300` | `#d7d3d3` | Body copy on the dark band |
| `--color-neutral-500` | `#9b9797` | Checkbox borders |
| `--color-neutral-700` | `#605d5d` | Footer text, table meta, secondary labels |
| `--color-neutral-800` | `#444141` | Disclaimer text, the closing legal note |
| `--color-accent-400` | `#e1ad66` | Kicker text **on the dark band only** |
| `--color-accent-700` | `#7d5411` | Accent-coloured text at body size, caution icons |

Full 100–900 ramps exist for `neutral`, `accent`, and `accent-2`. **This is a mono
palette** — `accent-2` is a machine-derived stand-in that reads identically to `accent`;
treat them as one role and don't reach for it as a second colour.

One literal appears in the design that is *not* a token: `#1c1a18`, the deep warm near-black
of the landing page's "three passes" band. The design system calls for section dividers to
sit "a shade below `--color-neutral-900`" as a colophon page, and `#1c1a18` is that shade.
Consider adding it to the stylesheet as `--color-colophon` during the port.

### Type

| | |
| --- | --- |
| Headings | `var(--font-heading)` — Cormorant Garamond |
| Body | `var(--font-body)` — Lora |
| Heading weight ceiling | `600` (semibold). **Never `700`.** |
| Display sizes | `400` (normal) — the bigger the text, the lighter it sets |
| Base body | `15px / 1.55` |

Sizes used in the design (all explicit inline; the stylesheet's `h1`–`h6` defaults are
overridden almost everywhere):

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Landing h1 | `clamp(37px, 4.8vw, 60px)` | 400 | `line-height: 1.04`, `max-width: 17ch`, `text-wrap: balance` |
| Result h1 | `clamp(30px, 3.8vw, 44px)` | 400 | `line-height: 1.08`, `max-width: 26ch` |
| About h1 | `42px` | 400 | |
| Intake step title | `32px` | 400 | |
| Section h2 (landing) | `28px` | 400 | |
| Dark-band h3 | `22px` | 400 | |
| Result section heading | `14px` | 600 | uppercase, `letter-spacing: 0.1em` |
| Question label | `17px` | 600 | heading face |
| Path step title | `19px` | 600 | heading face |
| Card title | `16px` | 600 | heading face, `line-height: 1.25` |
| Hero lede | `17px / 1.62` | 400 | body face, `max-width: 52ch` |
| Result lede | `16.5px / 1.65` | 400 | `max-width: 62ch` |
| Body copy | `14px / 1.65` | 400 | `max-width: 64–66ch` |
| Small print / helper | `12.5px` | 400 | usually `.text-muted` |
| Kicker | `10.5px` | 400 | uppercase, `letter-spacing: 0.16em`, accent |
| Field label | `12px` | 400 | from `.field > label` |

**Tabular figures.** Apply `font-feature-settings: 'tnum'` to any number that stands as a
figure or sits in a column: the `01`/`02`/`03` numerals, step ordinals, the deadline dates,
character counts, and the tenure and date inputs. **Do not** apply it to running prose —
Lora's tabular feature also widens word-spaces and punctuation, which loosens the text.

### Spacing, radius, elevation

`--space-1: 4.6px` · `--space-2: 9.2px` · `--space-3: 13.8px` · `--space-4: 18.4px` ·
`--space-6: 27.6px` · `--space-8: 36.8px` (a 1.15× density scale).

`--radius-sm: 2px` · `--radius-md: 4px` (everything in this design) · `--radius-lg: 7px`.

`--shadow-sm/md/lg` exist but **the design uses none of them.** Elevation here is a
whisper; structure is carried by hairlines. Don't add shadows during the port.

The screens use explicit pixel padding rather than the space scale in places (`30px`
gutters, `56px` section tops). Those are deliberate editorial margins — keep them, but reach
for `var(--space-*)` for anything new.

### Interaction states

All built into the stylesheet. **Do not restyle them per component.**

- Hover: an accent `color-mix()` tint. Pressed: one ramp step past the base.
- Focus: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`.
  Never leave the browser's blue ring.
- Selection: an accent tint. Disabled: `opacity: 0.45`, `cursor: not-allowed`.
- Links: `a { color: var(--color-accent) }`, `a:hover { color: var(--color-accent-700) }`.

### Icons

Lucide (https://lucide.dev), inline SVG on `currentColor`, `stroke-width: 1.6–1.8`,
`stroke-linecap: round`, `fill: none`. Sizes used: `13px` (disclaimer), `14–15px`
(buttons, list markers), `16px` (selected check). Icons in the design: `info` /
`alert-circle`, `arrow-right`, `arrow-left`, `check`, `printer`, `triangle-alert`.
Use `lucide-react` in the port.

---

## Screens

### 1. Landing — `/`

**Purpose:** explain what the tool does, reassure, and get the user into intake.

**Layout.** Four stacked bands, each `max-width: 1060px` centred with `30px` side padding,
except the dark band which is full-bleed with a centred inner container.

**Band A — hero.** `display: grid`, `grid-template-columns: repeat(auto-fit,
minmax(310px, 1fr))`, `gap: 48px`, `align-items: end`, padding `56px 30px 48px`. Two cells:

*Left cell:*
- Kicker: `Human Rights Code · Employment Standards · WorkSafeBC` — `10.5px`, uppercase,
  `letter-spacing: 0.16em`, `var(--color-accent)`, `margin-bottom: 18px`.
- `h1`: "Most of these situations are workable." (see *Variants* for the alternate framing.)
- `hr.hr` with `background: var(--color-accent)`, `margin: 0 0 20px` — the one accent rule
  on the page.
- Lede paragraph, `17px / 1.62`, `max-width: 52ch`, `text-wrap: pretty`:
  "Answer a few questions about what has happened, and this guide will lay out one clear
  path forward — the order to do things in, what to write down, and which dates you need to
  watch. Built for British Columbia employers and the people who advise them."
- Button row, `display: flex; gap: 11px; flex-wrap: wrap`:
  - `.btn.btn-primary` → `/intake`. Label "Start intake" + `arrow-right` 15px.
    `font-size: 15px; padding: 11px 22px`.
  - `.btn.btn-secondary` → `/about`. Label "How this is assessed". Same size.
- Reassurance line, `.text-muted`, `12px`, `margin-top: 18px`:
  "Takes about six minutes. Nothing you type leaves your browser."

*Right cell — "What you get back" panel:*
`border: 1px solid var(--color-divider)`, `border-radius: var(--radius-md)`,
`background: var(--color-neutral-100)`, `padding: 22px 26px 6px`. A `10px` uppercase accent
kicker, then three rows. Each row: `display: grid; grid-template-columns: 28px minmax(0,1fr);
gap: 15px; padding: 15px 0; border-top: 1px solid var(--color-divider)`. Left column is the
numeral `01`/`02`/`03` in the heading face at `19px`, `var(--color-accent)`, `tnum`. Right
column is a `16px` semibold heading-face title over `13.5px / 1.55` body at `opacity: .8`.

Row copy:
1. **One recommended path** — "Not a menu of options — the sequence that fits the facts you
   gave, step by step."
2. **The dates that matter** — "Filing windows and internal response times, counted from
   your incident date."
3. **A file you can hand over** — "What to gather, what to avoid doing, printable for
   counsel."

**Band B — "The three passes" (the colophon band).** Full-bleed `background: #1c1a18`,
`color: var(--color-neutral-200)`, `padding: 50px 30px`. Inner container `max-width: 1060px`.
Kicker in `var(--color-accent-400)` at `10.5px` uppercase. Then a
`repeat(auto-fit, minmax(230px, 1fr))` grid with `gap: 34px`, three cells.

Each cell is `position: relative` with a **ghost numeral** behind it: `position: absolute;
top: -20px; left: -4px; font-family: var(--font-heading); font-size: 78px; line-height: 1;
color: var(--color-accent); opacity: .22` — Roman `I`, `II`, `III`. The content sits in a
`position: relative` wrapper above it: a `1px` accent rule at `opacity: .5`, a `22px`/400
`h3` in `--color-neutral-100`, and a `14px / 1.6` paragraph in `--color-neutral-300`.

The numerals deliberately overlap the headings — that is the design system's colophon
treatment. Keep it; the headings stay legible at `.22`.

Cell copy: **Context** — "Where things stand today — status, tenure, and whether anything
has been formally lodged yet." · **Concern** — "How the employee has framed the issue, plus
the features of the matter you think are relevant." · **Narrative** — "The sequence in your
own words, with a date. This is what sets the timeline and the document list."

**Band C — "What this guide is careful about."** Two-column
`repeat(auto-fit, minmax(270px, 1fr))`, `gap: 40px`, padding `48px 30px 68px`. Left: a
`28px`/400 `h2` and an `hr.hr`. Right: two paragraphs at `14.5px / 1.7` with
`text-align: justify; hyphens: auto` — the system's editorial column treatment. Statute
names in `<em>`.

### 2. Intake — `/intake`

**Purpose:** collect six answers across three passes.

**Layout.** `max-width: 980px`, padding `36px 30px 70px`. Top to bottom: the stepper, then a
two-column body (`repeat(auto-fit, minmax(300px, 1fr))`, `gap: 44px`, `align-items: start`)
whose left cell is the pass heading and blurb and whose right cell is the questions, then an
`hr.hr` and the navigation row.

**Pass heading (left cell).** `32px`/400 `h2` and a `.text-muted` `14px / 1.6` blurb at
`max-width: 38ch`. Content per pass:

| Pass | Title | Blurb |
| --- | --- | --- |
| 1 | Where things stand | These answers tell us which routes are open and which clocks may already be running. Estimates are fine. |
| 2 | What the concern is | We ask for their framing first, then yours. Both change the recommendation. |
| 3 | What happened | Your account in plain words. This is what sets the timeline and the document list. |

**Stepper (default treatment — "hairline rules").** `repeat(auto-fit, minmax(150px, 1fr))`
grid, `gap: 20px`, `margin-bottom: 40px`. One cell per pass. Reached passes get a `2px`
`var(--color-accent)` rule above the label; unreached get a `2px` `var(--color-divider)` rule
and the whole label block at `opacity: .45`. Label block: `display: flex; align-items:
baseline; gap: 9px` — an `11px` `tnum` numeral (`01`/`02`/`03`) then a `15px` semibold
heading-face name (`Context` / `Concern` / `Narrative`). See *Variants* for two alternates.

**Questions (right cell)**, stacked `display: flex; flex-direction: column; gap: 30px`:

**Q1 — employment status.** Heading-face question at `17px`/600, `margin-bottom: 11px`:
"Where does their employment stand today?" Control: `.seg` with `flex-wrap: wrap` and three
`.seg-opt` labels wrapping native radios — `Active` / `Suspended` / `Terminated`.

**Q2 — tenure.** A `.field` with label "How long have they worked for you? An estimate is
fine." Row: `display: flex; gap: 10px; flex-wrap: wrap` — an `.input[type=number][min=0]`
at `max-width: 100px` with placeholder `4` and `tnum`, beside an `.input` `<select>` at
`max-width: 140px` with options `years` / `months`.

**Q3 — prior filings.** Question `17px`/600: "Has anything been formally lodged yet, by
either side?" Helper `.text-muted` `12.5px`: "Counts: a written internal complaint, a
Tribunal filing, a union grievance, or a WorkSafeBC report." Control: two `.radio` labels
(`<input type="radio">` + `<span class="dot">`) `Yes` / `No`, `gap: 22px`.

**Q4 — the concern.** Question: "What is the concern, as they have framed it?" Helper: "Pick
their framing even if you see it differently — you can add your own read next."

A `repeat(auto-fit, minmax(250px, 1fr))` grid, `gap: 12px`, of eight selectable cards. Each
card is a `<button class="card">` — `text-align: left`, `padding: 15px 17px`, `gap: 5px`,
transparent background, inherited font and colour. Hover:
`background: color-mix(in srgb, var(--color-text) 4%, transparent)`.

**Selected state** is drawn two ways, both additive so the card's own border never changes
colour: a `check` icon (16px, `stroke: var(--color-accent)`) appears at the top right of the
title row, and an absolutely-positioned overlay spans the card —
`position: absolute; inset: 0; border-radius: var(--radius-md); box-shadow: inset 0 0 0 1px
var(--color-accent); pointer-events: none`. (The overlay exists so the ring can be added
without a filled or recoloured surface, per the system's stroke-only rule. In React you can
equally use a conditional class — just keep the visual result identical.)

Card content: `16px`/600 heading-face title, then `12.5px / 1.5` description at
`opacity: .75`. Titles and descriptions are the `CONCERNS` array in `lib/guide.ts` —
single source of truth, don't retype them.

**Q5 — factors.** Question: "Anything else true about this matter?" Helper: "Optional. Each
one you pick sharpens the recommendation." A wrapping flex row, `gap: 8px`, of eight toggle
chips: `<button>` with `1px solid var(--color-divider)`, `border-radius: var(--radius-md)`,
`padding: 7px 13px`, `font-size: 13px`, transparent. Hover `color-mix(… 6%)`. Selected uses
the same inset-ring overlay as the cards. Labels are `FACTORS` in `lib/guide.ts`.

**Q6 — narrative.** Question: "Tell us what happened, in order." Helper: "Plain language is
best. No need to characterise anything legally — that is our job."

- `textarea.input`, `min-height: 200px`, `font-size: 14.5px`, `line-height: 1.65`,
  `padding: 13px`. Placeholder: "On 12 March they gave their supervisor a note recommending
  reduced hours. On 20 March their schedule was changed without discussion…"
- Below it, a `space-between` row at `12px` `.text-muted`: on the left a hint that flips
  from "A few sentences is plenty." to "That is enough to work with." once the trimmed
  length reaches 60; on the right a `tnum` character count, `"<n> characters"`.
- A `repeat(auto-fit, minmax(190px, 1fr))` grid, `gap: 18px`, `margin-top: 22px`, with two
  `.field`s: an `.input[type=date]` labelled "Date of the most recent relevant event"
  (`tnum`), and an `.input` `<select>` labelled "What are you hoping for?" with options
  `Resolve it internally` / `Respond to a filed complaint` / `Move ahead with termination` /
  `Not sure yet`.
- A tinted prompt panel, `margin-top: 22px`: `1px` divider border, `var(--radius-md)`,
  `background: var(--color-neutral-100)`, `padding: 18px 20px 4px`. A `10px` uppercase accent
  kicker "Helpful to include, if you know it", then five `13.5px / 1.5` rows each with
  `padding: 9px 0; border-top: 1px solid var(--color-divider)`. Content is `PROMPTS`.

**Navigation row.** `hr.hr` (`margin: 42px 0 16px`), then a `space-between` flex row with
`gap: 14px; flex-wrap: wrap`:
- Left: `.btn.btn-secondary` with `arrow-left` + a label that reads "Back to overview" on
  pass 1, otherwise "Back".
- Right: a `12.5px` `.text-muted` gate note, then `.btn.btn-primary`
  (`padding: 10px 20px`) with `arrow-right` and a label that reads "Continue", or "See the
  recommendation" on the last pass.

The primary button is `disabled` whenever the current pass has unmet requirements, and the
gate note names what is missing — e.g. `Still needed: tenure, the concern`. Both come from
`missingNote()` in `lib/guide.ts`. Disabled styling is already in `.btn:disabled`.

Advancing scrolls to the top of the document (`window.scrollTo(0, 0)`); in the routed
version, Next's default scroll restoration covers this.

### 3. Method & sources — `/about`

Single column, `max-width: 740px`, padding `56px 30px 70px`. Accent kicker "Method", a
`42px`/400 `h1` "How the recommendation is built", an accent `hr.hr`, then two justified
paragraphs at `15px / 1.72`. Then a `19px`/600 `h3` "Sources consulted" over a hairline
list — each row `display: flex; justify-content: space-between; padding: 11px 0;
border-bottom: 1px solid var(--color-divider); font-size: 14px`, with the citation on the
left and a `.text-muted` section reference on the right:

| Source | Reference |
| --- | --- |
| Human Rights Code, RSBC 1996, c. 210 | ss. 13, 43 |
| Employment Standards Act, RSBC 1996, c. 113 | ss. 63, 74, 83 |
| Workers Compensation Act — OHS bullying policies | D3-115-2 |
| BC Human Rights Tribunal — Rules of Practice | Filing & screening |

Closes with a `.btn.btn-secondary` "Back to overview".

This route currently holds a placeholder whose stated job is to prove the disclaimer banner
persists across navigation. Replacing it is fine — but keep the persistent banner, since
that is what the placeholder was there to demonstrate.

### 4. Guide output — `/guide`

**Purpose:** deliver one recommended path, its reasoning, the dates, and the file to build.
Printable. This screen is new; nothing exists upstream.

**Layout.** `max-width: 980px`, padding `36px 30px 76px`. Sections in order, each introduced
by a `14px`/600 uppercase heading (`letter-spacing: 0.1em`) followed by an `hr.hr`.

**Header.** A `space-between` flex row, `align-items: flex-end`, `flex-wrap: wrap`,
`border-bottom: 2px solid var(--color-accent)`, `padding-bottom: 16px`. Left: accent kicker
"Recommended path" then the `h1` (the path title, `max-width: 26ch`, `line-height: 1.08`).
Right: two `.btn.btn-secondary`s, `gap: 9px`, both `white-space: nowrap` — "Print" with a
`printer` icon (calls `window.print()`) and "Start over" (clears answers, returns to `/`).
Both carry `.no-print`.

**Meta row.** A wrapping flex row, `gap: 6px 26px`, `padding-top: 13px`, `12.5px`,
`var(--color-neutral-700)`. Five key/value pairs, each an uppercase `10.5px` key
(`letter-spacing: 0.08em`) beside a `var(--color-text)` value: **Status**, **Tenure**
(`"4 years"`), **Lodged**, **Goal**, **Prepared** (today, `en-CA` long form —
"7 September 2026"). Unanswered values render as an em dash.

**Lede.** `16.5px / 1.65`, `max-width: 62ch`, `margin: 30px 0 44px`. Path-specific.

**"Do these, in this order".** A hairline-separated list. Each row:
`display: grid; grid-template-columns: 34px minmax(0,1fr); gap: 18px; padding: 19px 0;
border-bottom: 1px solid var(--color-divider)`. Left column: a zero-padded ordinal
(`01`…) in the heading face at `24px`, `var(--color-accent)`, `tnum`. Right column: a title
row (`19px`/600 heading face) with a `.tag.tag-outline` timing chip beside it — "Within 3
days", "This week", "Before acting" — then a `14px / 1.65` description at `max-width: 66ch`.

**"Why this path"** (toggleable — see *Variants*). Hairline rows,
`repeat(auto-fit, minmax(240px, 1fr))`, `gap: 8px 28px`, `padding: 16px 0`. Left: a `17px`/600
framework name over an `11.5px` statute citation in `var(--color-accent-700)`. Right: a
`13.5px / 1.6` explanation of how strongly it is engaged.

**"Dates to watch".** A `.table` with columns **What / Where / Window / Runs to**. First cell
per row uses the heading face at `15px`/600; the "Runs to" cell is `13.5px` with `tnum`.
Rows come from `deadlineRow()`. When no incident date was given the cells read
"set an incident date" or "begin now" rather than showing a wrong date.

**Two-column close.** `repeat(auto-fit, minmax(290px, 1fr))`, `gap: 38px`:
- **"Put in the file"** — checkable hairline rows. Each is a `<label>` with a real
  `<input type="checkbox">` at `14px` square, `accent-color: var(--color-accent)`,
  `margin-top: 4px`, beside `14px / 1.5` text.
- **"Hold off on"** — the same row rhythm, but with a `triangle-alert` icon at `14px`,
  `stroke: var(--color-accent-700)`, in place of the checkbox.

**Closing note.** `border-top: 1px solid var(--color-divider)`, `padding-top: 18px`, a
`10px` uppercase accent "Note" label beside a `13px / 1.65` paragraph at
`var(--color-neutral-800)`, `max-width: 78ch`: "This reading comes from the answers you gave
and has not been reviewed by a lawyer. Dates are calculated arithmetically and do not
account for extensions, tolling, or the Tribunal's discretion to accept a late complaint.
Check every date before you rely on it."

**Print.** `@media print { .no-print { display: none !important } }`. The disclaimer bar,
nav, footer, and header buttons all carry `.no-print`, so the printed page is the memo
alone. Keep that.

### Persistent chrome (`app/layout.tsx`)

**Disclaimer bar.** Full width, `background: var(--color-neutral-200)`, `border-bottom: 1px
solid var(--color-divider)`, `padding: 7px 16px`, centred flex with `gap: 8px`. An `info`
icon at `13px` beside `11px` uppercase text (`letter-spacing: 0.05em`,
`var(--color-neutral-800)`): "Informational triage tool only — this is not legal advice".
Carries `.no-print`.

**Nav.** `.nav` with `padding: 13px 30px`, `flex-wrap: wrap`, `gap: var(--space-3)`. Brand is
`.nav-brand` at `17px`: a `10.5px` `BC` in the **body** face with `letter-spacing: 0.16em`
and `var(--color-accent)`, beside "Employer Issue Guide" in the heading face, baseline
aligned, `gap: 9px`. Then three links — Overview, Intake, Method. `.nav a` inherits colour
and turns accent on hover and on `[aria-current="page"]`; wire `aria-current` from the
active route.

**Footer.** `border-top: 1px solid var(--color-divider)`, `padding: 20px 30px`,
`space-between`, `12px`, `var(--color-neutral-700)`. Left: "BC Employer Issue Guide ·
British Columbia, Canada". Right: "Not legal advice · Nothing retained". `.no-print`.

---

## Responsive behaviour

There are no media queries. Every multi-column layout is
`repeat(auto-fit, minmax(<floor>, 1fr))`, so columns collapse on their own; the hero, the
intake body, the concern grid, the date/goal pair, and the result's two-column close all
reflow to single column on a phone. Type scales via `clamp()` on the two display headings
only. Keep this approach — do not add breakpoints during the port unless something
genuinely breaks.

Grid children use `minmax(0, 1fr)` where they contain long text, to stop overflow. The
intake question column carries `min-width: 0` for the same reason.

Touch targets: `.btn` is 36px+ tall, `.input` has `min-height: 36px`, and the concern cards
are large. If you find a control under 44px on mobile, pad it rather than shrinking the type.

---

## State management

Six answers plus flow position. The shape is `Answers` in `lib/guide.ts`, with
`EMPTY_ANSWERS` as the initial value.

Flow position in the prototype is `{ step: 1 | 2 | 3, cursor: 1..6 }` — `cursor` is only
used by the one-question-per-screen variant; `STEP_OF` maps a question index to its pass.

Transitions:
- **Continue** — blocked while `missingNote(step, answers) !== ''`. Otherwise `step + 1`, or
  to the guide output from pass 3.
- **Back** — `step - 1`, or to the landing page from pass 1.
- **Start over** — reset to `EMPTY_ANSWERS` and return to `/`.

**The decision you need to make.** The prototype holds this in component state, which is
fine for a single-page mock but means a refresh or a route change loses everything. Options:

- **`sessionStorage`, client-only.** Simplest, and it matches the promise in the copy —
  "nothing you type leaves your browser". Keep `/intake` as one client route with the three
  passes as internal state, and persist on change. **This is the recommended default**,
  because the narrative field contains sensitive third-party information and the reassurance
  copy is doing real work.
- **URL params per pass** (`/intake/1`, `/intake/2`…). Shareable and back-button friendly,
  but the narrative is far too long for a query string and putting it there would leak into
  server logs and browser history. Don't.
- **Server-side session.** Only if you later want saved cases or multi-device access — which
  changes the privacy promise, so the copy and the disclaimer would need revisiting first.

Whatever you pick, `/guide` needs the answers to render. If you go the `sessionStorage`
route, make it a client component that reads storage on mount and redirects to `/intake` when
there is nothing there.

No data fetching. `recommend()` is synchronous and pure.

---

## Variants

The prototype exposes four toggles so the team can settle these before the port. **Pick one
value for each and implement only that** — don't port the switches.

| Toggle | Options | Prototype default |
| --- | --- | --- |
| Intake layout | Grouped by pass · One question per screen | **Grouped by pass** |
| Stepper | Hairline rules · Numbered ledger · Slim progress bar | **Hairline rules** |
| Landing framing | Reassuring · Question-led | **Reassuring** |
| Show "Why this path" | on · off | **on** |

The alternates, if one is chosen:

- **One question per screen.** Same markup; only one question visible at a time, `cursor`
  drives it, and the gate checks that single question. Six screens instead of three.
- **Numbered ledger stepper.** A bordered list (top and bottom `1px` divider) with one row
  per pass: `grid-template-columns: 44px minmax(0,1fr) auto`, `padding: 13px 2px`. A `26px`
  accent Roman numeral, the pass name at `16px`/600, and a right-aligned `10.5px` uppercase
  state — `Done` / `In progress` / `Not started`.
- **Slim progress bar stepper.** A `space-between` row with the current pass name at
  `16px`/600 and a `tnum` "Pass 2 of 3" label, over a `5px`-tall track (`1px` divider border,
  `border-radius: 2px`, `overflow: hidden`) whose fill is `var(--color-accent)` at
  `step / 3 × 100%`.
- **Question-led landing.** Swaps the `h1` to "An employee has raised something. What now?"
  (`max-width: 19ch`) and the lede to: "Take three short passes through the facts and this
  guide will give you one recommended path — sequenced, dated, and written in plain language.
  For British Columbia employers and the advocates who triage on their behalf."

---

## Content and logic (`lib/guide.ts`)

Drop this in and import from it. It holds:

- `CONCERNS` — the eight concern cards (id, label, description).
- `FACTORS` — the eight optional chips.
- `PROMPTS` — the five narrative sidebar hints.
- `PATHS` — six recommendation paths, each with a title, lede, four sequenced steps,
  frameworks, document list, cautions, and which deadline rows to show.
- `CONCERN_TO_PATH` — eight concerns collapse to six paths (race, age, and sex all map to
  the shared `code` path, which is the general Code-complaint investigation).
- `STEP_META` — pass numerals, names, titles, blurbs.
- `recommend(answers)` — returns the whole output screen's content. Factors and a prior
  filing append extra cautions, documents, and framework notes.
- `deadlineRow(key, answers)`, `monthsFromIncident`, `businessDaysFromIncident`.
- `questionValid(n, answers)`, `missingNote(step, answers)`, `STEP_OF`, `EMPTY_ANSWERS`.

Notes on the date maths, since it is easy to get subtly wrong:

- The incident date is parsed as `new Date(iso + 'T12:00:00')` — **noon local, deliberately**,
  so a DST transition can never roll the displayed date back a day. Don't "simplify" it to
  `new Date(iso)`, which parses as UTC midnight and shifts west of Greenwich.
- The internal-investigation row counts **5 business days**, skipping Saturdays and Sundays.
  It does **not** skip BC statutory holidays; adding a holiday calendar would be an
  improvement.
- Dates render via `toLocaleDateString('en-CA', { day: 'numeric', month: 'long',
  year: 'numeric' })`. If any of this renders on the server, pin the locale and time zone
  explicitly or you will get hydration mismatches — the safest fix is to format on the
  client, or to pass a preformatted string down from a server component that sets
  `timeZone: 'America/Vancouver'`.

**All of the legal content in this file needs a lawyer's review before launch.** The
limitation periods (1 year to the Tribunal, 6 months to the Employment Standards Branch,
4-year record retention) and the statute references are drafted carefully but were not
verified by counsel, and the recommended steps are general guidance rather than advice on any
matter.

---

## Assets

None. No images, no photographs, no logos. All icons are inline Lucide SVG paths; the port
should use `lucide-react`. The design system's `.plate` image wrapper is unused here — if
photography is added later, every content photograph must go through it.

---

## Files in this bundle

| File | What it is |
| --- | --- |
| `BC Employer Issue Guide.dc.html` | The prototype. Open in a browser to click through. Design reference, not production code. |
| `support.js` | Runtime the prototype needs in order to open. Not a deliverable. |
| `classical/styles.css` | **Deliverable.** The design system stylesheet: tokens plus component classes. |
| `classical/readme.md` | The design system's guide — the rules the visual language follows. |
| `lib/guide.ts` | **Deliverable.** Portable TypeScript: content, recommendation logic, date maths, validation. |

## Suggested order of work

1. Import `classical/styles.css` globally; load the two fonts. Confirm tokens resolve.
2. Build the persistent chrome in `app/layout.tsx` — disclaimer bar, nav, footer.
3. Landing and Method pages. Both static; they establish the type and rule rhythm.
4. Drop in `lib/guide.ts`. Decide persistence before building the flow.
5. Intake at `/intake`, one client component, three passes, gating from `missingNote()`.
6. Guide output at `/guide` from `recommend()`. Check print output.
7. Book the legal review of `lib/guide.ts`.
