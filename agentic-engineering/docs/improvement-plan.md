# Improvement plan — lessons from obra/superpowers

Audit of `agentic-engineering` 2.1.1 against nine gaps found in a comparison with
[obra/superpowers](https://github.com/obra/superpowers). Each item is checked against
the real files first, then classified `missing`, `partial` or `already covered`.
Citations are `file:line` in this plugin at commit `9f7d970` (paths relative to
`agentic-engineering/`, `SKILL.md` = `skills/agentic-engineering/SKILL.md`,
`commands/X.md` = `skills/agentic-engineering/commands/X.md`).

What superpowers contributed is the *mechanism*, not the wording: a SessionStart hook
that injects a bootstrap note on `startup|clear|compact`, headless `claude -p`
scenario tests with transcript assertions and a token report, transcript-based
session diagnosis, a worktree create → baseline → finish menu, an evidence-before-claims
rule, a brainstorming intent pass, and a four-phase debugging discipline. None of its
persuasion style is carried over.

**Things that must not get weaker** (checked after every item): traceability
(FR → story → AC matrix), contract claims and failure states, the 7-agent parallel
review, the `docs/` tree, every `--auto` gate and the hard-override list.

## Summary

| Item | Classification | Mode affected | Status |
|---|---|---|---|
| P1-a SessionStart router hook | missing | both | planned |
| P1-b Test harness | partial | both | planned |
| P2-a Worktree lifecycle for `[P]` stories | missing | both | planned |
| P2-b Evidence gate before completion | partial | both | planned |
| P2-c `/diagnose` | missing | both | planned |
| P3-a Clarifying pass for vague `/feature` input | partial | full only | planned |
| P3-b Debugging depth in `/fix` | partial | both | planned |
| P3-c Context diet | partial | both | planned |

**Dropped as already covered: none.** Every item has at least one real gap. Where
part of an item already exists, the plan below reuses it rather than rebuilding it,
and says which part is out of scope for that reason.

---

## P1-a — SessionStart router hook

**Classification: missing.**

Current state:
- No `hooks/` directory; the plugin registers no hooks at all.
- Routing depends on the skill description firing (`SKILL.md:3-18`), which it does
  only when the model decides to load the skill. Nothing re-establishes the workflow
  after `/compact`, which is exactly when the framing is lost.
- `SKILL.md:251` tells the model to read `INDEX.md`, `MEMORY.md`, `CONSTITUTION.md`
  "at session start" — but that line is inside the skill, so it is read only after
  the skill loads, i.e. never at session start on its own.
- `.agentic/focus.md` already holds the active task per worktree
  (`commands/focus.md:5`, `shared/project-mode.md:42`) and the status line shows it
  (`agentic-statusline.sh`), but the model is never told about it.

Change:
- `hooks/hooks.json` — one `SessionStart` entry, matcher `startup|clear|compact`,
  command `bash "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"`.
- `hooks/session-start.sh` — pure bash, no `jq`/`python` dependency. Emits exactly
  one JSON object: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":…}}`.
  - Always: a short intent → command table (bug → `/fix`, idea → `/note`, small change
    → `/improve`, new feature → `/feature`, "what's left" → `/status`), and a line that
    an explicit slash command or system-prompt instruction wins over the table.
  - No `docs/INDEX.md` in the project → the router only, prefixed with a line saying
    the workflow is not set up here, so ordinary requests stay ordinary work (matches
    the skill description's own rule at `SKILL.md:6-7`). No file reads beyond the
    existence check.
  - `docs/INDEX.md` present → also tell the agent to read `docs/INDEX.md`,
    `docs/MEMORY.md` (and `docs/CONSTITUTION.md`) before changing code, naming only the
    files that exist.
  - Active CURRENT in `.agentic/focus.md` → inline the title, feature, `set_by`, and
    PLAN progress (`k/n done — next: …`), and tell the agent to surface it in its
    first reply.
  - Hard cap of 40 injected lines; control characters stripped; always exits 0.
  - Opt-out: `AGENTIC_SESSION_HOOK=0` emits nothing (for headless drivers that want a
    bare context).

Files touched: `hooks/hooks.json`, `hooks/session-start.sh` (new), `README.md`
(new "Session hook" section + hooks table), `CLAUDE.md` (architecture note),
`CHANGELOG.md`.

Risk:
- Token cost in every session of every project with the plugin enabled, including
  non-agentic ones. Mitigated by the 40-line cap and a ~10-line router-only form
  outside initialized projects.
- A focus title is user-written text going into JSON; escaping must be exact or the
  hook output is dropped. Covered by P1-b static tests with hostile titles.
- Could fight a headless run driven by `--append-system-prompt`. Mitigated by the
  explicit-instruction-wins line and the opt-out variable; P1-b scenarios all run
  with `--append-system-prompt` and the hook active.

Done when:
- [ ] A fresh `claude -p` session in an initialized project with an active focus
      names the focus task in its first reply without being asked.
- [ ] The same holds after `/compact` (hook fires with `source: compact`).
- [ ] A session in a repo without `docs/INDEX.md` gets only the router block.
- [ ] Hook output is a single valid JSON object with only `hookSpecificOutput`.
- [ ] Headless runs with `--append-system-prompt` still follow their instructions.

---

## P1-b — Test harness (static infra tests + behavioral scenarios)

**Classification: partial.**

Current state:
- `CLAUDE.md:80` — "There are no tests." Root `CLAUDE.md:7` says the same for the repo.
- Structural invariants exist, but only as an *edit-time* PostToolUse hook in the repo
  (`../.claude/hooks/check-integrity.sh`, checks A–J: wrappers have bodies, bodies are
  routable, wrappers pass `$ARGUMENTS`, no `user-invocable`, manifests parse, agents
  declare `name:`, flat `agents/`, no Bash on reviewers, no `~/.claude`, description
  cap). They fire only when someone edits a file inside Claude Code; nothing runs them
  in CI or over the whole tree.
- `../.claude/skills/verify-install/SKILL.md` is a manual checklist that needs a
  logged-in `claude`.
- Nothing exercises behavior: sequential review dispatch, `--auto` hard-overrides and
  converge's false-completion rule are asserted only in prose (`commands/review.md:135`,
  `SKILL.md:173-178`, `commands/converge.md:71`).

Change — `tests/` with two layers and one entry point:
1. **Static** (`tests/static/*.sh`, bash + python3 stdlib, no API key):
   frontmatter of every wrapper and agent parses and carries required keys; every
   `${CLAUDE_PLUGIN_ROOT}/…` path and every `agentic-engineering:ae-*` dispatch name
   resolves; no `~/.claude` literal in shipped content; README command table and
   SKILL.md command map both match `commands/`; `hooks.json` valid and its script
   exists; the hook script emits valid JSON under every fixture (plain, initialized,
   active focus, hostile focus title, compact source, empty/garbage stdin, opt-out).
2. **Behavioral** (`tests/behavioral/scenarios/*.sh`): each builds a throwaway fixture
   project, runs `claude -p --output-format stream-json --verbose --plugin-dir …
   --append-system-prompt …` with the prompt on stdin, and asserts on the transcript
   through `tests/lib/transcript.py`. Scenarios:
   - "fix this failing test" routes to `/fix` (Skill call `agentic-engineering:fix`
     or a read of `commands/fix.md`).
   - `/ship` Phase 2 dispatches all seven reviewers in one assistant message
     (grouped by `message.id`).
   - `/ship --auto` hard-pauses when the story needs a table-creating migration, and
     no migration lands.
   - `/converge` reports a checked story with no matching code as a blocker.
   - (from P1-a) a fresh session names the active focus task.
3. `tests/run-tests.sh` — `--static`, `--behavioral`, `--scenario NAME`, `--model`.
   Behavioral runs are skipped with a `SKIP` line and exit 0 when `claude` is missing,
   or when neither `ANTHROPIC_API_KEY` is set nor `claude auth status` reports a
   login.
4. `tests/token-report.py` — modeled on superpowers' `analyze-token-usage.py`:
   per-scenario cost, turns, per-model tokens and per-subagent usage from the
   stream-json `result`/`task_notification` events; plus a static per-command
   **load estimate** (wrapper + SKILL.md + command body + shared blocks + nested
   command bodies) that P3-c measures against.
5. `.github/workflows/agentic-engineering-tests.yml` — static job on every push/PR
   touching `agentic-engineering/**`; behavioral job on `workflow_dispatch`, which
   installs the CLI and skips cleanly without the `ANTHROPIC_API_KEY` secret.

Files touched: `tests/**` (new), `.github/workflows/agentic-engineering-tests.yml`
(new, repo root), `.gitignore` (test output), `CLAUDE.md` ("Verifying changes"
section), `README.md` (Testing section), `CHANGELOG.md`.

Risk:
- Behavioral scenarios are slow, cost money and are non-deterministic. Mitigated by
  tiny fixtures, `--max-budget-usd` per scenario, assertions on mechanism (dispatch
  grouping, file state, logged lines) rather than prose, and never running them in
  default CI.
- `bypassPermissions` is refused when running as root; the harness uses
  `--permission-mode acceptEdits` plus an explicit `--allowedTools` list instead.
- `--allowedTools` is variadic and swallows a trailing prompt argument; prompts go on
  stdin.
- Parent Claude Code env vars (`CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`) leak into
  nested runs; the harness unsets them and passes an explicit `--session-id`.

Done when:
- [ ] `tests/run-tests.sh --static` passes locally and in the GitHub Actions workflow.
- [ ] `tests/run-tests.sh --behavioral` runs every scenario with one command and
      prints a token report per scenario.
- [ ] With no credentials, behavioral runs print `SKIP` and exit 0.
- [ ] At least the four listed scenarios exist.

---

## P2-a — Worktree lifecycle for `[P]` stories

**Classification: missing.**

Current state:
- `commands/ship-all.md:58-59` tells the user they "could open multiple Claude Code
  sessions" for `[P]` stories; `commands/ship-all.md:190` says ship-all itself always
  runs sequentially. Creating, baselining and cleaning up a worktree is entirely manual.
- `.agentic/focus.md` is already per-worktree (`commands/focus.md:5`,
  `shared/project-mode.md:42`) — the right seam to seed.
- `README.md:276-278` describes `[P]` as a suggestion only.
- Parallel branches collide on shared docs: `/ship` Phase 5 prepends to both
  changelogs (`commands/ship.md:172-190`) and Phase 7 rewrites `MEMORY.md` and appends
  `DEC-NNN` (`commands/ship.md:201-203`). Two branches doing that in parallel produce
  merge conflicts and duplicate `DEC` numbers. `PROGRESS.md` is append-only per story.

Change:
- `/ship-all`, when the session overview shows a `[P]` group of two or more stories,
  offers `[ASK: single]` **Ship them here, one by one (Recommended)** · **One worktree
  per story** · **Skip the group**. Tag `[AUTO: skip]` — under `--auto` the offer is
  skipped and the group ships sequentially, as today. Opt-in only.
- Worktree path (`shared/worktree.md`, loaded only on that branch):
  - `git worktree add .worktrees/<story-slug> -b feat/<feature>-<story-id>` from the
    current branch; verify `.worktrees/` is ignored first (`git check-ignore`), add it
    to `.gitignore` if not.
  - Baseline: run the project's test command inside each worktree through the P2-b
    evidence script; failing baseline → report and ask, never hide it.
  - Seed each worktree's `.agentic/focus.md`: CURRENT = the story, `set_by: /ship-all
    (worktree)`, plus `worktree_of:` and `worktree_base:` lines; PLAN empty.
  - Print one line per worktree: `cd <path> && claude`, then `/ship STORY-XXX`.
- `/ship` in a seeded worktree (detected by `worktree_of:` in CURRENT) runs Phases
  1–4 and 6 and **defers Phase 5 (changelogs) and Phase 7 (cleanup) to the merge**,
  recording `deferred to merge (worktree)` on those PLAN lines. Story-scoped files
  (code, tests, `STORIES.md` checkbox, `PROGRESS.md` entry, `reviews/`) still land on
  the branch.
- Finish: the next `/ship-all` run in the main tree reconciles worktrees under
  `.worktrees/` first, and for each offers `[ASK: single]` **Merge into <base>
  (Recommended)** · **Push and open a PR** · **Keep the worktree** · **Discard it**.
  Tag `[AUTO: always-ask]`. Merge runs `scripts/worktree.sh merge`, which resolves an
  append-only `PROGRESS.md` conflict by keeping ours and appending exactly what their
  side added (plain `--union` interleaves entries — found by the test) and stops on
  anything else, then runs the
  test command on the merged result, then runs the deferred Phase 5 + 7 in the main
  tree. Worktree removal and branch deletion happen only after the chosen action
  succeeds; Discard shows the commits and files it would destroy first and asks again.
- `scripts/worktree.sh` — deterministic helper: `create`, `list`, `merge`, `remove`.

Files touched: `commands/ship-all.md`, `commands/ship.md` (worktree-mode deferral, a
few lines), `shared/worktree.md` (new), `scripts/worktree.sh` (new),
`tests/static/worktree.sh` (new), `README.md` (Parallel stories section),
`CHANGELOG.md`.

Risk:
- A merge that silently mangles `PROGRESS.md`. Mitigated by append-by-construction
  limited to the known append-only file (abort when their side edited rather than
  appended), a static test that merges two real worktree branches
  and checks both entries survive intact, and stopping on any other conflict.
- Destructive cleanup under `--auto`. Mitigated: removal/deletion gates are
  `[AUTO: always-ask]` and never listed as skippable; `worktree.sh remove` refuses a
  dirty worktree without an explicit flag the command never passes on its own.
- Mode: both. Lite mode has no epics but has `[P]` stories via `/feature` lite.

Done when:
- [ ] A feature with two `[P]` stories can be shipped in two worktrees and merged
      back, with both `PROGRESS.md` entries intact and both stories checked in the
      main tree (static test drives the script end to end).
- [ ] Nothing is removed or deleted until the user picks an option; under `--auto`
      the finish menu still asks.

---

## P2-b — Evidence gate before completion

**Classification: partial.**

Current state:
- `commands/implement.md:143-149` — PROD's acceptance check wants `evidence: file:line
  or test name`, which is a *pointer*, not a run.
- `commands/implement.md:245,252` — test-first and revert-to-prove-the-regression-test
  rules exist; `commands/implement.md:247` says "Complete ≠ implementation done … tests
  pass" but never requires output.
- `commands/ship.md:277` — "Fixed ≠ self-attested" re-runs review, not tests.
- `commands/fix.md:193` requires the regression test to fail before the fix; nothing
  requires the passing run to be recorded.
- `agents/ae-req.md:200-231` (Mode A) checks criteria and constitution only.
- `/converge` catches a checked story with missing code (`commands/converge.md:71`),
  but only after the fact and only for missing code, not for unverified claims.

Change:
- `scripts/evidence.sh run --phase <p> -- <test command>` runs the command, streams its
  output, and prints one `EVIDENCE-ROW:` Markdown row: phase, command, exit code, the
  runner's own summary lines, timestamp, and a **code tree id** — `git write-tree` of
  the working tree through a temporary index, excluding `docs/`, `app-docs/`,
  `.agentic/`. Same id before and after commit; any code edit changes it.
- `scripts/evidence.sh check <PROGRESS.md> <STORY-ID> [diff]` prints `fresh`, `stale`,
  `failing` or `missing` by comparing the latest row with the current tree id, plus
  whether the diff checks the story's box.
- `/ship` (Phase 1 record, after Phase 2/4 blocker fixes, after Phase 3) and `/implement`
  add an `### Evidence` table to the story's `PROGRESS.md` entry, one row per run.
- `/review` Step 0c runs `evidence.sh check` into `.agentic/review/<ID>.evidence` and
  passes the path to `ae-req`.
- `ae-req` Mode A gains Part 3 — Evidence: a story whose box is checked **in the diff
  under review** with an evidence verdict other than `fresh` is a **Blocker**.
  Stories checked before the diff (older entries) are out of scope — backward
  compatible with every existing `PROGRESS.md`.
- `/fix` and `/improve` have no story entry by design (`commands/improve.md:8,116`),
  so their evidence goes in the completion block and as an `Evidence:` trailer in the
  fix/improve commit; when the fix targets a story's feature, the row is also appended
  to that story's `PROGRESS.md` Evidence table with phase `fix`.
- Gotcha in `/ship`, `/implement`, `/fix`, `/improve`: **claimed green without
  running**.

Files touched: `scripts/evidence.sh` (new), `commands/{ship,implement,fix,improve,review}.md`,
`agents/ae-req.md`, `tests/static/evidence.sh` (new), behavioral scenario for REQ via
`--agent`, `README.md`, `CHANGELOG.md` (with a **Migration** note — `PROGRESS.md`
gains an optional `### Evidence` subsection; old entries stay valid).

Risk:
- Blocking on a flaky tree id (e.g. untracked build output). Mitigated: the id uses
  `git add -A` semantics, so ignored files never count; static test proves the id is
  stable across commit and changes on a code edit.
- Monorepos where "the test command" is several commands: one row per command.
- Mode: both (mode-blind — lives in `STORIES.md`/`PROGRESS.md`, which both modes have).

Done when:
- [ ] `ae-req` reports a Blocker for a story checked in the diff whose evidence is
      missing or stale, and no blocker when a fresh row exists (behavioral, `--agent`).
- [ ] Static test: tree id stable across commit, changes after a code edit, ignores
      `docs/` edits.

---

## P2-c — `/diagnose` command

**Classification: missing.**

Current state:
- No command reads transcripts. `.agentic/auto-log.md` records `DECISION:`,
  `SKIPPED:`, `HARD-PAUSE:` (`SKILL.md:187-197`), but nothing compares a run against a
  command's contract.
- The contracts exist and are precise: seven reviewers in one batch
  (`commands/review.md:65`), seven PLAN lines (`commands/ship.md:20-28`), gate tags per
  checkpoint (`commands/ship.md:242-252`), namespaced dispatch (`SKILL.md:68`).

Change:
- `commands/diagnose.md` wrapper with `context: fork`; body
  `skills/agentic-engineering/commands/diagnose.md`.
- `scripts/transcript-digest.py <session.jsonl | session-id>` — reads on-disk
  transcripts (`${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/<slug>/<id>.jsonl`, plus
  `<id>/subagents/`) or stream-json. Emits a compact, line-cited digest and never
  prints tool-result bodies: commands invoked, command bodies read, Agent dispatches
  grouped by assistant `message.id`, PLAN writes, questions asked, test runs, commits,
  compactions. `--check` adds mechanical `DEVIATION:` lines (review batch split across
  messages, bare `ae-*` dispatch names, reviewer count ≠ 7/6).
- The command compares the digest with the invoked command's contract (phases, batch,
  gates hit vs skipped under `--auto`, auto-log entries) and reports deviations, each
  with `path:line` quotes.
