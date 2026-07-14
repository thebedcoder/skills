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

Frontmatter: `name` + `description` (one line, project-specific) + `model` by purpose — checklist/mechanical verify → `haiku`; judgment review, research → `sonnet`; architecture/design → `opus`; unsure → omit key (inherits session model). No `memory:` key by default — generated agents stay stateless; project knowledge flows via Context reads. Add `memory: project` only on evidence (agent re-flags settled findings across sessions despite Context reads) — never speculatively. Body must contain four sections:

- **Dispatch trigger** — when main conversation calls this agent
- **Context** — files agent reads before checks. Reviewer agents: `docs/decisions.md` — deliberate decisions ≠ bugs. Never `.claude/scratch.md` (main-session state). Findings go in report — agent never writes memory files.
- **Checks** — concrete list, project-specific, verifiable
- **Report format** — caveman, severity-ordered

### Settings — `.claude/settings.json`

Sensitive-file guardrails, DEFAULT ON at tier ≥ 1 (user can decline in interview). Merge into existing file — never rewrite. Default deny block:

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./**/*.pem)",
      "Read(./**/*.key)",
      "Read(./secrets/**)",
      "Read(./**/credentials*)"
    ]
  }
}
```

Trim to files project could actually contain. Hooks: propose only on concrete detected trigger (formatter config → PostToolUse format hook). Never speculative hooks.

### Rule — `.claude/rules/<topic>.md`

Every rule file needs `CLAUDE.md` pointer line: `editing <pattern> → read .claude/rules/<topic>.md`. Rule without pointer = never read = do not generate.

## Quality bar

- Procedure skill earns existence only if procedure non-obvious (> 1 command, or has gotchas). Single obvious command → `CLAUDE.md` line instead.
- Rule ≤ ~3 lines → inline `CLAUDE.md` line, no rule file. `.claude/rules/<topic>.md` only for longer rules.
- Rule `paths:` globs → verify against actual project dirs (`test/` vs `tests/`). Non-matching glob = dead rule.
- Every memory layer states read-trigger. No read-trigger → not generated.
- Match exemplar density — files in `exemplars/` are the bar. Do not pad past them.
- Test commands in generated content: non-watch invocations only — `vitest run`, `jest`, `pytest`, `go test ./...`. Never bare `vitest`, never `--watch`.
