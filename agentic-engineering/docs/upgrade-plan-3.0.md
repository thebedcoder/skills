# Upgrade plan 3.0 — a thin orchestrator, a fresh context per story, phases that run on

Input: the comparison *Superpowers vs Agentic Engineering* (Superpowers 6.4.2 at
`8ca22db`, this plugin 2.3.0 at `e5fac98`), its "Agentic Engineering could borrow"
list and its "Issues found" list, plus four asks from the owner:

1. Should the plugin move from one skill with many commands to many skills?
2. Planning on the session's (most capable) model; implementation on Sonnet, or Haiku
   where the work is mechanical.
3. A clean context for every story, to cut context use.
4. Phases switch on their own once planning is approved — no manual stop between
   them.
5. Anything else worth doing (proposed here, not built).

Citations are `file:line` at `e5fac98`, relative to `agentic-engineering/`;
`SKILL.md` = `skills/agentic-engineering/SKILL.md`, `commands/X.md` =
`skills/agentic-engineering/commands/X.md`.

**Things that must not get weaker** (checked after every item): FR → story → AC
traceability, Contract claims and Failure states, the seven-reviewer parallel batch,
the evidence gate, the hard-override list, and "a worktree is only merged, pushed or
discarded on a human answer".

## Summary

| Item | Source | Classification | Status |
|---|---|---|---|
| U1 One skill or many | ask 1 | decision | recommendation below — **no migration**; two cheap steps proposed (X1) |
| U2 Model per role | ask 2 | missing | built in this change |
| U3 Fresh context per story | ask 3 + borrow #1 | missing | built in this change |
| U4 Phases run on after planning | ask 4 | missing | built in this change |
| U5 Rulings with "cost if wrong" | borrow #3 | partial | built in this change |
| U6 Plan proportion check | borrow #4 | missing | built in this change |
| U7 Pressure-test before prose ships | borrow #2 | partial | built in this change |
| I1 License conflict | issue | — | **owner decision** — not changed |
| I2 `auto-mode.md` names the wrong commands | issue | bug | fixed + pinned by a test |
| I3 Installer says "6-agent review" | issue | bug | fixed (also `smart-setup` workflow spec) |
| I4 README "~75% token reduction" unmeasured | issue | bug | number removed |
| I5 A hand-written evidence row reads as fresh | issue | bug | fixed — run ledger |
| I6 The red run of TDD leaves no evidence | issue | missing | fixed — `--phase red --expect-fail` |
| X1–X8 | ask 5 | proposals | listed at the end — **not built**, need your OK |

Version: **3.0.0**. The default gate behaviour changes (U4) and two agents are added
(U2/U3), so existing users see a different flow without passing a new flag.

---

## U1 — One skill with 24 commands, or many skills?

**Recommendation: do not migrate.** Keep one router skill and the command surface;
take the two small steps in X1 instead.

Why the migration buys little today:

- **Commands already are skills in Claude Code.** Since the commands/skills merge a
  `commands/<name>.md` file and a `skills/<name>/SKILL.md` both create `/name`, take
  the same frontmatter (`model`, `effort`, `context: fork`, `agent`,
  `allowed-tools`, `disable-model-invocation`, `argument-hint`) and both appear in the
  model's skill listing. The SessionStart router already tells the model to invoke
  `agentic-engineering:<name>` through the Skill tool, and that works now. What a
  skill directory adds is `name:`, `paths:` and a folder for supporting files — none
  of which U2–U4 need.
- **Model and context per command do not need skills.** U2 sets `model:` on the forked
  read-only command wrappers and per dispatch on subagents; U3 gets fresh contexts from
  subagents. Both work in the current layout.
- **The cost is real.** 24 descriptions to write, keep under the listing cap and audit
  for collisions with built-ins (`/review`, `/init`, `/design`, `/status`…); the
  claude.ai `.skill` archive and the AGENTS.md adapter both assume one skill; the
  static tests, the integrity hook, `load-manifest.json`, both command tables and
  `/verify-install` are keyed to `commands/`. The policy layer in `SKILL.md`
  (principles, `[ASK:]`/`[AUTO:]` taxonomies, output rules) would have to be loaded by
  every one of the 24 skills.

