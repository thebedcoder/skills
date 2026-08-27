# Changelog

All notable changes to the `agentic-engineering` plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] — 2026-08-27

### Added

- **`Contract claims` — a required section in ARCH's implementation plan.** Every behavior a story depends on but does not own — another module's data shape, a syscall's semantics, a library guarantee, a language primitive's depth — must now be listed with `file:line` in the real source, or a probe command *and its pasted output*. Reasoning from the name of a thing is not proof, and an unproven claim is the defect class that ships silently: code built on a wrong belief still runs, still returns a plausible value, and still passes the tests its author wrote from that same belief. `Risks:` is explicitly not the place for these — a risk is what might go wrong later, a claim is what the code is built on now. Plans that cannot prove a claim from source are told to spike it and paste the output.
- **`Failure states` — a required table whenever a story can fail partway.** Any commit, rollback, migration, batch write, or multi-step mutation enumerates failure point x per-resource state x what the outcome reports, *before* the code. The rationale is that these bugs do not arrive one at a time: a reversal path designed in prose and implemented ad hoc produces a cluster of individually-plausible defects, all found at once and late. The section is omitted only by saying so, never by dropping the heading.
- **A pre-review pass — `ae-red` + `ae-sec` dispatched against the plan, not the codebase.** Both read only the story, its acceptance criteria, and the two new sections, and are prompted to attack the plan's model of the world rather than its style. It runs under `--auto` and never pauses; it is skipped entirely when a plan has no Contract claims and no Failure states, since a pure function over owned types has no external model to be wrong about. This is the same pair of reviewers that would find these defects after implementation, moved to where a fix costs an edit instead of a full re-verify cycle.

### Changed

- **The plan-approval checkpoint gains a second `[AUTO: always-ask]` escalation.** Alongside "introduces a new dependency or alters a public interface", an unresolved pre-review finding on a Contract claim now stops `--auto` — proceeding on a disputed claim is precisely how the defect cluster forms. Mirrored in `/ship-all`'s per-story checkpoint, whose display block also now shows the pre-review result.
- PROD's plan review gained two questions: whether every Contract claim is backed by `file:line` or real probe output rather than assertion, and whether the Failure states table is missing a step that can fail. Previously PROD checked the plan against the *story* only — which is why a plan could be complete and wrong at the same time.
- The `Implement` step now requires that a test covering a load-bearing Contract claim exercise the **real** collaborator: a fixture containing only cases where the claim holds proves nothing, so the instruction is to pick the fixture that would expose the claim being backwards.
- Two new Gotchas: *a green suite is not evidence of a correct model* (the suite agrees with the bug when the model is wrong), and *Contract claims are not Risks*.

## [1.3.0] — 2026-08-17

### Added

- **`/improve [description]` — a third weight class between `/fix` and `/feature`.** Covers changes that are neither a bug nor a whole feature: a new keyboard shortcut, support for a new file format, an extra export option, a faster query, a long module split in two. ARCH leads. The plan block requires a `Fits existing pattern:` line citing how whatever already does the same kind of thing does it — the failure mode for additive work is a correct change in the wrong shape, such as a third format handler that ignores how the first two work. It also requires 2–4 `Done when:` conditions, **printed in the plan only and never written to `STORIES.md`, `PRD.md`, or `docs/specs/`**; more than four means the work is a feature and the command routes to `/feature`. Review is a scoped parallel batch — `ae-red` and `ae-test` always, plus one of `ae-sec` / `ae-ux` / `ae-edge` chosen from what the diff touches. `ae-req` is deliberately absent: with nothing persisted, it would have only `CONSTITUTION.md` to check, so `ae-test` carries the `Done when:` verification instead. Test obligation keys off `Change type`: `feat` needs one test per condition including the negative case, `perf` needs a recorded before/after, `refactor` needs a characterization test written *before* the restructuring when nothing covers the touched code. The Phase 1 `Change type` also fixes the commit prefix up front, so additive work lands as `feat(` and keeps its minor-version bump instead of hiding under `refactor(`.
- Bare `/improve` (no arguments) picks an `improvement`-typed item out of `docs/BACKLOG.md`, marks it in-progress, and sets it `done` at cleanup — closing a loop `/note` previously punted to `/ship`.
- New `### Improved` section in `app-docs/CHANGELOG.md`, owned by `/improve` the way `### Fixed` is owned by `/fix`. Written only when the plan declared `Behavior change: user-visible`, which is most `feat`-type improvements and almost no `perf` / `refactor` ones.

