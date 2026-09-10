---
description: Interactively document a feature — reads code, asks clarifying questions, writes end-user docs
argument-hint: [feature-name]
---
Read `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/doc.md` — that file holds the real instructions; this wrapper holds none.

Follow it, for feature: $ARGUMENTS

It references policy sections of `SKILL.md` and blocks of `shared/preamble.md`, both under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/`. Read those when it points you there — the wrapper does not load them for you.
