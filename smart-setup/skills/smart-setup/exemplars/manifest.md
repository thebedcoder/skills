<!-- EXEMPLAR: manifest shown to user before generation. Whole footprint, one screen. -->

# Setup Manifest — <project>

Tier: **1 — solo product** (tests exist, one contributor, no CI)

## Generating

| # | Artifact | Path | Why |
|---|---|---|---|
| 1 | CLAUDE.md | `CLAUDE.md` | stack facts, commands, conventions |
| 2 | Procedure skill: release | `.claude/skills/release/SKILL.md` | 5-step release, 2 gotchas |
| 3 | Stack rules: flutter | `.claude/rules/flutter.md` | rules-library template, trimmed |
| 4 | Memory scaffold | `docs/decisions.md`, `.claude/scratch.md`, CLAUDE.md section | per memory-spec |
| 5 | Agent: qa | `.claude/agents/qa.md` | widget states + platform channels need adversarial check |
| 6 | MCP: playwright | `.mcp.json` | playwright.config.ts detected |
| 7 | Guardrails | `.claude/settings.json` | deny-read `.env*`, keys, certs — default on |

## NOT generating

| Artifact | Why not |
|---|---|
| Domain skills | tier 1, none requested |
| Backend / Infra / SecOps agents | no backend, no infra in repo |
| docs/CHANGELOG.md | tier 2 artifact |
| CI conventions | no CI configured |

Approve, edit rows, or override tier. Nothing written until approved.
