# Fully Completely — Global Instructions

This project uses a sprint workflow enforced by `scripts/sprint_lifecycle.py`.
Slash commands in `.claude/commands/` are the only supported way to move a
sprint forward. Never edit `docs/sprints/registry.json` or anything in
`docs/sprints/state/` by hand, and never move sprint files between folders
yourself, the script owns that. There are two deliberate exceptions: the
trivial fix fast lane (`## Trivial fix fast lane` below), and changes to
this repository's own tooling (`## Changes to this repo's own tooling`
below). The former is a narrow category of change, judged against an
objective checklist rather than a size or risk feeling, that skips the
sprint file and the state
machine entirely.

**Only Pipeman ever runs `git push`, no exceptions, ever.** This holds
regardless of which command you're running or which role's session is
active. In particular, running `/sprint-complete` never involves a push,
it only updates bookkeeping, if you're in Dev Team 1 or Dev Team 2's
session when a sprint wraps up (the common case), do not push as a
"finishing touch" just because you're the one closing it out. Commit
locally if needed, then hand off to Pipeman via `/sprint-ship` or
`/sprint-reship`.

**A sprint is never closed without the user's explicit, real-time
authorization, no exceptions.** Both QA1's audit and GroundTruth's live test
passing tells you the code is ready to close, it does not tell you the user
has decided, right now, to close it, those are different facts and the
second is never inferred from the first. Once both gates are green, Dev
Team tells the user the sprint is ready and waits; it only runs
`/sprint-complete <N>` when the user explicitly says to, in that moment.
This is mechanically backstopped, not just an instruction: `complete`
requires `--user-said "..."`, quoting what the user actually said, and
refuses outright, no override, if it's missing or empty.

## The team

| Role | Shorthand | Agent file | Model | Job |
|---|---|---|---|---|
| Master Controller | MC | `.claude/agents/master-controller.md` | opus | Plans sprints, checks status read-only |
| Dev Team 1 | Dev1 | `.claude/agents/dev-team-1.md` | sonnet | Starts, builds, tests, fixes, closes its own sprint |
| Dev Team 2 | Dev2 | `.claude/agents/dev-team-2.md` | sonnet | Runs a separate, independent sprint in parallel, in its own git worktree |
| QA1 | QA1 | `.claude/agents/qa1.md` | opus | Static code audit (the only gate) |
| Pipeman | PM | `.claude/agents/pipeman.md` | sonnet | Only one who pushes to remote |
| GroundTruth | GT | `.claude/agents/groundtruth.md` | opus | Live browser testing after every push |

Shorthand is for conversation only, never for file names or commands.

Run each role as its own dedicated Claude Code session, always, no
exceptions, a separate terminal tab is the simplest setup, pasting the
relevant agent file as that session's system prompt. Start each session
with the model listed above, e.g. `claude --model opus` for Master
Controller, QA1, or GroundTruth.

**Never invoke another role via the Task/Agent tool as a substitute for
that role running in its own session, ever, regardless of which role's
session you're currently in.** A role's job is to do its own work and then
say so, that's the whole handoff, it is never to perform, simulate, or
spawn another role's actual work, through any mechanism, whether that's
running another role's slash command directly or invoking that role via
the Task/Agent tool. This has actually happened: Dev Team 1's session
spawned QA1 as a sub-agent via the Task tool, inside its own session,
instead of waiting for a real, separate QA1 session to run the audit,
because an earlier version of this file presented sub-agent invocation as
an equally-valid convenience option instead of the hard requirement it
actually is. When a role's work is done, it states its handoff message
and stops. Only the user, moving to the correct role's own session, acts
on that handoff.

## The lifecycle

```
/sprint-new "Title" --epic "Epic name"      Master Controller
        │  (fills in requirements/acceptance criteria in the file)
/sprint-start <N>                            Dev Team 1/2
        │
   dev_build  ─────────────────────────────  Dev Team 1/2 builds
        │
/sprint-qa1 <N> --verdict ...                QA1 (gate 1)
        │  FAIL/CONDITIONAL → back to dev_build
        │  PASS ↓
/sprint-dev-done <N>                         Dev Team (agreed done, NOT complete)
        │
/sprint-ship <N> --commit <hash>             Pipeman
        │
   groundtruth_live ──────────────────────────── GroundTruth tests live
        │
/sprint-groundtruth <N> --deployed-commit <sha> --verdict ...   GroundTruth
        │  FAIL/CONDITIONAL → Dev Team fixes, Pipeman /sprint-reship, loop
        │  PASS ↓
