# PM how-to

Workflow for product managers using Product Brain through the Aha bot.

## First-time setup

You don't install anything. The bot is a service your engineering team runs. Once it's wired to your Aha workspace:

1. Confirm your Aha email is in `config.bot.allowed_users` (ask your eng lead).
2. To enable a feature for grooming, add the label `brain:on` (or whatever `opt_in_label` is set to) to the parent feature.

## Grooming a ticket

In the Aha comment box on any ticket:

```
/brain groom
```

Within ~30 seconds, the bot replies with a structured comment:

- **Scope by repo** — which sub-products need work, what areas
- **Estimate** — range with confidence label and reference tickets
- **Edge cases** — mined from related shipped work, with citations
- **Risks** — areas of recent instability or staleness
- **Suggested reviewers** — based on commit history
- **Draft sub-tickets** — checklist to consider creating

Re-running `/brain groom` edits the existing comment in place rather than appending. If the underlying data has changed, you'll see a `_what changed_` line at the top.

## Other commands

| In a comment | What you get |
|---|---|
| `/brain estimate` | Just the estimate, with references. Use when scope is settled and you want the number. |
| `/brain edges` | Just the edge-case checklist. Useful for QA planning. |
| `/brain related` | List of similar shipped tickets. Use to anchor expectations. |
| `/brain draft-tickets` | Bot creates draft sub-tickets in Aha (status: "Bot-draft" or whatever's configured). Review and accept/edit/reject. |
| `/brain refresh` | Bypass cooldown; force a re-run. Use after material changes to the ticket. |
| `/brain explain` | Expand the prior bot comment with more detail (what's behind a number, why a risk was flagged). |
| `/brain off` | Stop the bot on this ticket. |
| `/brain on` | Re-enable. |

## Reading the output

### Estimate confidence

| Label | What it means |
|---|---|
| **high** | ≥6 reference tickets above 0.6 similarity. Trust the range. |
| **medium** | ≥4 references above 0.5 similarity. Useful directional. |
| **low** | <4 references or low similarity. Treat as an order-of-magnitude. |
| **preliminary** (in `/pb-plan`) | No ticket yet; scope is predicted. Always one notch lower than equivalent groom would produce. |

### Edge cases — citations matter

Every bullet cites a source:

```
- Rate-limit reset requests to 5/hour per email
  source: pr#789 review comment by @bob
```

You can click through to the PR or test to verify. If a bullet looks wrong, follow the citation. If the citation is broken (404, missing test), file a bug — validation should have caught it.

### Draft sub-tickets

Bot creates them with status "Bot-draft" (or whatever's configured). They:

- Live under the parent feature
- Have no assigned owner (you or the lead assigns)
- Carry estimate, scope summary, edge-case checklist, reference link
- Don't auto-promote to active backlog

You review each draft, edit/accept/reject in Aha. Bot never finalizes.

## When to groom

| Situation | Recommended |
|---|---|
| Feature still being scoped with stakeholders | `/brain related` to see what we've shipped nearby |
| Ready for engineering scoping | `/brain groom` |
| Estimate disputed | `/brain explain` to expand the math |
| About to break into sub-tickets | `/brain draft-tickets` |
| Feature in flight, scope changed | `/brain refresh` |

## Limitations

- **The index goes blind before a cutoff date** — see each repo's `manifest.index_cutoff_date`. Tickets older than that aren't fully captured.
- **Cross-team work is partial** — only repos configured in the orchestrator are indexed.
- **Estimates are anchored on past churn**, not capacity. The bot doesn't know your team's velocity or current load.
- **Bot doesn't assign owners or change status** — that's a human decision.

## Trust calibration

Read 5–10 bot comments before fully trusting the output. Patterns:

- If estimates land within range on completed tickets → high trust.
- If edge-case bullets routinely match what reviewers actually flag → high trust.
- If draft sub-tickets need heavy editing → flag to eng; the prompt may need tuning.

Audit log is available — engineers can show you any past run with full inputs/outputs/cost.

## Common questions

### "The bot's estimate is way off our team's actual velocity."

Estimates measure historical effort on similar tickets, not your team's bandwidth. If your team is faster/slower than the team that shipped the references, scale accordingly. The bot can't know your current sprint capacity.

### "An edge case bullet is wrong."

Click the citation. If it's a real PR comment that's been misinterpreted, file a bug — the prompt may need tuning. If the citation is fabricated, that's a validation bug — escalate.

### "I want the bot to consider Aha tickets from another product line."

Currently, the bot only considers tickets that touch one of the configured repos. Cross-product-line correlation isn't supported in v1. Ask eng to add the repo to `config.yaml`.

### "Can I get the bot to comment automatically when I move a ticket to 'Ready for grooming'?"

Yes, after enabling status-change auto-triggers (off by default in v1). Ask eng to:
1. Set `bot.enabled: true` (already done if you're using the bot).
2. Configure the status name in the bot config.
3. Add `brain:on` to features you want auto-groomed.
