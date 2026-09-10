# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope of this file

The parent `../CLAUDE.md` covers the monorepo (per-plugin layout, the wrapper/real-command split, the top-level multi-tool installer, the `<!-- agentic-engineering:start v1 -->` marker contract, commit conventions). **Read it first** — most authoring rules live there. This file only adds what's specific to the `agentic-engineering/` plugin's internal shape.

**This plugin is marketplace-only for Claude Code.** It ships no `install.sh`; there is no hand-copy path into `~/.claude`. Every path in shipped content resolves through `${CLAUDE_PLUGIN_ROOT}`, and a hand copy breaks all of them. The top-level `../install.sh` still serves the non-Claude tools from `adapters/AGENTS.md.template`.

## Architecture at a glance

The plugin is the entire `/ship`, `/feature`, `/review`, `/fix` SDLC workflow — a router skill (`skills/agentic-engineering/SKILL.md`) that dispatches into one of 21 command files in `skills/agentic-engineering/commands/`, plus 9 named specialist agents under `agents/` that the commands invoke (often in parallel) as Claude Code subagents. The end-user `README.md` is the workflow-level overview; this file is for authoring inside the plugin.

Three pieces of the architecture are non-obvious and load-bearing:

1. **Router plus policy layer.** `SKILL.md` is *not* a thin router, despite reading like one. It holds the command → file table and agent roster, and also the policy every command inherits: Project Mode, Memory Docs, Core Principles, the `[ASK:]` and `[AUTO:]` taxonomies, Human-Facing Output Rules, Progress Tracking, Context Management, the caveman rules and the test-watch ban. Command *bodies* live in `skills/agentic-engineering/commands/<name>.md` and load only when that command fires; blocks repeated across many commands live once in `skills/agentic-engineering/shared/preamble.md` (§A parse `--auto`, §B focus write, §C auto summary, §D memory inputs). Do not inline command logic into `SKILL.md`, and do not re-paste a preamble block into a command.
2. **7-agent parallel review.** `commands/review.md` dispatches `agentic-engineering:ae-red`, `:ae-req`, `:ae-test`, `:ae-doc`, `:ae-sec`, `:ae-edge`, `:ae-lean` as **simultaneous** subagents — single message with multiple `Agent` tool calls. Sequential dispatch defeats the design (cost, latency, context). `ae-red`, `ae-sec`, `ae-edge` and `ae-lean` run on Sonnet — all four do multi-file reasoning with no ability to execute anything, and a cheaper tier fabricates reproductions there. `ae-req`, `ae-test` and `ae-doc` stay on Haiku: checklist and parsing work. **Dispatch names are plugin-namespaced**: a bare `ae-red` does not resolve under a plugin install, and the failure is silent — the main model role-plays the reviewers inline and emits a normal-looking report. `ae-lean` is dropped from the Phase 4 re-review via `/review --frontend-pass` — it already saw the branch in Phase 2. The `ae-ux` agent runs separately after the frontend pass and is **not** in the parallel batch at all.

   Reviewers have **no Bash**. `/review` captures the diff once into `.agentic/review/<STORY-ID>.diff` and passes the path; `tools:` does not honour permission-rule syntax, so `Bash(git diff:*)` would hand an agent a general Bash tool, not a restricted one.
3. **Forked vs. main context.** `/status` and `/analyze` run with `context: fork` so their tool calls don't pollute the main conversation. `/ship`, `/feature`, `/design` run in the main context because they have human checkpoints that need conversation continuity. If you add a new command, this choice is deliberate — pick based on whether it needs human handoff.

## Agent file layout — flat only

**Every agent is a single `agents/<name>.md` file. `agents/` contains nothing else.**

The directory form (`agents/<name>/AGENT.md`) works at project level but is broken under a plugin install, verified against 2.1.267:

- `agents/ae-red/AGENT.md` registers as `agentic-engineering:ae-red:ae-red`, not `:ae-red`.
- **Every `.md` under `agents/*/` registers as its own agent.** 59 reference and language files became dispatchable subagent types, sitting in the Agent tool description of every turn of every session.

So reference material lives outside `agents/`:

```
agents/<name>.md                          the agent
references/<name>/<topic>.md              its topic references
references/<name>/languages/<lang>.md     its language guides
```

Agents reach them by absolute path — `${CLAUDE_PLUGIN_ROOT}/references/ae-red/null-safety.md`. A relative `references/x.md` resolves against the *project*, not the plugin, and silently finds nothing.

Every agent file **must** declare `name:` in its frontmatter matching the file stem. Claude Code drops a nameless agent silently. `.claude/hooks/check-integrity.sh` check F enforces the name; check G enforces that `agents/` holds nothing but agent files.

## All 21 commands are user-visible

