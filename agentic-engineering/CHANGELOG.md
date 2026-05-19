# Changelog

All notable changes to the `agentic-engineering` plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Every parallel-review agent (`ae-red`, `ae-req`, `ae-test`, `ae-doc`, `ae-sec`) now names its 4 peers and downstream `ae-scribe` directly in its AGENT.md. `ae-ux` clarifies that it runs **outside** the 5-parallel batch (in the frontend review phase). `ae-scribe` states that it runs as the **final step before commit** and positively distinguishes itself from `ae-doc`. The workflow handoffs that were previously only legible from the README's ASCII diagram are now discoverable from each agent file.

### Added

- `CLAUDE.md` at the plugin root — points to the parent monorepo `CLAUDE.md` and documents plugin-specific authoring rules: agent file shapes (single file vs. directory), the `USER_COMMANDS` gate in `install.sh` that hides internal `implement`/`review`/`frontend` commands, the post-install `user-invocable: false` patch contract, the scope of the caveman authoring rules, the non-watch test-execution hard rule, and the `paths:` → Cursor `globs:` one-way rewrite contract for `rules-library/`.
- `CHANGELOG.md` (this file).

## [1.0.0] — 2026-05-19

First release as a Claude Code plugin, distributed via the `thebedcoder` marketplace and the multi-tool installer.

### Added

- **Claude Code plugin manifest** (`.claude-plugin/plugin.json`) registering `agentic-engineering` v1.0.0 under the `thebedcoder` marketplace.
- **Top-level slash command wrappers** under `commands/` — thin 1–2 line shims so each command (`/bootstrap`, `/init`, `/feature`, `/design`, `/ship`, `/ship-all`, `/plan-all`, `/fix`, `/note`, `/doc`, `/doc-all`, `/status`, `/analyze`) works after `claude plugin install`. The real command bodies live at `skills/agentic-engineering/commands/<name>.md` and load on demand.
- **`adapters/AGENTS.md.template`** — portable rules blob installed by the top-level `install.sh` into Cursor, Codex, Copilot, Gemini CLI, Cline, Windsurf, Aider, Zed, OpenHands, and generic `AGENTS.md` setups. Encodes the workflow phases, agent roster, and caveman rules so non-Claude tools can follow the same SDLC.
- **Multi-tool shell installer** (`--tool=<name>`) at the repo root supporting `claude-code`, `cursor`, `codex`, `copilot`, `copilot-cli`, `cline`, `windsurf`, `aider`, `gemini`, `zed`, `openhands`, `agents-md`, and `auto` (detects installed tools and runs each). Same canonical workflow content gets written to each tool's native location. For Cursor, `rules-library/*.md` is copied as `.cursor/rules/*.mdc` with the frontmatter `paths:` / `pattern:` key rewritten to `globs:`. Re-runs are idempotent — content is wrapped in `<!-- agentic-engineering:start v1 -->` … `<!-- agentic-engineering:end v1 -->` markers and replaced in place.
- **Per-plugin `install.sh`** — copies the skill, named agents (with `references/` and `languages/` subdirs where present), and the **user-facing subset** of commands into `~/.claude/`. The `USER_COMMANDS` array gates `implement`/`review`/`frontend` as internal-only — they're invoked by `ship`, not exposed in the slash palette.
- **Post-install patch** that injects `user-invocable: false` into the installed `SKILL.md` frontmatter — valid in the Claude Code CLI, rejected by the claude.ai skill packager, so it lives only in the installed copy.
- **Env-var overrides** for every target path (`CURSOR_RULES_DIR`, `CLINERULES`, `WINDSURFRULES`, `AIDER_CONVENTIONS`, `GEMINI_MD`, etc.) and `--scope=user` for tools with global config (`cursor`, `codex`, `gemini`).
- **`agentic-engineering.skill`** archive — pre-built zip for the claude.ai skill packager.

### Changed

- Dropped the `ae-` prefix from all 16 user-facing command wrappers — plugin namespacing (`/agentic-engineering:ship`) makes the manual prefix redundant.
- SKILL.md trigger keywords switched from `"ae:init"` to `"/init"` form.
- Agent-roster table split into **subagents** (the 7 agents with AGENT.md files — `ae-red`, `ae-req`, `ae-test`, `ae-doc`, `ae-sec`, `ae-ux`, `ae-scribe`) vs **personas** (`ARCH`, `PROD`, `FIXER`, `GIT` — role-played inline by the main conversation, no AGENT.md). Roster previously implied all 11 were dispatchable.
- README rewritten so plugin install becomes Option A, shell installer becomes Option B (fallback), and Option D documents the full `--tool` matrix.
- Installer made bash 3.2-compatible (replaced `mapfile` with a `read` loop).

### Removed

- Standalone `/ae-update` command — `/plugin update agentic-engineering` handles updates natively now.

### Fixed

