# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Read the parent `../CLAUDE.md` first — it covers monorepo conventions (plugin layout, wrapper/real-command split, two-installer system, commit conventions). This file only adds jtbd-specific knowledge.

## What jtbd is

A Claude Code plugin that runs a Jobs-to-Be-Done pipeline as five chainable modes (MODE 0–4), each dispatching one or more specialist agents. Output is markdown — research reports, persona cards, competitive matrices, landing-page copy, and ad scripts — exported to the user's working directory.

The pipeline:

```
MODE 0  Synthetic research      → 1× jtbd-researcher (web search, parallel with main thread)
MODE 1  Real-data discovery     → N× jtbd-analyst    (1 per qualitative source, parallel)
MODE 2  Persona definition      → main thread only
MODE 2B Competitor analysis     → 4× jtbd-scout      (1 per tier: direct/adjacent/workarounds/do-nothing)
MODE 3  Landing page copy       → 7× jtbd-copywriter (1 per section: hero/problem/value/social/how/faq/cta)
MODE 4  Ad scripts              → 1–4× jtbd-scriptwriter (1 per platform: tiktok/reel/shorts/threads)
```

The agent counts above are load-bearing — the parallel-dispatch design is the reason mode runtimes stay flat as scope grows. Don't change a mode to call its agent serially without understanding why.

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

1. `AGENT.md` — short system prompt (under 30 lines) that defines role, lists the reference table, and dictates output format.
2. `references/*.md` — one file per assignment variant (per section, per platform, per tier, per source type). The agent loads **only the one** for its assignment.
3. **`tools:` is intentionally minimal** — copywriter/scriptwriter/analyst/scout have `tools: Read` only. researcher has `WebSearch, WebFetch, Write, Edit, Read`. Don't widen the toolset without a reason; these are sandboxed by design.
4. **Output format is rigid** — every agent emits a `━━━ [SECTION] ━━━` header followed by the artifact. No explanation, no preamble. The main thread relies on this for assembly.

When adding a new variant (e.g. a new landing-page section, a new ad platform, a new competitor tier), the pattern is:
- Add `references/<variant>.md` with the variant's rules, anti-patterns, and templates.
- Add a row to the agent's reference table in `AGENT.md`.
- Update the spawning mode file to dispatch one more parallel agent for the new variant.
- Mirror the change in `adapters/AGENTS.md.template` (for non-Claude tools).

## SKILL.md has frontmatter that matters

`skills/jtbd/SKILL.md` declares:
- `disable-model-invocation: true` — the skill only fires on `/jtbd`, never on heuristic match. Don't remove this; jtbd is heavyweight and should not auto-trigger.
- `effort: high` — signals to Claude Code that this skill expects long-running, multi-agent work.
- `allowed-tools` — narrowly scoped (`Bash(date *)`, `Bash(ls jtbd-*.md)`, etc.) for the inline `!` shell expansions at the top of the file. Adding a tool here widens the skill's permissions globally; only add what's used by an inline expansion.
- `hooks: PostToolUse` — appends usage to `~/.claude/jtbd-usage.log`. Best-effort; failure is swallowed.

The `user-invocable: false` field is **added post-install** by `install.sh` (it's valid in the Claude Code CLI but rejected by the claude.ai packager, so it cannot live in the source). If you ever see `user-invocable:` in `skills/jtbd/SKILL.md` in this repo, it leaked from a manual install — remove it before committing.

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

There is no test suite. Verify by running the installer against your live `~/.claude` and then exercising `/jtbd` end-to-end, or by running the multi-tool installer against a scratch directory:

```bash
# Claude Code path
bash install.sh

# Multi-tool path (writes to current working dir's tool config)
cd /tmp/scratch && bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --skill=jtbd --tool=cursor
```

Then sanity-check that:
- `~/.claude/skills/jtbd/SKILL.md` has `user-invocable: false` injected.
- All 5 agent directories landed in `~/.claude/agents/` with their `references/` subtrees intact.
- The `<!-- jtbd:start v1 -->` … `<!-- jtbd:end -->` markers in any tool's AGENTS.md are exactly one matched pair (idempotency check).

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
