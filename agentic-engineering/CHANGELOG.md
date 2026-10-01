# Changelog

All notable changes to the `agentic-engineering` plugin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] — 2026-10-01

The main session becomes an orchestrator: you plan with it, then it builds without
stopping. Plan and rationale: `docs/upgrade-plan-3.0.md`.

### Changed — breaking

- **Planning asks, execution runs.** `/ship`, `/ship-all`, `/implement` and
  `/frontend` no longer ask for plan approval, per story or per chain, and
  `/ship-all` no longer asks you to `/compact` between stories. They stop only for a
  plan escalation (new dependency, public interface change, disputed Contract claim,
  missing project state), a review blocker the fix loop could not clear or that
  needs a decision, an operation on the hard-override list, an implementer still
  stuck after a retry on the session model, `/fix`'s third failed attempt, and a
  worktree finish. Without `--auto`, too.
- **Planning hands over to building.** `/feature`, `/design` and `/plan-all` end with
  *Start building?* — build everything, the P1 set, design first, or stop — and chain
  straight into `/ship-all`. `[AUTO: skip]`: under `--auto` they chain without asking.
  `/ship-all` entered that way asks nothing more at start; otherwise it asks once,
  scope and parallel groups in one widget, never mid-chain.
- **Review blockers go through a fix loop** (`shared/fix-loop.md`): each blocker is
  triaged as *fix* or *decision*; decisions pause at once; fixes go to the implementer
  for two rounds on its tier and a third on the session model, each re-reviewed by
  only the reviewers that raised them. Survivors pause with the old options.
  Hard-override #1 now reads "a blocker that survives the fix loop, or needs a
  decision". Standalone `/review` still reports and asks.

### Added

- **`ae-arch` — the story planner**, `model: inherit`: plans each story on the
  session's own model in a fresh context — Contract claims with proof, Failure
  states, files, test plan with red and full test commands, the frontend plan for UI
  stories, escalations, and the implementer tier. Read-only: Bash for probes, no
  write tool.
- **`ae-impl` — the story implementer**, `model: sonnet`: builds one brief test-first
  in a fresh context, records the red run and the green run, appends the story's
  `PROGRESS.md` entry (with an `Implementer:` tier line), writes a report and returns
  ≤12 lines. Never ticks, never commits, refuses out-of-plan files and hard-override
  operations it was not cleared for. Dispatch passes `model` per story: `haiku` only
  for mechanical stories that copy a cited precedent, the session model for fix
  round 3. Also builds `/frontend` and `/improve`'s apply phase and runs fix rounds.
- **Briefs and reports** in `.agentic/briefs/` — the planner's output and the
  implementer's account, so neither lives in the main context. The orchestrator
  re-checks evidence, files and every acceptance criterion itself before ticking.
- **Run ledger** — `evidence.sh run` appends every run to
  `<git common dir>/agentic/evidence.log` (never committed, shared by worktrees);
  `check` looks the newest row up there and reports **`unverified`** for a typed,
  edited or foreign row, which REQ blocks like `stale`. `check-row` gives the same
  verdict for one row (`/improve`).
- **Red runs on record** — `evidence.sh run --phase red --expect-fail` records the
  failing-first run, exits 0 when it fails as expected and 1 when the tests already
  pass. `check` reports `red=present|missing`; REQ reports a missing one as
  should-fix (`FAIL-FIRST:`). `/fix` records its regression test failing before the fix.
- **Rulings** under `--auto`: an ambiguous call whose worst case is rework inside the
  current task is decided and logged with `cost if wrong` and `reversal`; anything
  costlier still asks. `/cleanup` promotes rulings that set a pattern to `DEC-` entries;
  §C counts them.
- **Proportional plans** — about 40 lines for an S story, 80 for M, signatures never
  bodies; PROD's plan review checks it.
- **Pressure tests** — `tests/run-tests.sh --against <ref>` runs scenarios with the
  plugin as it was at `<ref>`; a new rule's scenario must fail there and pass on the
  change (`CLAUDE.md`).
- `/status` runs on Haiku, `/analyze` and `/diagnose` on Sonnet (forked wrappers).
- `/diagnose` flags `DEVIATION build` — a story chain that wrote source or tests in the
  main thread with no `ae-impl` dispatch — and lists main-thread source edits.
- **Parallel `[P]` builds in one session** (`shared/parallel-build.md`). A `[P]` group
  is planned by one `ae-arch` per story at once, checked for overlapping files and
  tests that can't run side by side, then built by one `ae-impl` per story at once —
  each with `isolation: "worktree"`, so Claude Code keeps it out of your checkout.
  Claude Code starts those worktrees from the default branch; each implementer first
  runs `worktree.sh pin` onto the feature branch's commit, so it has every story
  already built there and reads its plan from the brief. The orchestrator verifies
  each in its worktree, `adopt`s, commits and merges them in plan order, runs the
  suite once on the merged result, ticks the stories, and continues each through
  review, frontend, docs and cleanup one at a time. The default for a `[P]` group;
  *One after another* and *Separate sessions* (the old worktree-per-session path)
  remain at the start question.
