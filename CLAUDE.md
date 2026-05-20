# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A monorepo of Claude Code plugins published under the **thebedcoder** marketplace. There is no build system, no tests, no lint — the artifacts are markdown (SKILL.md, AGENT.md, command files) and shell (installers). "Shipping" means committing markdown and updating an installer.

Three plugins live here:

| Plugin | Role | Marketplace |
|---|---|---|
| `agentic-engineering/` | Full SDLC workflow — named specialist agents, 5-agent parallel review, end-user docs | listed in `.claude-plugin/marketplace.json` |
| `jtbd/` | Jobs-to-Be-Done megaskill (MODE 0–4) — research → personas → competitors → landing copy → ad scripts | listed in `.claude-plugin/marketplace.json` |
| `premortem-skill/` | `/premortem` command + investigator agent | **not yet** in the marketplace |

Distribution targets two universes:
- **Claude Code** — via the plugin manifest in `.claude-plugin/` (per-plugin `plugin.json` + top-level `marketplace.json`).
- **Every other coding agent** (Cursor, Codex, Copilot, Cline, Windsurf, Aider, Gemini CLI, Zed, OpenHands, generic AGENTS.md) — via the top-level `install.sh` which writes a portable rules blob from `adapters/AGENTS.md.template`.

## Per-plugin layout (load-bearing)

Every plugin follows the same shape:

```
<plugin>/
  .claude-plugin/plugin.json         ← Claude Code plugin manifest
  README.md                          ← user-facing docs
  install.sh                         ← Claude-Code-only installer (copies to ~/.claude/…)
  commands/<name>.md                 ← THIN WRAPPER slash commands (1–2 lines)
  skills/<plugin>/SKILL.md           ← skill entrypoint (frontmatter + routing)
  skills/<plugin>/commands/<name>.md ← REAL command logic
  agents/<agent>/AGENT.md            ← agent system prompt
  agents/<agent>/languages/          ← optional per-language guides
  agents/<agent>/references/         ← optional per-topic deep dives
  adapters/AGENTS.md.template        ← portable rules for non-Claude tools
  rules-library/                     ← (agentic-engineering only) per-stack conventions
```

**The wrapper/real-command split is the most common gotcha.** `commands/<name>.md` at the plugin root is a 4-line shim that says *"Read `commands/<name>.md` from the agentic-engineering skill, then follow those instructions."* The actual command body lives at `skills/<plugin>/commands/<name>.md`. When editing command behavior, edit the real one — the wrapper rarely changes. The split lets the same command be invoked as either a top-level slash command or through the `Skill` tool.

`.skill` files at the root of each plugin (`agentic-engineering.skill`, `jtbd.skill`) are **zip archives** built for the claude.ai skill packager. Treat them as build artifacts, not source — rebuild them from the directory tree if needed; never edit them directly.

## Two installers — know which one to touch

**Top-level `install.sh`** (universal, multi-tool):
- Entry point for the curl-pipe-bash flow: `curl … | bash -s -- --tool=cursor --skill=agentic-engineering`.
- Resolves source from local checkout if running from inside the repo; else clones to `$HOME/.local/share/bedcode-skills`.
- For `--tool=claude-code`, delegates to the per-plugin `install.sh`.
- For every other tool, calls `install_agents_md_style()` which writes `adapters/AGENTS.md.template` into the tool-appropriate file. **Idempotency depends on the `<!-- <plugin>:start v1 -->` … `<!-- <plugin>:end -->` HTML comment markers** inside the template — these let re-installs replace the block in place. Do not rename, remove, or duplicate those markers.
- For `--tool=cursor`, additionally copies `rules-library/*.md` → `.cursor/rules/*.mdc`, rewriting the `paths:` / `pattern:` frontmatter key → Cursor's `globs:`. Cursor expects MDC.
- `--tool=auto` detects installed tools by probing for `~/.claude`, `~/.codex`, `~/.cursor`, `~/.config/github-copilot`, VS Code extensions, etc., and installs for each.

**Per-plugin `install.sh`** (Claude-Code-only):
- Copies `skills/<plugin>/` → `~/.claude/skills/`, named agents (with optional `languages/` + `references/` subdirs) → `~/.claude/agents/`, and the **user-facing subset** of `commands/*.md` → `~/.claude/commands/`. Some commands are internal (e.g. `implement`, `review`, `frontend` are called by `ship`, not exposed) — see the `USER_COMMANDS` array in `agentic-engineering/install.sh`.
- **Post-copy patch**: rewrites `SKILL.md` frontmatter to add `user-invocable: false`. That field is valid in the CLI but rejected by the claude.ai packager, so it lives only in the installed copy. If you see `user-invocable: false` in a source SKILL.md, it leaked — remove it.

## When you change something

| Change | Touch |
|---|---|
| Command behavior | `skills/<plugin>/commands/<name>.md` (real), not `commands/<name>.md` (wrapper) |
| Add a new slash command | (1) `commands/<name>.md` wrapper, (2) `skills/<plugin>/commands/<name>.md` body, (3) `USER_COMMANDS` array in per-plugin `install.sh` if user-facing, (4) the skill's `commands/` table in `SKILL.md` |
| Add a new agent | new dir under `agents/<name>/AGENT.md` + `cp` line in per-plugin `install.sh` |
| Add a new plugin | (1) `<plugin>/.claude-plugin/plugin.json`, (2) entry in top-level `.claude-plugin/marketplace.json`, (3) per-plugin `install.sh`, (4) `adapters/AGENTS.md.template` with `<plugin>:start v1` / `<plugin>:end` markers, (5) entry in top-level `install.sh` `--skill=` help text |
| Edit portable (non-Claude) behavior | `adapters/AGENTS.md.template` — preserve the marker comments |
| Add per-language convention rule | `agentic-engineering/rules-library/<stack>.md` with frontmatter `paths:` (becomes `globs:` for Cursor) |

## Commit conventions

Conventional Commits with a scope: `feat(agentic-engineering):`, `chore(jtbd):`, `fix(premortem-skill):`, etc. Check `git log` before composing a commit message — the recent history is consistent.

## Testing changes locally

There is no test suite. Verify changes by running an installer against a temp dir:

```bash
# Claude Code path
bash agentic-engineering/install.sh

# Multi-tool path — dry-run-ish: write into a scratch directory
cd /tmp/scratch && bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
```

Then inspect `~/.claude/skills/`, `~/.claude/agents/`, `~/.claude/commands/`, or (for non-Claude tools) the written AGENTS.md / `.cursor/rules/` / etc.

## Agentic-engineering authoring style

When editing content inside `agentic-engineering/` (agent prompts, command bodies, SKILL.md), follow the **caveman rules** documented in `agentic-engineering/skills/agentic-engineering/SKILL.md` — drop articles and hedging, prefer fragments, keep file paths and technical terms verbatim. These rules apply to internal agent output but the skill files themselves are written in the same terse register, so new content should match.