Plugin auto-discovery registers every `.md` in `commands/` — there is no frontmatter key that hides one. `implement`, `review` and `frontend` are *internal by intent* (driven by `ship`, not by hand) but they still appear as `/agentic-engineering:implement`, `:review`, `:frontend`. That is fine: standalone `/agentic-engineering:review` is genuinely useful.

The only way to hide a command is to delete its root `commands/<name>.md` wrapper; the skill router still dispatches from `skills/agentic-engineering/commands/<name>.md`.

**Wrappers carry no logic.** Each is a pointer to `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/<name>.md`. Write the absolute form — a bare `commands/<name>.md` under a plugin install resolves to the wrapper itself. Every wrapper passes `$ARGUMENTS`, even the ones whose command takes none; a wrapper that drops it silently discards `--auto` and every flag.

## `user-invocable` must never appear in SKILL.md

The field is valid in the Claude Code CLI but **rejected by the claude.ai skill packager** when building `agentic-engineering.skill`. The bash installer used to inject it post-copy; that installer is gone, so there is nowhere for it to live. Source stays clean. `.claude/hooks/check-integrity.sh` check C enforces this.

## SKILL.md description is capped

The `description` frontmatter must stay **≤ 1,024 characters** folded (the Agent Skills cap; Claude Code's own listing cap is 1,536 for description plus `when_to_use`). Over the cap the *tail* is silently truncated, so the disambiguation clauses — the "do NOT trigger on" list — are exactly what gets lost. Do not list slash-command names in it: the CLI dispatches slash commands before the model reads any description, and under the marketplace they are `/agentic-engineering:<n>` anyway. Check G in the integrity hook measures it.

## Caveman communication rules (authoring style)

`SKILL.md` enforces caveman rules for **agent-to-agent internal output** — review reports, plans, status lines. The rules: drop articles (a/an/the), drop filler (just/really/basically), drop hedging, keep technical terms and file paths verbatim, fragments are fine. Apply this to:

- Agent prompts and report templates in `agents/*.md`
- Command instructions in `skills/agentic-engineering/commands/*.md`
- Anything the agents read or emit during a session

**Do not** apply caveman style to: human checkpoint messages, code blocks, conventional commit subjects, MDX end-user docs written by `ae-scribe`, or the public `README.md`. Those are user-facing and need normal prose.

## Test execution: non-watch only (hard rule)

Documented in `SKILL.md` under "Test Execution Rules". Watch-mode test runners (`vitest`, `npx vitest` without `run`, `jest --watch`, `pytest-watch`, `ptw`, file-watcher wrappers around `go test`) spawn workers that outlive the Bash tool's timeout — they pile up across the chained `ship` → `review` → `frontend` → `review` phases and freeze the host. Use `vitest run`, `jest` (default non-watch), `pytest`, `go test ./...`. This applies to every subagent the workflow dispatches, not just the main conversation. If you author a new command that invokes tests, copy the non-watch rule into its instructions.

## Rules-library frontmatter contract

`rules-library/*.md` files use `paths:` in their YAML frontmatter. The multi-tool `../install.sh` rewrites `paths:` → Cursor's `globs:` when emitting `.cursor/rules/*.mdc`. Other tools consume `paths:` directly or ignore it. **Do not rename `paths:` to `globs:` in the source rules** — the rewrite is one-way (paths → globs), and renaming the source breaks every non-Cursor tool. Rules without a `paths:` key load unconditionally; reserve those for genuinely cross-cutting concerns (`secrets-management.md`, `git-conventions.md`).

## Verifying changes locally

There are no tests. Two things to run.

**Load the plugin from the working tree** and check that the agents register under the names the commands dispatch:

```bash
cd "$(mktemp -d)" && git init -q
claude -p --model haiku --plugin-dir "$REPO/agentic-engineering" \
  "List the exact names of every agent type available to the Agent tool, one per line." </dev/null
```

Expect exactly nine `agentic-engineering:ae-*` entries and nothing else. A `:ae-red:ae-red` or an `:ae-sec:references:xss` means the flat-agent rule was broken.

**Exercise the non-Claude path** through the parent multi-tool installer, never against your real home:

```bash
SANDBOX="$(mktemp -d)"
( cd "$SANDBOX" && HOME="$SANDBOX" bash "$REPO/install.sh" --tool=cursor --skill=agentic-engineering )
ls "$SANDBOX/.cursor/rules/" "$SANDBOX/AGENTS.md"
```

`--tool=claude-code` prints the marketplace instructions and writes nothing — that is correct, not a failure. Restart Claude Code to pick up changes.

## graphify

This project can carry a graphify knowledge graph at `graphify-out/`. It is **build output, gitignored and local-only** — a fresh clone has none. Run `graphify .` to generate it; the rules below apply only when the directory exists.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
