# Changelog

All notable changes to the `jtbd` plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2026-09-10

Fixes a silent failure: under a plugin install, none of the five specialist
agents were reachable. Every mode still ran and still emitted a normal-looking
report — written by the main conversation, not by the agents.

### Changed — BREAKING

- **Agent files are flat.** `agents/<name>/AGENT.md` → `agents/<name>.md`.
  Verified on Claude Code 2.1.267 with `--plugin-dir`: the directory form
  registers as `jtbd:<name>:<name>`, so every dispatch by `<name>` resolved to
  nothing, and **every `.md` beside it registered as its own agent type** — 24
  phantom subagents named after reference docs, sitting in the Agent tool
  description of every turn of every session where jtbd was enabled.
- **Reference guides moved out of `agents/`** to `references/<agent>/<file>.md`,
  and agents now address them absolutely as
  `${CLAUDE_PLUGIN_ROOT}/references/<agent>/<file>.md`. A relative
  `references/x.md` resolves against the *user's project*, not the plugin.
- **Dispatch names are plugin-namespaced.** All five sites in
  `skills/jtbd/commands/mode-*.md` now spell `jtbd:jtbd-researcher`,
  `jtbd:jtbd-analyst`, `jtbd:jtbd-scout`, `jtbd:jtbd-copywriter`,
  `jtbd:jtbd-scriptwriter`. A bare name does not resolve under a plugin install.
- **`jtbd/install.sh` is removed. The plugin is marketplace-only for Claude
  Code.** Both changes above depend on `${CLAUDE_PLUGIN_ROOT}` and on the `jtbd:`
  namespace, neither of which exists in a hand copy under `~/.claude`.
  `install.sh --tool=claude-code --skill=jtbd` now prints the marketplace
  instructions and writes nothing; the non-Claude tools are unaffected and still
  install from `adapters/AGENTS.md.template`.

### Fixed

- **`jtbd-researcher` and `jtbd-scout` could not read their own references.** Both
  declared `tools: WebSearch, WebFetch` — no `Read` — while their prompts open
  with "Load the relevant reference". Now `Read, WebSearch, WebFetch`.
- **Reference files pointed at a SKILL.md that does not exist.** All 17 citations
  of the Four Forces used `../../../skills/jtbd/SKILL.md#forces`, correct only
  from the old nesting depth. Now `${CLAUDE_PLUGIN_ROOT}/skills/jtbd/SKILL.md#forces`.

### Added

- `SKILL.md`'s Agent Roster gained a **Dispatch as** column carrying the
  namespaced name, plus the reason the bare form fails silently.
- `.claude/hooks/check-integrity.sh` check G now covers `jtbd/agents/`, so the
  nested layout cannot come back unnoticed.

## [1.0.0] — 2026-05-19

First release as a Claude Code plugin, distributed via the `thebedcoder` marketplace and the multi-tool installer.

### Added

- **Claude Code plugin manifest** (`.claude-plugin/plugin.json`) registering `jtbd` v1.0.0 under the `thebedcoder` marketplace.
- **Top-level `/jtbd` slash command** (`commands/jtbd.md`) — thin wrapper that routes into the skill so the command works after `claude plugin install`.
- **`adapters/AGENTS.md.template`** — portable rules blob installed by the top-level `install.sh` into Cursor, Codex, Copilot, Gemini CLI, Cline, Windsurf, Aider, Zed, OpenHands, and generic `AGENTS.md` setups. Encodes the Four Forces, the mode router, and per-mode rules so non-Claude tools can run the pipeline.
- **Five-mode JTBD pipeline**, each with a dedicated command file under `skills/jtbd/commands/`:
  - MODE 0 — synthetic research (1× `jtbd-researcher`, web search)
  - MODE 1 — real-data discovery (N× `jtbd-analyst`, parallel by source)
  - MODE 2 — persona definition (main thread)
  - MODE 2B — competitor analysis (4× `jtbd-scout`, one per tier: direct / adjacent / workarounds / do-nothing)
  - MODE 3 — landing page copy (7× `jtbd-copywriter`, one per section: hero / problem / value / social / how-it-works / faq / final-cta)
  - MODE 4 — ad scripts (1–4× `jtbd-scriptwriter`, one per platform: tiktok / instagram-reel / youtube-shorts / threads)
- **Five specialist agents** under `agents/`, each with its own `references/` subtree per assignment variant:
  - `jtbd-researcher` — market intelligence (4 references: competitor research, customer voice, pain points, pricing signals)
  - `jtbd-analyst` — qualitative source synthesis (3 references: interview, review, support)
  - `jtbd-scout` — competitor tier deep-dive (4 references: direct, adjacent, workarounds, do-nothing)
  - `jtbd-copywriter` — landing page section authoring (7 references, one per section)
  - `jtbd-scriptwriter` — platform-native ad scripts (6 references: hooks, angles, and per-platform formats)
- **Checkpoint protocol** — every mode ends with a `━━━ CHECKPOINT ━━━` block, an export prompt (`jtbd-[slug]-mode[N]-[date].md`), and an explicit "Continue to MODE [N+1]?" question. Modes never auto-chain.
- **Skill frontmatter guardrails** — `disable-model-invocation: true`, `effort: high`, narrow `allowed-tools` scope, and a `PostToolUse` usage-log hook. Skill only fires on `/jtbd`.
- **Per-plugin `install.sh`** — copies skill, agents (with `references/` subtrees), and `/jtbd` into `~/.claude/`, then post-patches `user-invocable: false` into the installed `SKILL.md` (CLI accepts it; the claude.ai packager doesn't, so it stays out of source).
- **`jtbd.skill` archive** — pre-built zip for the claude.ai skill packager.

### Changed

- Directory renamed from `jobs-to-be-done-megaskill/` → `jtbd/` to match the plugin short name.
- `write_or_replace` marker pairs in `adapters/AGENTS.md.template` parameterized by `$SKILL` so `jtbd` and `agentic-engineering` blocks coexist idempotently in the same `AGENTS.md`.
- Top-level `install.sh` help text, the Copilot CLI install message, and the final post-install hint now reflect the active `--skill`.

[1.0.0]: https://github.com/thebedcoder/skills/releases/tag/jtbd-v1.0.0