- `--bundle` writes a scrubbed bundle (`.agentic/diagnose/<id>/`: report, digest,
  issue body) — emails, home paths, tokens and remotes redacted — and tells the user
  to review it before sharing. It never posts anything.

Files touched: `commands/diagnose.md` (new wrapper), `skills/agentic-engineering/commands/diagnose.md`
(new), `scripts/transcript-digest.py` (new), `SKILL.md` (command map row),
`README.md` (commands table), `tests/fixtures/transcripts/sequential-review.jsonl`
(new), `tests/static/diagnose.sh` (new), behavioral scenario, `CHANGELOG.md`.

Risk:
- Transcript lines can be megabytes; reading them raw floods the fork. Mitigated: the
  digest truncates every field and the body forbids `cat`/unbounded reads.
- Transcript format is undocumented and may drift. Mitigated: digest reads only
  `type`, `message.id`, `message.content[].{type,name,input}` and ignores unknown
  records; static test runs against a fixture shaped from a real 2.1.286 transcript.
- Needs `python3`; body falls back to bounded `grep -n` extraction without it.

Done when:
- [ ] Run against a transcript where the review agents were dispatched one per
      message, `/diagnose` names the sequential-dispatch deviation and quotes the lines
      (static via `--check`; behavioral via the command).

---

