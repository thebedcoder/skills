# Authoring Guidelines

Every generated artifact follows these. Read before generating anything.

## Caveman rules

Apply to: generated skills, rules, agent prompts, memory scaffolds, manifest.

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- **Keep:** technical terms exact, code blocks unchanged, file paths verbatim
- **Pattern:** `[thing] [problem/action] [reason]. [next step].`
- **Fragments OK.** Short synonyms: fix not "implement solution", use not "utilize"

NOT caveman (normal prose): README content, end-user docs, human checkpoint messages.

## Frontmatter contracts

### Project skill — `.claude/skills/<name>/SKILL.md`

```yaml
---
name: <kebab-case>
description: >
  <what it does>. Use when <explicit trigger conditions — phrases user types,
  situations, file patterns>.
---
```

Trigger conditions in description mandatory. Skill without trigger = never fires = dead file.

### Agent — `.claude/agents/<name>.md`

Frontmatter: `name` + `description` (one line, project-specific). Body must contain three sections:

- **Dispatch trigger** — when main conversation calls this agent
- **Checks** — concrete list, project-specific, verifiable
- **Report format** — caveman, severity-ordered

### Rule — `.claude/rules/<topic>.md`

Every rule file needs `CLAUDE.md` pointer line: `editing <pattern> → read .claude/rules/<topic>.md`. Rule without pointer = never read = do not generate.

## Quality bar

- Procedure skill earns existence only if procedure non-obvious (> 1 command, or has gotchas). Single obvious command → `CLAUDE.md` line instead.
- Rule ≤ ~3 lines → inline `CLAUDE.md` line, no rule file. `.claude/rules/<topic>.md` only for longer rules.
- Rule `paths:` globs → verify against actual project dirs (`test/` vs `tests/`). Non-matching glob = dead rule.
- Every memory layer states read-trigger. No read-trigger → not generated.
- Match exemplar density — files in `exemplars/` are the bar. Do not pad past them.
- Test commands in generated content: non-watch invocations only — `vitest run`, `jest`, `pytest`, `go test ./...`. Never bare `vitest`, never `--watch`.
