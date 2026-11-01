# Item D — suggestions with cited AI judgement

Status: binding design for the remaining Item D implementation. The original file
named by the handoff was absent when work resumed; this replacement makes the
contract explicit rather than leaving it in a prompt or in model output.

## Scope and non-negotiables

The assistant may suggest rewriting one existing guide paragraph. It returns a
comparison report with exactly three arrays: `improves`, `corpusSupport`, and
`conflicts`. Every claim in every non-empty array carries at least one citation
whose quote is an exact substring of the named corpus entry. An empty conflicts
array means no conflict was found; it is not a claim that none can exist.

There is no confidence score, percentage, certainty estimate, or self-graded
truth badge. AI supplies a candidate and a judgement; the existing validators
and the human proposal review decide whether it may proceed.

All five detectors in `server/bans.js` screen the request, model candidate,
proposed paragraph, and report text. `prose-rewrite` screens the paragraph again
when a proposal is created. Unsafe output is refused, never silently rewritten.
No suggestion endpoint writes a source file, creates a branch, or changes `main`.

Accepting a suggestion means **create a proposal through the existing loop**. It
does not merge, accept, or publish that proposal. Reject dismisses the local
suggestion and performs no network request or write.

## HTTP contracts

### `POST /api/suggest`

Request, as JSON no larger than 16 KiB:

```json
{
  "sentence": "Make the detection pipeline explanation clearer",
  "section": "p-build"
}
```

- `sentence` is a non-empty instruction, trimmed and capped at 500 characters.
- `section` is one existing tabpanel id returned by `prose-rewrite.listSections`.
  It selects the editable paragraphs; it does not authorize editing another
  section.
- The route requires `application/json` and passes the same Origin/Host check as
  the other mutation-shaped APIs. It is rate-limited and budget-limited. It does
  not require the three write gates because it writes nothing; Accept still goes
  through all three gates at `/api/propose`.
- Missing provider credentials return `501`; a spent budget returns `402`; bad
  input returns `400`; a provider failure returns `502`. A well-formed request
  whose candidate fails validation returns `200` with `ok: false` and a plain
  explanation, never an unscreened raw model response.

Successful response:

```json
{
  "ok": true,
  "op": {
    "op": "prose-rewrite",
    "section": "p-build",
    "oldText": "<p>the exact existing paragraph</p>",
    "newText": "<p>the proposed replacement paragraph</p>"
  },
  "report": {
    "improves": [
      { "claim": "a cited judgement", "citations": [{ "source": "G1", "label": "Guide — p-build paragraph 1", "quote": "exact corpus text" }] }
    ],
    "corpusSupport": [
      { "claim": "a cited source claim", "citations": [{ "source": "D1", "label": "domain file — heading", "quote": "exact corpus text" }] }
    ],
    "conflicts": []
  }
}
```

The response contains no provider reasoning, hidden prompt, API key, or raw
model text. Labels are attached by the server from its corpus, not trusted from
the model. The report arrays are always all present. Each has at most six
claims; each claim has one to four citations. `improves` and `corpusSupport`
need at least one valid claim for a successful suggestion; `conflicts` may be
empty. A claim is non-empty plain text, and every citation quote is a
non-trivial exact substring of its cited entry.

### Accept through `POST /api/propose`

The existing route additionally accepts an already structured named operation:

```json
{ "op": { "op": "prose-rewrite", "section": "p-build", "oldText": "<p>...</p>", "newText": "<p>...</p>" } }
```

Only the existing `prose-rewrite` operation is allowed on this branch. The
server applies the five bans, calls the existing `PROPOSE.propose` with a
temporary JSON op file in the git-ignored cache, removes that temporary file,
and returns the ordinary proposal result. It does not add a second proposal
implementation. All existing sentence-based proposal behavior remains intact.
The write token, loopback/remote policy, explicit write flag, clean-tree guard,
validation, branch creation, and later CLI accept/reject behavior are unchanged.

## Corpus and deterministic AI boundary