## P3-a — Clarifying pass for vague `/feature` input

**Classification: partial.**

Current state:
- Full mode goes straight from `$ARGUMENTS` to ARCH's three approaches
  (`commands/feature.md:69-100`). A one-line idea gets three architectures before
  anyone knows who it is for.
- `[NEEDS CLARIFICATION]` exists but only *after* the PRD is drafted
  (`commands/feature.md:110`, Stage 2b at `:136-154`).
- Lite mode already has a one-round thin-description ask at story breakdown
  (`commands/feature.md:188`) — out of scope here.

Change: new **Stage 0 — Intent check** in `/feature`, full mode only, skipped under
`--auto` (`SKIPPED: intent check [auto]`, the gaps become `[NEEDS CLARIFICATION]`
markers in the PRD so Stage 2b still surfaces them). PROD checks the input for three
things — **user**, **outcome**, **constraint**. All three present → no questions.
Otherwise at most 3–5 questions, one per message, `[ASK: prose]` (or `[ASK: single]`
when the options are known), stopping as soon as all three are answered. Answers are
written back as a 3-line intent note that feeds Stage 1 and the PRD's Problem/Goals;
Stage 2b never re-asks them.

Files touched: `commands/feature.md`, `README.md` (commands table row),
`CHANGELOG.md`.

