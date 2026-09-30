---
description: Diagnose a misbehaving agentic-engineering run — reads the session transcript and reports every deviation from the command's contract (skipped phases, sequential reviewer dispatch, gates missed under --auto) with line-level evidence; --bundle writes a scrubbed bundle for a GitHub issue
argument-hint: "[session-id | transcript-path] [--bundle]"
context: fork
---
Read `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/diagnose.md` — that file holds the real instructions; this wrapper holds none.

Follow it. Arguments: $ARGUMENTS

It references policy sections of `SKILL.md` and blocks of `shared/preamble.md`, both under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/`. Read those when it points you there — the wrapper does not load them for you.
