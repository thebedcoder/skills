# Headless Aha bot

Same skill logic as the interactive slash commands, run by a service that listens to PM-tool webhooks and posts results back as comments.

## What it does

- Listens for Aha webhook events.
- Parses `/brain <command>` from comments by allowed users.
- Optionally fires on status changes for tickets carrying an opt-in label.
- Posts a structured comment back. Edits the comment in place on re-runs.
- Creates draft sub-tickets when asked.

## Architecture

```
+---------------+     POST /webhook
|     Aha       | ─────────────────────► Webhook server (Fastify)
+---------------+                              │ verify signature, parse,
                                                │ decide enqueue or ignore
                                                ▼
                                        Job queue (SQLite)
                                                │ {ticket, command, trigger, requester}
                                                ▼
                                        Worker
                                                │ git pull repos
                                                │ catch up index if stale
                                                │ run skill blocks
                                                │ post/edit Aha comment
                                                │ append audit log
                                                ▼
                                        +------------------+
                                        | Aha comment      |
                                        | (edit-in-place)  |
                                        +------------------+
```

Single small VM/container holds all of this until you're at hundreds of jobs/day.

## Triggers

| Trigger | Default | Notes |
|---|---|---|
| `/brain <cmd>` in a comment by an allowed user | **on** | The killer surface. Manual, explicit, predictable. |
| Status change to a configured grooming column | off | Enable behind an opt-in label after a month of dogfooding. |
| Ticket created | never | Too noisy. |
| Nightly sweep | optional | Find tickets in grooming-eligible statuses lacking a recent bot comment; queue them. |

**Recommended launch**: manual `/brain` only for the first month. Watch which commands get used, what PMs ignore, what they complain about. Then add status-change triggers behind `config.bot.opt_in_label`.

## Comment shape

Stable header so the bot can locate-and-edit; footer with trust signals.

```markdown
🧠 **product-brain** · groom · run 2026-04-25 14:32
_Estimate revised: AHA-1450 shipped last week, now in references._

## Scope by repo
...

## Estimate: 4–6d  (medium confidence)
References: AHA-1100 · AHA-1300 · AHA-900

## Edge cases (mined from 7 related tickets)
...

---
<sub>Trigger: /brain groom by @pm@example.com ·
Re-run with `/brain refresh` · Disable with label `brain:off` ·
[Audit log](http://bot.internal/audit/run/abc123)</sub>
```

The "what changed" line under the header is what makes edits feel intentional vs arbitrary.

## /brain command reference

| Command | Action |
|---|---|
| `/brain groom` | Full groom on the current ticket. Default if `/brain` alone. |
| `/brain estimate` | Estimate only, with references. |
| `/brain edges` | Edge cases mined from related tickets. |
| `/brain related` | Similar shipped tickets. |
| `/brain draft-tickets` | Create draft sub-tickets in Aha (status = `config.bot.draft_status`). |
| `/brain refresh` | Bypass cooldown; re-run the most recent command. |
| `/brain explain` | Expand the previous bot comment with more detail. |
| `/brain on` / `/brain off` | Toggle the bot for this ticket (via labels). |

The bot ignores its own user and any user not in `config.bot.allowed_users`.

## Spam prevention

| Guard | Mechanism |
|---|---|
| **Edit in place** | One bot comment per ticket per command type. Aha API supports edits. Identifier in header (`product-brain · groom`) makes the edit target unambiguous. |
| **Content-hash dedupe** | Hash `(ticket_body + index_state_for_related_tickets)`. Unchanged → skip silently. |
| **Cooldown** | `config.bot.cooldown_hours` between auto-runs on the same ticket. `/brain` commands bypass. |
| **Opt-in label** | Auto-triggers (status change, sweep) require `config.bot.opt_in_label`. Manual `/brain` does not. |
| **Kill switch** | `config.bot.kill_switch_label` silences the bot immediately on a ticket. |
| **Quiet hours** | Auto-posts skipped outside `config.bot.quiet_hours_utc`. Manual bypasses. |
| **Bot loop prevention** | Strict author filter — bot reacts only to comments from allowed users, never to its own. |

## Setup

### 1. Install and configure

```bash
./install.sh
cp config.example.yaml config.yaml
cp .env.example .env
# edit both
```

In `config.yaml`:

```yaml
bot:
  enabled: true
  host: 0.0.0.0
  port: 8088
  webhook_signing_secret_env: AHA_WEBHOOK_SECRET
  allowed_users: [pm@example.com, lead@example.com]
  cooldown_hours: 24
  opt_in_label: brain:on
  kill_switch_label: brain:off
  quiet_hours_utc: [22, 7]
  draft_status: "Bot-draft"
```

### 2. Run the server

```bash
product-brain bot serve
```

This launches the webhook listener and a single in-process worker. For higher load, run worker as a separate process: `product-brain bot worker`.

For production, put it behind an HTTPS reverse proxy.

### 3. Configure Aha webhook

In Aha (Settings → Webhooks):

- **URL**: `https://your-bot-host/webhook/aha`
- **Events**: comment created, comment updated, feature updated (status change)
- **Secret**: same value as `AHA_WEBHOOK_SECRET` env var

### 4. Test

Comment on a ticket: `/brain groom`. Within ~30s the bot should post a reply.

```bash
product-brain bot status         # queue depth, worker health
product-brain bot tail-audit     # follow the audit log
```

## Audit log

Every action is recorded:

```
timestamp · trigger · ticket · command · input_hashes · output_summary · model · cost · run_id
```

Stored in `config.audit.path` (SQLite by default). Append-only. Surfaced via `product-brain bot audit` and the link in each comment footer.

## Failure modes

| Mode | Behavior |
|---|---|
| **Stale index** | Worker `git pull`s each repo at job start; if HEAD moved past `manifest.last_indexed_sha`, runs inline incremental backfill before grooming. |
| **Aha rate limits** | Per-run cap (≤30 ticket fetches), session cache, exponential backoff on 429. |
| **GitHub outage during PR enrichment** | Note in comment: "PR data unavailable; edges from tests/commits only." Don't silently produce a worse groom. |
| **Bot loop** | Strict author filter on `WebhookEvent.comment.author`. Bot's own user ID is excluded by config. |
| **Worker crash mid-job** | SQLite queue with `claimed_at` timeout reclaims abandoned jobs. |
| **Comment edit collision** | If two runs for the same ticket race, the second waits for the first to complete (per-ticket job lock). |

## Cost ceiling

Per `/brain groom`: ~3 LLM calls + ≤3 subagents. With Sonnet for synthesis and Haiku for extraction: ~$0.10–$0.30 per run.

A team running 50 grooms/week: ~$10–15/week. Track via `audit.cost`.
