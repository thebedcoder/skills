# Project mode and memory docs

## Project Mode

Workflow sizes itself to project. Marker lives in `./docs/INDEX.md` frontmatter:

```yaml
---
mode: lite   # lite | full
---
```

`/init` asks once, proposes from signals (test framework, CI, deploy config, contributor count). Ambiguous → propose lite.

| | lite | full |
|---|---|---|
| Planning | stories only | research → PRD → epics → stories |
| `PRD.md`, `EPICS.md` | never | always |
| `improvements.md`, `specs/`, `app-docs/` | on first write | at init |
| `CONSTITUTION.md` | short form (~10 lines) | full articles |
| `STORIES.md`, `PROGRESS.md`, `plans/`, `reviews/` | same | same |
| 7-agent review, tests, checkpoints | same | same |

Who reads the marker, and why nothing else may: SKILL.md "Project Mode and Memory Docs". `/cleanup` reads it for one thing — `MEMORY.md`'s line cap.

No `mode:` key (project predates modes) → treat as `full`.

Lite's shipping path is `/note` → `/ship`, not `/feature` → `/ship`. `/ship` promotes a BACKLOG item into `docs/features/main/` when no feature exists.

## Project Memory Docs

Three files, three jobs. Overlap between them is the failure mode.

| File | Answers | Write pattern |
|---|---|---|
| `docs/CHANGELOG.md` | what shipped, when | append, newest first, unbounded |
| `docs/DECISIONS.md` | why it's built this way | append `DEC-NNN`, supersede never delete |
| `docs/MEMORY.md` | what to know before touching anything | **rewritten** each cleanup, hard line cap (150 full / 50 lite) |

`/cleanup` owns all three after a task. `CONSTITUTION.md` is separate — rules that must not be broken, not choices that were made.

`.agentic/focus.md` holds CURRENT + PLAN + NEXT for this worktree. Gitignored, per-developer, never committed.