/sprint-complete <N> --user-said "..."       Dev Team 1/2 closes it, only when told to
```

A sprint is never complete just because Dev Team said so mid-build. It's only
complete once QA1's static audit AND GroundTruth's live test have both
independently passed, **and** the user has explicitly authorized closing it
right now. `/sprint-complete` enforces the first two and will refuse to
close a sprint that's missing either one, telling you exactly which; it
enforces the third by requiring a non-empty `--user-said`, see the note near
the top of this file. Gates passing is not authorization, don't run this
command just because both are green, wait for the user to actually say so.

There used to be a second QA1 gate here, a "final check" run after
GroundTruth passed. Across ~13 real sprints it never once caught anything
gate 1 + the live test hadn't already caught, so it was removed — the one
thing it occasionally caught (a sprint file amended mid-build, after QA1's
first read) is now handled two ways: QA1 re-reads the sprint file fresh
immediately before recording its gate-1 verdict (see `.claude/agents/qa1.md`),
and `/sprint-dev-done` mechanically enforces it — a QA1 PASS records a hash
of the sprint file as audited, and dev-done refuses outright, no override,
if the file has changed since. The instruction covers understanding; the
hash check covers the case where the instruction gets skipped under load.

**Command ownership**: `/sprint-start` and `/sprint-complete` are run by
whichever Dev Team (1 or 2) owns the sprint, not by Master Controller. Master
Controller plans sprints and reads status (`/sprint-status`), it does not
issue lifecycle transition commands once a sprint is handed off. Running
those from both a Master Controller session and a Dev Team session at the
same time is what has actually caused duplicate-attempt races and stale
"already complete" errors, keep it to one issuer per sprint.

**Wrong-script safety net**: every `sprint_lifecycle.py` invocation prints a
`[sprint_lifecycle] repo=... script=...` line to stderr. If that path doesn't
point into *this* repo's `scripts/sprint_lifecycle.py`, stop, you're looking
at output from a different tool (a stale global command, a same-named script
elsewhere on disk), not this project's lifecycle state.

**QA1 audits code, not just the sprint file**: the same PASS that records
the sprint-file hash also records the audited commit's tree hash, the
content of the files at that commit, not its SHA. `/sprint-ship` resolves
whatever `--commit` Pipeman passes and refuses outright, no override, if
its content doesn't match what QA1 audited. Using tree content instead of
the raw commit SHA is deliberate: Pipeman's own process legitimately
squashes or rebases before pushing, which changes the SHA without changing
any file, and that must keep working. What must NOT keep working is a
new, unaudited change landing between QA1's PASS and the push, so a
content mismatch always means a fresh `/sprint-qa1` audit is required
before that commit can ship. If you already ran `/sprint-dev-done` once
and need a fresh audit (a new commit landed after the fact), re-running
`/sprint-qa1` is expected to work and resets the phase, run
`/sprint-dev-done` again afterward before shipping.

## Trivial fix fast lane

Not every change needs the full lifecycle. On the downstream project this
is drawn from, the QA1 + GroundTruth gate process has repeatedly caught
real bugs, a double-click scoring race, a requirement a static audit
missed but the live test caught, a synchronous-write race on a new storage
key, and every one of those catches was on a change that touched state,
logic, or persistence. None of the real catches were on visual/copy-only
changes. Running the full two-gate process on a one-line footer reorder is
where the actual friction lives, not the verification itself.

**Criteria** (all must hold, this is a checklist, not a size or risk
judgment call):
- The diff touches exactly one file.
- That file is a component/style file (`.tsx`/`.jsx`/`.css` or
  equivalent), **and** the diff itself is markup, text content, or
  style/className props only, no new or modified state, hooks, effects,
  function bodies, or business logic of any kind.
- No new dependencies.
- Not a data file (a `cards.json`/`players.json`-equivalent). Content
  changes still go through the existing lightweight content-sprint
  pattern, a print/export pipeline can be affected by a content change in
  ways a diff doesn't show.

If every criterion holds: Master Controller (or whoever's directing the
work) gives Dev Team a direct instruction, no `/sprint-new` required. Dev
Team builds it, self-verifies (build, lint, and test clean, plus an actual
manual check that it renders correctly, don't skip this because the diff
is small), and hands directly to Pipeman. QA1's static audit and
GroundTruth's live test are both skipped, but only for this category
specifically, not the whole verification layer, Pipeman's normal pre-push
checks (branch hygiene, clean build) still apply exactly as they do for
every other push.

If a change fails even one criterion, it goes through the full process,
unchanged, no partial credit and no in-between tier. These criteria are
deliberately mechanical, file count, file type, diff content, dependency
changes, rather than a judgment call about how big or risky a change
*feels*, so "trivial" can't quietly stretch over time to cover changes
that actually needed a real audit. When in doubt, it isn't trivial, run
the full process.

## Running two sprints at once

Each sprint has its own ID and its own state file, so two sprints can be
in-flight at the same time, each moving through the lifecycle above
independently. Dev Team 2 exists for exactly this: Master Controller
assigns it a separate sprint from whatever Dev Team 1 is building. Checking
the Dependencies section of both sprint definitions for file/type overlap is
necessary but **not sufficient**, "independent" sprints on a small app
routinely both end up touching shared files (routing, a shared layout,
a shared config) even when their features don't conceptually overlap.

Because of that, Dev Team 2 always works in its own git worktree, a
separate working directory on its own branch, not the same checkout Dev
Team 1 is using. This is the default, not an opt-in:

```bash
/sprint-worktree <N>
```

run once, before Dev Team 2 starts building. It creates (or reuses) a
worktree at `../<repo>-devteam2-sprint-<N>` on branch `devteam2/sprint-<N>`
and prints the path. Dev Team 2's session should `cd` there before touching
any files, and stay there for the whole sprint. This is what actually
prevents the uncommitted-work collisions that "check for overlap first"
alone did not.

## Quick reference

```bash
/sprint-new "Title" [--epic "Epic name"]
/sprint-start <N>
/sprint-worktree <N>            # Dev Team 2 only, before building
/sprint-status [<N>]
/sprint-list
/sprint-qa1 <N> --verdict PASS|FAIL|CONDITIONAL --notes "..."
/sprint-dev-done <N>
/sprint-ship <N> --commit <hash>
/sprint-reship <N> --commit <hash>
/sprint-groundtruth <N> --deployed-commit <sha> --verdict PASS|FAIL|CONDITIONAL --notes "..."
/sprint-complete <N> --user-said "..."
/sprint-abort <N> --reason "..."
```

## Sprint data persistence

This template's own `.gitignore` keeps `docs/sprints/` content (sprint files
and `state/`) untracked, so the template repo doesn't ship its own example
sprint data. If you installed this workflow into a real project, that
ignore block gets inherited wholesale and left in place, which means your
project's *actual* sprint definitions and state history are never
committed anywhere, a wipe of the working tree (bad `clean`, disk failure,
anything) loses them for good with no git history to recover from. See the
`## Install` section of `README.md` for the one-time fix: delete the
sprint-data block from your project's `.gitignore` so it rides along with
your commits like everything else.

