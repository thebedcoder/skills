---
name: agentic-engineering
description: >
  Full SDLC agentic engineering workflow for Claude Code using named specialist agents.
  Use this skill whenever the user wants to start a new project, initialize a feature,
  research a feature, implement a feature, run a code review, or follow a structured
  agentic development workflow. Triggers on: "ae:init", "ae:feature", "ae:implement",
  "ae:review", "ae:status", "ae:design", "ae:frontend", "ae:ship", "ae:fix",
  "ae:bootstrap", "ae:plan-all", "ae:doc", "init project", "new feature", "implement
  feature", "ship feature", "code review", "fix bug", "document feature", "plan all",
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
| `/ae-bootstrap` | `commands/bootstrap.md` | Scaffold project — stack, deps, structure |
| `/ae-init` | `commands/init.md` | Docs scaffold + CLAUDE.md |
| `/ae-feature [name]` | `commands/feature.md` | Research + PRD + stories |
| `/ae-design` | `commands/design.md` | Mockups via Figma/Pencil/Markdown |
| `/ae-implement` | `commands/implement.md` | Next unchecked story + tests |
| `/ae-review` | `commands/review.md` | 5-agent parallel review |
| `/ae-ship` | `commands/ship.md` | Full chain: implement→review→frontend→review→docs |
| `/ae-ship-all` | `commands/ship-all.md` | Loop ship across unchecked stories |
| `/ae-fix [description]` | `commands/fix.md` | Diagnose → fix → review |
| `/ae-plan-all` | `commands/plan-all.md` | Plan all unplanned epics from INDEX.md |
| `/ae-doc [feature]` | `commands/doc.md` | Document one feature with Q&A |
| `/ae-doc-all` | `commands/doc-all.md` | Document many features. `--full` = new project (+ guides + index) |
| `/ae-status` | `commands/status.md` | Progress overview |
| `/ae-note [description]` | `commands/note.md` | Capture bug/idea/improvement |
| `/ae-analyze` | `commands/analyze.md` | Answer project question — searches docs + code |
| `/ae-frontend` | `commands/frontend.md` | Frontend from design handoff |

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