- `copy_rules_to_cursor` was including `README.md` from `rules-library/` as a Cursor rule (`README.mdc`). Filtered out — it's documentation, not a rule.
- `install.sh --help` now works under the `curl … | bash -s -- --help` invocation form (previously the no-arg short-circuit swallowed `--help`).

## [0.3.0] — 2026-04-24

### Added

- **`./app-docs/` reframed as end-user product documentation** — landing-page "Docs" section style: feature overviews, how-tos, tutorials for the people who actually use the app. Distinct from `./docs/` (engineering reference). SCRIBE updates app-docs as the final step of every `/ship` and `/fix` so published docs always match what the app can actually do.
- **Test Execution Rules** section in `SKILL.md` banning watch-mode test runners across every command and every dispatched subagent. Covers vitest (`vitest run`, never bare `vitest`/`npx vitest`), jest (default non-watch, never `--watch`/`--watchAll`), pytest (`pytest`, never `pytest-watch`/`ptw`), go (`go test ./...`, no watcher wrapper). Watch workers outlive the Bash tool timeout and pile up across chained ship phases → host freeze.

### Changed

- `ae-scribe` template restructured: **What you can do** → **How to use it** (numbered, real UI labels) → **Tips** → **FAQ** (only if real recurring questions) → **Related**.
- SCRIBE returns `"no user-facing change, app-docs unchanged"` for internal-only work instead of force-generating MDX.
- Phase 5 of `/ship` and Phase 4 of `/fix` reworded as the final step before commit — keeps user-facing docs in sync with what just shipped.
- Caveman compression applied across `SKILL.md`, all command files, and all agent files — drop articles, hedging, and filler; fragments OK; technical terms and file paths kept verbatim.

## [0.2.0] — 2026-04-17

### Changed

- **Context footprint reduced ~15% across all skill files.** Typical `/ship` invocation: ~15KB → ~11KB context load (-27%).
- `SKILL.md` trimmed — removed Docs Structure and Changelog Rules sections (each command that needs them already has the format inline).
- Caveman compression applied to all Gotchas sections across the 7 command files.
- `ship.md` SCRIBE MDX template, phase intros, PR description template, and "What still requires your input" section compressed.
- `init.md` CONSTITUTION template (example articles dropped) and rules-library selection dialog (35 lines → 4 lines) compressed.
- `feature.md` PRD template and data-model section compressed.
- `design.md` duplicate Figma/Pencil progress blocks consolidated.
- `doc-all.md` PROD review block, `doc.md` improvements template, `bootstrap.md` layer-selection format block all compressed.
- SKILL.md agent-roster Bias column entries trimmed.

## [0.1.0]

First version of the agentic-engineering skill — installed by manual clone before the Claude Code plugin system existed.

### Added

- **11-agent SDLC workflow** with named specialist agents (`ARCH`, `PROD`, `UX`, `RED`, `FIXER`, `REQ`, `TEST`, `DOC`, `SEC`, `SCRIBE`, `GIT`), each with a distinct role and bias.
- **5-agent parallel review** dispatched after every story — `RED` (bugs), `REQ` (requirements + constitution), `TEST` (coverage), `DOC` (convention drift), `SEC` (security) run as simultaneous Haiku subagents; `UX` runs separately after the frontend pass.
- **Phase-gated SDLC commands** — `/bootstrap`, `/init`, `/feature`, `/design`, `/implement`, `/review`, `/frontend`, `/ship`, `/ship-all`, `/plan-all`, `/fix`, `/note`, `/doc`, `/doc-all`, `/status`, `/analyze` — each with human checkpoints at every phase gate.
- **Constitution-driven development** — every project gets a `CONSTITUTION.md` of non-negotiable principles checked by REQ at every review; violations are blockers.
- **`rules-library/`** — 16 path-scoped rule templates (`react-typescript`, `nextjs-app-router`, `python-fastapi`, `go`, `rust`, `flutter`, `swiftui`, `ios-native`, `android-native`, `react-native`, `python-django`, `node-express`, plus cross-cutting `testing-conventions`, `git-conventions`, `api-design`, `secrets-management`) that auto-load on matching file patterns.
- **Review-agent knowledge bases** — `ae-red`/`ae-test`/`ae-sec` ship with per-topic `references/` and per-language `languages/` guides that load on demand based on what's in the diff.
- **`ae-ux` fidelity reviewer** with a checklist across 6 dimensions (interaction states, forms/validation, visual consistency, copy/feedback, responsive, accessibility) that runs after the frontend implementation.
- **`ae-scribe` end-user docs author** — writes MDX for `./app-docs/` (then-conflated with engineering docs; reframed in 0.3.0).
- **Parallel-story markers** `[P]` — stories tagged `[P]` have no dependencies and can be shipped in separate Claude Code sessions concurrently.
- **Mandatory `/compact` between stories** in `/ship-all` and `/plan-all` to keep context lean across long sessions.

[Unreleased]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v1.0.0...HEAD
[1.0.0]: https://github.com/thebedcoder/skills/releases/tag/agentic-engineering-v1.0.0