## Changes to this repo's own tooling

Everything above describes the lifecycle a *downstream project* runs its
own sprints through, after installing this workflow. It does not describe
how changes to this repository itself (`scripts/`, `.claude/`,
`templates/`, this file) get made. Those are development on the tool, not
a sprint that runs through the tool's own state machine, and that's a
deliberate call, not an oversight:

- **QA1's gate still has a real referent here** (does a diff of
  `sprint_lifecycle.py` or an agent file actually do what it claims), so a
  real independent review before anything non-trivial merges is still
  expected, just not mechanized through `/sprint-qa1` and a sprint file
  for this repo's own commits.
- **GroundTruth's gate does not.** GroundTruth live-tests a deployed
  product in a browser. This repository has no deployed product, it *is*
  the workflow definition a downstream project deploys against. Forcing a
  browser-testable live-test step onto a change to a Python script or a
  markdown agent file would be fitting the process to itself rather than
  to what actually needs verifying, the same reasoning that produced the
  trivial fix fast lane, applied to the opposite end of the size scale.
- **Every change here should still be a real, committed diff before
  anyone reviews it**, for the same reason `qa1.md` tells QA1 to hold a
  verdict on uncommitted work: a review of a working-tree diff is a claim
  about code that might not exist by the time anyone acts on the review.
  This matters more here than usual, `/sprint-ship`'s commit-content check
  (see `## The lifecycle` above) depends on `git rev-parse HEAD` actually
  being the reviewed commit, not whatever was last pushed before the
  review started.

If a change to this repo's own tooling ever turns out to need something
sprint-shaped (recorded requirements, a documented audit trail across
multiple rounds), that's a case for `/sprint-new` with GroundTruth's step
explicitly skipped and noted why, not a case for forcing a live-test step
that doesn't apply.

