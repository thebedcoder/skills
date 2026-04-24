## `/ae-init` — Project Initialization

**Agents:** ARCH, PROD

### Steps

1. **ARCH** checks for existing `./docs/` + `./CLAUDE.md`. Found → asks reinitialize or update.

2. **PROD** asks project context if CLAUDE.md missing:
   - Project name + one-line description
   - Users + problem solved
   - Tech stack (languages, frameworks, DB, infra)
   - Code conventions + test framework
   - Design tool: **Figma** (paid MCP) / **Pencil.dev** (free, IDE-native, `.pen` files in repo — pencil.dev) / **None** (Markdown wireframe specs)

3. **ARCH** designs folder structure + creates:

```
./docs/
  INDEX.md                      ← agent navigation — always read first
  CHANGELOG.md                  ← agent changelog — prepend after every ship/fix, newest first
  BACKLOG.md                    ← bugs, ideas, improvements to implement later
  CONSTITUTION.md               ← non-negotiable project principles — agents check before every review
  /features/
    [feature-name]/
      PRD.md                    ← feature requirements
      EPICS.md                  ← epics for this feature
      STORIES.md                ← user stories with checkboxes
      PROGRESS.md               ← completed work log
      /reviews/                 ← code review outputs
  improvements.md               ← ARCH/RED suggestions (appended over time)
  /specs/                       ← cross-feature and design handoff specs

./app-docs/                     ← END-USER product documentation (like "Docs" section of a landing page)
  index.mdx                     ← docs landing page the user sees first
  CHANGELOG.mdx                 ← product release notes, written to end users
  /features/                    ← one .mdx per user-facing feature — overview + how-to + tutorial + FAQ
  /guides/                      ← user guides (getting-started, shortcuts, troubleshooting). NOT dev onboarding.
```

> **app-docs vs docs:** users vs builders. Strict separation — no paths/code in app-docs, no tutorials in docs.

**ARCH** seeds changelog files immediately:

`./docs/CHANGELOG.md`:
```markdown
# Agent Changelog
<!-- Agents: prepend new entries after every ship/fix — newest first at top. Read at session start. -->

## [date]
- [INIT] project initialised
```

`./app-docs/CHANGELOG.mdx` — product release notes, written to end users:
```mdx
---
title: What's new
description: Product updates and changes — what you can now do in the app
---

# What's new

<!-- SCRIBE: prepend new entries at top, newest first. Write like release notes to end users — no file paths or internals. -->

## [Month YYYY]

### Added
- Welcome! This is where new features and improvements will be announced as they ship.
```

**ARCH** seeds `./docs/BACKLOG.md`:
```markdown
# Backlog
<!-- Agents: prepend new NOTE-XXX items at top, newest first -->
<!-- Run /ae-ship to pick up and implement a backlog item -->
```

**PROD** generates `./docs/CONSTITUTION.md` by asking: non-negotiable tech standards, architectural principles, security/compliance, forbidden patterns.

Constitution format:
```markdown
# Project Constitution
<!-- Non-negotiable. Agents: check every PRD and review against these. Specific + verifiable only. -->

## Article I: [Topic]
[Principle — specific, testable]

## Article II: [Topic]
[Principle]

(add articles as needed)

## Governance
- Constitution supersedes all guidelines
- Violations documented and justified — never silently ignored
- REQ checks every story against constitution during /ae-review
```

⚠️ **Human checkpoint:** Show CLAUDE.md + CONSTITUTION.md drafts together. Ask for edits before saving. *"The constitution must be specific and verifiable — vague principles like 'write high quality code' give agents nothing to check against."*

**`./docs/INDEX.md`** — single file every agent reads at session start. ARCH generates:

```markdown
# Docs Index

## How to navigate
- Read this file first to orient yourself
- Read ./docs/CHANGELOG.md to see what's already been done
- Read ./docs/CONSTITUTION.md for non-negotiable project principles
- Go to ./docs/features/[name]/ for feature-specific PRD, stories, and progress
- Go to ./app-docs/ for END-USER product documentation (how to use the app — don't write internal notes here)
- Go to ./docs/improvements.md for ARCH/RED improvement suggestions

## Features

| Feature | Status | Folder |
|---------|--------|--------|
| (none yet — populated by /ae:feature) | | |

## Design specs
./docs/specs/
```

4. **ARCH + PROD** co-generate `./CLAUDE.md`:

```markdown
# Project: [name]
[one-line description]

## Who This Is For
[target user + core problem]

## Tech Stack
[details]

## Code Conventions
[naming, folder structure, patterns]

## Testing
[framework + coverage expectations]

## Design Tool
[figma | pencil | none]
- figma: uses Figma MCP (requires paid Figma subscription + MCP configured)
- pencil: uses Pencil.dev via local MCP server (free, IDE-native, .pen files live in repo)
- none: SCRIBE produces detailed Markdown wireframe specs instead

## Docs Structure
- Index:        ./docs/INDEX.md
- Constitution: ./docs/CONSTITUTION.md
- Features:     ./docs/features/[name]/PRD.md|EPICS.md|STORIES.md|PROGRESS.md
- Reviews:      ./docs/features/[name]/reviews/
- Specs:        ./docs/specs/
- App Docs:     ./app-docs/   (end-user product documentation — not internal reference)

## Agent Rules
- Always read ./docs/INDEX.md and ./docs/CONSTITUTION.md first every session
- Work one User Story at a time
- Write tests before marking a story complete
- Update PROGRESS.md after completing each story
- Never modify files outside the current story's scope
- Constitution violations must be flagged — never silently ignored
```

5. ⚠️ **Human checkpoint:** Show generated CLAUDE.md. Ask for edits before saving.

6. **ARCH** reads `~/.claude/skills/agentic-engineering/rules-library/README.md`, presents rules grouped by type, pre-suggests matches from captured stack.

Stack rules: `react-typescript` · `nextjs-app-router` · `react-native` · `python-fastapi` · `python-django` · `node-express` · `go` · `rust` · `flutter` · `swiftui` · `ios-native` · `android-native`

Cross-cutting: `testing-conventions` · `git-conventions` · `api-design` · `secrets-management`

User confirms/adds/removes. Reply 'none' to skip. Per selected rule, copy from `~/.claude/skills/agentic-engineering/rules-library/<name>.md` to `./.claude/rules/` (create dir if needed).

**ARCH** confirms installed + notes: *"Edit any to match your project. Delete any that don't fit."*

7. **GIT** stages + commits scaffold:
```
chore: initialise project structure, CLAUDE.md, CONSTITUTION.md, and project rules
```

8. **PROD** summarizes created + prompts: *"Run `/ae-feature [name]` to start your first feature."*

---
