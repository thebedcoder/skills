# smart-setup

Project-tailored Claude Code setup. Scans your codebase (or interviews you, for a brand-new project), sizes the project into a tier, then generates only the configuration that project actually needs across five dimensions:

| Letter | Dimension | What gets generated |
|---|---|---|
| **S** | Skills | Procedure skills (run, test, release…) and domain skills (invariants, gotchas) in `.claude/skills/` |
| **M** | Memory | Three layers: permanent (`CLAUDE.md`), decisions (`docs/decisions.md`), disposable (`.claude/scratch.md`, gitignored) |
| **A** | Agents | Role-named, verification-shaped subagents in `.claude/agents/` — only where the project gives them something to check |
| **R** | Rules | Stack rules from the shared rules-library plus conventions observed in your code, in `.claude/rules/` |
| **T** | Tools | `.mcp.json` entries and required-CLI documentation, detected from config files |

## Why

Full SDLC workflows are overkill for most projects. smart-setup sizes first: a throwaway script gets a 20-line `CLAUDE.md` and nothing else; a production system gets domain skills, agents, and doc conventions. Before writing a single file it shows you a manifest — including an explicit list of what it is *not* generating and why — and waits for your approval.

## Install

```bash
bash smart-setup/install.sh
```

Restart Claude Code afterwards.

## Usage

- `/smart-setup` — scan or interview → tier proposal → manifest → generate
- `/smart-setup update` — re-audit an existing setup against the current codebase and propose amendments

## Tiers

| Tier | Meaning | Ceiling |
|---|---|---|
| 0 — scratch | throwaway, experiment | `CLAUDE.md` ≤ 20 lines |
| 1 — solo product | real project, one dev | + procedure skills, stack rules, memory, ≤ 2 agents, `.mcp.json` |
| 2 — production system | team, CI, users | + domain skills, agents as justified, docs/specs conventions |

If a project genuinely needs a phase-gated SDLC, smart-setup recommends installing the `agentic-engineering` plugin instead of reimplementing it.