What the question points at — too much in the always-on listing, and the model being
able to start destructive flows by itself — is real and cheap to fix without a
migration (X1).

**When to revisit:** if claude.ai stops being a target (no `.skill` archive), or if a
command needs `paths:`-scoped auto-activation. At that point split by *phase*
(plan · build · review · maintain, four skills), not by command.

---

## U2 — The right model for each role

**Classification: missing.** Today ARCH, PROD, FIXER and GIT are hats the main session
wears (`SKILL.md:76`), and so is implementation: `/ship` Phase 1 writes the code in the
main session (`commands/ship.md:98`). Only the reviewers have a model of their own
(Sonnet, DOC and SCRIBE on Haiku). The session model therefore writes every line of
code and reads every test log.

Change:

| Role | Who | Model |
|---|---|---|
| Orchestrator — gates, PROD checks, review consolidation, commits | main session | session model |
| Story plan — Contract claims, Failure states, files, test plan, frontend plan | new `agentic-engineering:ae-arch` subagent | `inherit` = session model |
| Build — tests first, code, evidence | new `agentic-engineering:ae-impl` subagent | `sonnet`; `haiku` for mechanical stories; session model for a third fix round |
| Reviewers | unchanged | `sonnet`; DOC `haiku` |
| End-user docs | `ae-scribe`, unchanged | `haiku` |
| `/status` (forked) | wrapper `model:` | `haiku` |
| `/analyze`, `/diagnose` (forked) | wrapper `model:` | `sonnet` |

**Implementer tier routing** (`shared/story-flow.md`). ARCH proposes, the orchestrator
decides and records it as an `Implementer:` line in the story's `PROGRESS.md` entry:

- `haiku` only when *all* hold: no Contract claims, no Failure states, at most three
  files, no new module or public interface, and the change copies a precedent ARCH
  cites by `file:line` (a field next to its siblings, a copy change, a config entry).
- `sonnet` otherwise — the default.
- the session model for fix round 3 (U4) or when the implementer returns `BLOCKED` on
  a capability problem.

The `model` parameter on the Agent call overrides the agent file's `model:`
(Claude Code resolves per-invocation first, frontmatter second), so one agent file
serves all three tiers. Agent files keep naming a tier, never a pinned id.

Files touched: `agents/ae-arch.md`, `agents/ae-impl.md` (new), `shared/story-flow.md`,
`commands/{ship,implement,frontend,improve}.md`, wrappers `status`/`analyze`/`diagnose`,
`SKILL.md` roster + new "Execution model" section, `README.md`, `CLAUDE.md`.

Risk:
- Haiku writes a subtly wrong implementation. Mitigated by the narrow routing rule,
  the unchanged review batch and the evidence gate — a Haiku build still has to pass
  seven Sonnet reviewers and a fresh green run.
- `inherit` means a user on a Sonnet session plans on Sonnet. That is what "session
  model" means; the README says so.

Done when:
- [x] Two agents ship with `model: inherit` and `model: sonnet`; `test_frontmatter.py`
      knows eleven agents and keeps the planner free of write tools.
- [x] `/ship`, `/implement`, `/frontend` and `/improve` dispatch `ae-impl` with an
      explicit `model` and record the tier in `PROGRESS.md`.
- [x] Behavioral scenario `13-ship-subagent-build` passes: `ae-arch` → RED + SEC
      pre-review in one message → `ae-impl` on `model: sonnet`; no main-thread write
      under `src/` or `test/`; red + green rows ledger-verified; `Implementer: sonnet`
      in `PROGRESS.md` (Sonnet run, $0.56).

---

## U3 — A fresh context for every story