Risk: extra round-trips on inputs that were fine. Mitigated by the three-question
presence check (a complete input asks nothing) and the hard cap.

Done when:
- [ ] Full mode with a vague input asks ≤5 questions, one at a time, before ARCH's
      approaches; a complete input asks none; `--auto` and lite skip it.

---

## P3-b — Debugging depth in `/fix`

**Classification: partial.**

Current state (`commands/fix.md`):
- Present: reproduction path, root cause at file:line, blast radius, fix plan with
  scope boundary, risk (`:58-77`); regression test must fail first (`:193`); reproduce
  before confirming (`:194`); one bug, one fix (`:191`); root cause not symptom (`:192`).
- Missing compared with superpowers' systematic-debugging: an *executed* reproduction
  with its output; checking recent changes (`git log`/bisect) for regressions;
  tracing a bad value backwards to its origin, with boundary instrumentation for
  multi-component paths; comparing against a working sibling; a single stated
  hypothesis tested with the smallest probe; stop-and-question-the-design after three
  failed fixes; defense-in-depth guards.

Change: extend Phase 1 with the missing steps (template gains `Reproduced:`, `Recent
changes:`, `Trace:`, `Working sibling:`, `Hypothesis:`); Phase 2 gains a fix-attempt
counter — the third failed attempt stops and asks `[AUTO: always-ask]`; defense in
depth only as guards planned in the Fix plan on this bug's own data path, each with a
test, so "one bug, one fix" holds. Temporary instrumentation is removed before commit.

