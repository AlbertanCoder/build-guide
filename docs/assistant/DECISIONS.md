# Decisions — the expanded Guide Assistant

Recorded 2026-11-01 from a 26-question interview. Each row is a binding decision
for the next slices, with the reason it was chosen. Where a decision *rules
something out*, that matters as much as what it allows.

The old scope was "answer questions about this build, grounded in this page".
The new scope is "answer questions about drones, AI, and AI drones for forest
fires — and be able to correct itself, explain another way, and improve its own
artefacts." Most of the decisions below exist to make that wider scope survive
the honesty standard the narrow one already had.

## Truth and scope

| # | Decision | Why |
|---|---|---|
| 1 | **Three labelled layers**: guide facts are authoritative; a cited domain pack answers the rest; general model knowledge is allowed but always marked *not from a source* | Anything narrower is useless for the new scope; anything looser repeats the one real shipped bug (an unsourced total) at scale |
| 2 | **Corpus = curated, cited Markdown in `docs/domain/`**, retrieved by the same BM25 + cache as the page | PDFs and live scraping both add machinery before the shape is proven; a cited page is reviewable and diffable |
| 3 | **Hybrid labelling**: per-claim markers on prices, fees, regulations and detection-performance claims; one answer-level badge for prose | The falsifiable claims are the ones a sceptic checks. Labelling every sentence reads as noise and is hard to stream |
| 4 | **Conflicts are shown, never silently resolved**, labelled with which side is authoritative for this build | Silent resolution is how a stale claim becomes invisible. Audit pass 2 already did this by hand (1900KV is a 6S-class wind *and* here is the 4S thrust estimate) |
| 5 | **Every fact carries `verified YYYY-MM-DD`**; warn when a price, fee or regulation is older than 30 days | Staleness is the proven failure mode: the $5 to $10 registration fee and the out-of-stock frame both looked fine |
| 6 | **Live data only through named, allowlisted tools** (CWFIS hotspot feed, price re-check), on demand | Keeps every claim attributable to an endpoint and the cost bounded; general browsing would undo #1 |

## Domain content

| # | Decision | Why |
|---|---|---|
| 7 | **Page order**: thermal sensing and detection limits, wildfire crew workflow, Canadian regs, ML/CV, airframes, careers | Front-loads where being wrong is expensive and where a government reviewer pushes: "what can it detect?" and "who uses it?" |
| 24 | **Voice**: the guide's voice, plus one line per domain answer — *why it matters for your build* | One voice across one artefact; the added line stops the domain layer becoming a Wikipedia summary |

## Self-correction and self-editing

| # | Decision | Why |
|---|---|---|
| 8 | **Propose a diff, Accept, run the gate, auto-commit an undo point.** Money and 3D changes need a second confirmation | Full autonomy loses the deck: an agent rewriting a 3.5 MB page unsupervised will eventually delete a section, and you would find out at the meetup. Because every accepted change is its own commit, undo is `git revert` — not a feature to build |
| 9 | **Editable**: prose, docs, KB entries, budget numbers. **Not** application code. **3D only via named parameters, never raw geometry** | Risk is not uniform. Prose is recoverable and machine-checkable; a JS edit can white-screen the page while text tests still pass; a `.glb` cannot be reviewed by a human at all, so "accept this diff" is meaningless for it |
| 10 | **3D = named presets as parameters** (camera FOV, lighting, background, explode view, part highlight) with a before/after preview | Diffable, instant, and never touches the ~7 MB of packed models. Explode/isolate teaches assembly better than prettier lighting |
| 11 | **"Learn" = a reviewed corrections memory**, never model training | Fine-tuning cannot be inspected, cited or undone, so it would break #1 immediately. Auto-ingesting chats would feed unverified output into the corpus that lends the authority |
| 12 | **Corrections live in `docs/domain/corrections.md`**, committed | Auditable, diffable, undoable, survives a cache wipe — and retrieved by the same BM25, so learning costs no new machinery |
| 13 | **The full gate runs before an edit is accepted**; any red check rejects the diff and names itself | Every commit in the history then passed the same bar, which is what makes auto-commit defensible. Rejecting before it lands is strictly stronger than applying then reverting |
| 14 | **Three gates to write**: local-only bind, a token in `server/.env`, and an explicit `--allow-write` flag | A write tool that takes a path is remote code execution by design. Each gate alone is enough to stop an accident |
| 15 | **Limits**: 10 *accepted* edits per session, edits charge the same budget as a question, visible kill switch | Bounds blast radius and stops edits becoming a billing loophole. Rejecting a bad diff should not burn the allowance |

## Operation

| # | Decision | Why |
|---|---|---|
| 16 | **A labelled domain eval (~50 Q&A with expected facts) plus the 28-question quiz bank**, scored on every change | Once the scope widens, "improved" and "drifted" are indistinguishable without labelled answers. A quotable score is also the most persuasive thing to show a public-sector reviewer |
| 17 | **Source line always; a low-confidence flag plus a "what to check" sentence only when low. Never a percentage** | LLM percentages are uncalibrated — fabricated precision spends down the credibility this project exists to build |
| 18 | **Cheap tier for build lookups, strong tier for domain reasoning, one escalation on refusal** | Domain questions are disproportionately multi-hop, which the existing router already sends to the strong tier: most of the quality at a fraction of the cost |
| 19 | **Under 1.5 s to first token, under 8 s total**, streamed, tool calls never block (show a status) | Most answers are already instant through the free ladder; only new domain questions pay latency |
| 20 | **`DAILY_USD_MAX=0.25`**, degrade rather than fail | ~400 questions/day at verified rates: a cap never touched in normal use, sized for the two cases that would actually hurt — a runaway edit loop and public traffic |
| 21 | **Free ladder offline**: curated KB, then cached answers, then domain excerpts quoted verbatim, then the model | Retrieval and quoting need no model, so the assistant stays useful on venue wifi with no key. A bundled local model would make the laptop the single point of failure |
| 22 | **Keep the corner panel, add an "Ask" tab** for full-width cited answers | 384 px is an intake widget, not a place for citations and 3D previews. One assistant with two surfaces; a second app would fork the corpus, the cache and the corrections file |
| 23 | **Only the question, retrieved passages and last 2 turns leave the machine** | "What leaves the machine?" is the first question a public-sector reviewer asks, and it is what the server already does |

## Guardrails

| # | Decision | Why |
|---|---|---|
| 25 | **Five code-enforced bans**: measured detection performance stated as fact; a price, fee or regulation with no source and date; flying near or over a wildfire (CAR 601.15); claiming certification or legal approval; any edit without approval | Two can cause real harm or public humiliation, and one has already shipped once here. Five rules can each have a test; a forty-rule policy nobody verifies cannot |
| 26 | **Build order**: (1) domain pack + labels + retrieval, (2) Ask tab, (3) corrections memory + eval set, (4) self-edit agent | Each slice is demoable and passes the existing gate. Slice 1 doubles the useful surface with zero new risk. A write-capable agent is debugged last, against a corpus that can already judge it |

## What this rules out

- No PDF ingestion, no live browsing, no fine-tuning, no numeric confidence.
- No editing of `index.html` structure or JS by the assistant, and no `.glb` changes.
- No second app, no separate knowledge store, no chat log kept for training.
- No change that cannot be expressed as a reviewable diff and undone with git.

