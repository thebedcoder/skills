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

Command invoked → read the matching file under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/commands/`. That file holds the full instructions; this one holds the policy every command inherits.

Command bodies reference two other things by name:

- **`shared/preamble.md`** — §A parse `--auto`, §B write focus, §C auto-mode summary, §D project-memory inputs. Blocks that used to be pasted into a dozen files.
- **Sections of this file** — Auto Mode, Progress Tracking, Human Checkpoint Interaction, Context Management, Test Execution Rules.

Both live under `${CLAUDE_PLUGIN_ROOT}/skills/agentic-engineering/`.

## Command → File Map

| Command | File | Does |
|---|---|---|
| `/bootstrap` | `commands/bootstrap.md` | Scaffold project — stack, deps, structure |
| `/init` | `commands/init.md` | Docs scaffold + CLAUDE.md |
| `/feature [name]` | `commands/feature.md` | Research + PRD + stories |
| `/design` | `commands/design.md` | Mockups via Figma/Pencil/Markdown |
| `/implement` | `commands/implement.md` | Next unchecked story + tests |
| `/review` | `commands/review.md` | 7-agent parallel review (`--frontend-pass` drops LEAN) |
| `/ship` | `commands/ship.md` | Full chain: implement→review→frontend→review→docs |
| `/ship-all` | `commands/ship-all.md` | Loop ship across unchecked stories |
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
| `/archive [feature\|--all]` | `commands/archive.md` | Compact shipped feature docs → SUMMARY.md |
| `/cleanup [story\|feature]` | `commands/cleanup.md` | Record binding decisions + rewrite MEMORY.md after a task |
| `/frontend` | `commands/frontend.md` | Frontend from design handoff |

## Agent Roster

Agent speaks → prefix output with name. Internal output = caveman rules.

**Nine are real subagents.** Dispatch by the full plugin-namespaced `subagent_type`. A bare name (`ae-red`) does not resolve under a plugin install: the Agent tool errors, the model falls back to role-playing the reviewer inline, and the report looks normal. Always dispatch the left column verbatim.

| `subagent_type` | Speaks as | Role | Bias |
|---|---|---|---|
| `agentic-engineering:ae-red` | 🔴 **RED** | Bugs — null/async/logic | Assumes code broken |
| `agentic-engineering:ae-req` | ✅ **REQ** | Requirements + constitution | Binary. Constitution violation = blocker |
| `agentic-engineering:ae-test` | 🧪 **TEST** | Test coverage + quality | Flags tests that prove nothing |
| `agentic-engineering:ae-doc` | 📖 **DOC** | Convention alignment, CLAUDE.md drift | Notices mismatch |
| `agentic-engineering:ae-sec` | 🔐 **SEC** | Security — high-confidence only | No noise |
| `agentic-engineering:ae-edge` | 🔍 **EDGE** | Adversarial edge probe — boundary, null, race, malformed, resource, error-path | Probes for what's *missing*, not what's wrong |
| `agentic-engineering:ae-lean` | ♻️ **LEAN** | Reuse, simplification, efficiency, altitude | Only reviewer looking at code that is *correct*. Searches the repo before flagging |
| `agentic-engineering:ae-ux` | 🎨 **UX** | Design flows, mockups, fidelity | Never skips empty/error/loading |
| `agentic-engineering:ae-scribe` | ✍️ **SCRIBE** | End-user product docs in `./app-docs/` | Writes for app users, not dev team |

**Four are inline roles**, not subagents — the main model wearing a hat. Never dispatch them.

| Speaks as | Role | Bias |
|---|---|---|
| 🏗 **ARCH** | Architecture, planning, structure | Suspects shortcuts + hidden debt |
| 📋 **PROD** | PRD, stories, acceptance | Challenges vague specs |
| 🔧 **FIXER** | Root cause, surgical fixes | One bug, one fix |
| 🔀 **GIT** | Commits, branches, PR desc | Conventional only |

Subagents have no Bash and cannot call `AskUserQuestion`. Anything needing a command run or a human answer stays with the parent.

## Project Mode and Memory Docs

Read `shared/project-mode.md` for the `mode: lite | full` marker and the three
memory documents (`CHANGELOG.md`, `DECISIONS.md`, `MEMORY.md`).

**Only `/init`, `/feature`, `/status` and `/cleanup` need it.** Every other
command is mode-blind — they consume `STORIES.md` + `PROGRESS.md`, which both
modes produce. Adding a mode branch anywhere else is a design break.

## Core Principles

Apply to every command. Not command-specific.

1. **Never skip a gate by improvisation.** Gates are skipped only by their own `[AUTO:]` tag under `--auto`, never because the answer looks obvious. A gate tagged `[AUTO: skip]` is ceremony by design; every other tag stands.
2. **Agents challenge each other.** PROD vs ARCH. RED assumes failure. Tension is the point.
3. **One story at a time.** No batching.
4. **Tests not optional.** Done = implemented + tested.
5. **Docs stay in sync.** PROGRESS.md, STORIES.md, reviews reflect reality.
6. **Plan before code.** ARCH plans. PROD validates. Then build.

## Caveman Communication Rules

Apply to agent-internal output — reports, reviews, agent-to-agent handoffs. NOT to human checkpoints, code, commits, app-docs pages.

**A plan shown at an approval gate is human-facing.** ARCH's implementation plan, the PRD summary, the `Done when:` list: the human reads and approves those, so they follow the Human-Facing Output Rules below, not caveman. Caveman applies to the plan only while agents are passing it between themselves.

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- **Keep:** technical terms exact, code blocks unchanged, file paths verbatim
- **Pattern:** `[thing] [problem/action] [reason]. [next step].`
- **Fragments OK.** Short synonyms: fix not "implement solution", use not "utilize"
- During `ship-all` / `plan-all`: **ultra** mode — arrows for causality (X → Y), one word when enough

## Human Checkpoint Interaction (`[ASK: ...]`)

Every `⚠️ Human checkpoint` carries an `[ASK: ...]` tag, which picks the input mechanism. Most also carry an `[AUTO: ...]` tag, which decides whether the gate fires at all under `--auto`.

**An untagged `[AUTO:]` is deliberate, not an omission.** Gates in `/note`, `/plan-all`, `/bootstrap`, `/focus`, `/init` and `/doc-all` ship without one and take the untagged default below (`always-ask`). Do not add tags to them on sight.

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

## Human-Facing Output Rules

Caveman rules above govern **agent-internal** output. These govern what the **human** reads — checkpoint messages, `━━━` summary blocks, consolidated review findings. The two registers never mix.

1. **Restate state.** Every chain turn says where it is: `STORY-003 (2 of 5) · Phase 4 of 7`. Use the phase count the command actually has (`/ship` has 7). PLAN does this structurally — don't also narrate the full plan in prose.
2. **End with one concrete next action.** Every command's last line is a runnable thing: `Next: /ship for STORY-004`. Not "let me know how you'd like to proceed." A command that ends on a checkpoint still prints its `Next:` line after the answer.
3. **Cap surfaced lists at 5.** Blocker lists, epic inventories, gap reports. Six blockers → show 5 + `+1 more in reviews/STORY-XXX-review.md`. Ranked-and-truncated beats complete-and-unreadable.
4. **Errors are matter-of-fact.** State cause and fix. `Test fails at auth.spec.ts:42 — expected 200, got 401. Cause: missing auth header.` No "Uh oh", no "There seems to be a problem".
5. **No caveman shorthand in human-facing text.** No arrows for causality, no dropped articles, no invented abbreviations, no stacked compounds. Ultra mode (in the caveman rules above) applies to agent reports during `ship-all` / `plan-all` — it never reaches a checkpoint prompt or a `━━━` block. A user reading only the first and last line of your output should know what happened and what to do next.

## Auto Mode (`--auto`)

Long-running commands accept `--auto`: `/feature`, `/fix`, `/improve`, `/ship`, `/ship-all`, `/implement`, `/design`, `/doc`, `/converge`. Per-invocation only — no persistent toggle.


Under `--auto`, every checkpoint is consulted by its tag:

| Tag | Behavior under `--auto` |
|---|---|
| `[AUTO: skip]` | Always skipped. For pure ceremony — a gate whose only options are "start" and "don't start". |
| `[AUTO: ask-if-ambiguous]` | Skip if answer is obvious from CONSTITUTION.md or context. Ask otherwise. |
| `[AUTO: always-ask]` | Never skipped. For architectural / destructive / unrecoverable choices. |
| (untagged) | Defaults to `always-ask` (safe failure). |

### Hard-Override List

Regardless of tag, auto mode pauses + asks when **any** of these:

1. `/review` reports a blocker — high-severity bug, requirements miss, constitution violation.
2. Operation touches: CI configs (`.github/workflows/*`, `.gitlab-ci.yml`, etc.), secrets (`.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`), force-push, DB migrations creating/dropping tables, mass file deletion (>10 files).
3. `CONSTITUTION.md` explicitly contradicts the recommended action.
4. Required project state missing — no test framework, no design tool chosen, no feature directory.

### Ambiguity Heuristic (for `[AUTO: ask-if-ambiguous]`)

- Multiple viable options, no constitution directive → ambiguous → ask.
- One option matches a constitution directive → not ambiguous → proceed + cite.
- Single viable option only → not ambiguous → proceed.
- Decision has cascading effects (>3 files, public-interface change, data-model change, new dependency) → treat as ambiguous regardless.

### Visibility

Every auto-decision is announced inline + appended to `.agentic/auto-log.md` (gitignored, alongside `.agentic/focus.md`):

```
DECISION: <choice>
  reason: <why, citing CONSTITUTION.md when applicable>
  [auto]
```

`SKIPPED:` for ceremonial skips. `HARD-PAUSE:` for forced pauses. Command ends with the one-line summary in `shared/preamble.md` §C: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`.

### Composition with /focus

When CURRENT is written by an `--auto` command, `set_by:` gets ` (auto)` suffix. Auto-mode behaviour of `/focus done` is defined in `commands/focus.md` — that file is the single source of truth; don't restate its rules here.

## Progress Tracking

**`# PLAN` in `.agentic/focus.md` is the tracker.** It is durable, survives a compaction, and is always available. Write it at the start of a multi-phase command and tick lines off as phases close.

A harness task tool (`TaskCreate` / `TaskUpdate` / `TodoWrite`) is a *mirror* of PLAN when the session exposes one — it is not available in every session and is env-gated on newer models. Open it if it is there; skip it silently if it isn't. **Never block, warn, or narrate its absence, and never treat it as the record of what happened.**

Chain commands write PLAN. Single-phase commands (`/note`, `/focus`, `/status`, `/analyze`, `/archive`, `/converge`) don't — a plan for one step is noise.


| Command | One PLAN line per |
|---|---|
| `/ship` | phase (implement · review · frontend · review · docs · PR desc · cleanup) |
| `/ship-all` | story |
| `/plan-all` | epic |
| `/fix` | phase (diagnose · fix · review · docs · cleanup) |
| `/improve` | phase (plan · apply · review · docs · cleanup) |
| `/feature` | phase (research · PRD · epics · stories) |
| `/doc-all` | feature |
| `/implement`, `/review`, `/frontend` standalone | phase |

Multi-phase → PLAN. One phase → no PLAN. `/init`, `/design` and `/bootstrap` are multi-phase but interview-shaped: their phases are the human's answers, so they narrate instead.

Rules:

- **Exactly one line in progress.** Mark it before the phase starts, close it as the phase closes — never batch completions at the end.
- **Nested commands don't open their own PLAN.** `/implement` inside `/ship` advances the parent's line; it does not start a second plan.
- **Blocker pause leaves the line open.** Closing a phase that ended in a pause reports work that didn't happen.
- **Skipped phase → close the line with the skip noted**, don't delete it. Backend-only story still shows "Frontend — skipped (no UI)".
- **PLAN replaces mid-chain narration**, not the `━━━` summary blocks. Those still print — they are the deliverable, PLAN is the progress bar.

## Context Management

**`/compact` is a user command. The model cannot invoke it.** Any instruction that says "compact now" is really a checkpoint asking the human to do it.

Between stories in `ship-all` and between epics in `plan-all`:

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: confirm]`: *"Context is full for this story. Run the compact command below, then choose Continue."* → **Continue** · **Stop here**

Show this block above the widget so it can be copy-pasted:

```
/compact Focus on: current feature, last story done, next story, branch, blockers, last changelog entry, constitution key points. Discard: file contents, review reports, diffs.
```

The human may choose Continue without compacting. That is their call — proceed, don't re-ask.

Other rules:

- **Read INDEX.md, MEMORY.md, CONSTITUTION.md in full at session start**; read the newest 20 entries of CHANGELOG.md and the *titles only* of DECISIONS.md — both are unbounded append-only files and reading them whole grows with project age
- **Read only files relevant to current story** — not whole project
- **Never re-read** files already in context

## Test Execution Rules (ALL commands)

Non-watch mode only. Watch workers outlive Bash timeout → pile up across chained phases → system freeze.

- **Vitest:** `vitest run` / `npx vitest run` — **never** bare `vitest` / `npx vitest`
- **Jest:** `jest` (default non-watch) — **never** `--watch` / `--watchAll`
- **Pytest:** `pytest` — never `pytest-watch` / `ptw`
- **Go:** `go test ./...` — no watcher wrapper
- **Other:** pass explicit one-shot / non-watch flag

Applies to the main conversation. **Subagents never read this file** — a dispatch prompt that lets a subagent run tests must restate the non-watch rule inline. Today only the parent runs tests; the batch reviewers have no Bash at all. No exceptions, even "quick checks."
