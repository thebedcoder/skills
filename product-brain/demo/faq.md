# FAQ

The questions PMs and eng-leads always ask after the demo.

## For PMs

### "Do I need to install anything?"

No. You comment `/brain groom` on any ticket carrying the `brain:on` label. That's the entire workflow.

### "What if I don't trust the output?"

Every edge-case bullet cites a source — a real PR comment, test name, commit SHA, or TestRail case. Click any citation and verify it. Hallucinations get dropped at write time; what you see is what we could verify.

### "What if I disagree with the estimate?"

The bot always shows its math: 3–5 reference tickets with similarity scores, churn (LOC and days), and a confidence label. If you can argue the references aren't comparable, the estimate is rightly contested. Run `/brain explain` for a deeper view.

### "Will the bot spam my tickets?"

No. Edit-in-place: one bot comment per ticket per command type. Content-hash dedupe means re-running with no changes is a silent no-op. 24h cooldown on auto-triggers. `brain:off` label kills it on any ticket.

### "What if I need to change the description after grooming?"

Update the description, then comment `/brain refresh`. Bot edits the same comment in place with a "what changed" note at the top.

### "Can I see what tickets touched a specific file?"

Yes — engineers can grep the brain repo. Or ask: `/brain related <ticket>` lists similar past tickets.

### "What if the team standardizes on Linear/Jira instead of Aha?"

Adapter pattern. Add a `LinearAdapter` (~150 LOC), set `pm_adapter: linear` in config. Same workflow, different PM tool.

---

## For engineering leads

### "What's the dependency surface?"

- Python 3.10+
- One LLM provider (Anthropic / OpenAI / Azure / local)
- One small VM/container for the bot
- Read access to source repos, write access to brain repo
- One GitHub PAT (read-only), one PM tool token

That's it. SQLite for queue + audit. No external DB. No vector store.

### "What if our org standardizes on Copilot, not Claude?"

The CLI is provider-agnostic. Set `provider: azure_openai` (most enterprise Copilot orgs already have this) or `provider: openai_compatible` for local models via Ollama. Engineers use Copilot Chat by invoking `product-brain run groom AHA-1234` from terminal — Copilot reads the output as context. See `docs/integrations.md`.

### "What about local models — privacy concern about sending diffs to a hosted LLM?"

Set `provider: openai_compatible` with `base_url: http://localhost:11434/v1` for Ollama. Caveat: small models (≤13B) often fail strict-JSON mining; recommend 70B+ for the extraction step or hosted for that one task.

### "Will source repos get a `.product-brain/` directory committed?"

No. Source repos get **one** of:
- `.git/hooks/post-merge` (local hook, not committed)
- `.github/workflows/product-brain.yml` (one CI file)

That's all. The brain repo is separate.

### "What happens if the bot host crashes mid-job?"

SQLite queue with claim timeout. Crashed jobs get re-claimed. Brain repo writes are committed atomically (`git commit && git push --rebase` retries on conflict). Restart the worker; queue resumes.

### "Concurrent merges to all 3 repos — race?"

Single worker by default. Jobs serialize. If you scale to multiple workers, add a coarse brain-repo write lock (filelock); but at typical team scale (~50 merges/week per repo) this isn't needed.

### "What's the operational risk?"

- Bot misfires → audit log + edit-in-place. Rollback = revert the bot comment.
- Index drift (hook misses a merge) → CI Action as backup; nightly repair catches gaps.
- Hallucinations → citation validation drops them; drop-rate is logged.
- Cost runaway → hard cap of 5 LLM calls per groom; per-ticket cost in audit log.

### "How do we know if the index is producing garbage?"

Three signals:
1. **Drop rate**: `bullets_dropped` >10% across a backfill = prompt is bad. Tune.
2. **Estimate error**: track actual vs predicted on shipped tickets in the audit log.
3. **PM trust**: if PMs stop running `/brain groom`, dig in.

### "What's the maintenance burden?"

- Nightly repair (cron, ~5 min)
- Occasional prompt tuning (1–2 hours/quarter)
- Bot host: standard service operation
- Backfill schema drift: `--no-llm --force` rebuilds free; LLM rebuilds cost ~$2.50 per repo

### "What does the rollback look like?"

```bash
rm -rf company-product-brain/
# remove post-merge hook from each source repo
# delete brain:on / brain:off labels in Aha (optional)
# disable Aha webhook
```

Source repos are unchanged. No code in `flutter-app`, `react-app`, `backend` referenced product-brain.

### "How do we measure success?"

- Time from ticket creation → ready-for-eng (PM grooming time)
- Estimate accuracy on shipped tickets
- Edge cases caught at PR review vs caught in production (regression rate)
- PM/eng satisfaction survey at month 3

---

## Tradeoffs to acknowledge

### "Why no vector DB?"

Tickets are addressable by ID. Lookup is exact. We don't need fuzzy semantic search. Markdown + grep + Jaccard scoring covers 80% of value at 10% of complexity. Add vector if and only if recall failures appear.

### "Why no SaaS — why self-host?"

Code diffs and PR review threads contain proprietary IP. Self-hosting means data never leaves your infra (or only goes to your contracted LLM provider). Also: the brain repo IS the value; you should own it.

### "Why central brain repo, not embedded in each source?"

Adoption friction is the real reason. Multi-team orgs have multi-team review processes. Getting `.product-brain/` directories merged into 3 separately-owned repos is 3 separate political fights. Central is one fight.

### "Why not let the LLM see the whole codebase?"

Cost + latency + correctness. Per-groom budget of 3 LLM calls is predictable. Letting the LLM roam free across 3 repos at every query would be 10–100× cost and unreliable. The pre-built index is the reproducibility unlock.

### "Why not just use Cursor's @-mention or Copilot's `@workspace`?"

Those work great while the engineer is in their IDE. But the PM grooming use case happens in Aha, and the bot is the surface there. Same logic, two front doors: CLI for engineers, bot for PMs. Both consume the same index.

---

## "What if we have other questions?"

Open `docs/architecture.md`, `docs/setup.md`, `docs/integrations.md`. Or ping the owner listed on the [one-pager](one-pager.md).
