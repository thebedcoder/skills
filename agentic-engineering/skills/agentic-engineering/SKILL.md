---
name: agentic-engineering
description: >
  Full SDLC workflow (research → PRD → stories → implement → review →
  converge → docs) with named specialist agents. Fires only in a project
  that already has ./docs/INDEX.md; elsewhere feature/bug/refactor requests
  are ordinary work. In a scaffolded project use for: new feature,
  ship/implement a story, fix a bug, improve an existing feature (new
  format, shortcut, module split), document a feature, plan all epics, audit
  shipped code against the PRD, "what's next" / "let's start coding" (route
  to /status). Also "bootstrap a greenfield project", "scaffold agentic
  docs", "set up docs and constitution" — NOT bare /init or "initialize
  CLAUDE.md" (built-in /init). Do NOT trigger on: "review my diff/PR"
  (built-in /code-review); "simplify this", "clean up the diff" (built-in
  /simplify); bare /design with no story (built-in /design); "set up this
  project for Claude" (smart-setup); "update deps" or "fix vulnerabilities"
  from an advisory (update-dependencies); UI motion in a Flutter project
  (flutter-motion).
---

# Agentic Engineering

Phase-gated SDLC workflow. Named specialist agents. On-demand command loading.

## How to use

Command invoked → read its file under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/` — full instructions there; this file holds the policy every command inherits. Bodies also point at `shared/` blocks (same base dir): `preamble.md` §A–§D, and on-demand files loaded only on their branch — `auto-mode.md` (`--auto`), `story-flow.md` (story work), `fix-loop.md` (a chain's review returned blockers), `focus-release.md`, `worktree.md` (a worktree picked, present or finishing — `git config agentic.worktree` = `ask`·`always`·`never`), `visual-capture.md`.

## Command → File Map

| Command | File | Does |
|---|---|---|
| `/bootstrap` | `commands/bootstrap.md` | Scaffold project — stack, deps, structure |
| `/init` | `commands/init.md` | Docs scaffold + CLAUDE.md |
| `/feature [name]` | `commands/feature.md` | Research + PRD + stories |
| `/design` | `commands/design.md` | Mockups via Figma/Pencil/Markdown |
| `/implement` | `commands/implement.md` | Next unchecked story — `ae-arch` plans, `ae-impl` builds test-first |
| `/review` | `commands/review.md` | 7-agent parallel review (`--frontend-pass` drops LEAN) |
| `/ship` | `commands/ship.md` | Full chain: plan→build→review→frontend→review→docs, no stop |
| `/ship-all` | `commands/ship-all.md` | Loop ship across unchecked stories, no stop between them. Opt-in worktree per `[P]` story (`shared/worktree.md`) |
| `/worktree [name]` | `commands/worktree.md` | List workflow worktrees (task + `[P]` story); merge, PR, keep or discard finished ones |
| `/fix [description]` | `commands/fix.md` | Diagnose → fix → review |
| `/improve [description]` | `commands/improve.md` | Non-bug change — plan → apply → review. Bare call → picks improvement from `BACKLOG.md`. Wants it done now; "we should improve X someday" → `/note` |
| `/plan-all` | `commands/plan-all.md` | Plan all unplanned epics from INDEX.md |
| `/converge [feature]` | `commands/converge.md` | Audit shipped code against the feature's PRD — appends real gaps as stories |
| `/doc [feature]` | `commands/doc.md` | Document one feature with Q&A |
| `/doc-all` | `commands/doc-all.md` | Document many features. `--full` = new project (+ guides + index) |
| `/status` | `commands/status.md` | Progress overview |
| `/note [description]` | `commands/note.md` | Capture bug/idea/improvement |
| `/focus [task\|done\|clear]` | `commands/focus.md` | Set, clear, or advance current task pointer for this worktree |
| `/next [task\|drop N]` | `commands/next.md` | Queue a task to be picked up after current finishes |
| `/analyze` | `commands/analyze.md` | Answer project question — searches docs + code |
| `/diagnose [session\|path] [--bundle]` | `commands/diagnose.md` | Transcript vs command contract — deviations with line evidence. Forked, read-only |
| `/archive [feature\|--all\|--apply]` | `commands/archive.md` | Extract decisions + obligations to DECISIONS.md/BACKLOG.md, compact rest → SUMMARY.md |
| `/cleanup [story\|feature]` | `commands/cleanup.md` | Record binding decisions + rewrite MEMORY.md after a task |
| `/frontend` | `commands/frontend.md` | Frontend from design handoff |

## Agent Roster

Agent speaks → prefix output with name. Internal output = caveman rules.

**Eleven are real subagents.** Dispatch the left column verbatim. A bare name (`ae-red`) does not resolve under a plugin install — the model then role-plays the agent inline and the output looks normal.

| `subagent_type` | Speaks as | Role | Bias |
|---|---|---|---|
| `agentic-engineering:ae-arch` | 🏗 **ARCH** | Story plan — Contract claims, Failure states, files, test plan, frontend plan, implementer tier. Session model, read-only | Suspects shortcuts + hidden debt |
| `agentic-engineering:ae-impl` | 🔨 **IMPL** | Builds one brief test-first; red + green runs through `evidence.sh`; never ticks, never commits. Sonnet by default | Plan's file list is the fence |
| `agentic-engineering:ae-red` | 🔴 **RED** | Bugs — null/async/logic | Assumes code broken |
| `agentic-engineering:ae-req` | ✅ **REQ** | Requirements + constitution | Binary. Constitution violation = blocker |
| `agentic-engineering:ae-test` | 🧪 **TEST** | Test coverage + quality | Flags tests that prove nothing |
| `agentic-engineering:ae-doc` | 📖 **DOC** | Convention alignment, CLAUDE.md drift | Notices mismatch |
| `agentic-engineering:ae-sec` | 🔐 **SEC** | Security — high-confidence only | No noise |
| `agentic-engineering:ae-edge` | 🔍 **EDGE** | Adversarial edge probe — boundary, null, race, malformed, resource, error-path | Probes for what's *missing*, not what's wrong |
| `agentic-engineering:ae-lean` | ♻️ **LEAN** | Reuse, simplification, efficiency, altitude | Only reviewer looking at code that is *correct*. Searches the repo before flagging |
| `agentic-engineering:ae-ux` | 🎨 **UX** | Fidelity review of built UI — states, forms, a11y, responsive. Read-only, designs nothing | Never skips empty/error/loading |
| `agentic-engineering:ae-scribe` | ✍️ **SCRIBE** | End-user product docs in `./app-docs/` | Writes for app users, not dev team |

**Three are inline roles**, not subagents — the main model wearing a hat. Never dispatch them.

| Speaks as | Role | Bias |
|---|---|---|
| 📋 **PROD** | PRD, stories, plan validation, acceptance checks | Challenges vague specs |
| 🔧 **FIXER** | Root cause, surgical fixes | One bug, one fix |
| 🔀 **GIT** | Commits, branches, PR desc | Conventional only |

**Four subagent names double as inline hats** — main model, no dispatch — where the work needs the human or a tool no subagent has:

| Speaks as | Where | Why inline |
|---|---|---|
| 🏗 **ARCH** | `/feature`, `/plan-all`, `/improve`, `/bootstrap`, `/init`, `/doc`, `/converge`, `/archive` | Approach options, PRD and story review, `/improve`'s plan, project scaffolding — the human answers each, or it is a doc pass, not a plan. Story *implementation* plans are always `ae-arch` |
| 🎨 **UX** | `/design` | Mockups through the design tool's MCP; `ae-ux` is read-only and reviews built UI later |
| ✍️ **SCRIBE** | `/doc`, `/doc-all` | Q&A with the user; follows `agents/ae-scribe.md`'s template |
| 🔴 **RED** | `/doc` | Improvement notes to `improvements.md` — no verdict, not a review |

Everywhere else these names mean the subagent: dispatch it, never write its block yourself.

Reviewers have no Bash; `ae-arch` has Bash for read-only probes; `ae-impl` has Bash, Write, Edit. No subagent can ask the human — that comes back to the parent as a status or an escalation.

## Execution Model

**Main session = orchestrator, session model.** Plans features with the human, gates, consolidates, commits. In story work it holds artifacts — plan, statuses, consolidated reviews — and writes no source code. Story plan → `ae-arch` (`inherit` = session model). Build, fix rounds, `/improve` apply → `ae-impl` (`sonnet`; `haiku` for mechanical stories; session model for fix round 3). Each runs in a fresh context per story. Tier routing, brief and report → `shared/story-flow.md`; fix rounds → `shared/fix-loop.md`. A status is a claim: the parent re-checks evidence, files and every AC itself.

## Project Mode and Memory Docs

Read `shared/project-mode.md` for the `mode: lite | full` marker and the three
memory documents (`CHANGELOG.md`, `DECISIONS.md`, `MEMORY.md`).

**Only `/init`, `/status` and `/cleanup` read it; `/feature` and `/converge` read
just the `mode:` marker, each with its own table.** Every other command is
mode-blind — they consume `STORIES.md` + `PROGRESS.md`, which both modes produce.
Adding a mode branch anywhere else is a design break.

## Core Principles

Apply to every command. Not command-specific.

1. **Never skip a gate by improvisation.** Gates are skipped only by their own `[AUTO:]` tag under `--auto`, never because the answer looks obvious. A gate tagged `[AUTO: skip]` is ceremony by design; every other tag stands.
2. **Agents challenge each other.** PROD vs ARCH. RED assumes failure. Tension is the point.
3. **One story at a time.** No batching.
4. **Tests not optional.** Done = implemented + tested + a fresh green `scripts/evidence.sh` row for the code being claimed. Output from an earlier phase proves nothing about code changed since.
5. **Docs stay in sync.** PROGRESS.md, STORIES.md, reviews reflect reality.
6. **Plan before code.** ARCH plans (`ae-arch`, session model). PROD validates. IMPL builds (`ae-impl`, fresh context). The main session orchestrates.
7. **Planning asks, execution runs.** See below.

## Caveman Communication Rules

Apply to agent-internal output — reports, reviews, agent-to-agent handoffs. NOT to human checkpoints, code, commits, app-docs pages.

**What a human answers is human-facing** — the PRD summary, a `Done when:` list, an escalation and its question follow the Human-Facing Output Rules below. ARCH's story plan prints as `ae-arch` returned it: a structured block, read before the build, not prose to restyle.

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- **Keep:** technical terms exact, code blocks unchanged, file paths verbatim
- **Pattern:** `[thing] [problem/action] [reason]. [next step].`
- **Fragments OK.** Short synonyms: fix not "implement solution", use not "utilize"
- During `ship-all` / `plan-all`: **ultra** mode — arrows for causality (X → Y), one word when enough

## Human Checkpoint Interaction (`[ASK: ...]`)

Every `⚠️ Human checkpoint` carries an `[ASK: ...]` tag, which picks the input mechanism. Most also carry an `[AUTO: ...]` tag, which decides whether the gate fires at all under `--auto`.

Untagged `[AUTO:]` = `always-ask`, by design.

| Tag | Mechanism | Use for |
|---|---|---|
| `[ASK: confirm]` | `AskUserQuestion`, 2 options | go / approved / proceed-or-stop gates |
| `[ASK: single]` | `AskUserQuestion`, 2–4 options | pick one from a known set |
| `[ASK: multi]` | `AskUserQuestion`, `multiSelect: true` | pick any subset |
| `[ASK: prose]` | plain text, no widget | freeform answers — clarifications, bug repro, design critique |

Rules:

- **Never render a tagged gate as "Reply 'go'" prose.** Widget or nothing. Typed-reply gates drop answers when the user phrases them differently.
- **`[AUTO: skip]` wins.** Under `--auto` a skipped gate shows no widget at all.
- Option labels ≤ 5 words. Recommended option first, suffixed `(Recommended)`.
- >4 options → collapse to the top 3; the built-in "Other" escape hatch covers the rest.
- Gate needing a choice *and* detail → `[ASK: single]` first, then a `[ASK: prose]` follow-up. Never one widget doing both.
- **Destructive gates are never `[ASK: confirm]` alone** — show what will be destroyed in the message body first (`/archive` deletes files; `/focus clear` wipes queue).

### Planning asks, execution runs

`/feature`, `/design`, `/plan-all` stop at their gates, then end on one **Build** gate that chains into `/ship-all`. From there `/ship`, `/ship-all`, `/implement`, `/frontend` run with no approval and no compact gate — stopping only for a plan escalation, a blocker that survives the fix loop or needs a decision, a hard override, a stuck implementer, `/fix`'s third failed attempt, or a worktree finish. `--auto` also skips ceremonial planning gates and the Build gate; it never removes one of those stops.

## Human-Facing Output Rules

Caveman rules above govern **agent-internal** output. These govern what the **human** reads — checkpoint messages, `━━━` summary blocks, consolidated review findings. The two registers never mix.

1. **Restate state.** Every chain turn says where it is: `STORY-003 (2 of 5) · Phase 4 of 7`. Use the phase count the command actually has (`/ship` has 7). PLAN does this structurally — don't also narrate the full plan in prose.
2. **End with one concrete next action.** Every command's last line is a runnable thing: `Next: /ship for STORY-004`. Not "let me know how you'd like to proceed." A command that ends on a checkpoint still prints its `Next:` line after the answer.
3. **Cap surfaced lists at 5.** Blocker lists, epic inventories, gap reports. Six blockers → show 5 + `+1 more in reviews/STORY-XXX-review.md`. Ranked-and-truncated beats complete-and-unreadable.
4. **Errors are matter-of-fact.** State cause and fix. `Test fails at auth.spec.ts:42 — expected 200, got 401. Cause: missing auth header.` No "Uh oh", no "There seems to be a problem".
5. **No caveman shorthand in human-facing text** — no causality arrows, dropped articles, invented abbreviations, stacked compounds. Ultra mode never reaches a checkpoint prompt or `━━━` block. First and last line alone must say what happened and what to do next.

## Auto Mode (`--auto`)

Accepted by `/feature`, `/fix`, `/improve`, `/ship`, `/ship-all`, `/implement`, `/frontend`, `/design`, `/plan-all`, `/converge`. Per-invocation only — no persistent toggle. Flag present → §A of `shared/preamble.md` loads `shared/auto-mode.md`: tag behavior, Hard-Override List, ambiguity heuristic, auto-log visibility. No flag → every gate asks and that file is never read.

## Progress Tracking

**`# PLAN` in `.agentic/focus.md` is the tracker.** It is durable, survives a compaction, and is always available. Write it at the start of a multi-phase command and tick lines off as phases close.

