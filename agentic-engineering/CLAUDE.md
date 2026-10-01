# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope of this file

The parent `../CLAUDE.md` covers the monorepo (per-plugin layout, the wrapper/real-command split, the top-level multi-tool installer, the `<!-- agentic-engineering:start v1 -->` marker contract, commit conventions). **Read it first** — most authoring rules live there. This file only adds what's specific to the `agentic-engineering/` plugin's internal shape.

**This plugin is marketplace-only for Claude Code.** It ships no `install.sh`; there is no hand-copy path into `~/.claude`. Every path in shipped content resolves through `${CLAUDE_PLUGIN_ROOT}`, and a hand copy breaks all of them. The top-level `../install.sh` still serves the non-Claude tools from `adapters/AGENTS.md.template`.

## Architecture at a glance

The plugin is the entire `/ship`, `/feature`, `/review`, `/fix` SDLC workflow — a router skill (`skills/agentic-engineering/SKILL.md`) that dispatches into one of 24 command files in `skills/agentic-engineering/commands/`, plus 11 named specialist agents under `agents/` that the commands invoke (often in parallel) as Claude Code subagents. The end-user `README.md` is the workflow-level overview; this file is for authoring inside the plugin.

Five pieces of the architecture are non-obvious and load-bearing:

1. **Router plus policy layer.** `SKILL.md` is *not* a thin router, despite reading like one. It holds the command → file table and agent roster, and also the policy every command inherits: Project Mode, Memory Docs, Core Principles, the `[ASK:]` and `[AUTO:]` taxonomies, Human-Facing Output Rules, Progress Tracking, Context Management, the caveman rules and the test-watch ban. Command *bodies* live in `skills/agentic-engineering/commands/<name>.md` and load only when that command fires; blocks repeated across many commands live once in `skills/agentic-engineering/shared/preamble.md` (§A parse `--auto`, §B focus write, §C auto summary, §D memory inputs). Do not inline command logic into `SKILL.md`, and do not re-paste a preamble block into a command.

   **On-demand shared files load only on their branch** — that is the context diet, keep it that way: `shared/auto-mode.md` (tag behavior, Hard-Override List, ambiguity heuristic — §A reads it only when `--auto` is present), `shared/story-flow.md` (plan → build → verify → record, run by `/implement` and `/ship` Phase 1), `shared/fix-loop.md` (only when a chain's review returns blockers), `shared/parallel-build.md` (only when `/ship-all` builds a `[P]` group at once), `shared/focus-release.md` (`/focus done`, run by chains on success instead of loading all of `commands/focus.md`), `shared/worktree.md` (only when a worktree is picked, present or finishing — the branch guards read `worktree.sh pref` first and open the file only on the worktree answer), `shared/visual-capture.md` (only when `.claude/visual-capture.md` exists). Measure a change with `tests/token-report.py static <command>` and keep `tests/load-manifest.json` honest about what each command reads.
2. **7-agent parallel review.** `commands/review.md` dispatches `agentic-engineering:ae-red`, `:ae-req`, `:ae-test`, `:ae-doc`, `:ae-sec`, `:ae-edge`, `:ae-lean` as **simultaneous** subagents — single message with multiple `Agent` tool calls. Sequential dispatch defeats the design (cost, latency, context). `ae-red`, `ae-sec`, `ae-edge`, `ae-lean`, `ae-req`, `ae-test` and `ae-ux` run on Sonnet — multi-file reasoning with no ability to execute anything, where a cheaper tier fabricates reproductions or misjudges severity. `ae-req`, `ae-test` and `ae-ux` moved from Haiku after a planted-defect comparison: both tiers caught every planted defect, Haiku mis-marked a met criterion, raised a debatable blocker and called drifting terminology clean, and the Sonnet runs cost the same. `ae-doc` (convention diff) and `ae-scribe` (writing to a template) stay on Haiku. Frontmatter names the **tier** — `model: sonnet` / `model: haiku` — never a pinned id: `claude-sonnet-5` kept the four Sonnet reviewers on Sonnet 5 after 5.5 shipped, and a first-party id may not resolve on Bedrock or Vertex. `test_frontmatter.py` rejects pinned ids. **Dispatch names are plugin-namespaced**: a bare `ae-red` does not resolve under a plugin install, and the failure is silent — the main model role-plays the reviewers inline and emits a normal-looking report. `ae-lean` is dropped from the Phase 4 re-review via `/review --frontend-pass` — it already saw the branch in Phase 2. The `ae-ux` agent runs separately after the frontend pass and is **not** in the parallel batch at all. Inside a chain, blockers go to `shared/fix-loop.md`: implementer fix rounds, each re-reviewed — in one message — by only the reviewers whose blockers it addressed; that partial roster is a re-review, not a second batch.

   Reviewers have **no Bash**. `/review` captures the diff once into `.agentic/review/<STORY-ID>.diff` and passes the path; `tools:` does not honour permission-rule syntax, so `Bash(git diff:*)` would hand an agent a general Bash tool, not a restricted one. `/fix` and `/improve` review **before** they commit, so `/review`'s branch diff misses their change — they capture it with `scripts/review-diff.sh <name>` (uncommitted work vs HEAD, through a throwaway index). `/fix` dispatches `ae-red` alone in fix-review mode (Mode C); writing a RED block inline instead is the role-play failure above, by hand.
3. **Forked vs. main context.** `/status`, `/analyze` and `/diagnose` run with `context: fork` so their tool calls don't pollute the main conversation; their wrappers set `model:` (`haiku` for `/status`, `sonnet` for the other two), which with `context: fork` picks the forked subagent's model. `/ship`, `/feature`, `/design` run in the main context because they have human checkpoints that need conversation continuity — so does `/worktree`, whose every merge, PR or discard is a human answer. If you add a new command, this choice is deliberate — pick based on whether it needs human handoff.
4. **Orchestrator, planner, implementer.** In story work (`/ship`, `/ship-all`, `/implement`, `/frontend`, and `/improve`'s apply) the main session is an orchestrator: `ae-arch` writes the story plan on the session's own model (`model: inherit`), `ae-impl` builds it test-first on `sonnet` (dispatch passes `model` per story — `haiku` for mechanical work, the session model for fix round 3), each in a fresh context. Plans go to `.agentic/briefs/<ID>.md`, reports to `<ID>.report.md`; the orchestrator re-checks evidence, files and every AC itself, ticks the story and commits. **The main session never writes source code in a story chain** — `/diagnose` flags it (`DEVIATION build`). `/fix` is the deliberate exception: diagnosis and the one-hypothesis loop need the conversation. Planning asks, execution runs: planning commands end on a Build gate that chains into `/ship-all`; execution commands have no approval or compact gate, only escalations, the fix loop's survivors, hard overrides and a stuck implementer. `test_frontmatter.py` pins `ae-arch` to `inherit` with no write tool and `ae-impl` to `sonnet` with Bash, Write, Edit.

   **Parallel `[P]` builds** (`shared/parallel-build.md`) dispatch one `ae-impl` per story in one message with `isolation: "worktree"`. Claude Code creates those worktrees from the **default** branch (`worktree.baseRef` is a user setting the plugin cannot rely on, and it cannot name a branch), so every isolated dispatch carries `pin: <base-sha> <branch>` and the implementer's first command is `worktree.sh pin`, which moves its fresh worktree onto the feature commit. The orchestrator then `adopt`s, commits and `merge`s each one; `adopt`/`merge`/`remove` also run from a task worktree that holds the base branch. Isolation without a pin is `DEVIATION base` in `/diagnose`. Only the build runs in parallel — review, frontend, docs and cleanup stay one story at a time.
5. **SessionStart hook is the only always-on context.** `hooks/hooks.json` runs `hooks/session-start.sh` on `startup|clear|compact`. It emits exactly one field, `hookSpecificOutput.additionalContext` — Claude Code reads every context field it finds without de-duplicating, so a second shape injects the text twice. Keep it pure bash (no `jq`/`python`: it runs in every session of every project the plugin is enabled in), under 40 injected lines, exit 0 always. Outside a scaffolded project it emits the router only; the "explicit instruction wins" line is what keeps headless `--append-system-prompt` drivers working. Anything a command needs belongs in the command body, not here.

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

## All 24 commands are user-visible

Plugin auto-discovery registers every `.md` in `commands/` — there is no frontmatter key that hides one. `implement`, `review` and `frontend` are *internal by intent* (driven by `ship`, not by hand) but they still appear as `/agentic-engineering:implement`, `:review`, `:frontend`. That is fine: standalone `/agentic-engineering:review` is genuinely useful.

The only way to hide a command is to delete its root `commands/<name>.md` wrapper; the skill router still dispatches from `skills/agentic-engineering/commands/<name>.md`.

**Wrappers carry no logic.** Each is a pointer to `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/<name>.md`. Write the absolute form — a bare `commands/<name>.md` under a plugin install resolves to the wrapper itself. Every wrapper passes `$ARGUMENTS`, even the ones whose command takes none; a wrapper that drops it silently discards `--auto` and every flag.

## `user-invocable` must never appear in SKILL.md

The field is valid in the Claude Code CLI but **rejected by the claude.ai skill packager** when building `agentic-engineering.skill`. The bash installer used to inject it post-copy; that installer is gone, so there is nowhere for it to live. Source stays clean. `.claude/hooks/check-integrity.sh` check C enforces this.

## SKILL.md description is capped

The `description` frontmatter must stay **≤ 1,024 characters** folded (the Agent Skills cap; Claude Code's own listing cap is 1,536 for description plus `when_to_use`). Over the cap the *tail* is silently truncated, so the disambiguation clauses — the "do NOT trigger on" list — are exactly what gets lost. Do not list slash-command names in it: the CLI dispatches slash commands before the model reads any description, and under the marketplace they are `/agentic-engineering:<n>` anyway. Check G in the integrity hook measures it.

## Untagged `[AUTO:]` gates are deliberate

Gates in `/note`, `/plan-all`, `/bootstrap`, `/focus`, `/init`, `/doc-all` and `/archive` carry an `[ASK:]` tag but no `[AUTO:]` tag. They take the untagged default, `always-ask` (`shared/auto-mode.md`). That is a decision, not an omission — do not add tags to them on sight. The one exception is `/plan-all`'s Build hand-over gate, `[AUTO: skip]` like its siblings in `/feature` and `/design`.

## Removing a gate is not tagging it

Execution commands lost their approval and compact gates in 3.0 — they were deleted, not tagged `[AUTO: skip]`, so the checkpoint tables say **none**. Do not add an approval gate back to `/ship`, `/ship-all`, `/implement` or `/frontend`: a stop belongs in the escalation list (`shared/story-flow.md` §1) or the fix loop's §4, where it fires on a condition, never on every story.

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

**Run the test suite first** — `tests/run-tests.sh` (details in `tests/README.md`):

```bash
agentic-engineering/tests/run-tests.sh --static      # seconds, no API key — also runs in CI
agentic-engineering/tests/run-tests.sh --behavioral  # real claude -p sessions, a few dollars
```

Static tests check frontmatter, every `${CLAUDE_PLUGIN_ROOT}` path and dispatch name, `~/.claude` literals, the README/SKILL.md command tables, and the SessionStart hook's JSON under hostile inputs. Behavioral scenarios run headless sessions in throwaway fixture projects and assert on the transcript — `/ship` batching all seven reviewers into one message, `/ship --auto` hard-pausing on a migration, `/converge` flagging a checked story with no code, `/fix` routing, the hook naming the focus task. They skip cleanly without credentials. **Add a scenario when you add a gate or a dispatch rule** — prose rules with no transcript check are exactly what regressed before.

**Pressure-test it.** A scenario that passes with or without your change proves nothing. Run it against the parent commit first and watch it fail, then on your change and watch it pass:

```bash
agentic-engineering/tests/run-tests.sh --scenario 13 --against HEAD   # before committing: must FAIL
agentic-engineering/tests/run-tests.sh --scenario 13                  # working tree: must pass
```

`--against <ref>` loads the plugin as it was at `<ref>` (extracted to a temp dir — the repo is untouched) while the harness, fixtures and assertions stay current. Say in the commit which way each scenario went.

Adding a command also means a README table row and a SKILL.md map row (`test_command_tables.py` fails otherwise) and, if it loads nested bodies, an entry in `tests/load-manifest.json` so `tests/token-report.py static` counts it honestly.

Two manual checks remain.

**Load the plugin from the working tree** and check that the agents register under the names the commands dispatch:

```bash
cd "$(mktemp -d)" && git init -q
claude -p --model haiku --plugin-dir "$REPO/agentic-engineering" \
  "List the exact names of every agent type available to the Agent tool, one per line." </dev/null
```

Expect exactly eleven `agentic-engineering:ae-*` entries and nothing else. A `:ae-red:ae-red` or an `:ae-sec:references:xss` means the flat-agent rule was broken.

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
