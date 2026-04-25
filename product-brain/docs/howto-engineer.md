# Engineer how-to

Day-to-day workflow for engineers using Product Brain inside Claude Code.

## Picking up a ticket

You've been assigned `AHA-1234`. Before opening any code:

```
/pb-related AHA-1234
```

Returns: a ranked list of similar shipped tickets, with their `## What shipped` summaries and top edge cases. Cheap to run (no LLM if records exist), good orientation.

If you want full grooming context:

```
/pb-groom AHA-1234
```

Returns: scope per repo, estimate, edges, risks, suggested reviewers, draft sub-tickets. Costs ~$0.10–$0.30. Useful when:

- The ticket is your first in this area.
- The PM's description leaves scope ambiguous.
- You want the historical edge-case checklist before writing tests.

## During implementation

Look at the ticket record for the most-similar past ticket and skim its `## Edge cases handled`. A reviewer will probably ask about most of those again.

If you find an edge case the index missed, add it to `## Edge cases (manual)` in the relevant ticket record after merge. The next planner that reads it will see your addition.

## When making the merge

The post-merge hook updates the index automatically. You don't need to do anything.

If the hook fails (CI bypass, hook not installed):

```
/pb-sync --repo backend
```

Or from the CLI:

```bash
product-brain sync --repo backend
```

## Reviewing a PR

The bot's Aha comment on the parent ticket is a quick sanity-check resource: did the implementer hit the edges flagged during grooming? Any that were missed?

PR reviews remain the source of truth for new edge cases. Mention them in review comments — they get mined into the next ticket record automatically.

## Common questions

### "How do I see what the index has on a ticket?"

```bash
cat <repo>/.product-brain/tickets/AHA-1234.md
```

Plain markdown. Read it like any doc.

### "I disagree with the prose in a record. Can I edit it?"

Two options:

1. Edit the LLM-generated section. **Will be overwritten on next backfill.** Fine for short-lived corrections.
2. Add to `## Edge cases (manual)` below the sentinel marker. Preserved across backfills.

### "How do I tell the bot to stop commenting on a ticket?"

Add the label `brain:off` (or whatever `config.bot.kill_switch_label` is set to).

### "I want to know all tickets that touched `auth/login.py`."

```bash
grep -l "auth/login.py" <repo>/.product-brain/tickets/*.md
```

The index is grep-friendly by design.

### "Estimate said 4-6d but it took me 12. What now?"

Estimates anchor on past churn. If the references were truly similar, this ticket had a dimension the index missed (cross-repo coordination, novel approach, etc). Add a note to your record's `## Edge cases (manual)` — future planners will see it.

If estimates are systemically off, look at the audit log for similarity scores. References below ~0.5 similarity are stretched analogies.

### "How do I run the index on a new repo?"

1. Add the repo to `config.yaml` under `repos:`.
2. Create `<repo>/.product-brain/manifest.md` (template at `skills/product-brain/templates/manifest.md`).
3. `product-brain backfill --repo <name>`
4. `<path-to-product-brain>/scripts/install-post-merge-hook.sh` from inside the repo.

## When NOT to use Product Brain

- **One-line bug fixes**: skip grooming. The records will get a tiny update post-merge anyway.
- **Spikes/research**: nothing to compare to. `/pb-plan` will return low-signal output.
- **Cross-cutting refactors**: the ticket touches everything; clusters become noise. Skip.
