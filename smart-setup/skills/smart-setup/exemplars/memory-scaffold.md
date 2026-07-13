<!-- EXEMPLAR: memory scaffold — three pieces generated together. Generator fills real date. -->

## Piece 1 — CLAUDE.md "Memory" section (appended)

```markdown
## Memory

- Decisions log: `docs/decisions.md` — read BEFORE architectural changes or questioning existing patterns. Append ADR-lite entry after any architectural / tooling / scope decision.
- Scratch: `.claude/scratch.md` — read at session start. Holds current task state + next steps. Prune freely.
```

## Piece 2 — docs/decisions.md (seeded)

```markdown
# Decisions
<!-- Append-only, newest first. ADR-lite: Decision / Why / Rejected. -->

## YYYY-MM-DD smart-setup initialized
- **Decision:** project configured at tier N via smart-setup
- **Why:** <one line from manifest>
- **Rejected:** —
```

## Piece 3 — .claude/scratch.md (seeded) + .gitignore entry

```markdown
# Scratch
<!-- Session state. Gitignored. Prune freely. -->

## Current
(nothing)

## Next
(nothing)
```

`.gitignore` gains line: `.claude/scratch.md`