## Project standards

Every agent above should read this file before starting work, so keep it
current. If a sprint changes any of the decisions below, the sprint that
changes it also updates this section, a standard nobody has updated is
worse than no standard, because agents will still be auditing against it.

### Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Deployed on Vercel |
| Styling | Tailwind CSS | No competing CSS-in-JS or component library unless a sprint explicitly introduces one |
| Database | Supabase (Postgres) | Session persistence, and the verified BC HRT case-library seed data |
| Testing | Vitest | Unit tests only, see `### Testing` below |

### Domain types

All shared TypeScript interfaces live in **one file, `lib/types.ts`**:
`Situation`, `CodeGround`, `CaseExcerpt`, `SessionRecord`, and every other
domain type. Every file imports from there. **No local redefinition of a
domain type, ever**, not a near-copy, not a structurally-identical
interface declared inline "just for this component", not a
`Pick<>`/`Omit<>` alias that quietly becomes the real shape a component
depends on. If a component needs a shape that doesn't exist yet, it goes
in `lib/types.ts` first.

This is an auditable rule, not a style preference: QA1 should fail any
diff that declares a domain-shaped interface outside `lib/types.ts`. On an
app whose whole job is mapping a user's situation onto protected grounds
and case law, two drifting definitions of `CodeGround` is a correctness
bug that presents as a UI bug, and a static audit is exactly where it gets
caught cheaply.

### Case matching

Case matching is **simple tag/keyword matching against the seed library
JSON**. Not vector search, not embeddings, not an LLM call at match time.
See the PRD's Technical Notes for the rationale.

Treat this as a scope boundary with teeth: "while we're in there, let's
just try embeddings" is the exact shape of scope creep this line exists to
stop. If tag matching turns out to be insufficient, that's a finding that
produces its own sprint with its own requirements, not an in-flight
substitution inside a sprint scoped to something else.

### Writing acceptance criteria against the right gate

Gate 1 (QA1) runs **before** anything is pushed. Gate 2 (GroundTruth) runs
**after**. An acceptance criterion assigned to QA1 must therefore be
satisfiable from the code and the repository alone — a diff, a build, a
test run, a file's contents.

**Never assign QA1 a criterion that depends on a deployed artifact**: a
live URL, a production database row, a real deploy log, anything that only
exists once Pipeman has pushed. Doing so creates a deadlock rather than a
strict gate — QA1 cannot pass, `/sprint-dev-done` cannot run, Pipeman
cannot ship, so the artifact never comes into existence. Dev Team cannot
fix it, and QA1 cannot waive it, because amending requirements is Master
Controller's call.

This happened on Sprint 1, requirement 8. The fix pattern, if it happens
again: split the requirement by timing and owner. What is verifiable
pre-push (deploy access provisioned, configuration in place, evidence in
Dev Notes) stays at gate 1. What requires the deployment moves to
GroundTruth's gate, which already runs against the live app.

**Related timing constraint.** A QA1 PASS records a hash of the sprint
file, and `dev_done` is the only command that checks it — `ship`,
`groundtruth`, and `complete` do not. So a sprint file may safely be edited
after `/sprint-ship` (recording a deployed URL, for instance), but must not
be touched between QA1's PASS and `/sprint-dev-done`, where the check will
refuse for reasons that look unrelated to whoever hits it.

**And the inverse: do not assign GroundTruth a criterion that needs a UI
the sprint does not build.** Several sprints in this project ship pure logic
with no user-visible surface — a loader, a matcher, a rules engine — because
rendering is deliberately concentrated in one later sprint. A gate-2
criterion like "run a scenario through the app and confirm the ground is
identified" is untestable in those sprints for the same structural reason a
deployed-URL check is untestable at gate 1: the thing being checked does not
exist yet. Sprint 5's original criteria did exactly this and were moved to
Sprint 6 at pre-review.

For a logic-only sprint, state gate 2's scope honestly as non-regression —
the app still builds and loads, prior sprints' flows still work — plus a
scope-violation trap: if this sprint's output *has* become user-visible,
that is a FAIL, because rendering belonged to another sprint. That version
can actually fail, which the dressed-up version cannot.