- `worktree.sh pin` and `adopt`; `adopt`, `merge` and `remove` also run from a task
  worktree holding the base branch. `ae-arch` reports `Setup command` and
  `Test isolation`; `ae-impl` pins, sets up and runs a baseline before a parallel
  build. `/review` takes `range: A..B` for a story's own merge. `/diagnose` flags
  `DEVIATION base` — an isolated `ae-impl` with no `pin:`.
- **Plan records** — a story's plan, once it clears PROD, pre-review and any escalation,
  is committed to `docs/features/<feature>/plans/<ID>-plan.md` before any code, with the
  gate answers and approved hard-override operations; a replan appends, never rewrites.
  The brief stays gitignored working state. A rerun passes the record to `ae-arch` as
  `prior plan:` (approvals do not carry). `[P]` groups commit their records before the
  pin. `/cleanup`, `/archive` and DOC read it; `/diagnose` flags `DEVIATION plan`.
  `/improve` puts its approved plan in the commit body.
- **Unattended runs** — `scripts/ship-loop.sh`: one fresh headless
  `/agentic-engineering:ship --auto` session per story, each under its own
  `--session-id` with the launching session's variables (local and cloud) stripped,
  stopping with the session to resume on any hard pause (exit 3) or a run that shipped
  nothing (exit 4); `--max`, `--dry-run`, a log in `.agentic/ship-loop.log`.
  `STORIES.md` is its state.
- **Measured cost per story** — `scripts/story-cost.py` reads the session's own
  subagent transcripts and `/ship` Phase 5 writes a `### Cost` table (tokens per agent
  and model) into the story's `PROGRESS.md` entry — each message counted once at its
  final usage, the transcript under this project's dir preferred when an id appears in
  several. Unavailable → nothing written.
- **Lite review** for a Haiku-tier story or a docs-only change: RED, REQ, TEST (+SEC on
  auth, input parsing, crypto, file or network I/O). Everything else keeps all seven.
- **Review memory** — `docs/review-memory.md`, kept by `/review` and read by RED, SEC
  and LEAN: patterns found in a second story, and claims that turned out not to hold.
  Claude Code's agent `memory:` is ignored for plugin agents and would give the
  reviewers write tools, so the orchestrator owns the file.
- **Human-started commands** — `archive`, `worktree`, `bootstrap`, `init`, `ship-all`,
  `plan-all`, `doc-all`, `cleanup`, `implement`, `frontend`, `review` carry
  `disable-model-invocation: true`: out of every session's skill listing, never
  started by the model from a plain-language request. Chains are unaffected.
- **Effort** — `ae-arch` runs at `high`, `ae-impl` at `medium`, whatever the session's
  level. Not on the Haiku agents: Haiku has no effort levels.
- **Pressure test in CI** — `tests/pressure.sh <base>`: every scenario a pull request
  adds must fail on the base and pass on the branch; every changed one must pass. New
  `pressure-test` job, skipped without the API key secret.
- Behavioral scenarios `13-ship-subagent-build`, `14-ship-all-runs-on` and
  `15-ship-all-parallel-build`; `03` also asserts the implementer is never dispatched
  before a hard pause is answered.

### Fixed

- `shared/auto-mode.md` kept its own `--auto` command list, which named `/doc` and
  missed `/frontend` and `/plan-all` after 2.3.0 fixed the other two. It now defers to
  SKILL.md's, and `test_command_tables.py` fails if a divergent list comes back.
- The top-level installer and smart-setup's workflow spec said "6-agent review".
- The README's "~75% token reduction" for caveman output had no measurement behind it;
  the number is gone.
- `evidence.sh` with no subcommand printed nothing when run by a relative path.

- The repository `LICENSE` was proprietary while every `plugin.json` and README said
  MIT. It is now MIT.

## [2.3.0] — 2026-10-01

### Added

- **A worktree per task.** When `/ship`, `/fix` or `/improve` starts on `main`, the
  branch question they already ask gains a **New worktree** option. Picking it
  creates `.claude/worktrees/<name>` on a new branch from the current commit, moves
  the task's CURRENT and PLAN into it, offers to copy ignored `.env*` files, moves
  the session in with `EnterWorktree`, and runs a baseline (deps + tests; a red
  baseline asks, except in `/fix`). The chain then runs in full there. At chain
  end `/ship`, `/ship-all`, `/fix` and `/improve` offer merge (tests run on the
  merged result before removal), push + PR, keep, or discard — `ExitWorktree`
  brings the session back first. Under `--auto` the worktree is kept and logged;
  merge, PR and discard wait for a human. `shared/worktree.md` §W4 / §W5.