**Classification: missing** (borrowable #1 in the comparison). The main session plans,
implements, reads every test log and fixes every blocker for every story, so
`/ship-all` depends on the human running `/compact` between stories — it has an
`always-ask` gate for exactly that (`commands/ship-all.md:112`) because "after 3–4
stories context fills and quality drops" (`commands/ship-all.md:185`).

Change — the main session becomes an orchestrator that holds artifacts, not work:

1. **Plan in a fresh context.** `ae-arch` reads the story, its code and the design
   handoff, runs read-only probes, and returns the plan. The orchestrator writes
   `.agentic/briefs/<STORY-ID>.md` (story verbatim + approved plan + test commands).
2. **Build in a fresh context.** `ae-impl` gets the brief path, writes tests first,
   records the red run and the green run through `evidence.sh`, appends the story's
   `PROGRESS.md` entry, writes `.agentic/briefs/<STORY-ID>.report.md`, and returns a
   status of at most 12 lines (`DONE` · `DONE_WITH_CONCERNS` · `NEEDS_PLAN_CHANGE` ·
   `BLOCKED`).
3. **Verify, don't trust.** The orchestrator runs `evidence.sh check` (fresh,
   ledger-verified, red present), compares `git status` with the plan's file list, and
   PROD checks each AC against the tests the report names — reading only those lines.
   Then it ticks the story. The implementer never ticks a box and never commits.
4. **Fix rounds reuse the implementer** (resumed with `SendMessage` when the harness has
   it, otherwise a fresh `ae-impl` with brief + report + blockers file), so the fix
   work stays out of the main context too.
5. **No compact gate between stories.** Each story leaves only the plan, two short
   statuses and the consolidated review in the main context. If the session
   auto-compacts anyway, the SessionStart hook already re-injects CURRENT and PLAN; it
   now also says to re-read the running command's body before resuming.

`.agentic/briefs/` is working state: gitignored with the rest of `.agentic/`, per
worktree. The durable record stays `PROGRESS.md` (Contract claims, Failure states,
AC coverage, evidence rows), exactly as today.

`/fix` keeps its fix in the main session: diagnosis and the one-hypothesis loop need
the conversation and the human, and the diff is usually a few lines. `/improve`
dispatches `ae-impl` for its Apply phase (the plan is already approved there).

Files touched: `shared/story-flow.md`, `commands/{ship,ship-all,implement,frontend,improve}.md`,
`hooks/session-start.sh`, `SKILL.md` "Context Management", `scripts/transcript-digest.py`
(new deviation: source edited in the main thread of a story chain with no `ae-impl`
dispatch), `tests/load-manifest.json`, `README.md`.

Risk:
- The brief is the implementer's whole world; a thin brief gives a wrong build. The
  brief carries the story verbatim and the full plan, and `NEEDS_PLAN_CHANGE` sends the
  implementer back rather than letting it improvise.
- A subagent can report success it did not earn. The orchestrator never takes the
  report's word: evidence is re-checked mechanically and the ledger (I5) makes a
  pasted row detectable.
- Background subagents lose `AskUserQuestion` and `Agent`. Neither planner nor
  implementer needs them: every question comes back to the orchestrator as a status.

Done when:
- [x] No chain command writes source code in the main session; `/diagnose` flags one
      that does.
- [x] `/ship-all` has no compact gate.
- [x] Behavioral `14-ship-all-runs-on`: two stories ship in one session with a fresh
      `ae-arch` + `ae-impl` each and no gate between them (Sonnet run, $0.45).

---

## U4 — Planning asks; execution runs

**Classification: missing.** Without `--auto` the chain stops at: the `/ship` start gate
(`commands/ship.md:97`), the story-flow plan gate (`shared/story-flow.md:99`), the
`/frontend` plan gate (`commands/frontend.md:52`), every story in `/ship-all`
(`commands/ship-all.md:90`), the compact gate (`commands/ship-all.md:112`, which is
`always-ask` even under `--auto`), and every review blocker. `/feature` and `/design`
end by telling the human to type the next command (`commands/feature.md:327`,
`commands/design.md:151`).

Change — one rule in `SKILL.md`, applied in each file:

> **Planning asks, execution runs.** `/feature`, `/design` and `/plan-all` stop at their
> gates. Once stories are approved, `/ship`, `/ship-all`, `/implement` and `/frontend`
> run to the end without a stop, except for: a plan escalation (new dependency, public
> interface change, disputed Contract claim, an operation on the hard-override list),
> a blocker that survives the fix loop or needs a decision, the third failed fix, and
> the human-only worktree finish.

