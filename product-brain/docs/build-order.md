# Build order

If you're adopting Product Brain incrementally — or building a similar system from scratch — this is the order I'd recommend, with the rationale.

## Week 1 — `/pb-related` only

Ship just enough to read records and rank by file similarity. No estimation, no edge mining, no bot.

- Backfill front-matter only (no LLM prose). Free, fast, deterministic.
- `/pb-related AHA-1234` returns a list of similar tickets with their structured fields.
- Engineers use it to orient before opening code.

**Why first**: validates the index format and rename tracking on real data, without any LLM dependency. If `/pb-related` produces useful output, the foundation is sound. If it doesn't, the whole stack fails — find out cheaply.

## Week 2 — Add LLM prose

Layer LLM-generated `## What shipped` and `## Edge cases handled` onto the existing front-matter.

- Backfill phase 6 (prose generation).
- Citation validation.
- Records now show prose alongside structured fields.

**Why second**: you'll iterate the prompt 5–10 times. Doing that on a static corpus you've already backfilled is much cheaper than iterating in the post-merge hook.

## Week 3 — `/pb-edges`, `/pb-groom`

The interactive synthesis commands. They use `index-read` + `hotspot-cluster` + `estimate` + `edge-case-mine`.

- Engineers can groom tickets in Claude Code.
- Estimate is shown with references and confidence.

**Why third**: you have prose now, so synthesis has material to work with.

## Week 4 — Incremental hook

Post-merge hook updates one record per merge.

- Install in each repo with `scripts/install-post-merge-hook.sh`.
- Index stays current automatically.

**Why fourth**: you've stabilized the prompt by now, so running it on every merge isn't risky.

## Week 5 — Bot, manual triggers only

Headless bot that responds to `/brain <cmd>` in Aha comments. No auto-triggers.

- PMs opt in per ticket via `brain:on` label.
- Edit-in-place + content-hash dedupe enforced from day one.

**Why fifth**: real usage data tells you which commands matter, what output PMs ignore, what they ask for that you didn't anticipate.

## Month 2 — `/pb-plan`, `/pb-draft-tickets`

Pre-ticket planning and draft sub-ticket creation.

- More speculative; quality depends on the manifest.md prose in each repo.
- Bot can create drafts via the PM adapter.

**Why later**: requires good index, good prompt, and PMs who trust the simpler commands first.

## Month 3 — Repair job, status auto-triggers

- Nightly `repair.py` validates citations, reconciles renames, updates `linked_bugs`.
- Bot opt-in to status-change auto-triggers behind label.

**Why later**: maintenance work pays off only after you have a corpus large enough to drift.

## Month 6+ — Cross-repo aggregation, vector search

Only if needed:

- **Cross-repo aggregated records** if planner's per-repo join cost shows up in latency.
- **Vector search index** if you see recall failures (e.g., "find auth tickets" that don't have ticket-ID matches).

**Why optional**: most teams won't need either. Markdown + grep + Jaccard scaling depends entirely on team size and ticket volume.

---

## What to ship vs cut

If you have one week and want a useful prototype:

**Ship**:
- Backfill front-matter (no LLM).
- `/pb-related` slash command.
- One adapter (Aha or whatever you use).

**Cut**:
- Prose generation, edge mining, estimation — all LLM-dependent.
- Bot — needs infra.
- Incremental — runs only locally first.

This is enough to demo the value: "here are the tickets that touched the same files, with their structured metadata." If that's compelling on real data, the rest follows.

If it's not compelling, the whole approach was wrong and you saved yourself the LLM bill.
