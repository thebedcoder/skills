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

## Subagent scoping

Harness injects full `CLAUDE.md` into every custom subagent — not scopeable per agent. Unscoped triggers leak: subagent reads main session's scratch as "session start", or writes task state there, clobbering main session's notes. Rules:

- Generated Memory section carries scoping line: triggers main-conversation-only; subagents read only files named in agent file or dispatch prompt; subagents never write memory files.
- Agent needing project memory (reviewer must not flag deliberate decisions as bugs) → names `docs/decisions.md` in its Context section. See authoring-guidelines agent contract.
- Harness per-agent memory (`memory:` frontmatter → `.claude/agent-memory/<name>/`) — do NOT generate by default. Duplicates `docs/decisions.md` invisibly, agent self-curates (rot risk), fragments decision record. Escalation only: real use shows agent re-flagging settled findings despite Context reads.