- **Planning hands over to building.** `/feature`, `/design` and `/plan-all` end with
  one gate — *Build now* (all stories, or the P1 set) · *Design first* (UI features) ·
  *Stop here* — and chain straight into `/ship-all` (or `/design`) on the answer.
  `[AUTO: skip]` → under `--auto` they chain without asking.
- **No per-story approval.** The plan is printed and persisted; the gate fires only on
  its escalations, as `[AUTO: always-ask]`.
- **One start question in `/ship-all`**, asked only when not entered from a planning
  gate: scope, and — when a `[P]` group exists — sequential or worktrees, as one
  `AskUserQuestion` call with two questions. Never mid-chain.
- **Blockers go through a fix loop** (`shared/fix-loop.md`, loaded only when a review
  returns blockers): triage each blocker as *fix* or *decision*; decisions pause at
  once; fixes go to the implementer for up to two rounds on its tier and a third on the
  session model, each followed by a re-review from the reviewers that raised them.
  Survivors pause with the existing options. Standalone `/review` keeps its gate.
- **Hard-override #1** becomes "a blocker that survives the fix loop, or needs a
  decision rather than a fix". The rest of the list is unchanged.
- **`--auto` still means something:** it skips the planning gates' ceremony
  (intent check, PRD approval when clean, the Build gate), lets `ask-if-ambiguous`
  gates rule (U5), and keeps a worktree instead of asking how to finish it.

Files touched: `SKILL.md`, `shared/{story-flow,auto-mode}.md`, `shared/fix-loop.md`
(new), `commands/{ship,ship-all,implement,frontend,improve,feature,design,plan-all}.md`,
`README.md` "Human checkpoints", `adapters/AGENTS.md.template`, scenario `02`'s
resume note.

Risk:
- A user who liked approving each plan loses that stop. The plan is still printed
  before the build, every escalation still asks, and `/implement` alone still builds
  one story at a time for anyone who wants to look between stories.
- An auto-fixed blocker can be fixed wrongly. Each round is re-reviewed by the reviewer
  that raised the blocker, needs a fresh green run, and a regression test that fails
  with the fix reverted (`shared/story-flow.md` gotcha, now in the implementer's own
  rules).

Done when:
- [x] No `[AUTO: skip]` gate remains in an execution command's main path.
- [x] `/feature`, `/design`, `/plan-all` end on the Build gate and chain on its answer.
- [x] Scenario `14-ship-all-runs-on` (above).
- [x] Pressure test: scenario 13 `--against` the 2.3.0 plugin fails 7 of 10 checks (it
      stops at the plan gate); the run also exposed a commit check that the fixture's
      own commit satisfied — tightened to `feat(`/`test(` subjects.

---

## U5 — Rulings with "cost if wrong"

**Classification: partial.** Under `--auto` an ambiguous `ask-if-ambiguous` gate asks
(`shared/auto-mode.md:30`), and decisions are logged as `DECISION:` with a reason only.

Change: an ambiguous choice whose worst case is rework inside the current task is
decided and logged as a ruling; anything with cascading cost still asks.

```
RULING: <choice>
  why: <reason, citing CONSTITUTION.md when it applies>
  cost if wrong: <what breaks, how much rework>
  reversal: <the edit that undoes it>
  [auto]
```

Still asks: more than three files, public interface, data model, new dependency,
anything on the hard-override list, anything irreversible. `/cleanup` promotes a
ruling that sets a pattern to a `DEC-NNN` entry, so — unlike Superpowers — rulings
outlive the run. `§C`'s summary counts rulings.

Files: `shared/auto-mode.md`, `shared/preamble.md` §C, `commands/cleanup.md`.

---

## U6 — Plans proportional to the story

**Classification: missing.** Nothing bounds a plan's size; Superpowers cut planning time
to a quarter by recording decisions instead of code.

Change (in `ae-arch` and `shared/story-flow.md`): a plan records decisions, interfaces,
assertions and test scenarios — signatures, never bodies. Budget: about 40 lines for an
S story, 80 for M; a story that needs more is two stories. PROD's plan review gains
"is any section larger than the story needs?".

---

## U7 — Pressure-test new prose before it ships

