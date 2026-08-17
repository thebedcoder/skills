---
name: agentic-engineering
description: >
  Full SDLC agentic engineering workflow for Claude Code using named specialist agents.
  Use this skill whenever the user wants to start a new project, initialize a feature,
  research a feature, implement a feature, run a code review, or follow a structured
  agentic development workflow. Triggers on: "/feature", "/implement",
  "/review", "/status", "/design", "/frontend", "/ship", "/fix", "/improve",
  "/bootstrap", "/plan-all", "/doc", "/cleanup", "new feature", "implement feature",
  "ship feature", "code review", "fix bug", "document feature", "plan all",
  "improve existing feature", "add another supported file format", "add a
  keyboard shortcut", "make an existing query or path faster", "split a long
  module", "restructure this file", or any request to follow a structured
  step-by-step development process.
  /improve writes into an existing ./docs scaffold, so do NOT trigger on a bare
  "add support for X" or "implement X" in a project with no ./docs/INDEX.md —
  that is ordinary implementation work. Also NOT on "simplify this" or "clean up
  the diff" (Claude Code's built-in /simplify and the code-simplifier agent own
  quality-only passes), nor on Flutter motion, animation timing, or transition
  polish (flutter-motion skill).
  Also triggers on "/agentic-engineering:init", "scaffold agentic docs", or
  "set up docs and constitution" — but NOT on a bare "/init" or "initialize
  CLAUDE.md", which belong to Claude Code's built-in init command. This skill's
  init builds the full ./docs scaffold (INDEX, CONSTITUTION, BACKLOG, CHANGELOG),
  not just a CLAUDE.md.
  Always use this skill when the user is beginning or continuing structured development
  work — even if they just say "let's start coding" or "what's next".
---

# Agentic Engineering

Phase-gated SDLC workflow. Named specialist agents. On-demand command loading.

## How to use

Command invoked → read matching file from `commands/` first. File holds full instructions.

## Command → File Map

| Command | File | Does |
|---|---|---|
| `/bootstrap` | `commands/bootstrap.md` | Scaffold project — stack, deps, structure |
| `/init` | `commands/init.md` | Docs scaffold + CLAUDE.md |
| `/feature [name]` | `commands/feature.md` | Research + PRD + stories |
| `/design` | `commands/design.md` | Mockups via Figma/Pencil/Markdown |
| `/implement` | `commands/implement.md` | Next unchecked story + tests |
| `/review` | `commands/review.md` | 6-agent parallel review |
| `/ship` | `commands/ship.md` | Full chain: implement→review→frontend→review→docs |
| `/ship-all` | `commands/ship-all.md` | Loop ship across unchecked stories |
| `/fix [description]` | `commands/fix.md` | Diagnose → fix → review |
| `/improve [description]` | `commands/improve.md` | Non-bug change — plan → apply → review. Bare call → picks improvement from `BACKLOG.md`. Wants it done now; "we should improve X someday" → `/note` |
| `/plan-all` | `commands/plan-all.md` | Plan all unplanned epics from INDEX.md |
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

| Agent | Role | Bias |
|---|---|---|
| 🏗 **ARCH** | Architecture, planning, structure | Suspects shortcuts + hidden debt |
| 📋 **PROD** | PRD, stories, acceptance | Challenges vague specs |
| 🎨 **UX** | Design flows, mockups, fidelity | Never skips empty/error/loading |
| 🔴 **RED** | Bugs — null/async/logic | Assumes code broken |
| 🔧 **FIXER** | Root cause, surgical fixes | One bug, one fix |
| ✅ **REQ** | Requirements + constitution | Binary. Constitution violation = blocker |
| 🧪 **TEST** | Test coverage + quality | Flags tests that prove nothing |
| 🔍 **EDGE** | Adversarial edge-case probe — boundary, null, race, malformed, resource, error-path | Probes for what's *missing*, not what's wrong |
| 📖 **DOC** | Convention alignment, CLAUDE.md drift | Notices mismatch |
| 🔐 **SEC** | Security — high-confidence only | No noise |
| ✍️ **SCRIBE** | End-user product docs in `./app-docs/` | Writes for app users, not dev team |
| 🔀 **GIT** | Commits, branches, PR desc | Conventional only |

