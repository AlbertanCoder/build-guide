# Status — what the 50 decisions actually bought

Two rounds of questions were asked: **26** (`DECISIONS.md`) and **24**
(`DECISIONS-2-LIVING-DOCUMENT.md`). This file audits every one of them against
the code, because "we decided that" and "we built that" are different claims and
the difference is the whole point of this project.

Legend: **BUILT** = exists and is covered by the gate · **PARTIAL** = partly there,
with the gap named · **NOT BUILT** = decided, not written · **DEFERRED** = belongs
to a later stage of the approved plan.

## Round 1 — the answering assistant (26)

| # | Decision | Status |
|---|---|---|
| 1 | Three labelled layers | PARTIAL — guide and domain passages carry provenance; "general knowledge marked as unverified" is not enforced yet |
| 2 | Corpus = curated cited `docs/domain/` | BUILT — generator + `source::`/`verified::` guard that refuses to publish |
| 3 | Hybrid labelling (per-claim on numbers/regs) | NOT BUILT — labels are not rendered per claim |
| 4 | Conflicts shown, never silently resolved | NOT BUILT |
| 5 | `verified YYYY-MM-DD` + 30-day warning | PARTIAL — dates are required at build time; no staleness warning at answer time |
| 6 | Allowlisted live tools (CWFIS, prices) | NOT BUILT |
| 7 | Six domain pages, thermal first | PARTIAL — 1 of 6 written |
| 8 | Propose → accept → gate → auto-commit | BUILT |
| 9 | Editable surface: prose/docs/KB/budget, not code | PARTIAL — only the quiz operation exists; no prose edit operation |
| 10 | 3D as named presets | NOT BUILT |
| 11 | Corrections memory (learning, no training) | NOT BUILT |
| 12 | Corrections stored in `docs/domain/corrections.md` | NOT BUILT — file does not exist |
| 13 | Full gate before accepting | BUILT |
| 14 | Three write gates (local + token + `--allow-write`) | PARTIAL — loopback bind and origin/content-type guards exist; no token, no flag |
| 15 | Edit limits: 10/session, budget, kill switch | NOT BUILT |
| 16 | Labelled domain eval (~50 Q) | NOT BUILT — no `EVAL.md` |
| 17 | Never a confidence percentage | BUILT — no percentages anywhere |
| 18 | Cheap for lookups, strong for domain reasoning, one escalation | BUILT |
| 19 | Latency budget, non-blocking tool status | PARTIAL — streaming yes; no status frames for tools |
| 20 | Daily cap, degrade rather than fail | BUILT — slider $0.10–$2.00, server-enforced |
| 21 | Free ladder offline (KB → cache → excerpts → model) | PARTIAL — KB and cache exist; quoting domain excerpts verbatim does not |
| 22 | Keep the panel, add an "Ask" tab | PARTIAL — panel only |
| 23 | Only question + passages + 2 turns leave the machine | BUILT |
| 24 | Guide voice + "why it matters for your build" line | PARTIAL — voice is prompted; the line is not enforced |
| 25 | Five code-enforced bans | NOT BUILT — prompt-level only |
| 26 | Build in four slices | PARTIAL — slice 1 done; 2–4 in progress |

## Round 2 — the living-document agent (24)

| # | Decision | Status |
|---|---|---|
| R1 | Three real guarantees, never a percentage | BUILT — the gate is the mechanical half; nothing claims 100% |
| R2 | Edit sources, rebuild, mirror; never a generated file | BUILT |
| R3 | JS allowed, but a real browser smoke test | BUILT — the browser suite is the sensor |
| R4 | Named operations + exact-once find/replace | PARTIAL — `quiz-add` exists; no prose operation yet |
| R5 | Structured reads, never whole-file | BUILT |
| R6 | Additive by default | BUILT |
| R7 | Questions only from the corpus, answer must be provable | BUILT |
| R8 | Named 5-level difficulty ladder | PARTIAL — `level` is validated 1–5; the ladder's meaning is not enforced |
| R9 | Distractors derivable and refuted | PARTIAL — a short known-values blacklist, not "contradicts a cited passage" |
| R10 | Near-duplicate rejection | BUILT |
| R11 | Research corpus = guide + pack + git history, no web | PARTIAL — guide and pack are read; git history and the audit report are not |
| R12 | Earned quiz passes survive the bank growing | BUILT |
| R13 | Proposal branches; main stays clean | BUILT |
| R14 | Rendered preview **and** diff | NOT BUILT |
| R15 | Per-item acceptance | NOT BUILT — accept takes the whole branch |
| R16 | Background job with visible progress | NOT BUILT |
| R17 | Per-job sub-budget | PARTIAL — the number is exposed; there is no job to spend it |
| R18 | Measurable intent, checked by the gate | BUILT |
| R19 | Accept runs gate → rebuild → smoke → mirror → commit, rolls back | PARTIAL — everything but the smoke test of the built file |
| R20 | Honest failure; never relax a check | BUILT — the gate refuses a shrinking check count |
| R21 | Smallest end-to-end vertical first | BUILT — one question, real repo, accepted and reverted |
| R22 | Assertion changes shown; weakening rejected | BUILT — expected check counts are declared per suite |
| R23 | Multi-file facts move atomically | BUILT — the stated total is rewritten in every doc that carries it |
| R24 | Never modify checks, history, generated files, or push | PARTIAL — the operation scripts do none of these; it is not yet enforced in code |

## The tally

| | Count |
|---|---|
| BUILT | 21 |
| PARTIAL | 17 |
| NOT BUILT | 12 |

Counted by hand off the two tables above, row by row — the first version of this
file said 20 / 13 / 17, which was a guess dressed as a summary. It is corrected
here because a status document that does not add up is worse than no status
document.

## The honest summary

The questions bought **rules**, and the rules are why the gate exists, why a
question cannot be added without a citation, and why an accepted change can be
undone byte-for-byte. That part is real.

What they did **not** buy is a finished assistant. **Twelve decisions are still
paper, and a further seventeen are half-built.** The largest gaps, in the order
they hurt:

1. **The five code-enforced bans** (R25) — they are prompt text today, and prompt
   text is the thing this project has repeatedly proven cannot be trusted alone.
2. **The corrections memory** (R11/R12) — "it learns when you correct it" is the
   feature most likely to be mistaken for "it is finished".
3. **Per-item acceptance and the preview/diff view** (R14/R15) — the difference
   between "I can accept a branch" and "I can pick which three of ten questions I
   actually want".
4. **The eval set** (R16 round 1) — without it, "it got better" is an opinion.
5. **5 of 6 domain pages** — the assistant's answer quality is capped by these.

Nothing here is hidden: every PARTIAL and NOT BUILT above is checkable by opening
the named file, which is why this list is committed rather than described.