**A gate cannot be assigned a check it has no instrument for.** This is a
third variant of the same mistake: at gate 1 the artifact does not exist
yet; at gate 2 the UI may not exist yet; and here the gate exists, the
artifact exists, and the *measuring instrument* does not. GroundTruth was
twice asked to verify computed accessible names with no flag-enabled
Chrome, no CDP `getPartialAXTree`, and no screen reader. The criterion was
worth writing — it caught a real defect both times — but a third identical
round returns a third identical CONDITIONAL, which is a stuck gate rather
than a strict one.

When this happens, split the criterion by what each party can actually
observe, and assign the remainder to a **named human with a recorded
artifact** — not to a gate that will keep failing honestly:

- **GroundTruth keeps the DOM-observable half**: attribute presence,
  `aria-describedby` resolving to IDs that exist, `role="alert"` placement,
  `<label for>` associations. No special tooling required.
- **A human keeps the computed-accessible-name half.** Note that CDP's AX
  tree is Chromium's computation, not what NVDA, JAWS, or VoiceOver
  announces — provisioning it would buy partial confidence and leave the
  real question open. On this product especially, a real assistive
  technology pass by a person is the better answer, not the cheaper one.

**Reships that touch what gate 2 cannot measure go back through gate 1.**
The normal post-GroundTruth loop — dev fixes, Pipeman reships, GroundTruth
retests, no QA1 in between — is fast because GroundTruth can verify the
fix. When the fix touches a class of defect GroundTruth structurally cannot
measure, that justification is gone and the change would reach production
past the only gate still running. This is not hypothetical: a Sprint 8
round-3 ARIA fix introduced a *new* ARIA regression, caught only because
QA1 happened still to be in the loop. Luck is not a control.

So: **before `/sprint-reship`, Pipeman checks whether the diff touches ARIA
attributes, roles, labels, or accessible names. If it does, it gets an
independent QA1 review of that diff, recorded in the sprint file's Dev
Notes, before the push.** This belongs on Pipeman's pre-push checklist
alongside the deploy-target check. Every other reship keeps the fast path.

**The control is independent review, not a particular command.** An earlier
version of this rule said "route back through `/sprint-qa1`", which is not
executable: `cmd_qa1` accepts only `dev_build`, `qa1_audit`, and
`dev_agreed_done`, and a sprint in the reship loop is in `groundtruth_live`,
so the command dies. Dev Team found this while holding a Sprint 8 ARIA fix
it could not act on without contradicting something on record. QA1 reviewing
a diff and reporting findings does not require the script — the script
records verdicts, it does not perform audits — so the review happens
in-session and lands in Dev Notes. That is the whole substance; the state
transition was my over-specification.

**Open proposal, not yet decided.** Making this mechanical would be
stronger, and would mean either a new `groundtruth_live -> qa1_audit`
transition or a reship-time guard. Note what that actually is:
`cmd_reship` currently carries a comment stating that skipping a fresh QA1
pass is *intentional in this two-gate design*, because GroundTruth's retest
is the check for reshipped code. That reasoning is sound wherever
GroundTruth can measure the change, and silently wrong where it cannot. So
this is a revision of a deliberate design decision, not the filling of an
oversight, and a naive new transition also has to answer what happens after
the re-audit passes — `dev_done` then `ship`, with `ship`'s tree-hash check
and `last_shipped_commit` both in play. It needs a real design and an
independent review, per `## Changes to this repo's own tooling`. It is not
a Master Controller decree, and it should not be done mid-sprint.

**Documented is not verified.** Splitting a requirement across gates has a
second failure mode, and it is the one that actually cost a round. When the
verifiable half moves to gate 2, do not leave behind a pre-push half phrased
as though it verifies something when all it can do is record an assertion.
Apply this test to every gate-1 criterion: *could someone falsify this by
reading the repo or the config?* If the only way to satisfy it is "a person
wrote down that it is fine," it verifies nothing and should say so plainly
rather than reading like a check.

Sprint 1's requirement 18 failed this test. It asked for "deploy access
confirmed and build configuration in place," QA1 passed it on a Dev Notes
entry stating the Vercel project was connected and auto-deploying on push,
and both of those statements were **true**. The build then failed anyway:
the Vercel Framework Preset was set to "Other" rather than Next.js, so the
platform looked for a `public/` output directory that an App Router build
never emits. GroundTruth round 1 was a hard FAIL with no app to test, and
the sprint took a reship loop to recover.

**Configuration is not a deployed artifact.** That is the specific mistake
to avoid repeating. A deployed URL genuinely cannot exist before the push;
the deploy target's *settings* can be read at any time, and reading them
would have caught this a day earlier. Do not sweep configuration into gate 2
just because the deployment it produces belongs there.

