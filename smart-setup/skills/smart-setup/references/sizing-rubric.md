# Sizing Rubric

Classify project BEFORE proposing anything. Tier caps generation budget — hard limit, not suggestion.

## Signals → Tier

| Signal | Points toward |
|---|---|
| No git repo, single file or dir of scripts | 0 |
| "just testing" / "experiment" / "throwaway" in user answers | 0 |
| No tests, no CI, no deploy config, < ~20 source files | 0–1 |
| Tests exist, or user wants them | 1 |
| Deploy target exists (vercel.json, Dockerfile, fastlane/, etc.) | 1–2 |
| CI pipeline (.github/workflows/, .gitlab-ci.yml, etc.) | 2 |
| Multiple contributors (`git shortlog -sn` > 1) | 2 |
| External users in production | 2 |

Ambiguous → propose LOWER tier. User can always bump up. Never silently exceed confirmed tier.

## Tier Caps

| Tier | Name | Max output |
|---|---|---|
| 0 | scratch | `CLAUDE.md` ≤ 20 lines. Nothing else. |
| 1 | solo product | `CLAUDE.md` + procedure skills + stack rules + memory scaffold + ≤ 2 agents + `.mcp.json` |
| 2 | production system | Tier 1 + domain skills + agents as justified + docs/specs conventions. May recommend agentic-engineering install for phase-gated SDLC. |

`.claude/setup-manifest.md` exempt from caps — bookkeeping, written at every tier.

## Procedure

1. Collect signals (scan or interview).
2. Propose tier + one-line reason citing signals.
3. Ask user: confirm or override. One question. Never proceed unconfirmed.
4. Record confirmed tier in manifest.
