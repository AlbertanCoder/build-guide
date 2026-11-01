# Decisions — round 2: the living-document agent

Recorded 2026-11-01 from a 24-question interview about letting the assistant **edit
the guide itself**. Read this with `DECISIONS.md` (round 1), which covers answering.
Two rows below **revise** round-1 decisions and say so.

The request was: it may "edit, change, answer, look up, research, modify, render" the
whole guide — but only after thoroughly checking that a change is correct. A living
document.

**The framing correction that governs everything here.** "100% true and correct" is
not something a machine can verify. A machine can verify that tests pass, arithmetic
closes, every claim carries a source, no duplicates exist, links resolve and a schema
holds. It cannot verify that a statement is true in the world. So the gate promises
three things it can actually keep — **mechanically verifiable, sourced, reversible** —
and never displays a percentage.

## Truth and the gate

| # | Decision | Why |
|---|---|---|
| R1 | **Three real guarantees**: named mechanical checks, provenance on every claim, one `git revert` away. Never a "100%" badge | An unfalsifiable label is the CA$1,678 bug promoted to the product itself, and one sharp reviewer question would expose it |
| R2 | **Edit sources only** (`index.html`, `docs/`, `docs/domain/`), then rebuild `dist/` and mirror the Desktop copy. Never edit a generated file | Editing the generated 3.5 MB file means the next rebuild silently discards the work: it *looks* like it succeeded, then vanishes hours later |
| R3 | **JS and structure allowed** *(revises round-1 #9)*, but every JS change must pass a real browser smoke test: page loads, all tabs render, zero console errors | Text tests provably cannot catch a JS break. You asked for the entire file; the honest answer is yes-with-a-sensor, not no |
| R4 | **Named operations on known structures** (`add quiz item`, `append KB entry`, `insert domain block`, `set 3D preset`) validated by schema, plus exact-once find/replace for prose | A named operation can be validated *before* it applies. A free-form patch can apply cleanly to the wrong place, and "cleanly wrong" is the worst outcome |
| R5 | **Structured reads only**: retrieval for named sections, targeted reads, exact-match anchors, then re-read the edited region | The source is 184 KB of prose; the standalone is ~900,000 tokens of inlined three.js and base64 models. Wholesale reading is impossible *and* pointless |

## Quizzes and content

| # | Decision | Why |
|---|---|---|
| R6 | **Additive by default.** Existing questions are never edited or removed unless explicitly asked, then item by item | Deletion is recoverable in git but not in the reader's experience. Item-by-item stops it quietly "improving" a question you wrote |
| R7 | **Questions come only from the guide + domain pack**, each citing the passage that proves its answer, and the gate checks the passage actually contains it | The only design where correctness is *checkable*. Honest trade-off: coverage is capped by the corpus, so each new domain page raises the ceiling |
| R8 | **A named 5-level difficulty ladder**: recall, apply a number, discriminate between plausible values, spot the false claim, combine two facts | "Harder" is a feeling until it is checkable per question, and you get coverage-by-level as a number |
| R9 | **Distractors must be derivable and refuted**: each contradicts a cited passage, or is a documented wrong value from the audit. Reject any that appears as a correct value | The highest-risk silent failure: an accidentally-true distractor teaches a falsehood and nothing errors |
| R10 | **Near-duplicate rejection** at ~85% stemmed-token overlap with an existing question | Reuses the answer cache's tokeniser: zero new code, a threshold already seen behaving |
| R11 | **Research corpus = guide + domain pack + corrections + git history and audit reports. No web** | `Shad-Drone-Audit-Report.md` is a catalogue of *refuted* claims (the 900 MHz antenna, the $5 fee, CA$1,678) — exactly the seed for strong distractors |
| R12 | **Earned progress is preserved** when questions are added | Proven trap: pass is `best >= ceil(total * 0.75)`, so one added question turns a passed 6/8 into a failing 6/9 and your own dashboard forgets an achievement. No clean-browser test catches it |

## Review and acceptance

| # | Decision | Why |
|---|---|---|
| R13 | **Proposal branches** (`proposal/<slug>`); `main` stays clean; accept = gate + merge, reject = delete branch | Survives a restart, reviews as a diff, and cannot be erased by a stray `git checkout .` mixing in your own edits |
| R14 | **Both previews**: a rendered build from the proposal branch (so you can actually *take* the new quiz) and the diff side by side | They answer different questions: "is it any good?" versus "is it safe?". A quiz you cannot sit is not reviewable |
| R15 | **Per-item acceptance** with an accept-all shortcut | You will like seven of ten. All-or-nothing means paying twice to replace three |
| R16 | **Background job** with visible per-step progress, surviving a reload, cancellable | Research + draft + validate + build is seconds to minutes; a hanging chat turn reads as broken, and the steps *are* the product |
| R17 | **Per-job sub-budget ($0.05)** drawing from the same daily cap; exceed either and it stops and reports | Keeps one ambitious job from eating the whole day and leaving you unable to ask questions |
| R18 | **Measurable intent declared up front** ("+5 questions, all level 3+, 0 duplicates, 28 to 33"), checked by the gate | Passing tests only proves nothing broke; it cannot prove you got what you asked for |
| R19 | **Accept runs the whole chain**: gate, rebuild, smoke-test the built file, mirror to Desktop, commit, rolling back on failure | Inlining can break what worked in the source, and a stale Desktop copy means demoing last week's document |
| R20 | **Honest failure**: bounded retries within the sub-budget, then a report of what was tried and which check each candidate failed. Never applies a failing set, never relaxes a check | The temptation is to make the gate green by weakening the gate. "Five candidates, all rejected because the distractor could not be refuted" is a useful answer: the corpus is too thin |
| R21 | **Build the smallest end-to-end vertical first**: one question through the entire pipeline before ten | Every seam proven on the smallest surface; ten becomes a loop over something known to work |

## Test integrity and prohibitions

| # | Decision | Why |
|---|---|---|
| R22 | **Test assertions may change only alongside a declared intentional change**, the old to new assertion is shown for approval, and a meta-check rejects weakening (`== 28` to `>= 28`) | "Updated for an intended change" and "weakened to pass" are the same bytes to a runner. `>=` would also stop catching *lost* questions |
| R23 | **Multi-file facts update atomically**, enforced by a cross-file consistency check | Already shipped once: the assistant KB kept CA$1,678 after the order list moved on, and both suites passed because neither compared files |
| R24 | **Never, even with approval**: modify the checks, rewrite git history, edit generated files, push to a remote, or delete anything not explicitly named | An agent that can edit its own gate has no gate; history rewriting destroys the undo guarantee everything above relies on |

## What this rules out

- No "100% verified" label, no percentage confidence, no self-graded success.
- No open-web research for content, no whole-file rewrites, no uncommitted proposals.
- No editing generated artefacts, no gate modifications, no history rewriting, no pushing.
- No quiz question without a cited passage that contains its own answer.

## Known traps found while writing this

1. **Quiz progress regresses on additions** — see R12. Measured, not hypothesised.
2. **The named file is a build artefact** — `Shad's Build Guide.html` is generated; editing it loses the work.
3. **`dist/` inlining can break a working source** — the reason R19 smoke-tests the *built* file, not the source.
4. **Count assertions look like weakening when they are legitimate** — R22 exists so a human sees the assertion diff, not a green tick.

