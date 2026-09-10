---
description: Answer questions about the project — searches docs, app-docs, and codebase. Ask anything like "which features lack designs?" or "how do we process payments?"
argument-hint: <your question>
context: fork
---
Read `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/analyze.md` — that file holds the real instructions; this wrapper holds none.

Follow it, for question: $ARGUMENTS

It references policy sections of `SKILL.md` and blocks of `shared/preamble.md`, both under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/`. Read those when it points you there — the wrapper does not load them for you.