**Owner: Pipeman, pre-push.** This cannot be QA1 — QA1 is static code review
and never opens a browser — and it cannot be Dev Team, who never push.
Pipeman already runs pre-push checks (branch hygiene, clean build), and is
the role acting immediately before a deployment happens. Verifying that the
deploy target is configured for the framework actually being deployed
belongs on that checklist. Consider mirroring this into
`.claude/agents/pipeman.md` so it is in front of the role that has to do it,
not only in the shared rulebook.

### Analysis architecture

Ground identification and the duty-to-accommodate procedural checklist are
**deterministic rules**. An LLM is used for exactly one thing: rewriting
the already-decided result into plain language.

- The model does **not** choose grounds, does not choose cases, does not
  generate citations, and never receives the seed library.
- Citations are attached to output *after* the model has run, which is what
  makes the PRD's grounding constraint structural rather than
  prompt-enforced. This project has already produced one hallucinated
  citation (`Devine v. British Columbia, 2022 BCHRT 45`, in the PRD
  itself); the architecture assumes that will happen again given the
  opportunity, and removes the opportunity.
- The rules path must not import the prose module. QA1 verifies this by
  reading imports, not by reading a description of the design.
- If the prose layer is unavailable, the app degrades to structured rules
  output. Legal content never depends on model availability.

### Testing

- **Vitest unit tests are required** on the issue-spotting and
  tag-matching logic. That logic is the product, a wrong ground or a
  missed match is the failure mode that matters, and it's pure enough to
  test directly.
- **No component render tests either, and no `@testing-library/react`,
  `jsdom`, or `happy-dom`.** The rule that resolves this: *what to show is
  logic; that it actually showed is a browser fact.* Conditional display,
  ordering, enablement, and validity are decisions — extract them into named
  pure functions in `lib/` and unit-test those. Whether the DOM then
  reflected the decision is GroundTruth's, in a real browser, which is
  stronger evidence than a simulated one. A render test would mostly be
  testing React. This came up on Sprint 8, whose visibility rules became
  `visibleProceduralQuestions()` rather than a new test stack.
- **No in-repo end-to-end tests.** GroundTruth's live browser testing
  covers that gate, and duplicating it in-repo means maintaining two
  answers to the same question.
- Consequence, stated plainly so nobody is surprised by it: with no E2E in
  the repo, a broken user flow is not caught until *after* Pipeman
  pushes, because GroundTruth tests the deployed app. That's the designed
  tradeoff, not an oversight. It means the Vitest coverage on matching
  logic carries real weight, and it means a GroundTruth FAIL is a normal
  event in this project rather than a crisis.
- Dev Team still self-verifies before handing off: build clean, lint
  clean, `vitest` green, plus an actual manual check in a browser. "The
  unit tests pass" is not the same claim as "the page renders."

### Git strategy

- **One branch per sprint**, named `sprint-N-<short-name>` (e.g.
  `sprint-3-case-matcher`).
- **Pipeman squash-merges into `main`.** Pipeman is the only role that
  pushes, per the top of this file.
- **No force-pushes.** If history needs fixing, that's a conversation, not
  a `--force`.
- **Descriptive commit messages.** A message that says what changed and
  why. Not `fix`, not `stuff`, not `updates`, not `wip`. The commit log is
  read later by someone reconstructing why a match rule changed.

### Not yet decided

These are open and should be settled by a sprint that needs them, rather
than improvised per-file:

- Error handling conventions (Supabase failures, empty match results).
- Security baseline, specifically what a `SessionRecord` may contain.
  Users describe workplace situations involving their real employer and
  protected characteristics; where that data lives, how long it's kept,
  and whether it's ever attributable to a person are product decisions,
  not implementation details, and they should be answered before session
  persistence ships, not after.

**This is Fully Completely, not Maestro.** The machine running this may also
have a separate, unrelated sprint-workflow product called Maestro installed
globally (`maestro-*`/`epic-*`/`project-*` skills). If those skills show up
in the available-skills list, that's a fact about this machine, not about
this project. It shares structural similarity with this project (both are
sprint-lifecycle workflows) and possibly some shared lineage, but they are
two different systems. Do not refer to this project as "Maestro," assume
it uses Maestro's conventions, or treat the two as interchangeable, even
when the global skill list shows Maestro skills alongside this project's
own `.claude/commands/sprint-*` and `.claude/agents/` files.

---