## Project Mode

Workflow sizes itself to project. Marker lives in `./docs/INDEX.md` frontmatter:

```yaml
---
mode: lite   # lite | full
---
```

`/init` asks once, proposes from signals (test framework, CI, deploy config, contributor count). Ambiguous → propose lite.

| | lite | full |
|---|---|---|
| Planning | stories only | research → PRD → epics → stories |
| `PRD.md`, `EPICS.md` | never | always |
| `improvements.md`, `specs/`, `app-docs/` | on first write | at init |
| `CONSTITUTION.md` | short form (~10 lines) | full articles |
| `STORIES.md`, `PROGRESS.md`, `reviews/` | same | same |
| 6-agent review, tests, checkpoints | same | same |

**Only `/init`, `/feature`, `/status`, `/cleanup` read the marker.** `/cleanup` reads it for one thing — `MEMORY.md`'s line cap. Every other command is mode-blind: they consume `STORIES.md` + `PROGRESS.md`, which both modes produce. Adding a mode branch anywhere else is a design break, not a feature.

No `mode:` key (project predates modes) → treat as `full`.

Lite's shipping path is `/note` → `/ship`, not `/feature` → `/ship`. `/ship` promotes a BACKLOG item into `docs/features/main/` when no feature exists.

## Project Memory Docs

Three files, three jobs. Overlap between them is the failure mode.

| File | Answers | Write pattern |
|---|---|---|
| `docs/CHANGELOG.md` | what shipped, when | append, newest first, unbounded |
| `docs/DECISIONS.md` | why it's built this way | append `DEC-NNN`, supersede never delete |
| `docs/MEMORY.md` | what to know before touching anything | **rewritten** each cleanup, hard line cap (150 full / 50 lite) |

`/cleanup` owns all three after a task. `CONSTITUTION.md` is separate — rules that must not be broken, not choices that were made.

`.agentic/focus.md` holds CURRENT + PLAN + NEXT for this worktree. Gitignored, per-developer, never committed.

## Core Principles

Apply to every command. Not command-specific.

1. **Never skip human checkpoint.** Every gate exists for reason. `--auto` skips by tag, never by improvisation.
2. **Agents challenge each other.** PROD vs ARCH. RED assumes failure. Tension is the point.
3. **One story at a time.** No batching.
4. **Tests not optional.** Done = implemented + tested.
5. **Docs stay in sync.** PROGRESS.md, STORIES.md, reviews reflect reality.
6. **Plan before code.** ARCH plans. PROD validates. Then build.

## Caveman Communication Rules

Apply to all agent internal output (plans, reports, reviews). NOT to human checkpoints, code, commits, app-docs pages.

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- **Keep:** technical terms exact, code blocks unchanged, file paths verbatim
- **Pattern:** `[thing] [problem/action] [reason]. [next step].`
- **Fragments OK.** Short synonyms: fix not "implement solution", use not "utilize"
- During `ship-all` / `plan-all`: **ultra** mode — arrows for causality (X → Y), one word when enough

## Human Checkpoint Interaction (`[ASK: ...]`)

Every `⚠️ Human checkpoint` carries an `[ASK: ...]` tag beside its `[AUTO: ...]` tag. The ASK tag picks the input mechanism; the AUTO tag decides whether the gate fires at all.

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