- **`git config agentic.worktree ask|always|never`** — per developer, never
  committed, asked once by `/init`. `always` skips the branch question and goes
  straight into a worktree, so a `--auto` run on `main` no longer stops there.
  `/feature`, which never asked about its branch, offers branch-or-worktree only
  on an explicit `ask` (or goes to a worktree on `always`); unset leaves it as it was.
- **`/worktree [name]`** — lists the worktrees the workflow made (task and `[P]`
  story), with branch, state and commits ahead, and finishes each through the same
  merge / PR / keep / discard gate. Main context, every finish a human answer.
  Worktrees from `claude -w` are not listed.
- **Session hook names the worktree.** Inside one: its branch and the main folder.
  In the main folder: how many wait under `.claude/worktrees/`. Read from files,
  no git call.
- `scripts/worktree.sh`: `pref`, `where`, `create --kind task --carry-focus`,
  `list --kind`; `remove` carries the worktree's `.agentic/auto-log.md` back.
- Behavioral scenario `09-fix-in-worktree`: unset preference offers the option and
  creates nothing; `always` + `--auto` fixes and commits inside a worktree with the
  main folder untouched and the worktree kept.

### Changed

- **`ae-test`, `ae-req` and `ae-ux` run on Sonnet** (were Haiku). Measured, not
  assumed: each agent ran twice per tier on a fixture with 16 planted defects
  (3 weak tests, 4 unmet criteria / constitution violations, 4 spec problems, 5 UI
  departures from the handoff). Both tiers caught all 16 every time. Haiku also
  marked a met criterion "❌ … MET", made shared test state a blocker, called
  drifting terminology consistent, and reported no UI polish where Sonnet found
  four real ones. The Sonnet agents cost the same per run ($0.145 / $0.168 vs
  $0.138 / $0.165) because Haiku read and wrote more to get there. `ae-doc` and
  `ae-scribe` stay on Haiku.

- **Worktrees live in `.claude/worktrees/`**, `[P]` story ones included — where
  `claude -w` puts its own and the only place `EnterWorktree` switches between.
  They are ignored through `.git/info/exclude`, so `/ship-all` no longer commits a
  `.gitignore` line, and `.agentic/` is excluded too when the worktree's own
  `.gitignore` lacks it.
- `worktree.sh list` shows only worktrees it made (branch config `agenticBase`),
  with their `kind`, wherever they sit. A `claude -w` or hand-made worktree is never
  offered for merge or removal.

### Fixed

- **Final sweep.**
  - The portable rules non-Claude tools install (`adapters/AGENTS.md.template`)
    were 2.1-era. They now carry evidence before "done", the reproduce → diagnose
    → one-hypothesis fix flow with its three-failed-fixes stop, the intent check,
    `FR-` traceability, priorities and the spec audit, the uncommitted-change review
    with a reuse pass in improvements, a feature audit, the two-phase archive, and
    optional worktrees. Their `--auto` list no longer names `doc`. Checked through
    `install.sh --tool=cursor` twice: one block, replaced in place.
  - SKILL.md's `--auto` list named `/doc` (no such flag) and missed `/frontend`
    and `/plan-all`. `test_command_tables.py` now pins SKILL.md's and README's lists
    to the commands whose hint offers `--auto`.
  - Hard-override #2 (secrets always pause) contradicted the worktree step that
    copies an ignored `.env` under `--auto`. The rule now says what it guards —
    creating, editing, staging or sending a secret — and carves out that local
    copy; scenario 09 runs `/fix --auto` with a real ignored `.env`.
  - `/fix`, `/ship-all`, `/doc` and `/status` end with the `Next:` line SKILL.md
    requires of every command.
  - `/init`'s `CLAUDE.md` template asks for `MEMORY.md` at session start and a
    recorded green run before a story is complete; its closing prompt fits the
    chosen mode. The session hook names the newest 20 `CHANGELOG.md` entries, as
    SKILL.md's session-start rule always said. README's SEC count is 16.
  - CI: a `behavioral-smoke` job runs scenarios 05, 06 and 11 on pull requests
    (about $0.35) when the `ANTHROPIC_API_KEY` secret is available, and skips
    with a notice otherwise.