### Changed

- `/note`'s closing line routed every captured item to `/ship` regardless of type. It now routes by type: bugs to `/fix`, improvements to `/improve`, ideas to `/ship`.
- **`/fix` and `/improve` now open a harness phase task list**, like `/ship` already did. SKILL.md's "Progress Tracking" rule is that multi-phase chains get a list and single-phase commands don't, but the table enumerated only `/ship`, `/ship-all`, `/plan-all` — so these two five-phase chains fell through a gap rather than being deliberately excluded, and tracked their phases only in `.agentic/focus.md`'s `# PLAN`. Both now do what `/ship` does: open the list, mirror it into PLAN (the harness list dies with the session; PLAN survives it). The table gained both rows plus the criterion itself, so the next command added is measured against phase count rather than against the enumeration. `/improve` opens its list at Step 0c, *after* target resolution — Step 0b can stop the command with nothing to do, and a list opened before it would strand five tasks on a run that never started.

### Fixed

- **`/fix` and `/improve` prepended to `app-docs/CHANGELOG.md` with no existence check.** In a lite project that has not yet grown an `app-docs/` tree, the first user-facing fix or improvement wrote into a directory that was not there. `ship.md:256` and `doc.md:89` already carried the `absent → create the tree first` guard; both chains now carry it too.

## [1.2.0] — 2026-08-04

### Fixed

- **The named agents never registered.** All eight agent files (`ae-red`, `ae-req`, `ae-test`, `ae-doc`, `ae-sec`, `ae-edge`, `ae-ux`, `ae-scribe`) were missing the required `name:` frontmatter key. Claude Code drops such files silently — no warning, no filename fallback — so the "6-agent parallel review" in `/review` and in `/ship` phases 2 and 4 was the main conversation role-playing six reviewers inline, with no real subagents and none of the isolated context the design depends on. Every agent now declares `name:`, verified by enumerating the agent types Claude Code actually registers.
- `/frontend`'s plan-approval checkpoint ignored `--auto`, so `/ship --auto` and `/ship-all --auto` stalled at phase 3 waiting for input that would never come. The checkpoint is tagged `[AUTO: skip]` and the command now parses the flag.
- `ae-sec` pinned the legacy `claude-sonnet-4-5` model id; it now uses `claude-sonnet-5`.
- SKILL.md advertised a bare `/init` trigger, colliding with Claude Code's built-in init command. The description now claims `/agentic-engineering:init` and explicitly disclaims bare `/init`.
- Stale rosters and counts across agent files and commands — a review variously described as 4-agent and 5-agent, `ae-sec` calling itself "the 5th parallel subagent", `ae-edge` "the sixth", and `ae-doc` / `ae-req` / `ae-scribe` still pointing at the retired `/ae:` command namespace.

### Added

- **`[ASK: confirm|single|multi|prose]` checkpoint taxonomy** — documented in SKILL.md and applied to all 39 human checkpoints across 15 command files. Tagged gates render as `AskUserQuestion` widgets with labelled options instead of asking the operator to type `go`. Destructive gates print what will be deleted before offering the choice. `[AUTO: skip]` still overrides everything.
- **Progress tracking rules** — `/ship` opens a task per phase, `/ship-all` per story, `/plan-all` per epic; exactly one is `in_progress` at a time, nested commands advance the parent's list, and a blocker pause leaves its task open rather than silently completing it.
- **Human-facing output rules** — restate the state before acting, end on one concrete next action, cap surfaced lists at five items, report errors matter-of-factly. Adapted from the `i-have-adhd` skill's clarity rules; the `━━━` summary blocks are deliberately exempt.
- `### Gotchas` and a checkpoint-tag reference table in `commands/frontend.md`.

### Changed

- `## Core Principles` moved out of `commands/frontend.md` into SKILL.md. It governs every command but only loaded when `/frontend` ran.
- Plugin `CLAUDE.md` now states that the `USER_COMMANDS` gate applies to the bash installer only — a marketplace install registers all 19 commands, including `implement`, `review`, and `frontend`. Standalone `/agentic-engineering:review` is useful, so the wrappers stay; the previous docs simply claimed a filter that does not exist on that path.

### Removed

- `graphify-out/` is untracked and gitignored. It is local build output; a fresh clone has none.

## [1.1.0] — 2026-07-14

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
