# Product Brain — one-pager

## What

A central index that ties every Aha ticket to the actual code that shipped — across flutter, react, and backend. Lets PMs groom features and engineers pick up tickets with the *real* implementation history at hand, not just the spec.

## Why

Specs say "we have 2FA." Code says "we have 2FA, plus rate-limit, plus three known edge cases." The second view is what you need to plan the next auth feature. Today nobody has it.

## What it does

- **`/brain groom AHA-1500`** in any Aha comment → 30s later: scope per repo, estimate with reference tickets, edge-case checklist, stability signals from past failures, coverage gaps, draft sub-tickets.
- **Engineer's IDE** (Claude Code, Copilot Chat, Codex, terminal) → `product-brain run groom AHA-1500` returns the same content for engineering scoping.

Every edge-case bullet cites a real PR comment, test name, commit SHA, or TestRail case — validated at write time. Hallucinations get dropped, not shipped.

## What it costs

- ~$2.50 to backfill 5 years × 500 tickets per repo (one-time, with Haiku)
- ~$10–15/week per team for ongoing grooming
- One small VM/container for the bot
- ~2 hours of one engineer's time to bind the 3 repos and run first backfill

## What changes for the team

| Person | Change |
|---|---|
| **PM** | Adds `/brain ...` commands to existing Aha workflow. No install. |
| **Engineer** | Optional `/pb-groom` slash command in Claude Code, or `product-brain run` from terminal in any IDE. |
| **Source repos** | One post-merge hook or one GitHub Action workflow file. No `.product-brain/` directory in source. |
| **QA** | TestRail cases get pulled into edge-mining if linked via `refs`. Coverage-gap section flags untested code-handled edges. |

## What's NOT changing

- No new tools to learn for PMs
- No new IDE for engineers
- No source-repo PRs needed (one config-only change)
- Aha workflow stays the same; bot just adds a comment surface

## What's the catch

- Requires "every commit references a ticket ID" — probably already true; if not, that's the precondition
- TestRail features need cases linked to tickets via `refs` — if your linkage is sparse, those features degrade gracefully
- Bot can misfire — designed with edit-in-place, content-hash dedupe, cooldowns, audit log; trust accumulates

## Decision

**Try it on one feature.** If the next groom feels useful, keep it. If it doesn't, the brain repo is a directory we delete.

Owner: _________________________________
Eng support: ___________________________
First feature to dogfood: ______________
Decision date: _________________________

---

Repo: `<link>`  ·  Setup guide: `<link>/docs/setup.md`  ·  Demo deck: `<link>/demo/`
