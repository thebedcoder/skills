---
description: Extract a shipped feature's durable decisions and open obligations into DECISIONS.md and BACKLOG.md, then compact its working docs to SUMMARY.md and delete the originals. --all stages every eligible feature; --apply commits the staged extract
argument-hint: [feature-name | --all | --apply]
---
Read `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/archive.md` — that file holds the real instructions; this wrapper holds none.

Follow it. Arguments: $ARGUMENTS

It references policy sections of `SKILL.md` and blocks of `shared/preamble.md`, both under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/`. Read those when it points you there — the wrapper does not load them for you.