1. **Restate state.** Every chain turn says where it is: `STORY-003 (2 of 5) · Phase 4 of 6`. The task list does this structurally — don't also narrate the full plan in prose.
2. **End with one concrete next action.** Every command's last line is a runnable thing: `Next: /ship for STORY-004`. Not "let me know how you'd like to proceed." `/analyze` and `/review` currently under-do this — fix on sight.
3. **Cap surfaced lists at 5.** Blocker lists, epic inventories, gap reports. Six blockers → show 5 + `+1 more in reviews/STORY-XXX-review.md`. Ranked-and-truncated beats complete-and-unreadable.
4. **Errors are matter-of-fact.** State cause and fix. `Test fails at auth.spec.ts:42 — expected 200, got 401. Cause: missing auth header.` No "Uh oh", no "There seems to be a problem".
5. **No caveman shorthand in human-facing text.** No arrows for causality, no dropped articles, no invented abbreviations, no stacked compounds. Ultra mode (below) applies to agent reports during `ship-all` / `plan-all` — it never reaches a checkpoint prompt or a `━━━` block. A user reading only the first and last line of your output should know what happened and what to do next.

## Auto Mode (`--auto`)

Long-running commands accept `--auto`: `/feature`, `/fix`, `/improve`, `/ship`, `/ship-all`, `/implement`, `/design`. Per-invocation only — no persistent toggle.

Under `--auto`, every checkpoint is consulted by its tag:

| Tag | Behavior under `--auto` |
|---|---|
| `[AUTO: skip]` | Always skipped. For pure ceremony (e.g. "Reply 'go' to start"). |
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

`SKIPPED:` for ceremonial skips. `HARD-PAUSE:` for forced pauses. Command ends with one-line summary: `🤖 Auto mode: N decisions, M hard-pauses. See .agentic/auto-log.md`.

### Composition with /focus

When CURRENT is written by an `--auto` command, `set_by:` gets ` (auto)` suffix. `/focus done` under auto mode auto-promotes NEXT item #1 silently (no y/n/b prompt) — parent passes `auto` as `$ARGUMENTS` to `/focus done`.

## Progress Tracking

Chain commands maintain a **live task list** — the harness task tool, not prose. `/ship`, `/ship-all`, `/plan-all` create one at start. Single-phase commands (`/note`, `/focus`, `/status`, `/analyze`, `/archive`) don't — a list for one step is noise.

| Command | One task per |
|---|---|
| `/ship` | phase (implement · review · frontend · review · docs · PR desc · cleanup) |
| `/ship-all` | story |
| `/plan-all` | epic |
| `/implement`, `/review`, `/frontend` standalone | phase |

Rules:

- **Exactly one task `in_progress`.** Mark it before the phase starts, complete it as the phase closes — never batch completions at the end.
- **Nested commands don't open their own list.** `/implement` inside `/ship` advances the parent's task; it does not create a second one.
- **Blocker pause leaves the task `in_progress`.** Completing a phase that ended in a pause reports work that didn't happen.
- **Skipped phase → complete the task with the skip noted**, don't delete it. Backend-only story still shows "Frontend — skipped (no UI)".
- **The list replaces mid-chain narration**, not the `━━━` summary blocks. Those still print — they are the deliverable, the list is the progress bar.

## Context Management

- **Compact between stories** in `ship-all` + `plan-all` — mandatory
- **Compact instruction:** `/compact Focus on: current feature, last story done, next story, branch, blockers, last changelog entry, constitution key points. Discard: file contents, review reports, diffs.`
- **Read INDEX.md, MEMORY.md, DECISIONS.md, CHANGELOG.md, CONSTITUTION.md first** every session — no codebase scan to orient
- **Read only files relevant to current story** — not whole project
- **Never re-read** files already in context

## Test Execution Rules (ALL commands)

Non-watch mode only. Watch workers outlive Bash timeout → pile up across chained phases → system freeze.

- **Vitest:** `vitest run` / `npx vitest run` — **never** bare `vitest` / `npx vitest`
- **Jest:** `jest` (default non-watch) — **never** `--watch` / `--watchAll`
- **Pytest:** `pytest` — never `pytest-watch` / `ptw`
- **Go:** `go test ./...` — no watcher wrapper
- **Other:** pass explicit one-shot / non-watch flag

Applies to main conversation + every subagent dispatched by review, fix, ship, ship-all. No exceptions, even "quick checks."
