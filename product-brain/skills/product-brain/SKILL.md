---
name: product-brain
description: |
  Use when the user wants to plan, groom, estimate, or surface edge cases for
  a project-management ticket or proposed feature, AND the request contains a
  ticket ID matching the configured pattern (e.g. AHA-\d+) OR an explicit
  planning verb: groom, plan, estimate, scope, edge cases, related tickets,
  draft tickets.

  Trigger examples:
    - "Groom AHA-1234"
    - "What edge cases should we consider for AHA-1234?"
    - "Plan password reset for the auth area"
    - "Estimate AHA-1234"
    - "Show me tickets related to AHA-1234"
    - "Draft sub-tickets for the password reset feature"

  DO NOT trigger for:
    - Bug investigation: "AHA-1234 is broken"
    - Code review: "review my PR for AHA-1234"
    - Plain lookup: "what does AHA-1234 do?" (use index-read directly via grep)
    - Anything not involving planning/grooming/estimation
---

# Product Brain

Cross-repo memory + planning over a ticket-keyed code index.

## Building blocks (composed by each command)

| Block | Purpose |
|---|---|
| `aha-fetch` | Pull ticket(s) and metadata from the configured PM adapter. |
| `index-read` | Read `.product-brain/tickets/AHA-XXXX.md` records across configured repos. |
| `hotspot-cluster` | Deterministic frequency + co-change clustering on record front-matter. LLM only for theming. |
| `estimate` | Similarity-weighted average of past tickets' churn. Always shows references and a confidence label. |
| `edge-case-mine` | Two-pass mining: extract per ticket from PR threads/tests/commits with citation discipline; dedup at query time. |
| `code-verify` | Optional subagent fan-out into repos when the index is stale or stakes are high. Hard cap of 3 subagents. |
| `render` | Format the standard groom/plan/edges output. |

## Operating principles

1. **Citation-or-drop.** Every edge case must cite a real source (PR comment, test name, commit SHA). Validated at write time.
2. **Front-matter is mechanical, prose is LLM.** Structured fields (files, SHAs, dates, owners) come from `git` + GitHub. Prose is regenerable; front-matter is reproducible.
3. **Show your work on estimates.** Always render the reference tickets, similarity scores, and a confidence label. Black-box estimates lose trust on first miss.
4. **On-demand reads, not perpetual sync.** The index is read on every command. Subagent code-verify is gated, not default.

## Configuration

The skill reads `config.yaml` (see `config.example.yaml`) for:
- `repos`: list of repos with `.product-brain/` indexes
- `pm_adapter`: which adapter to call (aha, linear, jira, ...)
- `llm`: model selection per task
- `estimate`: similarity thresholds and confidence cutoffs
- `backfill.workflow`: squash | merge | rebase

See the `commands/` directory for the per-command playbook.