Files touched: `commands/fix.md`, `CHANGELOG.md`.

Risk: longer diagnosis for trivial bugs. Mitigated: steps are "when applicable"
(recent-changes only for regressions, instrumentation only for multi-component
paths); reproduction and hypothesis are always required and are cheap.

Done when:
- [ ] `/fix` requires executed reproduction output, a single tested hypothesis, and
      stops after three failed fixes; "one bug, one fix" rule unchanged.

---

## P3-c — Context diet

**Classification: partial.**

Current state:
- `shared/preamble.md` already de-duplicated four blocks (§A–§D), but command bodies
  still restate them: the focus-write heuristic (`commands/ship.md:44-56`,
  `commands/implement.md:31-43`, `commands/fix.md:30-44`, `commands/improve.md:48-62`,
  `commands/feature.md:13-25`, `commands/review.md:12-24`), the auto-mode summary
  (`commands/ship.md:233-240`, `commands/fix.md:172-179`, `commands/improve.md:253-260`,
  `commands/feature.md:330-337`, `commands/implement.md:223-230`,
  `commands/ship-all.md:160-167`), release-focus blocks, PLAN-mirror sentences.
- `SKILL.md:157-201` (Auto Mode, ~45 lines) loads for every command although only
  `--auto` runs need it.
- `/ship` loads `commands/implement.md`, `review.md`, `frontend.md`, `cleanup.md` and
  `focus.md` on top of itself; the standalone-only parts of those files (their own
  PLAN, focus write, release, auto summary) are dead weight when nested.
