# Changelog

All notable changes to the `agentic-engineering` plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`/converge` — a spec ↔ code convergence audit, closing the one loop the
  workflow never closed.** `/review` is diff-scoped and story-scoped: seven
  reviewers read one story's changes and go home. Nothing ever compared
  `PRD.md` against the repository, and `/status` counts checkboxes written by
  the same process that claimed completion — so a feature could report 9/9
  shipped while a requirement sat half-built. `/converge` builds an inventory
  from the `FR-` ids, resolves each to the code the artifacts say should exist,
  and classifies findings as `missing`, `partial`, `contradicts` or
  `unrequested`.

  The discipline that makes it useful is distinguishing **unbuilt from
  undelivered**: an FR claimed only by unchecked stories is reported as
  *pending*, never as a gap, so a feature two stories into a ten-story plan
  converges clean. An FR claimed by a **checked** story with no matching code
  is a blocker — a false completion claim, and the signal the command exists
  for. `unrequested` code is reported for awareness and never generates a
  story, because the fix may be deletion and that is not converge's call.

  Findings with remaining work are appended to `STORIES.md` under a
  `## Convergence` heading behind an approval gate, each marked
  `Source: converge`. It runs in the parent (it needs Bash and a human answer,
  which subagents have neither of), never edits `PRD.md`, never touches code,
  and never fixes anything — repairs go back through `/ship` or `/fix` with a
  full review behind them. Severity uses the same three buckets as `/review`.

- **`FR-` requirement ids, and the `Implements:` line that traces them to
  stories.** PRD acceptance criteria are now numbered `FR-1…FR-n`,
  feature-scoped and stable for the life of the feature; each story declares
  the ids it delivers. There was previously no link at all between a PRD
  requirement and the work that closes it — "is FR-4 shipped?" could only be
  answered by reading the whole feature. Story-level `AC-N` is unchanged and
  remains per-story; the two are different layers and never merge.

  `/feature` Stage 3 now treats FR coverage as a hard gate rather than a review
  note: an FR claimed by no story, or a story citing an FR the PRD does not
  define, stops the breakdown. `/converge` is built on this inventory.

- **Stage 3b spec audit — `ae-req` Mode B, run before any code exists.** The
  spec set was previously checked only against the constitution (Stage 2c), one
  of six things worth checking. Mode B runs ambiguity, underspecification,
  duplication, coverage, constitution-alignment and inconsistency passes over
  the PRD, epics, stories and data model, and reports by id. It is the same
  move as the plan pre-review in `/implement`, one level up: the reviewer that
  would find these defects later, moved to where a fix costs an edit. Runs in
  lite mode too, scoped to stories and the constitution — lite's whole risk is
  thin stories written from a one-line description.

- **`Priority:` on every story — `P1`, `P2` or `P3`, where the P1 set alone
  must be deployable.** Stories carried `[P]` for parallelism and dependency
  notes, but nothing said what ships first, so `ship-all` worked in file order.
  The hard rule is the MVP one: a P1 set that needs a P2 story to function is
  mis-labelled, and an all-P1 breakdown is a rejected breakdown — it means no
  slice was found. Priority is a labelled line, never `[P1]` in the title
  bracket, which would read as a malformed parallel marker.

