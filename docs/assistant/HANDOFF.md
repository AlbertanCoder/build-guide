# HANDOFF

You are picking up a build-guide project that has grown a grounded AI assistant and
a **gated** self-editing pipeline. Read this, then `STATUS.md` in this folder, then
the two `DECISIONS` files. Do not trust any summary — including this one — without
running the gate.

## Where it actually stands

| | |
|---|---|
| Repo | `C:\Users\SHADHUNTER\Desktop\build-guide-repo`, branch `main` |
| State | clean, pushed, **0 ahead** |
| Head at handoff | `27e5a05` |
| Gate | `node scripts/dev/gate.js` → **239/239 named checks**, twelve suites |
| The file the user opens | `C:\Users\SHADHUNTER\Desktop\Shad's Build Guide.html` — a **generated** single file. Never edit it; edit source and rebuild |
| The user's API key | **not saved yet** (`keyConfigured: false`) |

## The commands

| Command | What it does |
|---|---|
| `node scripts/dev/gate.js` | every check, one exit code. `--quick` skips the browser suite |
| `node server/assistant-server.js` | serves the guide + AI + settings on `:8790` |
| `node server/ops/propose.js op.json` | validates a change, creates `proposal/<name>`, `main` untouched |
| `node server/ops/accept.js proposal/<name>` | gate **on the branch**; merges only if green; rebuilds; mirrors |
| `node server/ops/undo.js` | reverts the last accept, rebuilds, re-mirrors |
| `node server/ops/reject.js proposal/<name>` | deletes the branch, nothing else |

## What exists — do not overstate it

**Built:** answering (44 curated offline answers, AI optional), the cost engine
(cache, model tiers, compression, budget, `/api/stats`), the settings drawer
(provider, key, model, budget — all server-side), domain pack slice 1 of 6 with a
build that **refuses an unsourced claim**, one named edit operation (`quiz-add`),
the proposal branch loop, undo, and a 239-check gate that cannot be made green by
deleting a check.

**Not built — say so plainly if asked:**

- **The chatbot cannot edit anything.** No button, no sentence, changes the page.
  Editing is the CLI above, driven by a human, and only adds quiz questions.
- Also missing: corrections memory, eval set, the "Ask" tab, the five
  code-enforced bans, the preview/diff UI, per-item acceptance, background jobs,
  and 5 of 6 domain pages.

`STATUS.md` has the row-by-row audit: **21 built / 17 partial / 12 still paper.**

## Rules that must not be broken

1. **Never edit a generated file** (`dist/`, the Desktop copy). Edit source, rebuild, mirror.
2. **Never modify the checks in `scripts/dev/*` to make a gate green.** `gate.js`
   declares an expected check count per suite; lowering one is the single edit that
   silently weakens everything downstream.
3. **Additive only.** Never delete or rewrite an existing quiz question.
4. **A question's answer must be provable from the corpus** — `citation.mustContain`
   has to appear in the cited text.
5. **No percentage confidence, no "100% verified" language.** Ever.
6. **Never push from a script.** Pushing is a human action.

## Next task: Stage 3 — the drafter

**Goal:** the user types *"add 3 harder detection questions"* and gets a proposal
branch to review and take the quiz on. Half of it already exists:

- `server/ops/job-spec.js` turns the sentence into `{target, count, minLevel}` and
  **refuses destructive sentences** ("delete all the rules questions"). 8 checks.
- `server/ops/quiz-add.js` validates one candidate against the corpus and applies it
  as a pure function that cannot write to disk. 29 checks.

**Missing:** the piece that asks a model for N candidates, runs each through
`quiz-add.validate`, keeps only the survivors, and calls `propose`. Suggested shape:
`server/ops/draft.js` — build the prompt from the job spec plus retrieved passages,
request strict JSON, validate every candidate, discard the rest, write the proposal.
It must respect `jobBudgetUsd` from `/api/settings`.

## Traps already paid for — do not re-discover these

- A **UTF-8 BOM** breaks `JSON.parse`; PowerShell `Set-Content` and Notepad both write one.
- `git status --porcelain` counts **untracked** files — and the op file is untracked.
- **Two functions with the same name:** the later declaration silently wins.
- A local `git clone` inherits the outer repo's HEAD; pass `--branch main`.
- Tests that hardcode **"28 questions"** go red when a legitimate question is accepted.
- `dist/bundle.js` is **git-ignored**, so a fresh clone cannot rebuild the single file.
- The gate takes **~29 s** and the tool call limit is 30 s — run it detached and poll.
- `git revert` does **not** rebuild; that is why `undo.js` exists.

## How to check any claim in this file

```powershell
node scripts/dev/gate.js
```

If it is not green, everything above is out of date.