- `commands/ship.md:255-266` restates SCRIBE's own rules, which `agents/ae-scribe.md`
  already carries into the subagent.

Change: measure with `tests/token-report.py --static` (load estimate per command),
then: replace restated preamble blocks with one-line references; move Auto Mode into
`shared/auto-mode.md`, loaded by §A only when `AUTO=true`; move release-focus into
preamble §E so `/ship` no longer loads `focus.md`; move story-flow core (plan →
implement → verify → record) into `shared/story-flow.md` so `/ship` stops loading
`/implement`'s standalone scaffolding; load visual capture only when
`.claude/visual-capture.md` exists; drop restated SCRIBE rules and gotchas that
duplicate rules stated above them.

Files touched: `SKILL.md`, `shared/*.md`, most command bodies, `CHANGELOG.md`.

Risk: dropping a rule while "de-duplicating". Mitigated: every removed line must have
a surviving copy in a file the same command still loads (checked by grep during the
work), and the P1-b behavioral scenarios run before and after with identical results.

Done when:
- [ ] Static load estimate for `/ship` and `/feature` down ≥20% versus the pre-diet
      tree, reported per command.
- [ ] P1-b static and behavioral suites pass before and after the diet.

---

## Blockers

None known at planning time. Headless `claude -p` works in this environment
(verified), so behavioral scenarios can run. Recorded here if one appears.