A new pure helper, `server/ops/suggest.js`, owns corpus shaping, prompting,
parsing, and validation. It performs no file writes and no git operations.

- Guide entries are existing `<p>...</p>` elements inside the requested section.
  Their ids are `G1`, `G2`, and so on. The model receives the exact raw
  paragraph for `oldText`, plus visible text for citations.
- Domain entries are the existing curated `docs/domain/` blocks, including
  corrections. Their labels name the file and heading. Guide and domain entries
  together are the only citation corpus.
- The prompt asks for one JSON object with `op` and `report`, names every corpus
  id, and forbids uncited claims and unsupported operations. Prompt wording is
  not a safety boundary; the pure validator is.
- The model call is injected as `askFn(prompt)`, like the existing drafter. Unit
  tests therefore use fixtures with no network or key. The live server wires it
  to the existing non-streaming `askOnce` call and cost meter.
- Parsing accepts one JSON object, optionally fenced. Missing or malformed JSON
  is an honest refusal. Extra prose is never displayed.

Validation requires the operation to be `prose-rewrite`, keeps it in the
requested section, and calls `prose-rewrite.validate` against the real
`index.html`. Thus `oldText` must be one exact-once paragraph anchor, `newText`
must remain a single safe paragraph, and all structural post-conditions stay in
the existing operation. A candidate that names another section, invents an
anchor, drops a citation, misquotes a source, or trips a ban is rejected whole.

## Page behavior

The existing assistant form gains a `Suggest an edit` button beside Send. The
user types an instruction; the page sends it with the currently visible
tabpanel id. Offline copies keep the guide and question answering usable and
show an honest local-server-required message rather than calling a missing API.

A successful response renders a normal assistant card containing the proposed
before/after text and three labelled report groups. Claims and citations are
inserted with DOM text nodes, never `innerHTML`. The card has `Accept` and
`Reject` buttons:

- **Reject** marks that card dismissed, disables both buttons, and persists the
  dismissal locally. It does not call the server.
- **Accept** disables both buttons while pending, then posts the returned `op`
  to `/api/propose` with the existing write-token headers. Success displays the
  proposal branch and explains that the real guide is still unchanged pending
  the normal review. Failure re-enables Accept and shows the server reason.

Suggestion cards survive normal conversation persistence without restoring an
active pending state. There is no automatic accept, background merge, direct
source edit, or alternate write endpoint.

## `check-suggest.js` contract

The suite follows `check-write-gates.js`: each assertion prints one `PASS ` or
`FAIL ` line, failures exit 1, and all servers/temporary directories are cleaned
up. It uses an isolated temporary repository for any real proposal branch so the
working tree running the gate is never changed.

Cover at least these behaviors with separately named checks:

1. Corpus entries name real guide/domain evidence; a prompt contains only the
   selected editable section plus the curated evidence.
2. A valid fixture returns all three report arrays and a valid prose operation;
   every claim has an exact-quote citation.
3. Missing citations, unknown source ids, misquoted evidence, malformed JSON,
   cross-section edits, missing/duplicate anchors, and unsafe replacement
   paragraphs are refused.
4. Each of the five ban families refuses a hostile suggestion fixture, and no
   raw model output is returned on refusal.
5. The live suggest route enforces JSON, body, input, budget/provider, and
   Origin rules, calls the mock model once for a valid request, and performs no
   git or source write while suggesting.
6. Reject is client-only in the browser contract; Accept sends the same op to
   `/api/propose`, obeys the three existing write gates, and creates only a
   proposal branch in the isolated repository.
7. The existing sentence-based proposal path and offline page behavior still
   work.

The lead counts the suite's actual passing assertions and declares that number
in `gate.js`; adding coverage must never be handled by weakening an assertion.

## Explicit limits

Item D does not add arbitrary JavaScript edits, multi-paragraph rewrites,
automatic merging, web research, background jobs, edit quotas, or an evaluation
score. Conflicts are reported only when supported by cited corpus text; the
feature does not claim semantic proof beyond the exact-quote and existing
operation checks described here.
