# Docs / Specs Rules

Principle: doc exists only if it changes future work. Every doc type has read-trigger. No ceremony.

## Per tier

| Tier | Docs |
|---|---|
| 0 | none |
| 1 | `docs/decisions.md` + specs for multi-session / cross-cutting features only |
| 2 | tier 1 + `docs/CHANGELOG.md` — agent-facing, prepend after significant change, read at session start |

## Spec format — `docs/specs/<feature>.md`

Four sections, nothing more:

```markdown
# <feature>
## Problem
## Decision
## Scope
## Out of scope
```

Read-trigger: `CLAUDE.md` instruction — "implementing <feature area> → read its spec first."

## Banned

- Feature directories (PRD / EPICS / STORIES / PROGRESS trees)
- Story checkboxes
- Docs without read-trigger
- Per-feature review folders

Project needs phase-gated SDLC → manifest recommends agentic-engineering install. Do not reimplement it.