- **`ae-lean` — a seventh reviewer, owning reuse, simplification, efficiency and
  altitude.** The roster had no quality lens at all: grep the eight agent prompts
  for duplication, reuse, simplification or efficiency and the only hits are in
  `ae-red`'s *exclusion* list, which explicitly banned "performance issues unless
  they cause functional failure" and "dead code that can never be reached", while
  `ae-ux`'s golden rule reads "not code style". Every reviewer hunted for
  something *wrong*; nothing hunted for something *unnecessary*. That is why
  `/simplify` and `/code-review` kept finding work after a clean six-agent review
  — those two own exactly the axis nobody was assigned.

  `ae-lean` runs on Sonnet, read-only, in the parallel batch. Its Step 2 is a
  **mandatory repo search**: its defining finding ("this already exists at
  `utils/x.ts:40`") is unreachable from a diff, so a report without a `Reuse:`
  line is treated as incomplete. It receives the dependency manifest so it does
  not recommend a library the project deliberately does without, and it is scoped
  to code the diff added or changed, because `/implement` bans drive-by refactors
  and a finding the author cannot act on inside this story is noise.

  **Findings are `should-fix`, never blockers** — with one exception, a verbatim
  duplicate of an existing function with both locations cited, which is a defect
  being introduced rather than a preference. Working code does not stop a ship.

### Changed

- **`ae-req` has two modes.** Mode A is the existing implementation audit that
  `/review` dispatches; Mode B is the new spec audit. The dispatch prompt names
  the mode, and an unnamed dispatch is Mode A, so every existing call site is
  unaffected. Mode B never opens implementation files — there are none yet, and
  reaching for them means auditing the wrong thing.
- **`/ship-all` orders by priority, dependency second.** Never a `P2` while a
  `P1` is unchecked; `[P]` reorders within a level, never across one. The
  session-start gate gained a **Ship the P1 set only** option, which ends at the
  normal session-complete block with the remainder listed — a clean finish, not
  an early stop. Features whose stories predate `Priority:` ship in file order
  with the grouping dropped entirely; nothing is retro-labelled.
- **`/status` reports the MVP slice and recommends next by priority.** A
  `MVP: A / B P1 stories shipped` line per in-progress feature, omitted for
  features that predate the field so it never renders `0 / 0`. `UP NEXT` now
  picks the lowest open priority level instead of file order.

- **`/review` takes `--frontend-pass`**, which drops `ae-lean` and runs the other
  six. `/ship` Phase 4 passes it: `ae-lean` reviewed the same branch in Phase 2,
  and component-level duplication is `ae-ux`'s beat. Phase 2 is a seven-agent
  batch, Phase 4 a six-agent one.
- **`/improve` always dispatches `ae-lean`** alongside `ae-red` and `ae-test`. A
  `refactor`-type improvement is itself a simplification claim, and this is the
  reviewer that checks it landed.
- `ae-red`'s exclusion list now names where those findings go instead of dropping
  them: efficiency, dead code, duplication and needless indirection are
  `ae-lean`'s.
- Integrity check H (no `Bash` in a reviewer's `tools:`) extended to `ae-lean`.

## [2.0.0] — 2026-09-10

Breaking for anyone who installed this plugin with the bash installer. **Claude
Code now installs it through the marketplace only.**

### Removed

- **`agentic-engineering/install.sh` is gone.** The plugin had two install paths
  with divergent layouts, and everything in it was written against the bash one
  and never re-verified against the plugin cache. That is the root cause of every
  entry under "Fixed" below. `--tool=claude-code` in the top-level installer now
  prints the `/plugin marketplace add` instructions and writes nothing; the
  top-level installer still serves Cursor, Codex, Copilot and the rest from
  `adapters/AGENTS.md.template`, unchanged.
- The `USER_COMMANDS` gate went with it. Plugin auto-discovery registers all 21
  commands and always did — the gate only ever hid `implement`, `review` and
  `frontend` on the path nobody uses.
- The post-install `user-invocable: false` patch went with it. Nothing injects
  that field anywhere now, and the source must stay clean for the claude.ai
  packager.

### Fixed

- **The six-agent review did not dispatch under a plugin install.** Verified
  against Claude Code 2.1.267: `agents/ae-red/AGENT.md` registered as
  `agentic-engineering:ae-red:ae-red`, so every dispatch site's bare `ae-red`
  resolved to nothing. The failure is silent — the main model role-plays six
  reviewers inline and emits a normal-looking report. Agents are now flat
  `agents/<name>.md` files and every dispatch site names the full
  `agentic-engineering:ae-*` type.
- **59 reference and language files registered as dispatchable subagents.**
  Every `.md` under `agents/*/` became its own agent type — `…:ae-sec:references:xss`,
  `…:ae-test:languages:jest` — sitting in the Agent tool description of every turn
  of every session. Reference material moved to `references/<agent>/`, outside
  `agents/` entirely.
- **Reviewers could write to the repo under review.** `tools: Read, Glob, Grep, Bash(git diff:*)`
  reads like a restriction and is not one: `tools:` accepts permission-rule
  syntax but does not enforce it, so `ae-red`, `ae-sec` and `ae-edge` each held a
  general Bash tool. Observed consequences: one agent's edit clobbered a test
  another had just written; a second left debug lines in a committed file. Bash
  is removed from all three.
- **Reviewers each guessed their own base branch.** `ae-sec` fell back to
  `git diff HEAD~1` and reviewed one commit of a multi-commit branch while its
  peers reviewed the whole thing. `/review` now captures the diff once into
  `.agentic/review/<STORY-ID>.diff` and passes the path.
- **`/init` and `/bootstrap` read paths that only the bash installer created.**
  The rules library, the capture-tools catalog and the statusline script were
  addressed as `~/.claude/skills/agentic-engineering/…`; under the marketplace
  they live in the plugin cache. Every path is now `${CLAUDE_PLUGIN_ROOT}/…`, and
  `/init` copies the statusline script into the project's own `.claude/` so it
  survives plugin version bumps. `ae-edge` reached for `ae-test`'s references the
  same way and silently ran with no race, coverage or language material.
- **The skill description exceeded the 1,024-character cap**, so its tail was
  silently truncated — and the tail is where the "do NOT trigger on"
  disambiguation lives. Rewritten to 1,020 characters, dropping ~60 words of
  slash-command names that never routed through it anyway (the CLI dispatches
  slash commands before the model reads any description).
- **`/compact` was called "mandatory" and "non-negotiable" in `ship-all` and
  `plan-all`, and the model cannot invoke it.** It is a user command. Both now
  print the compact block and fire a real checkpoint asking the human to run it.
  The `/ship-all` wrapper no longer claims it "compacts context automatically".
- **The progress tracker named no tool.** "The harness task tool" is not
  available in every session (`TaskCreate`/`TaskUpdate`/`TodoWrite` are env-gated
  on newer models). `# PLAN` in `.agentic/focus.md` is now the record; a harness
  list is an opportunistic mirror, and its absence is never narrated.
- **Command wrappers pointed at a relative `commands/<name>.md`**, which under a
  plugin install is the wrapper itself. All 21 now name
  `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/<name>.md`, and all
  21 forward `$ARGUMENTS` — `archive`, `implement` and `frontend` previously
  dropped it, silently discarding `--auto`.
- **`ae-scribe` had no `Edit` tool** but was told to update existing pages, so it
  rewrote whole files to change one section.
- **`ae-ux` was told to run `git diff`** with no Bash tool, and its `.swiftui`
  frontend detection matched an extension that does not exist — a SwiftUI-only
  diff was probed as backend.
- **`/ship` had no branch guard.** `/fix` and `/improve` gate on `main`; lite
  mode's `/note` → `/ship` path has no branching step at all, so every lite story
  landed on `main`.

### Added

- **Mode B — plan pre-review** in `ae-red` and `ae-sec`. `/implement` dispatched
  both against a plan rather than a diff, and neither had any instruction for
  that: both opened with `git diff main...HEAD` and reviewed unrelated branch
  state. They now skip the diff step, verify each Contract claim against the
  `file:line` it cites, test the claim's converse, and audit the Failure states
  table for omissions.
- **`ae-test` gained the two modes it was already credited with**: validating the
  `### Edge probes` table the same way it validates the AC Coverage matrix, and
  carrying the `Done when:` check for `/improve` with per-condition pass/fail.
- **`ae-ux` gained a no-spec mode.** It hard-required
  `docs/specs/<feature>-design.md`; `/improve` dispatches it with no spec at all.
  Without a design to be unfaithful to, fidelity findings drop to POLISH while
  broken states stay blockers.
- **`ae-doc` now checks that Contract claims and Failure states were persisted**
  into `PROGRESS.md`. 1.4.0 credited it with catching exactly this and no prompt
  asked for it.
- **A severity mapping table in `/review`.** Six reviewers emitted six dialects
  (`CRITICAL`, `Critical`, `Blocker`, `should-cover`, `should-fix`) with nothing
  saying how they collapse into Blockers / Should-fix / Won't-fix. Every reviewer
  now also emits a `SUMMARY:` count line, which `/review` expected and only
  `ae-sec` produced.
- **`MEMORY.md` and `DECISIONS.md` are read, not just written.** `/cleanup` wrote
  both after every chain and no command listed either as an input. They are now
  in the inputs of `/implement`, `/ship`, `/fix`, `/improve` and `/feature`
  — MEMORY in full, DECISIONS titles only.
- **`shared/preamble.md`** holds the four blocks that were copy-pasted across
  8–12 command files (parse `--auto`, focus write, auto summary, memory inputs).
- **Integrity checks G–J** in `.claude/hooks/check-integrity.sh`: no nesting under
  `agents/`, no `Bash` in a reviewer's `tools:`, no `~/.claude` literal in shipped
  content, description within the 1,024-character cap.

### Changed

- **`ae-red` and `ae-edge` move from Haiku to Sonnet.** Both are pure multi-file
  reasoning with no ability to execute anything — `ae-red` traces an execution
  path, `ae-edge` mentally runs a test it just wrote against the current
  implementation. That is the worst possible task for a cheap tier, and it showed:
  one reviewer "reproduced" a delimiter collision with a debug line that joined
  differently than the code did, and measured its own string. `ae-sec` was already
  on Sonnet. `ae-req`, `ae-test` and `ae-doc` stay on Haiku — checklist and parsing
  work, where the tier is right.
- **Nesting rules are explicit.** `/implement` under `/ship` fires no second start
  gate and opens no second plan; `/review` under `/ship` reports and lets the
  parent gate; `/ship` under `/ship-all` advances the parent's plan.
- **The `ae-red` / `ae-edge` overlap is carved.** `ae-red` owns "crashes on the
  current path", `ae-edge` owns "no test proves the guard" — one null dereference
  was producing a RED CRITICAL and an EDGE Blocker from the same line.
- **The agent roster distinguishes the eight subagents from the four inline
  roles.** ARCH, PROD, FIXER and GIT are the main model wearing a hat and were
  listed identically to dispatchable agents.
- **The visual-capture dispatch is documented as Phase 3, where it runs.**
  Twenty-three files said Phase 4. Separately, "Phase 1 / Phase 2" meaning a
  rollout stage of the visual-artifacts feature collided with ship-chain phase
  numbers and is gone.
- **`ae-sec` reports in the same shape as the other five** — a `SEC —` header
  rather than markdown headings, which the consolidator could not parse.
- **`adapters/AGENTS.md.template` is portable again.** It named `ae-edge`,
  `ae-test`, `ae-ux`, a dozen slash commands, `.claude/settings.local.json` and
  the Claude Code statusline, in a file whose own first line says "regardless of
  which AI assistant you are". It also gained the `/improve` flow, Contract
  claims, Failure states and plan pre-review, and no longer says a done story is
  "pushed" — no chain pushes.
- Changelog ownership is settled: `ae-scribe` writes `app-docs/` pages only, the
  parent command writes both changelogs, and the parent creates the `app-docs/`
  tree. Three files each claimed a different owner.

### Backfilled — shipped in 1.1.0 through 1.4.0 with no changelog entry

These were found missing during the 2026-09-10 audit. Dates are the release they
went out in, not the date of this entry.

- **`/cleanup` + `docs/DECISIONS.md` + `docs/MEMORY.md`** — the memory-doc layer.
  `/cleanup` runs as the last phase of `/ship`, `/fix` and `/improve`, appends
  binding decisions as `DEC-NNN`, and rewrites a line-capped `MEMORY.md`.
- **`/archive [feature|--all]`** — compacts a shipped feature's docs into one
  `SUMMARY.md` and deletes the originals; `--all` archives every eligible feature
  behind one combined gate.
- **`/focus` and `/next`** — the per-worktree `.agentic/focus.md` pointer with
  `# CURRENT`, `# PLAN` and `# NEXT`, auto-written by every long-running command
  under a story-id-match heuristic.
- **`--auto` mode** — the `[AUTO: skip|ask-if-ambiguous|always-ask]` tag taxonomy,
  the hard-override list, the ambiguity heuristic and `.agentic/auto-log.md`.
- **The AC Coverage matrix and the test pyramid** — every story maps each
  acceptance criterion to the tests that prove it, with a `Level` column and a
  soft inverted-pyramid warning.
- **Visual Artifacts and `capture-tools/`** — a 15-entry catalog of capture tools
  selected at `/init`, dispatched during the frontend phase, auto-populating a
  Visual Artifacts table in `PROGRESS.md`.
- **`ae-edge`** — the sixth reviewer, making the batch six agents rather than five.
- **The focus statusline** (`agentic-statusline.sh`).
- **lite / full project mode** — the `mode:` marker in `docs/INDEX.md` frontmatter.
- **The won't-fix loop** — `/review` re-reads `docs/improvements.md` and reports a
  matching finding as "previously logged", never re-litigating it.

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

[Unreleased]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v2.0.0...HEAD
[2.0.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v1.4.0...agentic-engineering-v2.0.0
[1.4.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v1.3.0...agentic-engineering-v1.4.0
[1.3.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v1.2.0...agentic-engineering-v1.3.0
[1.2.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v1.1.0...agentic-engineering-v1.2.0
[1.1.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v1.0.0...agentic-engineering-v1.1.0
[1.0.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v0.3.0...agentic-engineering-v1.0.0
[0.3.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v0.2.0...agentic-engineering-v0.3.0
[0.2.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v0.1.0...agentic-engineering-v0.2.0
[0.1.0]: https://github.com/thebedcoder/skills/releases/tag/agentic-engineering-v0.1.0

**Note on tags.** These compare links assume `agentic-engineering-vX.Y.Z` tags.
Only some exist; create the missing ones from the release commits, or the links
404.
