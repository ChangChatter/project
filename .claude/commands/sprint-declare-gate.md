---
description: "Dev Team: declare that a named human verification gate (gate3 NVDA / gate4 legal) applies to this sprint"
allowed-tools: [Bash]
---

# Declare Human Gate

Usage: `/sprint-declare-gate <sprint-id> --which gate3|gate4`

```bash
python3 scripts/sprint_lifecycle.py declare-gate <sprint-id> --which <gate3|gate4>
```

`gate3` is a human accessibility pass (e.g. NVDA); `gate4` is a legal-content review. Most sprints declare neither — only run this when the sprint file itself says one of these gates applies (Master Controller records that in Requirements/Acceptance Criteria; you run the command, mirroring how you run `/sprint-start` off a sprint Master Controller wrote). Works in any phase before the sprint is complete or aborted, and is addable mid-sprint — Sprint 8 added its human gate mid-build, Sprint 11's was scoped before it started, both are fine. Calling this on an already-declared gate is a no-op, not an error.

Once declared, `/sprint-complete` refuses to close the sprint until a PASS is recorded for it via `/sprint-record-gate` — and nothing re-checks that PASS against later code changes, it stays valid unless someone records a new FAIL/CONDITIONAL over it. There is no "undeclare" command — a declared gate stays declared unless the human running this project un-declares it directly via `override --gate gate3` (or `gate4`), which is CLI-only and requires the same `--confirm OVERRIDE` and `--reason` as the hash overrides. Don't reach for that yourself; if a declared gate turns out not to apply, that's a call for whoever scoped the sprint, not something to route around here.
