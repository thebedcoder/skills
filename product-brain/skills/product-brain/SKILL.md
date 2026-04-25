---
name: product-brain
description: |
  Trigger when user wants to plan, groom, estimate, or surface edge cases for
  a PM ticket or proposed feature, AND request contains a ticket ID matching
  configured pattern (e.g. AHA-\d+) OR explicit planning verb: groom, plan,
  estimate, scope, edge cases, related tickets, draft tickets.

  Trigger:
    - "Groom AHA-1234"
    - "Edge cases for AHA-1234?"
    - "Plan password reset for auth"
    - "Estimate AHA-1234"
    - "Tickets related to AHA-1234"
    - "Draft sub-tickets for password reset"

  Skip:
    - "AHA-1234 is broken" (bug, not planning)
    - "Review my PR for AHA-1234" (review, not planning)
    - "What does AHA-1234 do?" (lookup → grep instead)
---

# Product Brain

Cross-repo memory + planning over ticket-keyed code index.

## Blocks (composed per command)

| Block | Job |
|---|---|
| `aha-fetch` | Pull ticket(s) from PM adapter |
| `index-read` | Read `.product-brain/tickets/AHA-XXXX.md` across repos |
| `hotspot-cluster` | Frequency + co-change clustering on front-matter. Deterministic + 1 LLM for theming |
| `estimate` | Similarity-weighted churn average. Always shows refs + confidence |
| `edge-case-mine` | Per-ticket extract w/ citation rule (cached) + cross-ticket dedup |
| `qa-mine` | Test cases linked to ticket → qa_edges + stability signals (if test_adapter set) |
| `coverage-gap` | Code edges with no QA case match |
| `code-verify` | Subagent fan-out, gated. Cap 3 |
| `render` | Template fill |

## Rules

1. **Cite-or-drop.** Every edge bullet cites real source (PR comment, test name, SHA, TR-C-NNNN). Validated at write.
2. **Front-matter mechanical, prose LLM.** Files/SHAs/dates from git+PM. Prose regenerable; front-matter reproducible.
3. **Show estimate refs.** Reference tickets, similarities, confidence label. Never black-box.
4. **Read on demand.** Index read every command. `code-verify` gated.

## Config

`config.yaml` provides: `repos`, `pm_adapter`, `test_adapter` (optional), `llm`, `estimate` thresholds, `backfill.workflow`.

See `commands/` for per-command playbooks.