- **Command audit.** A read of all 24 commands against each other, the README and
  the agents:
  - `/review`'s severity table had no row for REQ's unmet criteria or TEST's
    `Missing coverage:` entries (an AC with no test, a matrix row naming a missing
    test, a test that cannot fail) while forbidding a fourth bucket. Both now map
    to Blocker, and an unlisted reviewer "blocker" is never dropped.
  - `/design` required an approved `PRD.md`, which lite projects never have. It
    now works from `STORIES.md` when no PRD exists (existence check, not a mode
    check).
  - `/frontend` run on its own wrote UI code with no test run, no evidence row, no
    blocker gate and no commit. It now verifies through `evidence.sh` (the row
    `/ship` Phase 3 already cited) and, standalone, gates ae-ux blockers and
    commits.
  - `/plan-all` offered `--auto` but never parsed it; it now does and passes it to
    every `/feature`, writes and releases its CURRENT task, and prints the auto
    summary. Nested `/feature` runs leave the parent's CURRENT and PLAN alone, and
    a standalone `/feature` now writes the PLAN `/focus` always said it did.
  - `/init` no longer offers an `--auto` it never read; `test_frontmatter.py` now
    fails any command whose hint offers `--auto` without §A and §C.
  - `/fix` states the non-watch test rule. `/status` lists the workflow's
    worktrees. `/note` routes ideas to `/ship` or `/feature`.
  - Stale text: `/review`'s description said 6 agents and its hint lacked
    `--frontend-pass`; `/fix`'s said "stays on current branch"; `/doc-all --full`
    promised architecture docs; README's `/archive` row described the old one-shot
    flow; the constitution template `/init` writes listed six `--auto` commands.

- **`ae-req` no longer blocks on fresh evidence.** In 3 of 4 implementation audits,
  on both tiers, it marked Evidence ❌ BLOCKER on a fresh, green row because the
  tests looked weak. Part 3 now answers only "did the suite run green on this
  code?"; weak tests land under the unmet criterion, the constitution's testing
  article, or `ae-test`. Re-run: 4 of 4 audits report fresh evidence as ✅, unmet
  criteria still block, and a story whose criteria are met with thin tests passes
  REQ. Scenario 06 (stale evidence blocks, fresh clears) passes on Sonnet.

- **Reviewers run on the current Sonnet.** `ae-red`, `ae-sec`, `ae-edge` and
  `ae-lean` declared `model: claude-sonnet-5`, which pins Sonnet 5: run logs billed
  them as `claude-sonnet-5` while the session ran `claude-sonnet-5-5`, with half
  its output ceiling. All nine agents now name the tier — `model: sonnet` /
  `model: haiku` — which tracks the current model and resolves on Bedrock and
  Vertex. Verified: `ae-red` dispatched from a Haiku session runs on
  `claude-sonnet-5-5`. `test_frontmatter.py` now rejects pinned ids.
- **Roster says what each name is.** `ae-ux` was listed as doing "design flows,
  mockups", but it is a read-only reviewer of built UI; `/design`'s mockups are made
  by the main model speaking as UX. SKILL.md now lists the three subagent names that
  double as inline hats — UX in `/design`, SCRIBE in `/doc` and `/doc-all`, RED's
  improvement notes in `/doc` — and says that everywhere else those names mean a
  dispatch. The command headers say the same. `ae-sec` and `ae-edge` descriptions no
  longer say "six parallel subagents"; `ae-red`, `ae-test`, `ae-lean` and `ae-ux`
  descriptions name every command that dispatches them. README's workflow diagram
  drops a "CLEAN" speaker that existed nowhere else.

- **A focus file missing its `# CURRENT` heading still names the task.** A real
  `/fix` run wrote the CURRENT fields bare, so the new worktree got no task, the
  main folder kept it, and the session hook and status line showed none. Fields
  before any heading now count as CURRENT in `worktree.sh --carry-focus` (which
  restores the heading), the SessionStart hook and `agentic-statusline.sh`, and
  preamble §B states the heading rule.

- **`/fix` reviews with a real `ae-red`.** Phase 3 said "RED runs focused review"
  without naming a dispatch, and a headless `/fix --auto` wrote the RED block itself
  — self-review under a reviewer's name. It now dispatches
  `agentic-engineering:ae-red` in a new **fix-review mode** (`agents/ae-red.md`
  Mode C): root cause actually resolved, evidence row fresh and green, regression
  test fails without the fix, blast radius, plus the usual CRITICAL/WARNING
  findings and a `Verdict:` that drives the existing pause. `/diagnose --check`
  flags a `/fix` that commits with no `ae-red` dispatch.
- **`/improve`'s review sees the change.** Its reviewers ran before the commit on
  a diff captured "exactly as `/review` Step 0c" — committed work only. On a fresh
  branch that resolves the base to HEAD and aborts; on an older one it reviews the
  wrong commits. New `scripts/review-diff.sh <name>` captures uncommitted work
  (tracked, staged, new; not ignored files, `.agentic/` or nested worktrees)
  against HEAD through a throwaway index — the user's staging is untouched, and an
  empty change exits 3 instead of passing as a clean review. `/fix` uses it too.

- **`/ship-all` merges finished `[P]` worktrees again.** The 2.2.0 context diet
  dropped Step 0c along with the focus boilerplate around it, so `§W2` (merge, PR,
  keep or discard each shipped story worktree) had no caller and finished
  worktrees were never offered back. Restored. A static check now fails when any
  `§` section of a `shared/` file is referenced by nothing.

