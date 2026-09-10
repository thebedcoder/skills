# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Read the parent `../CLAUDE.md` first — it covers monorepo conventions (plugin layout, wrapper/real-command split, two-installer system, commit conventions). This file only adds jtbd-specific knowledge.

**This plugin is marketplace-only for Claude Code.** It ships no `install.sh`; there is no hand-copy path into `~/.claude`. Its agents resolve their references through `${CLAUDE_PLUGIN_ROOT}`, and a hand copy leaves every one of those paths pointing at nothing. The top-level `../install.sh` still serves the non-Claude tools from `adapters/AGENTS.md.template`.

## What jtbd is

A Claude Code plugin that runs a Jobs-to-Be-Done pipeline as five chainable modes (MODE 0–4), each dispatching one or more specialist agents. Output is markdown — research reports, persona cards, competitive matrices, landing-page copy, and ad scripts — exported to the user's working directory.

The pipeline:

```
MODE 0  Synthetic research      → 1×   jtbd:jtbd-researcher   (web search, parallel with main thread)
MODE 1  Real-data discovery     → N×   jtbd:jtbd-analyst      (1 per qualitative source, parallel)
MODE 2  Persona definition      → main thread only
MODE 2B Competitor analysis     → 4×   jtbd:jtbd-scout        (1 per tier: direct/adjacent/workarounds/do-nothing)
MODE 3  Landing page copy       → 7×   jtbd:jtbd-copywriter   (1 per section: hero/problem/value/social/how/faq/cta)
MODE 4  Ad scripts              → 1–4× jtbd:jtbd-scriptwriter (1 per platform: tiktok/reel/shorts/threads)
```

The agent counts above are load-bearing — the parallel-dispatch design is the reason mode runtimes stay flat as scope grows. Don't change a mode to call its agent serially without understanding why.

**Dispatch names are plugin-namespaced.** A bare `jtbd-scout` does not resolve under a plugin install, and the failure is silent: no error, no subagent, the main model writes the report inline and it looks exactly like a real one. Every dispatch site in `skills/jtbd/commands/mode-*.md` must spell the `jtbd:` prefix.

## Surface area: one slash command

Unlike `agentic-engineering` (many slash commands), jtbd exposes exactly **one** user-facing command: `/jtbd`. The 6 mode files (`mode-0-research.md` … `mode-4-ad-scripts.md`) are **internal routing targets**, not standalone commands — `SKILL.md` reads `$ARGUMENTS`, picks a mode, and follows that file's body. Don't add `commands/mode-*.md` wrappers at the plugin root.

`commands/jtbd.md` is the standard thin wrapper; the routing logic lives in `skills/jtbd/SKILL.md`.

## Cross-mode invariants (don't break these)

These behaviors are encoded across multiple mode files. Changing one without updating the others creates user-visible inconsistency.

- **Checkpoint after every mode.** Every mode ends with the `━━━ CHECKPOINT ━━━` block, an export prompt, and a "Continue to MODE [N+1]?" question. Never auto-chain modes. Format is defined in `skills/jtbd/SKILL.md` and must match.
- **Export filename:** `jtbd-[product-slug]-mode[N]-[YYYY-MM-DD].md`, slug = lowercase + hyphens. Defined in `SKILL.md → Export Protocol`. If you add a mode, follow this format.
- **Required-inputs check.** Each mode validates its inputs before spawning agents (e.g. MODE 2B refuses to run without `focus job + primary persona`). Keep the "Required Inputs" section in every mode file.
- **JTBD lens, always.** The Four Forces (Push/Pull/Habit/Anxiety) and three job layers (Functional/Emotional/Social) are the analytical frame for every agent. Every persona, copy section, and ad script must trace back to one or more forces. If you add a reference file and it doesn't reference the forces, it's drifting.

## Agent contract: load one reference, write one artifact

Each specialist agent has the same shape:

