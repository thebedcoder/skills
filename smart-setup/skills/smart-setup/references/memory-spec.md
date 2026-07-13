# Memory Spec — 3 Layers

Every layer defines four things: location, write-trigger, read-trigger, lifecycle. Layer missing read-trigger = write-only noise = do not generate.

| Layer | Location | Write when | Read when | Lifecycle |
|---|---|---|---|---|
| Permanent | `CLAUDE.md` | setup + "remember this" moments | auto-loaded every session | git, slow change |
| Decisions | `docs/decisions.md` | architectural / tooling / scope decision made | `CLAUDE.md` instruction: "before architectural changes or questioning existing patterns, read `docs/decisions.md`" | git, append-only, newest first, never rewritten |
| Disposable | `.claude/scratch.md` | task state, next steps, working notes | `CLAUDE.md` instruction: read at session start | gitignored, prune freely |

## Decisions entry format (ADR-lite)

```markdown
## YYYY-MM-DD <decision title>
- **Decision:** <what>
- **Why:** <reason>
- **Rejected:** <alternatives + why>
```

## Generation requirements

- `CLAUDE.md` gets "Memory" section wiring read-triggers for decisions + scratch.
- `.gitignore` entry for `.claude/scratch.md` — generate if missing.
- Do NOT duplicate harness auto-memory (`~/.claude/projects/.../memory/`) — that layer is personal-per-machine. These layers = project-shared via git (except disposable).
