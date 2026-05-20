---
name: agentic-engineering
description: >
  Full SDLC agentic engineering workflow for Claude Code using named specialist agents.
  Use this skill whenever the user wants to start a new project, initialize a feature,
  research a feature, implement a feature, run a code review, or follow a structured
  agentic development workflow. Triggers on: "/init", "/feature", "/implement",
  "/review", "/status", "/design", "/frontend", "/ship", "/fix", "/bootstrap",
  "/plan-all", "/doc", "init project", "new feature", "implement feature",
  "ship feature", "code review", "fix bug", "document feature", "plan all",
  or any request to follow a structured step-by-step development process.
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
| `/review` | `commands/review.md` | 5-agent parallel review |
| `/ship` | `commands/ship.md` | Full chain: implement→review→frontend→review→docs |
| `/ship-all` | `commands/ship-all.md` | Loop ship across unchecked stories |
| `/fix [description]` | `commands/fix.md` | Diagnose → fix → review |
| `/plan-all` | `commands/plan-all.md` | Plan all unplanned epics from INDEX.md |
| `/doc [feature]` | `commands/doc.md` | Document one feature with Q&A |
| `/doc-all` | `commands/doc-all.md` | Document many features. `--full` = new project (+ guides + index) |
| `/status` | `commands/status.md` | Progress overview |
| `/note [description]` | `commands/note.md` | Capture bug/idea/improvement |
| `/focus [task\|done\|clear]` | `commands/focus.md` | Set, clear, or advance current task pointer for this worktree |
| `/next [task\|drop N]` | `commands/next.md` | Queue a task to be picked up after current finishes |
| `/analyze` | `commands/analyze.md` | Answer project question — searches docs + code |
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
| 📖 **DOC** | Convention alignment, CLAUDE.md drift | Notices mismatch |
| 🔐 **SEC** | Security — high-confidence only | No noise |
| ✍️ **SCRIBE** | End-user product docs in `./app-docs/` | Writes for app users, not dev team |
| 🔀 **GIT** | Commits, branches, PR desc | Conventional only |

## Caveman Communication Rules

Apply to all agent internal output (plans, reports, reviews). NOT to human checkpoints, code, commits, MDX docs.

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- **Keep:** technical terms exact, code blocks unchanged, file paths verbatim
- **Pattern:** `[thing] [problem/action] [reason]. [next step].`
- **Fragments OK.** Short synonyms: fix not "implement solution", use not "utilize"
- During `ship-all` / `plan-all`: **ultra** mode — arrows for causality (X → Y), one word when enough

## Auto Mode (`--auto`)

Long-running commands accept `--auto`: `/feature`, `/fix`, `/ship`, `/ship-all`, `/implement`, `/design`. Per-invocation only — no persistent toggle.

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

## Context Management

- **Compact between stories** in `ship-all` + `plan-all` — mandatory
- **Compact instruction:** `/compact Focus on: current feature, last story done, next story, branch, blockers, last changelog entry, constitution key points. Discard: file contents, review reports, diffs.`
- **Read INDEX.md, CHANGELOG.md, CONSTITUTION.md first** every session — no codebase scan to orient
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