1. `agents/<name>.md` — short system prompt (under 30 lines) that defines role, lists the reference table, and dictates output format. **A flat file, never a directory.** `agents/<name>/AGENT.md` registers as `jtbd:<name>:<name>` under a plugin install, and every `.md` beside it becomes its own phantom agent type — 24 of them, in the Agent tool description of every turn of every session.
2. `references/<name>/*.md` — one file per assignment variant (per section, per platform, per tier, per source type). The agent loads **only the one** for its assignment. These live at the plugin root, *outside* `agents/`, and agents address them absolutely: `${CLAUDE_PLUGIN_ROOT}/references/<name>/<variant>.md`. A relative `references/x.md` resolves against the user's project, not the plugin, and silently finds nothing.
3. **`tools:` is intentionally minimal** — copywriter/scriptwriter/analyst have `tools: Read`; researcher and scout have `Read, WebSearch, WebFetch`. Every agent needs `Read`, because every agent is told to load a reference file first. Don't widen beyond that without a reason; these are sandboxed by design.
4. **Output format is rigid** — every agent emits a `━━━ [SECTION] ━━━` header followed by the artifact. No explanation, no preamble. The main thread relies on this for assembly.

When adding a new variant (e.g. a new landing-page section, a new ad platform, a new competitor tier), the pattern is:
- Add `references/<agent>/<variant>.md` with the variant's rules, anti-patterns, and templates.
- Add a row to the agent's reference table in `agents/<agent>.md`, spelled `${CLAUDE_PLUGIN_ROOT}/references/<agent>/<variant>.md`.
- Update the spawning mode file to dispatch one more parallel agent for the new variant.
- Mirror the change in `adapters/AGENTS.md.template` (for non-Claude tools).

## SKILL.md has frontmatter that matters

`skills/jtbd/SKILL.md` declares:
- `disable-model-invocation: true` — the skill only fires on `/jtbd`, never on heuristic match. Don't remove this; jtbd is heavyweight and should not auto-trigger.
- `effort: high` — signals to Claude Code that this skill expects long-running, multi-agent work.
- `allowed-tools` — narrowly scoped (`Bash(date *)`, `Bash(ls jtbd-*.md)`, etc.) for the inline `!` shell expansions at the top of the file. Adding a tool here widens the skill's permissions globally; only add what's used by an inline expansion.
- `hooks: PostToolUse` — appends usage to `~/.claude/jtbd-usage.log`. Best-effort; failure is swallowed.

`user-invocable: false` must never appear here. jtbd's only command (`/jtbd`) shares its exact name with the skill (`name: jtbd`), and Claude Code resolves same-name skill/command collisions in favor of the skill — hiding the skill would shadow the command itself, breaking `/jtbd` entirely. The plugin also ships no installer to patch the field in post-copy, and the claude.ai packager rejects it outright. There is nowhere for it to live.

## jtbd.skill is a build artifact

The `jtbd.skill` file at the plugin root is a zip for the claude.ai skill packager. Don't edit it directly; rebuild it from the directory tree when source changes. The packager rejects `user-invocable: false`, which is why the source SKILL.md doesn't include it.

## Authoring register

Mode files and agent prompts are written in the **terse caveman register** documented in `agentic-engineering/skills/agentic-engineering/SKILL.md` — drop articles, prefer fragments, no hedging. This applies to all content under `skills/`, `agents/`, and `commands/`. The README and this CLAUDE.md are in normal prose.

Anti-patterns to avoid when editing agent prompts and references:
- Long expository preamble before the rules.
- Generic copywriting advice that doesn't map to a JTBD force.
- "Examples might include…" — replace with concrete templates.
- Output formats that lack the `━━━ [SECTION] ━━━` header convention.

## Testing changes locally

There is no test suite, and **there is no installer to run** — never copy this plugin into your real `~/.claude`. Two things to check.

**Load the plugin from the working tree** and confirm the agents register under the names the modes dispatch:

```bash
cd "$(mktemp -d)" && git init -q
claude -p --model haiku --plugin-dir "$REPO/jtbd" \
  "List the exact names of every agent type available to the Agent tool, one per line." </dev/null
```

Expect exactly five `jtbd:jtbd-*` entries and nothing else. A `jtbd:jtbd-scout:jtbd-scout`, or any `:references:` entry, means the flat-agent rule was broken.

**Exercise the non-Claude path** through the parent multi-tool installer, never against your real home:

```bash
SANDBOX="$(mktemp -d)"
( cd "$SANDBOX" && HOME="$SANDBOX" bash "$REPO/install.sh" --tool=cursor --skill=jtbd )
ls "$SANDBOX/AGENTS.md"
```

`--tool=claude-code` prints the marketplace instructions and writes nothing — that is correct, not a failure. Then sanity-check that:
- `/jtbd` actually invokes (not blocked with a "can only be invoked by Claude" error).
- The `<!-- jtbd:start v1 -->` … `<!-- jtbd:end -->` markers in any tool's AGENTS.md are exactly one matched pair (idempotency check).

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
