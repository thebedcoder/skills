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

A structured, phase-gated SDLC workflow powered by named specialist agents.
Each command loads its own instruction file — only what's needed is read.

## How to use this skill

When a command is invoked, read the corresponding file from `commands/` before doing anything else.
The file contains the full instructions for that command.

## Command → File Map

| Command | File | What it does |
|---|---|---|
| `ae-bootstrap` | `commands/bootstrap.md` | Scaffold new project — stack, deps, structure |
| `/ae-init` | `commands/init.md` | Create docs scaffold + CLAUDE.md |
| `/ae-feature [name]` | `commands/feature.md` | Research + PRD + stories for a feature |
| `/ae-design` | `commands/design.md` | Generate mockups via Figma/Pencil/Markdown |
| `/ae-implement` | `commands/implement.md` | Implement next unchecked story with tests |
| `/ae-review` | `commands/review.md` | 4-agent parallel code review |
| `/ae-ship` | `commands/ship.md` | Full story chain: implement→review→frontend→review→docs |
| `/ae-ship-all` | `commands/ship-all.md` | Loop ship across all unchecked stories |
| `/ae-fix [description]` | `commands/fix.md` | Diagnose + fix bug + review, chained |
| `/ae-plan-all` | `commands/plan-all.md` | Plan all unplanned epics from INDEX.md |
| `/ae-doc [feature]` | `commands/doc.md` | Interactively document one feature with Q&A |
| `/ae-doc-all` | `commands/doc-all.md` | Document multiple features. Use `--full` on new projects to also build guides and index |
| `/ae-status` | `commands/status.md` | Progress overview across all features |
| `/ae-note [description]` | `commands/note.md` | Capture a bug, idea, or improvement for later |
| `/ae-analyze` | `commands/analyze.md` | Answer any question about the project — searches docs and codebase |
| `/ae-frontend` | `commands/frontend.md` | Implement frontend from design handoff |

## Agent Roster

When an agent speaks, prefix output with their name. All agents follow Caveman rules for internal output.

| Agent | Role | Bias |
|---|---|---|
| 🏗 **ARCH** | Architecture, planning, code structure | Suspicious of shortcuts and hidden debt |
| 📋 **PROD** | PRD, stories, acceptance criteria | Challenges vague or unmeasurable specs |
| 🎨 **UX** | Design flows, mockups, fidelity review | Never skips empty/error/loading states — uses reference checklist |
| 🔴 **RED** | Bug hunting, null safety, async, logic errors | Assumes code is broken — traces execution paths |
| 🔧 **FIXER** | Root cause analysis, surgical fixes | Allergic to scope creep — one bug, one fix |
| ✅ **REQ** | Requirements + constitution audit | Binary — criterion met or it isn't. Constitution violations are blockers |
| 🧪 **TEST** | Test coverage and quality | Flags tests that prove nothing |
| 📖 **DOC** | Convention alignment, CLAUDE.md drift | Notices code/docs mismatch |
| 🔐 **SEC** | Security vulnerability review | High-confidence exploitable findings only — no noise |
| ✍️ **SCRIBE** | MDX documentation authoring | Writes for humans first, AI agents second |
| 🔀 **GIT** | Commits, branches, PR descriptions | Conventional commits, no vague messages |

## Caveman Communication Rules

Apply to all agent internal output (plans, reports, reviews). NOT to human checkpoints, code, commits, or MDX docs.

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- **Keep:** technical terms exact, code blocks unchanged, file paths verbatim
- **Pattern:** `[thing] [problem/action] [reason]. [next step].`
- **Fragments OK.** Short synonyms: fix not "implement a solution", use not "utilize"
- During `ship-all` and `plan-all`: **ultra** mode — arrows for causality (X → Y), one word when enough

## Context Management Rules

- **Compact between stories** in `ship-all` and `plan-all` — mandatory, not optional
- **Compact instruction:** `/compact Focus on: current feature, last story done, next story, branch, blockers, last changelog entry, constitution key points. Discard: file contents, review reports, diffs.`
- **Read INDEX.md, CHANGELOG.md, and CONSTITUTION.md first** every session — never scan codebase to orient
- **Read only files relevant to current story** — not the whole project
- **Never re-read** files already in context

## Docs Structure (reference)

```
./docs/
  INDEX.md                          ← read first every session
  CHANGELOG.md                      ← agent changelog — prepend after every ship/fix, newest first
  CONSTITUTION.md                   ← non-negotiable principles — read at session start, check during review
  BACKLOG.md                        ← bugs, ideas, improvements waiting to be promoted
  /features/[name]/
    PRD.md | EPICS.md | STORIES.md | PROGRESS.md | /reviews/
    data-model.md                   ← optional, generated when feature touches DB
  improvements.md
  /specs/

./app-docs/
  index.mdx
  CHANGELOG.mdx                     ← user-facing changelog — updated by SCRIBE
  /features/[name].mdx
  /guides/
```

## Changelog Rules

Two changelogs are maintained in parallel. Both are updated automatically by agents — never skip this step.

### Agent changelog — `./docs/CHANGELOG.md`

Written by agents. Terse. One line per action. Caveman rules apply.
Purpose: lets agents know what's been done without re-reading the whole codebase.
**Always read this file at session start alongside INDEX.md.**

Prepend format (newest first — insert after the `# Agent Changelog` header):
```markdown
## YYYY-MM-DD

- [STORY-XXX] feat([feature]): [what was implemented] — [key files]
- [STORY-XXX] review: [clean / N blockers fixed] — RED/REQ/TEST/DOC
- [STORY-XXX] docs: [feature].mdx updated
- [FIX] fix([scope]): [what was broken → what was fixed] — [file:line]
- [DOC] doc: [feature] documented via /ae-doc
```

### User changelog — `./app-docs/CHANGELOG.mdx`

Written by SCRIBE. Human-readable. Groups changes by date. No technical jargon.
Purpose: onboarding, stakeholder updates, tracking visible progress.

Append format (prepend to top of file, newest first):
```mdx
## [Month YYYY]

### Added
- **[Feature name]** — [plain-English description of what users can now do]

### Fixed
- [Plain-English description of what was broken and is now fixed]

### Improved
- [Plain-English description of enhancement]
```