A harness task tool (`TaskCreate` / `TaskUpdate` / `TodoWrite`) *mirrors* PLAN when the session has one. Absent → skip silently: never block, warn or narrate it, never treat it as the record.

Chain commands write PLAN — each lists its own lines. Single-phase commands (`/note`, `/focus`, `/status`, `/analyze`, `/archive`, `/converge`, `/diagnose`) don't — a plan for one step is noise. `/init`, `/design` and `/bootstrap` are multi-phase but interview-shaped: their phases are the human's answers, so they narrate instead.

Rules:

- **Exactly one line in progress.** Mark it before the phase starts, close it as the phase closes — never batch completions at the end.
- **Nested commands don't open their own PLAN.** `/implement` inside `/ship` advances the parent's line; it does not start a second plan.
- **Blocker pause leaves the line open.** Closing a phase that ended in a pause reports work that didn't happen.
- **Skipped phase → close the line with the skip noted**, don't delete it. Backend-only story still shows "Frontend — skipped (no UI)".
- **PLAN replaces mid-chain narration**, not the `━━━` summary blocks. Those still print — they are the deliverable, PLAN is the progress bar.

## Context Management

**`/compact` is a user command. The model cannot invoke it.** Any instruction that says "compact now" is really a checkpoint asking the human to do it.

