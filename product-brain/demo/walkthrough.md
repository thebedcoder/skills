# Live demo walkthrough

10 minutes. Pre-recorded screencast or live show-and-tell. Audience: PMs + engineering leads.

## Pre-flight

Before the meeting:
- [ ] Brain repo cloned locally with real backfill data (use a recent ticket the audience knows)
- [ ] `.env` loaded; `ANTHROPIC_API_KEY` working
- [ ] Bot running on `localhost:8088` with ngrok / cloudflared tunnel exposing it
- [ ] Aha workspace open, signed in as a `bot.allowed_users` account
- [ ] Pick 1 real shipped ticket (say `AHA-1100` — 2FA login) for `/pb-related`
- [ ] Pick 1 real new ticket draft (`AHA-1500` — password reset) for `/brain groom`
- [ ] Tab open: brain repo on disk
- [ ] Tab open: bot audit log streaming (`product-brain bot tail-audit`)

## Script

### (0:00) "Here's the problem"

*Show* the audience an Aha ticket description. Then `git log --grep="AHA-1100"` in the matching codebase. Point out the difference.

> "The ticket says '2FA support.' Here's what was actually shipped — five edge cases nobody captured in Aha. When we groom the next auth feature, none of this is reachable."

**Time: 1 min.**

### (1:00) "Here's the index"

`cd company-product-brain` → `tree repos/`

> "One central repo. Source repos untouched. Every ticket touched in any of our 3 sub-products has a record."

```bash
cat repos/backend/tickets/AHA-1100.md
```

Point out:
- Front-matter (files, SHAs, authors, dates) — generated mechanically, reproducible
- `## Edge cases handled` with citations — every bullet links to a real PR comment / test / commit
- `## QA-verified edges` — from TestRail
- `## Stability signals` — "TR-C-4527 failed 5× in 90d"

> "Every line is clickable. Hallucinations get dropped before they ship."

**Time: 2 min.**

### (3:00) "Engineer asks the index a quick question"

Open Claude Code (or terminal):
```bash
product-brain run related AHA-1100
```

Output: ranked similar tickets table.

> "5 seconds. No LLM call. Engineer skims this before opening any code."

**Time: 1 min.**

### (4:00) "Engineer wants the full plan"

```bash
product-brain run groom AHA-1100
```

Wait ~30s. Output: scope per repo, estimate with refs, edges, stability, gaps, drafts.

> "30 seconds. ~$0.20. Notice the references — three real shipped tickets, similarity scores, churn-based estimate."

**Time: 1 min.**

### (5:00) "PM does the same in Aha — without installing anything"

Switch to Aha tab. Open `AHA-1500` (the password-reset draft).

Comment: `/brain related` → wait. Bot replies with the related-tickets table.

Comment: `/brain groom` → wait. Bot replies with the full plan.

**Switch tab to audit log:** show the entries appearing in real time.

> "PM never opened a terminal. PM never opened a repo. The output is the same the engineer just got."

**Time: 2 min.**

### (7:00) "PM iterates"

Edit the AHA-1500 description: "must work for SSO users too."
Comment: `/brain refresh`.

Bot **edits the existing comment** in place — show the `_what changed_` line at the top.

> "No spam. No new comment. Edit-in-place. Content-hash dedupe means it doesn't even fire if nothing changed."

**Time: 1 min.**

### (8:00) "PM commits to drafts"

Comment: `/brain draft-tickets`.

Bot replies, then creates 5 sub-tickets in Aha with status "Bot-draft."

Switch to Aha → show the new drafts. Point out: no owners assigned, status keeps them out of the active backlog.

> "PM accepts, edits, rejects, assigns. Bot doesn't promote anything to active. Human in the loop."

**Time: 1 min.**

### (9:00) "Loop closes when engineer ships"

In a source repo:
```bash
git commit -am "AHA-1500: handle SSO users in reset flow"
git push
```

Wait ~30s. Audit log shows:
```
source-merge backend AHA-1500 → 1 updated
```

Switch to brain repo → `git log -1` shows the new commit pushed by the bot.

> "Source repo unchanged. Brain repo updated. Hook fires automatically. The next groom on a related ticket sees this work in the index."

**Time: 1 min.**

### (10:00) "What's the catch"

Open `audit.sqlite` query of the day's activity:
```bash
product-brain bot tail-audit --limit 20
```

Point at the `bullets_dropped` column.

> "10 dropped today. Mostly from PRs without review comments — sparse signal, expected. We track this; if it spikes, the prompt or model needs tuning."

**Hand off to discussion.**

## Backup demos (if time)

- **Local model**: switch `config.llm.provider: openai_compatible` with `base_url: http://localhost:11434/v1` and re-run `groom`. Same output, runs on a Mac.
- **TestRail off**: comment out `test_adapter`, re-run groom. Show that QA-verified-edges and Stability sections gracefully disappear; everything else stays.
- **No docs scenario**: `cd ../some-other-repo` → `product-brain bind` (no LLM). Show the manifest gets sensible defaults from introspection alone.

## What to NOT show

- Don't try to render the Aha bot's HMAC-signed webhook flow live; brittle and uninteresting.
- Don't show LLM cost calculations unless asked. Use the slide.
- Don't open `src/` modules unless an engineer asks. The pitch is "what it does," not "how it's coded."

## Timing buffer

If you're running long, cut the iterate (step 7:00) and the loop-close (9:00). Leave PM groom + drafts + ship. That's the demo.
