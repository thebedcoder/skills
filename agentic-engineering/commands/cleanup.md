---
description: Promote finished work into durable docs — binding decisions to DECISIONS.md, project knowledge to a size-capped MEMORY.md. Runs automatically at the end of /ship, /fix and /improve
argument-hint: [STORY-ID | feature-name]
---
Read `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/cleanup.md` — that file holds the real instructions; this wrapper holds none.

Follow it, for scope: $ARGUMENTS

It references policy sections of `SKILL.md` and blocks of `shared/preamble.md`, both under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/`. Read those when it points you there — the wrapper does not load them for you.