**No compact gate between stories** — story work runs in fresh subagent contexts; never ask for `/compact` mid-chain. `/plan-all` keeps its gate between epics (planning happens here, with the human). Continue without compacting is the human's call — never re-ask.

Other rules:

- **SessionStart hook** (`hooks/session-start.sh`) re-injects intent router + active focus on startup, `/clear`, `/compact`. Its focus line = CURRENT + PLAN from `.agentic/focus.md`; trust PLAN over memory of pre-compact turns. After a compaction mid-chain: re-read the running command's body (`set_by:`), resume at the first open PLAN line
- **Session start:** `INDEX.md`, `MEMORY.md`, `CONSTITUTION.md` in full; newest 20 `CHANGELOG.md` entries; `DECISIONS.md` titles only, skipping `[superseded]` (`shared/preamble.md` §D has the grep)
- **Read only files relevant to current story** — not whole project
- **Never re-read** files already in context

## Test Execution Rules (ALL commands)

Non-watch mode only. Watch workers outlive Bash timeout → pile up across chained phases → system freeze.

- **Vitest:** `vitest run` / `npx vitest run` — **never** bare `vitest` / `npx vitest`
- **Jest:** `jest` (default non-watch) — **never** `--watch` / `--watchAll`
- **Pytest:** `pytest` — never `pytest-watch` / `ptw`
- **Go:** `go test ./...` — no watcher wrapper
- **Other:** pass explicit one-shot / non-watch flag

Applies to the main conversation. **Subagents never read this file** — every agent that runs tests restates the non-watch rule in its own file (`ae-impl`, `ae-arch`), and a dispatch prompt that lets any other subagent run tests must restate it inline. The batch reviewers have no Bash at all. No exceptions, even "quick checks."
