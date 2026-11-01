# Remaining work — the finish contract

Written 2026-11-01, before the final push, so the scope is fixed in writing
rather than in someone's memory. This file is additive; it states no check
totals (those live in the READMEs and the gate audits them).

## The work: four items, one gated commit each

Order is risk-managed: the cheap, bounded items land first; the one genuinely
risky item goes last, so it can never block the rest.

| # | Item | Definition of done |
|---|---|---|
| B | Conversation memory, server side | `/api/conversations` routes (PUT one thread, GET one, GET list) behind the three write gates; threads in `server/.conversations/` (git-ignored); a check suite with its own declared count; gate green |
| C | Build sync | The build position (current tab/step) saved and restored per thread, so the phone knows where the desktop stopped; suite declared; gate green |
| E | VPS runbook | A runbook a non-expert can follow: Node + Tailscale + `git pull` + two env lines, with the three write gates explained; gate green |
| D | Suggestions + AI judgement | A suggestion in the chat produces a comparison report (what improves / what the corpus supports / what conflicts) and one-tap accept through the existing proposal loop; suite declared; gate green |

(E is deliberately ahead of D: D is the one item with real unknowns, so the
other three must already be banked when we reach it.)

## Out of scope — locked

No new features, no refactors, no "while we're here". The 50-decision
leftovers (eval set, edit limits, "Ask" tab, background jobs, polish rows)
remain in `STATUS.md` for a future pass. This contract covers B, C, E, D
and nothing else.

## What survives a stop

- Every item is one commit with the gate green. A pause at any point leaves
  `main` shippable — that is the whole point of the per-item design.
- If D balloons, B, C and E are already committed and usable. D is then
  split or deferred with its gap named in `STATUS.md`, not hidden.
- If the session dies again mid-item, the uncommitted work is in the working
  tree, and this file plus `STATUS.md` are the resume point.

## The claim this file refuses to make

No percentages, no "100%". Rule 5 applies to us too: the honest statement is
that the work is bounded, every step is verifiable by `node scripts/dev/gate.js`,
and the risk is concentrated in one item that lands last.