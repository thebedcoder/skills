# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope of this file

The parent `../CLAUDE.md` covers the monorepo (per-plugin layout, the wrapper/real-command split, the two installers, the `<!-- agentic-engineering:start v1 -->` marker contract, commit conventions). **Read it first** — most authoring rules live there. This file only adds what's specific to the `agentic-engineering/` plugin's internal shape.

## Architecture at a glance

The plugin is the entire `/ship`, `/feature`, `/review`, `/fix` SDLC workflow — a router skill (`skills/agentic-engineering/SKILL.md`) that dispatches into one of 21 command files in `skills/agentic-engineering/commands/`, plus 8 named specialist agents under `agents/` that the commands invoke (often in parallel) as Claude Code subagents. The end-user `README.md` is the workflow-level overview; this file is for authoring inside the plugin.

Three pieces of the architecture are non-obvious and load-bearing:

1. **On-demand command loading.** `SKILL.md` is a thin router — it only holds the command → file table, the agent roster, the caveman rules, and the test-watch ban. The actual command body (the long instructions) lives in `skills/agentic-engineering/commands/<name>.md` and is read only when that command fires. This keeps the skill cheap to load. Do not inline command logic into `SKILL.md`.
2. **6-agent parallel review.** `commands/review.md` dispatches `ae-red`, `ae-req`, `ae-test`, `ae-doc`, `ae-sec`, `ae-edge` as **simultaneous** Haiku subagents — single message with multiple `Agent` tool calls. Sequential dispatch defeats the design (cost, latency, context). The `ae-ux` agent runs separately after the frontend pass — it is **not** in the parallel batch.
3. **Forked vs. main context.** `/status` and `/analyze` run with `context: fork` so their tool calls don't pollute the main conversation. `/ship`, `/feature`, `/design` run in the main context because they have human checkpoints that need conversation continuity. If you add a new command, this choice is deliberate — pick based on whether it needs human handoff.

## Agent file layout — single file vs. directory

Two shapes exist. Pick the right one and update `install.sh` to match. Either shape **must** declare `name:` in its frontmatter, matching the file stem or directory name — Claude Code drops a nameless agent silently, so `/review` still produces a report, just with the main model role-playing the six reviewers. `.claude/hooks/check-integrity.sh` check F enforces this.

| Shape | Used by | Why |
|---|---|---|
| Single `agents/<name>.md` | `ae-req`, `ae-doc`, `ae-scribe` | Small agents with no per-language or per-topic dispatch |
| Directory `agents/<name>/AGENT.md` + `references/` + `languages/` | `ae-red`, `ae-test`, `ae-sec`; `ae-ux` + `ae-edge` (no `languages/`) | Agent loads only the references/language guides relevant to what's in the diff — keeps each review small |

When adding language/topic depth to an existing single-file agent, **migrate it to a directory** (`agents/ae-foo/AGENT.md`) and update the `cp -r` line in `install.sh`. The single-file `cp` form will fail silently on the new shape.

## User-facing vs. internal commands

Twenty-one commands exist in `commands/`. `implement`, `review`, `frontend` are **internal by intent** — designed to be invoked by `ship` and `ship-all`, not driven by hand. But "internal" is enforced on exactly one of the two install paths, and that asymmetry is load-bearing:

| Install path | What the user sees |
|---|---|
| Per-plugin `install.sh` (bash) | 18 commands. The `USER_COMMANDS` array is the gate — a new command file is **not** user-visible until you append its name there. |
| Marketplace / `/plugin install` | **All 21.** Plugin auto-discovery registers every `.md` in `commands/`, so `/agentic-engineering:implement`, `:review`, and `:frontend` do appear in the palette. `USER_COMMANDS` has no effect here. |

This is deliberate, not a bug to paper over: standalone `/agentic-engineering:review` is genuinely useful (review without shipping), and the three wrappers are kept for it. What you must **not** do is assume the bash-installer filter hides them everywhere — it doesn't. If you ever need a command hidden on both paths, delete its root `commands/<name>.md` wrapper; the skill router still dispatches from `skills/agentic-engineering/commands/<name>.md`.

The skill's `commands/` table in `SKILL.md` lists all 21 because the router needs to dispatch them regardless of palette visibility.

## Post-install SKILL.md patch (do not pre-add)

`install.sh` runs a Python step that injects `user-invocable: false` into the installed `SKILL.md` frontmatter. This field is valid in the Claude Code CLI but **rejected by the claude.ai skill packager** when building `agentic-engineering.skill`. Therefore:

- The source `skills/agentic-engineering/SKILL.md` must **not** contain `user-invocable: false`. If a PR adds it to source, that's a bug — the `.skill` packager will fail.
- The installer guards with `grep -q "user-invocable"` so re-runs are idempotent — leave the guard in place.

If you ever need to ship the source with `user-invocable: false` (e.g. CLI-only release), also update the packager step and drop the install-time patch.

## Caveman communication rules (authoring style)

`SKILL.md` enforces caveman rules for **agent-to-agent internal output** — review reports, plans, status lines. The rules: drop articles (a/an/the), drop filler (just/really/basically), drop hedging, keep technical terms and file paths verbatim, fragments are fine. Apply this to:

- Agent prompts and report templates in `agents/*/AGENT.md`
- Command instructions in `skills/agentic-engineering/commands/*.md`
- Anything the agents read or emit during a session

**Do not** apply caveman style to: human checkpoint messages, code blocks, conventional commit subjects, MDX end-user docs written by `ae-scribe`, or the public `README.md`. Those are user-facing and need normal prose.

## Test execution: non-watch only (hard rule)

Documented in `SKILL.md` under "Test Execution Rules". Watch-mode test runners (`vitest`, `npx vitest` without `run`, `jest --watch`, `pytest-watch`, `ptw`, file-watcher wrappers around `go test`) spawn workers that outlive the Bash tool's timeout — they pile up across the chained `ship` → `review` → `frontend` → `review` phases and freeze the host. Use `vitest run`, `jest` (default non-watch), `pytest`, `go test ./...`. This applies to every subagent the workflow dispatches, not just the main conversation. If you author a new command that invokes tests, copy the non-watch rule into its instructions.

## Rules-library frontmatter contract

`rules-library/*.md` files use `paths:` in their YAML frontmatter. The multi-tool `../install.sh` rewrites `paths:` → Cursor's `globs:` when emitting `.cursor/rules/*.mdc`. Other tools consume `paths:` directly or ignore it. **Do not rename `paths:` to `globs:` in the source rules** — the rewrite is one-way (paths → globs), and renaming the source breaks every non-Cursor tool. Rules without a `paths:` key load unconditionally; reserve those for genuinely cross-cutting concerns (`secrets-management.md`, `git-conventions.md`).

## Verifying changes locally

There are no tests. Verify by running the installer and inspecting the result:

```bash
# Claude Code: this plugin only
bash install.sh
ls ~/.claude/skills/agentic-engineering/ ~/.claude/agents/ ~/.claude/commands/

# Other coding agent (e.g. Cursor) via the parent multi-tool installer
cd /tmp/scratch && bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
ls .cursor/rules/ AGENTS.md
```

The per-plugin `install.sh` is idempotent — re-run after every edit to a skill, command, or agent file. Restart Claude Code to pick up changes.

## graphify

This project can carry a graphify knowledge graph at `graphify-out/`. It is **build output, gitignored and local-only** — a fresh clone has none. Run `graphify .` to generate it; the rules below apply only when the directory exists.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
