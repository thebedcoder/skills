# Fix loop — review blockers fixed without a stop

Loaded only when a review inside a chain returns blockers: `/ship` Phases 2 and 4, `/frontend` standalone (ae-ux blockers), `/improve` Phase 3, and a failed PROD acceptance check (`shared/story-flow.md` §3). Standalone `/review` never runs it — that command reports and asks.

"Fix now" was always the recommended answer at the blocker gate. The loop gives that answer automatically, re-reviews what it fixed, and stops only when fixing is not working or a blocker needs a human decision rather than code.

## 1 · Triage

Every blocker in the consolidated list is one of:

- **fix** — code or tests are wrong; the plan and the AC stand.
- **decision** — needs a human: the AC itself is ambiguous or wrong, `CONSTITUTION.md` conflicts with the approved approach, the fix would change a public interface, add a dependency or touch the hard-override list, or a reviewer disputes the PRD.

Any **decision** blocker → skip to §4 now, with every blocker listed. Don't fix the rest first — the decision may change them.

## 2 · Rounds

Write the blockers to `.agentic/review/<ID>.blockers.md` — one per entry: id (`B1`…), source agent, `file:line`, the reviewer's fix plan. Top 5 by severity; the rest stay in `reviews/<ID>-review.md` for the next round.

| Round | Who fixes |
|---|---|
| 1, 2 | the same implementer: resume it with `SendMessage` to its agent id when the harness has it; else fresh `agentic-engineering:ae-impl` on the brief's tier with brief + report + blockers paths |
| 3 | fresh `ae-impl` on the **session model** — a stronger model on a clean context, not a third try at the same reasoning |

Prompt: `mode: fix-round`, `round: N`, `blockers: .agentic/review/<ID>.blockers.md`, `brief:`, `plugin root:`. The implementer writes a regression test per behavior blocker, fixes, does the revert-check per fix, records `--phase review-fix` (frontend blockers: `--phase frontend-fix`), and marks each blocker `fixed` · `disputed` · `needs decision`.

`needs decision` comes back → §4. `ae-edge` blockers it fixed → the orchestrator adds their rows to the story's `### Edge probes` table (category · `file:test_name`).

## 3 · Verify each round

1. `evidence.sh check` → `fresh`, as in story-flow §3.
2. **Re-review** — dispatch, in **one message**, only the reviewers whose blockers this round addressed (PROD's own acceptance misses → PROD re-checks inline). Fresh diff capture first (`/review` Step 0c or `scripts/review-diff.sh` for uncommitted work). Prompt each: *"Re-review: for each listed blocker, resolved or not, with `file:line`. Report new blockers only in lines this round changed."* A partial roster is right here; the full batch already ran.
3. `disputed` → the reviewer's re-review settles it: it withdraws → closed; it holds → counts as unresolved.

All resolved → leave the loop; the caller commits (`fix(<feature>): STORY-XXX — address review blockers`) and continues. Unresolved after round 3 → §4.

Announce each round in one line, not a gate: `Fix round 2 of 3 — 2 blockers → ae-impl (sonnet)`. Under `--auto` also log it: `DECISION: fix round N — K blockers → ae-impl (<tier>)`.

## 4 · Stop — the only gate

```
⚠️ PAUSED — [N] blockers need you
[blocker — source agent — why it stopped: survived 3 rounds | needs decision: <what>]
[top 5, then "+N more in reviews/STORY-XXX-review.md"]
```

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]` (hard-override #1): *"How do you want to handle these?"* → **Work through them together (Recommended)** · **I'll fix them myself** · **Abort the chain**. First option → main session and human fix them; this is the one place the orchestrator may edit code. Second → wait, then a fresh evidence row and the reviewers re-run — "fixed" is never self-attested. Abort → leave the PLAN line open.

## Gotchas

- **Should-fix never enters the loop.** Blockers only. Should-fix stays in the review file.
- **A round is not a retry of the same thought.** Round 3 switches model and context on purpose.
- **"Disputed" is not "skipped".** Only the reviewer that raised a blocker can withdraw it.
- **Recurring blocker class across stories** → `/ship-all` stops and asks whether `CONSTITUTION.md` needs a rule. More fix rounds won't fix a missing convention.