## [2.2.0] — 2026-09-30

Gaps closed from a comparison with [obra/superpowers](https://github.com/obra/superpowers);
audit and per-item plan in [`docs/improvement-plan.md`](docs/improvement-plan.md).

### Added

- **SessionStart router hook** (`hooks/hooks.json`, `hooks/session-start.sh`), both
  modes. Fires on `startup|clear|compact` and injects a router of at most 40 lines:
  bug → `/fix`, idea → `/note`, small change → `/improve`, new feature → `/feature`,
  "what's left" → `/status`. In a project with `docs/INDEX.md` it names the memory
  docs to read before touching code; with an active CURRENT in `.agentic/focus.md` it
  inlines the task title and PLAN progress, so a fresh session — or the first turn
  after `/compact` — names the task unprompted. Before this, everything hung on the
  user remembering the right command, and `/compact` dropped the workflow framing.
  Outside a scaffolded project it emits the router only, marked "not set up here".
  Pure bash, emits only `hookSpecificOutput.additionalContext` (a second shape would
  be injected twice), exits 0 always. An explicit slash command or system prompt wins
  over the router; `AGENTIC_SESSION_HOOK=0` disables it for headless drivers.
- **Test harness** (`tests/`), both modes. `tests/run-tests.sh` is the one entry point.
  - *Static* (`--static`, no API key, runs in the new
    `.github/workflows/agentic-engineering-tests.yml` on every push): frontmatter of
    every wrapper, agent and SKILL.md; every `${CLAUDE_PLUGIN_ROOT}` path,
    `agentic-engineering:<name>` dispatch name and `commands/`/`shared/`/`agents/`
    reference resolves; no `~/.claude` literal; README command table, SKILL.md map and
    `commands/` agree; `hooks.json` is valid and the SessionStart script emits exactly
    one valid JSON object under eleven project shapes, hostile focus titles included.
  - *Behavioral* (`--behavioral`): headless `claude -p --output-format stream-json` runs
    in throwaway fixture projects, asserting on the transcript — "fix this failing test"
    routes to `/fix`; `/ship` Phase 2 dispatches all seven reviewers in one assistant
    message; `/ship --auto` logs a `HARD-PAUSE` and writes no migration when a story
    needs a new table; `/converge` reports a checked story with no code as a Blocker;
    the hook makes a fresh session, and the first turn after `/compact`, name the
    active focus task. Skipped with exit 0 when no credentials are present.
  - `tests/token-report.py`, modeled on superpowers' `analyze-token-usage.py`: per-run
    cost, turns, per-model and per-subagent tokens from stream-json, plus a static
    per-command load estimate driven by `tests/load-manifest.json`.

- **Worktree lifecycle for `[P]` stories** (`/ship-all`, `shared/worktree.md`,
  `scripts/worktree.sh`), both modes. When the next priority level holds two or more
  `[P]` stories, `/ship-all` offers one worktree per story (`[AUTO: skip]` — `--auto`
  keeps shipping them sequentially). Opting in creates `.worktrees/<story>` on
  `feat/<feature>-story-xxx` (ignoring `.worktrees/` first), runs the test command
  there as a baseline (red → ask), and seeds that worktree's `.agentic/focus.md`. A
  `/ship` inside a seeded worktree runs Phases 1–4 and 6 and defers Phase 5
  (changelogs, app-docs) and Phase 7 (cleanup) to the merge, because two branches
  writing `CHANGELOG.md`, `DECISIONS.md` and `MEMORY.md` in parallel conflict and
  collide on `DEC-NNN` numbers. The next `/ship-all` finishes each shipped worktree:
  merge / PR / keep / discard, always asked. Merge joins both stories'
  `PROGRESS.md` entries, re-runs the tests on the merged result, then runs the deferred
  phases once in the main tree. Removal refuses a dirty worktree or an unmerged branch;
  discard shows what it destroys and asks again.
  - `PROGRESS.md` is **not** merged with `git merge-file --union`: git aligns the lines
    two entries share (`### AC Coverage`, the table header) and union splices one
    story's rows into the other's entry. The script keeps our file and appends exactly
    what their side added past the merge base, and aborts when their side edited
    rather than appended. `tests/static/test_worktree.sh` ships two `[P]` stories in
    two worktrees and checks both entries survive intact.

- **Evidence gate before completion** (`scripts/evidence.sh`, `/implement`, `/ship`,
  `/review`, `/fix`, `/improve`, `ae-req`), both modes. Checkboxes were ticked by the
  same process that claimed success, and nothing required a test run to back the
  claim; `/converge` only caught it late, and only for missing code. Now every phase
  that changes code ends with `evidence.sh run --phase <p> -- <test command>`, which
  prints a row — exit code, the runner's own summary, and a **tree id**: `git
  write-tree` of the working tree through a throwaway index, docs excluded, identical
  before and after a commit, changed by any code edit. The row goes into the story's
  new `### Evidence` table before the box is ticked. `/review` runs `evidence.sh check`
  and passes the verdict to `ae-req`, whose new Mode A Part 3 blocks a story ticked in
  the diff under review when the newest row is stale, failing or missing. `/fix` and
  `/improve` have no story entry by design; their row goes in the completion block and
  an `Evidence:` commit trailer, plus the story's table when the change targets one.
  New gotcha everywhere: **claimed green without running**.

- **`/diagnose [session-id | path] [--bundle]`** (`commands/diagnose.md`,
  `scripts/transcript-digest.py`), both modes, forked context. When a run misbehaves —
  a phase skipped, reviewers dispatched one by one, a gate that should have paused
  under `--auto` — there was no structured way to find out why. `/diagnose` locates
  the session transcript (by id, path, or newest in this project), builds a
  line-cited digest (commands, plugin files read, Agent dispatches grouped by
  assistant message, gates, PLAN and auto-log writes, test runs, commits,
  compactions, subagent transcripts) that never prints tool-result bodies, then
  compares it with the invoked command's own contract and reports each deviation
  with the contract line and the transcript lines. The digest's `--check` flags what a
  transcript proves on its own: reviewers of one round spread across messages, bare
  `ae-*` dispatch names, a chain command with no PLAN write. `--bundle` writes a
  scrubbed report, digest, excerpts and issue body under `.agentic/diagnose/<id>/`
  and never posts anything.

- **Intent check before approaches in `/feature`** (Stage 0), full mode only. ARCH
  used to propose three approaches straight from `$ARGUMENTS`, so a one-word idea got
  three architectures before anyone knew who it was for. PROD now checks the request
  for a **user**, an **outcome** and a **constraint**; a complete request asks
  nothing, an incomplete one gets at most five questions, one per message, stopping
  as soon as all three are known. The answers become a three-line intent note that
  Stage 1 and the PRD build on; Stage 2b never re-asks them. Skipped under `--auto`
  (`[AUTO: skip]`), where each empty slot becomes a `[NEEDS CLARIFICATION]` marker so
  the existing pass still surfaces it. Lite mode keeps its own one-round ask at story
  breakdown.

### Changed

- **`/fix` diagnosis is executed, not read off the code**, both modes. Compared with
  superpowers' systematic debugging, `/fix` already had root cause at `file:line`,
  blast radius, a fail-first regression test and "one bug, one fix"; it lacked the
  steps that make the root cause *proven*. Phase 1 now runs, in order: reproduce by
  running the failing thing and pasting its output; check recent changes (`git log`,
  `git log -S`, `git bisect run`) for regressions; trace the bad value back to its
  origin, with one boundary-instrumentation pass for multi-component paths (removed
  before commit); compare with a working sibling; state one hypothesis and test it
  with the smallest probe. The diagnosis template gains `Reproduced`, `Recent
  changes`, `Trace`, `Working sibling`, `Hypothesis` and optional `Guards`
  (defense in depth, only on this bug's own data path, each with a test — "one bug,
  one fix" holds). A failed attempt goes back to diagnosis instead of stacking a
  second patch, and the **third failed attempt stops** at an `[AUTO: always-ask]`
  gate: it is a design question, not a bug. The `--auto` diagnosis skip now also
  requires a reproduction and a confirmed probe.

- **Context diet** — every command, both modes. Measured with `tests/token-report.py
  static` (main-context load, tokens ≈ bytes/4), no behavior change:

  | Command | before | after | change |
  |---|---|---|---|
  | `/ship` | 21,080 | 16,844 | −20.1% |
  | `/feature` (full mode) | 10,623 | 8,368 | −21.2% |
  | `/ship --auto` | 21,080 | 17,484 | −17.1% |
  | `/feature --auto` | 10,623 | 9,008 | −15.2% |

  - The `--auto` policy (tag behavior, Hard-Override List, ambiguity heuristic,
    auto-log visibility) moved verbatim from SKILL.md to `shared/auto-mode.md`; §A
    loads it only when the flag is present. Without the flag every gate asks, so the
    text was dead weight in every interactive run.
  - `/ship` no longer loads all of `commands/implement.md` and `commands/focus.md`.
    The story flow (constraints → plan → pre-review → implement → verify → record)
    is `shared/story-flow.md`, shared by `/implement` and `/ship` Phase 1; release on
    success is `shared/focus-release.md`, shared by `/focus done` and every chain.
  - Visual capture dispatch and its auto-row markers moved to `shared/visual-capture.md`,
    read only when `.claude/visual-capture.md` exists.
  - Restated preamble blocks became one-line references: the focus write (§B) in nine
    commands, the auto-mode summary (§C, which now also states what to count) in five,
    the PLAN-mirror sentence in four.
  - Duplicates dropped where a loaded file already states the rule: `ship.md`'s SCRIBE
    rules (`ae-scribe.md` carries them; the parent's app-docs tree creation stays in
    Phase 5), SKILL.md's compact-gate template (`/ship-all` and `/plan-all` own theirs),
    `/feature` gotchas that repeated its stage text, story-flow gotchas that repeated its
    constraints. `/feature` no longer reads `shared/project-mode.md` — its Step 0c
    table is complete.
  - The "untagged `[AUTO:]` is deliberate" note is authoring guidance, not runtime
    policy; it moved to `CLAUDE.md`.

### Fixed

- **`argument-hint` values that YAML reads as lists, or cannot read at all.**
  `converge`'s `[feature-name] [--auto]` was invalid YAML, and thirteen other wrappers'
  `[--auto]`-style hints parsed as one-element lists rather than strings. All bracketed
  hints are now quoted. Found by the new frontmatter test.

### Migration

- **`PROGRESS.md` story entries gain an optional `### Evidence` subsection**
  (between `### AC Coverage` and `### Edge probes`). Nothing to do for existing
  features: entries without it stay valid, and `ae-req` gates only a story whose box
  is ticked *in the diff under review* — stories ticked before this release are never
  re-judged. `/status`, `/archive` and `ae-test` key on `### AC Coverage` and ignore
  the new heading. Tooling of your own that parses `PROGRESS.md` sections should expect
  one more `###` block per new story.

## [2.1.1] — 2026-09-15

Entry added retroactively in 2.2.0; the version shipped without one.

### Fixed

- **Superseded decisions no longer read as current in the session-start scan.**
  `DECISIONS.md` is read titles-only, and a superseded entry's marker lived only on its
  `status:` line below the heading, so every session read a reversed decision as
  current. `/cleanup` now also prefixes the title with `[superseded]`, and
  `shared/preamble.md` §D skips those titles (a superseded entry is still read in full
  when a change touches its subject).
- **`/archive`'s `SUMMARY.md` says what the feature was.** New conditional `## What it
  was` (the PRD's problem statement, ≤3 lines, plus the `**Approach:**` line and the
  option it beat) and `## Where it lives` (directories touched, existence-checked).
  The story line's AC digest is now required. `## Non-Goals` is never copied: it
  describes the world at plan time, and frozen into a summary it becomes false
  statements about the product.

## [2.1.0] — 2026-09-14

### Changed

- **`/archive` is now an extraction command; deletion is the side effect.** It
  used to compact files. The thing worth keeping was never a file — it was a
  handful of constraints scattered inside them, and the old command deleted
  them. Run against a repo with 108 feature directories and two years of
  history, `--all` discarded 97.3% of 2,543 KB and what survived was a list of
  story titles that `CHANGELOG.md` and `git log` already carried.

  Content now routes by destination, chosen by what actually gets read:

  | Content | Goes to |
  |---|---|
  | Constraint that still binds code | `docs/DECISIONS.md` — `DEC-NNN`, `source: archive` |
  | Open obligation — unmet gate, override, deferred measurement | `docs/BACKLOG.md` — `NOTE-NNN` |
  | Story list, frozen test rollup, pointers | `SUMMARY.md` |
  | Narrative, review transcripts, epics | deleted — git has it |

  `SUMMARY.md` is explicitly demoted to an **index**. Nothing reads it
  automatically: `/status` takes the story count and rollup, `/analyze` opens it
  only when already investigating that feature, `/plan-all` uses it as a skip
  marker. Writing durable knowledge there moves it from *deleted* to *present
  but unread*. Its `## Decisions` and `## Open at completion` sections are
  pointer lines — ids and a link, never restated content — so the file gets
  smaller, not richer. `MEMORY.md` is never written: it is line-capped and
  `/cleanup` rewrites it wholesale.

- **Extraction is proposed, reviewed, then applied — `/archive` now has two
  phases.** Reconstructing a decision from docs written two years ago, with no
  author to check against, produces some entries that are wrong, stale, or a
  restatement of what the code plainly says; `/cleanup` already names the cost
  ("an invented `DEC-` entry is worse than none, because it trains the next
  agent to ignore the file"). Phase 1 (`/archive <feature>` or `--all`) writes
  `SUMMARY.md` files plus `.agentic/archive-extract.md` and
  `.agentic/archive-plan.md`, and deletes nothing. The human edits the extract
  file in an editor — **delete a block and it is never written** — then
  `/archive --apply` commits it. A hundred proposed entries cannot be reviewed
  in a chat widget, which is the only reason the second phase exists; a feature
  that proposes nothing skips it and applies behind a single gate.

  Backfilled entries carry `source: archive · confidence: reconstructed` and
  the feature's **ship date**, never today's, and append under a trailing
  `## Backfilled from archive` heading so the live section stays newest-first
  and reconstructions never masquerade as recent decisions. Titles must stand
  alone, because `DECISIONS.md` is read titles-only at session start and that
  one line is the entire anti-re-litigation payload.

- **Superseded decisions no longer lie to the session-start read.** `/cleanup`
  marks a contradicted `DEC-` entry and never deletes it — correct, because the
  reason an approach was dropped is the value of the file. But the marker lived
  only on the `status:` line, one line *below* the heading, and `DECISIONS.md`
  is read **titles only** at session start. So every session read
  `## DEC-042 — Canonical intermediate format is XLIFF` with nothing saying it
  had been superseded two years earlier: a wrong fact in the read path, not
  merely stale noise. `/cleanup` now also prefixes the superseded entry's title
  with `[superseded]`, and `shared/preamble.md` §D skips those titles in the
  session-start scan — one grep, no two-line parsing. A superseded entry is
  still read in full when the current change touches its subject. `/init` seeds
  the convention into new projects' `DECISIONS.md` header. This gets more
  load-bearing as archive backfill grows the file.

### Fixed

- **`/archive` verified none of its own premises, and `--all` was unsafe to run
  on a project with real history.** Six defects, all found by the run described
  above.

  - **`PROGRESS.md` is now the status source; `STORIES.md` checkboxes are
    fallback only.** The old guard required every checkbox ticked. Checkboxes
    are written during `/implement` and routinely never ticked back, so the
    guard was wrong in both directions at once — it refused ~70 genuinely
    shipped features (one was `complete ✅ 8/8` in `INDEX.md` with 53 unticked
    boxes) while approving a feature whose `PROGRESS.md` said "PR open" and
    whose branch was 41 commits ahead. Story-id matching no longer assumes the
    `STORY-NNN` shape, the heading dialect (`## STORY-093 —`) is no longer read
    as an unchecked box, and `- [~]` partial markers — invisible to a
    checked/unchecked count — refuse the feature. A feature whose branch is
    unmerged is refused outright: an open PR means reviewers are still reading
    the files about to be deleted.

  - **The `DECISIONS.md` premise is now verified per feature instead of
    assumed.** `## Decisions` linked rather than restated on the grounds that
    `/cleanup` had already written every decision to `docs/DECISIONS.md`. That
    held for 7 of 94 features — `DECISIONS.md` was younger than most of the
    project, and 9 of 10 sampled older features appeared in it zero times. For
    ~85 features the archive was not compacting a duplicate, it was deleting
    the only copy of the reasoning. `/archive` now checks, per feature, whether
    `DECISIONS.md` holds entries attributable to it by `story:` field, feature
    slug or issue number, and extracts what nothing covers.

  - **Open obligations are routed to `BACKLOG.md`.** Overridden quality gates
    were recorded in exactly one place — the shipping feature's `PROGRESS.md` —
    and the old template had no slot for them at all, so archiving deleted the
    record of what a program still owed itself. They are debt, not history:
    they go to the backlog at `Priority: high`, not into a summary nothing
    reads.

  - **Inbound citations into the delete set are found before anything is
    deleted.** Nothing looked. Seven live citations pointed into the delete
    set, including shipped source citing a `PRD.md` for the rule it implements.
    A pre-gate grep now buckets hits — source code and live docs block,
    `CHANGELOG.md` and settings globs are informational — shows them at the
    gate, and repoints them in the same commit as the deletion. A repoint is
    only offered when the cited claim survived extraction.

  - **A PRD-only feature is no longer eligible.** No `STORIES.md` and no
    `PROGRESS.md` means there is nothing to compact; archiving trades a full
    PRD for a thinner summary at zero benefit.

  - **Recency is reported at the gate.** A feature completing long ago does not
    mean its docs are finished with — one had its PRD amended with a real
    finding and cited from shipped source, and 20 of 94 candidates had working
    docs edited within six weeks. `/archive` now reports each feature's last
    doc edit and flags anything inside 90 days as *recently amended — still in
    use*. Flagged, never auto-excluded; the human decides.

- **The `--all` gate is renderable.** Bulk mode showed a deletion list plus a
  rendered `SUMMARY.md` per feature in one combined gate — thousands of lines
  of chat at 94 features, against SKILL.md's cap of 5 surfaced items. The gate
  now shows file counts, the aggregate byte compression ratio, the extraction
  totals, the coverage / citation / recency warnings, 2–3 rendered samples, and
  the on-disk paths; the full per-feature table goes to
  `.agentic/archive-plan.md`. Cancelling leaves the written summaries
  untracked, which the gate now says, with the `git clean` line to undo them.

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

[Unreleased]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v2.1.0...HEAD
[2.1.0]: https://github.com/thebedcoder/skills/compare/agentic-engineering-v2.0.0...agentic-engineering-v2.1.0
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
