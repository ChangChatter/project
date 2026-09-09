---
description: "Dev Team: record a declared human gate's verdict (gate3 NVDA / gate4 legal review), as reported by the user"
allowed-tools: [Bash, Write]
---

# Record Human Gate Result

Usage: `/sprint-record-gate <sprint-id> --which gate3|gate4 --verdict PASS|FAIL|CONDITIONAL --notes "..."`

**Security note**: do not interpolate `$ARGUMENTS` (or any free-text notes) directly into the bash command below, quotes or shell metacharacters in the notes can break out and run unintended commands. Parse the sprint ID, `--which`, and verdict yourself (safe, low-entropy values), write the notes to a temp file with the Write tool, and run:

```bash
python3 scripts/sprint_lifecycle.py record-gate <sprint-id> --which <gate3|gate4> --verdict <verdict> --notes-file /tmp/record-gate-notes.txt
```

Only valid on a gate the sprint has already declared (`/sprint-declare-gate`) — it refuses otherwise, naming that as the fix. You are recording what the user (Chang) actually told you this session, in your own words in `--notes`, the same way you'd write up any other verdict — you do not perform the NVDA pass or the legal review yourself, you record the result of one that happened.

**A PASS is always safe to record**, regardless of what the notes say. Whether a finding violates this sprint's own requirements (a real defect) or is a judgement call that doesn't (Sprint 11's headline: approved with one change, handled separately, no defect) is decided by whoever reports the verdict, at the moment they report it — if it doesn't violate anything, record PASS and note what was approved. There is no separate "close it anyway" path to reach for.

**A FAIL or CONDITIONAL recorded while the sprint sits at `complete_ready` reopens it**: phase resets to `dev_build` (not `groundtruth_live` — GroundTruth's own PASS stays on record, it never actually failed a live test, this is Sprint 9's exact lesson), and both QA1 hash fields are cleared, so a stale PASS from before the finding can't sneak a later `dev-done`/`ship` through. Fix the finding, then run `/sprint-qa1` again — a fresh audit is required — and continue through the normal loop from there. A FAIL/CONDITIONAL recorded earlier in the loop (the gate was checked mid-build) doesn't reopen anything since there's nothing to reopen yet, but it still blocks `/sprint-complete` until a PASS is on record. Once recorded, a PASS is not re-checked against later code changes — nothing binds a gate result to a commit, so it stays valid until someone records a new FAIL/CONDITIONAL over it.
