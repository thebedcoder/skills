# Presenter speaker notes

Use alongside `presentation.md`. One section per slide.

---

## Slide 1 — title

"Product Brain. Cross-repo memory and planning, grounded in real shipped code."

Hook: "We're not asking for budget. We're asking for one engineer's afternoon to bind 3 repos and see if it's useful."

---

## Slide 2 — problem

Tell a real story from your team. Something like:

> "Three sprints ago we shipped 2FA. Last week the PM groomed password reset. He looked at the Aha 2FA ticket, saw 'TOTP, codes hashed, lockout after 5.' What he couldn't see: the rate-limit issue we found in PR review, the network-disconnect bug that's still failing 5× in QA, the older-Android-fallback we discovered post-launch from support tickets. So password reset is going to relearn all of those — or worse, not learn them."

---

## Slide 3 — what we do today

Don't read the table aloud. Just say:

> "Each of these is a place where eng and PM are working from incomplete pictures. The output is slow grooming and soft estimates. The fix isn't more docs — docs go stale. The fix is binding the spec to the shipped diff."

---

## Slide 4 — what we want

Walk through the bullets. Pause on **citations**:

> "Every edge-case bullet has a real source attached — a real PR comment, a real test, a real commit. If the bullet looks wrong, click the citation. Hallucinations get dropped at write time, not after they erode trust."

---

## Slide 5 — lifecycle diagram

"Three phases. Top: development — your normal commit-PR-merge flow. Middle: the central brain repo — that's the new artifact. Bottom: planning — that's where PMs and engineers consume it."

Point at top:
> "Source repos don't change. They get one post-merge hook. That's it."

Point at middle:
> "One central repo. Markdown files. Grep-able. Diff-able. No magic database."

Point at bottom:
> "PMs use the bot in Aha. Engineers use whatever IDE they already have. Same content, different doors."

---

## Slide 6 — brain repo layout

Walk through the tree. Point at:

> "`config.yaml` declares which source repos are bound. `repos/<name>/manifest.md` describes each repo to the planner. `repos/<name>/tickets/AHA-NNNN.md` is the actual record. One per ticket per repo."

> "Source repos get a post-merge hook. They never get a directory in their tree."

---

## Slide 7 — citations

This is the slide that builds trust. Read each line:

```markdown
- Rate-limit reset requests to 5/hour per email
  source: pr#789 review @bob
- Tokens hashed at rest (sha256 + salt)
  source: pr#789 commit def456
```

> "If the bullet is wrong, the citation is wrong. We can verify in seconds. The mining prompt is told: cite or skip. The validator drops citations that don't resolve. What you see is what we could prove."

---

## Slide 8 — components

Quick gloss:

> "Pluggable everywhere. PM tool: Aha today, Linear or Jira tomorrow. Test management: TestRail today, Zephyr or Xray tomorrow. LLM: Anthropic, OpenAI, Azure, or local models on Ollama — all behind one interface."

> "Core blocks are deterministic — hotspot clustering, similarity-based estimation, citation validation. LLM is only used where deterministic isn't enough."

---

## Slide 9 — PM workflow

Walk through the 12 boxes briefly. Emphasize the bottom-line:

> "PM never installs anything. No terminal. No IDE. No new tool to learn. The bot is a comment surface in Aha — same place PMs already work."

---

## Slide 10 — engineer workflow

> "Engineers use whatever they have. Claude Code users get slash commands. Copilot Chat users invoke the CLI from terminal — Copilot reads the output. Codex, Cursor, Continue, Aider — same pattern. The CLI is the universal surface."

> "After ship, the post-merge hook fires. The bot updates the brain. The next groom on a related ticket sees the new edges."

---

## Slide 11 — bot internals

For the eng leads in the room:

> "Webhook → HMAC verify → SQLite queue → worker → Aha API. Edit-in-place: one bot comment per ticket per command type. Content-hash dedupe. Cooldown. Opt-in label. Audit log. This is the boring infrastructure that makes the bot not become spam."

---

## Slide 12 — cost

Read the table. Anchor:

> "$2.50 to backfill 5 years of one repo. $10–15 a week per team to run it. One small VM. The most expensive thing here is the engineer's afternoon to set it up the first time."

---

## Slide 13 — rollout

> "Don't enable everything on day one. Week 1: engineers dogfood `/pb-related`. Week 2: `/pb-groom` interactively. Week 3: bot enabled for one PM, manual triggers only. Month 2: full rollout. Trust accumulates one good groom at a time."

---

## Slide 14 — decision

Direct ask:

> "We need: one engineer to bind the repos and run backfill. One PM willing to dogfood for 2 weeks. Decision date so we don't drift. If after 2 weeks the bot's output isn't useful, we delete the brain repo and forget about it."

> "Who's running point?"

---

## Anticipating pushback

| Pushback | Response |
|---|---|
| "We don't have time to learn another tool" | PMs don't learn anything — `/brain groom` in a comment is the entire interface. |
| "We tried bots before, they spam" | Edit-in-place + content-hash dedupe + cooldown. We don't post if nothing changed. |
| "Sounds expensive" | $10–15/week. Cheaper than one hour of grooming time saved. |
| "What if the LLM hallucinates?" | Citations are validated at write time. Unverifiable bullets are dropped, not shipped. |
| "Why not Notion / Confluence / a wiki" | Those go stale. The brain rebuilds from git on every merge. |
| "Why not just ask the LLM directly" | $X×100 cost, no reproducibility, no citations, no audit log. The pre-built index is the unlock. |
| "What about Linear / Jira / [other PM tool]" | Adapter pattern. ~150 LOC to add a new PM. |
| "We use Copilot, not Claude" | Pluggable LLM provider — Anthropic, OpenAI, Azure (most Copilot enterprise contracts have this), or local. |
| "Sounds like a lot of moving parts" | One CLI. One bot. SQLite. Markdown files. No external DB. The "moving parts" are intentionally minimal. |