**Classification: partial.** `CLAUDE.md` already asks for a behavioral scenario per new
gate or dispatch rule, but nothing shows the scenario would have *failed* without the
change, so a scenario that passes either way is indistinguishable from one that tests
the rule.

Change:
- `tests/run-tests.sh --against <git-ref>` runs scenarios with the plugin as it was at
  `<ref>` (a temporary worktree), while the harness and assertions stay current.
- Authoring rule in `CLAUDE.md`: a new gate or rule ships with a scenario that fails
  `--against` the parent commit and passes on the change. A scenario that passes on
  both proves nothing.

---

## Issues found in 2.3.0

- **I1 License — owner decision, not changed.** Every `plugin.json` in the repo and the
  README say MIT; the repo `LICENSE` is proprietary and grants no license. Either the
  manifests change to `"license": "SEE LICENSE IN LICENSE"` (and README's License
  section follows), or `LICENSE` becomes MIT. This is a legal choice for the owner.
- **I2** `shared/auto-mode.md:5` listed `/doc` and missed `/frontend` and `/plan-all`.
  The list is gone; the file points at `SKILL.md`'s, which `test_command_tables.py`
  already pins. The test now also fails if `auto-mode.md` grows its own list again.
- **I3** `install.sh:11` and `:63` said "6-agent review"; so did
  `smart-setup/skills/smart-setup/references/workflow-spec.md:37`. Now seven.
- **I4** README "Caveman rules … (~75% token reduction)" had no measurement behind it.
  The number is removed.
- **I5** `evidence.sh check` trusted row text. `run` now also appends each run to a
  ledger in the git common dir (`$(git rev-parse --git-common-dir)/agentic/evidence.log`
  — never committed, shared by worktrees). `check` looks the newest row up by phase,
  exit code, time and tree; a row with no matching run is `unverified`, which REQ
  blocks like `stale`.
- **I6** Only the green run was recorded. `evidence.sh run --phase red --expect-fail`
  records the failing-first run (exits 0 when the command fails as expected, 1 if it
  unexpectedly passes); `check` reports `red=present|missing`. REQ reports a missing
  red row as should-fix — `refactor` work legitimately starts green.

---

## Proposals — not built, need your OK (ask 5)

- **X1 Trim the always-on listing.** `disable-model-invocation: true` on the commands a
  human should start — `/archive`, `/worktree`, `/bootstrap`, `/init`, `/plan-all`,
  `/ship-all`, `/doc-all`, `/focus`, `/next`, `/cleanup`. Their descriptions leave every
  session's skill listing (about 10 × 30 words), and the model can no longer start a
  destructive flow by itself. The router's five targets stay model-invocable. This is
  the cheap half of U1.
- **X2 Headless story driver.** `scripts/ship-loop.sh`: one fresh `claude -p` session per
  story, resumable from PLAN, stopping the loop on any `HARD-PAUSE`. Zero shared context
  and runnable overnight or in CI; needs `--auto` semantics since `-p` has no
  `AskUserQuestion`.
- **X3 Measured cost per story.** Record each subagent's model and tokens in the
  story's `PROGRESS.md` entry. Gives the tier routing in U2 data instead of judgement,
  and backs the README's cost claims — Superpowers' one clear lead in the comparison.
- **X4 Risk-tiered review.** A Haiku-tier story or a docs-only diff gets RED + REQ +
  TEST; the full seven stay for everything else. Roughly halves review cost on small
  stories. Wants X3's numbers first.
- **X5 Parallel `[P]` builds inside one session** with the Agent tool's
  `isolation: worktree`. Blocked today: that worktree branches from the default branch,
  not the feature branch. Revisit when it can branch from `HEAD`.
- **X6 `effort:` per agent** — `high` for `ae-arch`, `medium` for `ae-impl` and the
  Haiku reviewers. Cheap to add, but untested; would want a planted-defect comparison
  like the one that moved REQ/TEST/UX to Sonnet.
- **X7 Reviewer memory** (`memory: project` on RED, SEC, LEAN) so recurring project
  patterns survive sessions. Overlaps the won't-fix log; speculative.
- **X8 Pressure-test in CI.** Run new or changed scenarios `--against` the base branch on
  pull requests that touch a gate (U7), so "fails before, passes after" is checked, not
  claimed.
