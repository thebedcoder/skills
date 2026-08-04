## `/init` — Project Initialization

**Agents:** ARCH, PROD

### Steps

1. **ARCH** checks for existing `./docs/` + `./CLAUDE.md`. Found → asks reinitialize or update.

2. **PROD** asks project context if CLAUDE.md missing:
   - Project name + one-line description
   - Users + problem solved
   - Tech stack (languages, frameworks, DB, infra)
   - Code conventions + test framework
   - Design tool: **Figma** (paid MCP) / **Pencil.dev** (free, IDE-native, `.pen` files in repo — pencil.dev) / **None** (Markdown wireframe specs)

2b. **ARCH** picks project mode. Mode sizes the docs scaffold + `/feature`'s planning depth. See "Project Mode" in SKILL.md.

ARCH proposes from observable signals — no guessing, cite what it found:

| Signal | Proposes |
|---|---|
| No test framework, no CI config, no deploy config | lite |
| `git shortlog -sn` → one contributor, < ~20 source files | lite |
| CI pipeline present (`.github/workflows/`, `.gitlab-ci.yml`) | full |
| Deploy config present (`vercel.json`, `Dockerfile`, `fastlane/`) | full |
| Multiple contributors, or user says "production" / "real users" | full |

Ambiguous → propose **lite**. User bumps up any time — re-running `/init` updates marker in place.

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: Print detected signals, then ask *"Which mode fits this project?"* → **Lite (Recommended)** · **Full**. Option descriptions:

- Lite — "Stories, tests, and the 6-agent review. No PRD, no epics, no app-docs until needed."
- Full — "Everything: research → PRD → epics → stories, plus end-user docs and cross-feature specs."

Swap which one carries `(Recommended)` to match ARCH's proposal. Mode is written to `./docs/INDEX.md` frontmatter in step 3.

3. **ARCH** designs folder structure + creates. **Full mode:**

```
./docs/
  INDEX.md                      ← agent navigation — always read first
  CHANGELOG.md                  ← agent changelog — prepend after every ship/fix, newest first
  DECISIONS.md                  ← binding decisions — why, not what. Appended by /cleanup
  MEMORY.md                     ← durable project knowledge — rewritten by /cleanup, hard line cap
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
  index.md                      ← docs landing page the user sees first
  CHANGELOG.md                  ← product release notes, written to end users
  /features/                    ← one .md per user-facing feature — overview + how-to + tutorial + FAQ
  /guides/                      ← user guides (getting-started, shortcuts, troubleshooting). NOT dev onboarding.
```

**Lite mode** — same files minus the ceremony:

```
./docs/
  INDEX.md
  CHANGELOG.md
  DECISIONS.md
  MEMORY.md
  BACKLOG.md
  CONSTITUTION.md               ← short form: Default Decisions + Governance only
  /features/                    ← empty. First story lands in features/main/ (see /ship)
```

Lite does **not** create at init: `PRD.md`, `EPICS.md`, `improvements.md`, `docs/specs/`, `app-docs/`. Each is created on first write — `/doc` builds `app-docs/` when the first user-facing feature ships, `/note`-driven improvements create `improvements.md` on first append. Lite **never** creates `PRD.md` or `EPICS.md`.

Lite keeps `CONSTITUTION.md` deliberately — REQ + EDGE read it during `/review`, and auto-mode hard-override #3 checks it. Short form is ~10 lines, not the full article set.

> **app-docs vs docs:** users vs builders. Strict separation — no paths/code in app-docs, no tutorials in docs.

**ARCH** seeds changelog files immediately:

`./docs/CHANGELOG.md`:
```markdown
# Agent Changelog
<!-- Agents: prepend new entries after every ship/fix — newest first at top. Read at session start. -->

## [date]
- [INIT] project initialised
```

`./app-docs/CHANGELOG.md` — product release notes, written to end users (**full mode only** — lite creates this when `/doc` first builds `app-docs/`):
```md
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
<!-- Run /ship to pick up and implement a backlog item -->
```

**ARCH** seeds `./docs/DECISIONS.md` (both modes):
```markdown
# Decisions
<!-- Binding decisions only — choices that constrain future work: API contracts, chosen
     libraries, rejected approaches, data-model shape. Not implementation detail.
     Appended by /cleanup, newest first. Superseded entries are marked, never deleted. -->

<!-- Entry format:

## DEC-001 — [decision, one line]
date: YYYY-MM-DD · story: STORY-XXX · status: active

**Chose:** [what]
**Because:** [why]
**Rules out:** [what this forecloses]

-->
```

**ARCH** seeds `./docs/MEMORY.md` (both modes). Line cap differs by mode — 150 full, 50 lite:
```markdown
# Project Memory
<!-- Rewritten by /cleanup — not appended. Durable knowledge only: what an agent must know
     at session start. Not a log (docs/CHANGELOG.md), not rationale (docs/DECISIONS.md).
     Nothing derivable from code, git log, or CLAUDE.md belongs here.
     Hard cap: 150 lines. -->

## What this is
[one paragraph — populated after first ship]

## How it's built
[shape of the system an agent can't infer in one read]

## Non-obvious constraints
[things that will bite someone who doesn't know them]

## Known rough edges
[what's knowingly unfinished, and why it's acceptable]
```

Lite mode → write `Hard cap: 50 lines.` in the comment instead.

**ARCH** also writes per-developer ephemera (worktree-local, gitignored):

1. Ensure `.gitignore` exists and contains `.agentic/`:
```bash
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Enable the focus statusline by writing `./.claude/settings.local.json` (the `.local.json` variant is per-developer and untracked by default):

```bash
mkdir -p .claude
```

If `.claude/settings.local.json` does not exist → create it with:
```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/agentic-statusline.sh"
  }
}
```

If it exists but lacks a `statusLine` key → merge the `statusLine` block into existing JSON, preserve other keys.

If it already has a `statusLine` → leave alone (user's choice).

3. Note in `./docs/INDEX.md` navigation section: `.agentic/focus.md` is per-worktree current-task pointer managed by `/focus` and `/next`.

**PROD** generates `./docs/CONSTITUTION.md` by asking: non-negotiable tech standards, architectural principles, security/compliance, forbidden patterns.

**Lite mode:** skip the article interview. Write the short form — header comment, `## Default Decisions` (uncommented, populated from the stack answers in step 2: test runner, package manager, styling approach), `## Governance`. No `## Article` sections. User adds articles later if the project grows. Everything below through `## Governance` is the full-mode format.

Constitution format:
```markdown
# Project Constitution
<!-- Non-negotiable. Agents: check every PRD and review against these. Specific + verifiable only. -->

## Article I: [Topic]
[Principle — specific, testable]

## Article II: [Topic]
[Principle]

(add articles as needed)

## Default Decisions

<!--
Auto mode (`--auto` flag on /feature, /fix, /ship, /ship-all, /implement, /design) reads this section as the authoritative source for default choices. Add one-line defaults below. Auto mode cites the matching line in its DECISION reasoning. Section is optional — auto mode falls back to general best-practice judgment when absent.

Example entries (replace with your project's real defaults):
- DB: Postgres unless feature explicitly requires SQLite
- HTTP client: built-in fetch, no axios
- Tests: pytest, non-watch only
- Frontend: Tailwind for layout, no CSS-in-JS
- Visual artifacts mandatory for UI stories: uncomment the "## Article N: Visual artifacts" article below to enforce. ae-ux escalates missing-artifact warnings to blockers.
-->

<!--
Uncomment to enforce visual-artifact capture on UI stories.
Renumber the Article number to match your constitution's existing articles.

## Article N: Visual artifacts

All UI-touching stories must capture visual artifacts (screenshots or screen recordings) and reference them in `PROGRESS.md`'s Visual Artifacts table. Stories that touch frontend files (`.tsx`/`.jsx`/`.vue`/`.svelte`/`.swiftui`/Compose `.kt`/etc.) without captured artifacts are not shipped.
-->

## Governance
- Constitution supersedes all guidelines
- Violations documented and justified — never silently ignored
- REQ checks every story against constitution during /review
```

**Idempotency for re-init / update:** If `CONSTITUTION.md` already exists and already contains a `## Default Decisions` header → leave that section alone (do not overwrite user content). If it exists without that section → append the `## Default Decisions` block (commented examples only) at the bottom, above `## Governance` if present.

⚠️ **Human checkpoint** `[ASK: confirm]`: Show CLAUDE.md + CONSTITUTION.md drafts together, then ask *"Save these drafts?"* → **Save both** · **Edit first**. Second option → follow up `[ASK: prose]`. Print this warning above the widget: *"The constitution must be specific and verifiable — vague principles like 'write high quality code' give agents nothing to check against."*

**`./docs/INDEX.md`** — single file every agent reads at session start. ARCH generates:

```markdown
---
mode: lite
---

# Docs Index

## How to navigate
- Read this file first to orient yourself
- Read ./docs/MEMORY.md for durable project knowledge — what you need to know before touching anything
- Read ./docs/DECISIONS.md for binding decisions — don't re-litigate what's recorded there
- Read ./docs/CHANGELOG.md to see what's already been done
- Read ./docs/CONSTITUTION.md for non-negotiable project principles
- Go to ./docs/features/[name]/ for feature-specific stories and progress
- Go to ./app-docs/ for END-USER product documentation (how to use the app — don't write internal notes here)
- `.agentic/focus.md` — current task + plan for this worktree, managed by /focus and /next. Gitignored; absent means no active task.

## Features

| Feature | Status | Folder |
|---------|--------|--------|
| (none yet — populated by /feature) | | |
```

Frontmatter `mode:` is the marker every mode-aware command reads. Values: `lite` | `full`. Write the mode confirmed in step 2b.

**Full mode additions** to the template above:
- navigation bullet: `- Go to ./docs/features/[name]/ for feature-specific PRD, stories, and progress` (replaces the lite wording)
- navigation bullet: `- Go to ./docs/improvements.md for ARCH/RED improvement suggestions`
- trailing section:
  ```markdown
  ## Design specs
  ./docs/specs/
  ```

**Re-init on an existing project:** frontmatter present → rewrite only the `mode:` value.

No frontmatter, INDEX.md exists anyway → two cases:
- Project has shipped work (any `PRD.md`, `EPICS.md`, or checked story) → it predates modes. Prepend `mode: full`, announce it, skip the 2b gate. Silently downgrading to lite would strand its PRD and epics.
- No shipped work — INDEX.md is a `/bootstrap` roadmap stub → run the 2b gate normally and prepend the chosen mode.

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

## Project Docs
- `docs/INDEX.md` — read first, navigation + feature table
- `docs/MEMORY.md` — durable project knowledge, read at session start
- `docs/DECISIONS.md` — binding decisions, don't re-litigate
- `.agentic/focus.md` — current task + plan (per-worktree, gitignored; absent = no active task)

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

`## Project Docs` is idempotent on re-init: section exists → replace it; absent → insert it above `## Docs Structure`.

**Lite mode** trims `## Docs Structure` to the files lite actually creates:
```markdown
## Docs Structure
- Index:        ./docs/INDEX.md
- Constitution: ./docs/CONSTITUTION.md
- Features:     ./docs/features/[name]/STORIES.md|PROGRESS.md
- Reviews:      ./docs/features/[name]/reviews/
```

5. ⚠️ **Human checkpoint** `[ASK: confirm]`: Show generated CLAUDE.md, then ask *"Save it?"* → **Save** · **Edit first**. Second option → follow up `[ASK: prose]`.

6. **ARCH** reads `~/.claude/skills/agentic-engineering/rules-library/README.md`, presents rules grouped by type, pre-suggests matches from captured stack.

Stack rules: `react-typescript` · `nextjs-app-router` · `react-native` · `python-fastapi` · `python-django` · `node-express` · `go` · `rust` · `flutter` · `swiftui` · `ios-native` · `android-native`

Cross-cutting: `testing-conventions` · `git-conventions` · `api-design` · `secrets-management`

⚠️ **Human checkpoint** `[ASK: multi]`: *"Which convention rules should this project install?"* — one option per rule above, pre-check the stack matches ARCH detected plus `testing-conventions` and `git-conventions`; leave the rest unchecked. `minSelected: 0` — selecting nothing is a valid "skip rules entirely".

Per selected rule, copy from `~/.claude/skills/agentic-engineering/rules-library/<name>.md` to `./.claude/rules/` (create dir if needed).

**ARCH** confirms installed + notes: *"Edit any to match your project. Delete any that don't fit."*

7. **ARCH** reads `~/.claude/skills/agentic-engineering/capture-tools/README.md` + each catalog entry's frontmatter.

Filter catalog by detected stack:
- Read CLAUDE.md (just generated above) + scan repo for files matching each entry's `detection:` rules
- Match by `platforms:` (web / mobile / ios / android / rn / flutter / desktop / terminal / any)
- Always include `manual` and `loom-link` as fallback candidates

Present matching tools to operator:

```
ARCH — Visual capture tool selection:

Detected stack: <stack summary>

Matching capture tools:
  1. <tool-name>       — <one-line description>
  2. <tool-name>       — <one-line description>
  3. manual            — capture by hand, no automation
  4. loom-link         — paste hosted recording URLs
```

⚠️ **Human checkpoint** `[ASK: single]`: *"Which visual-capture tool should this project use?"* — top stack matches first (best match suffixed `(Recommended)`), then `manual`. More than 3 matches → offer the top 3; the built-in "Other" covers the rest of the catalog. Skipping is a valid answer — treat "Other: none" as skip.

On selection:
1. Copy `~/.claude/skills/agentic-engineering/capture-tools/<name>.md` → `./.claude/visual-capture.md`
2. ARCH announces: *"Capture tool configured at `.claude/visual-capture.md`. Edit to tune project-specific values (command, output dir, etc.). Committed to git so team uses same tool."*

On 'none':
3. ARCH announces: *"Skipping visual capture setup. UI stories will receive informational reminders during `/ship` Phase 4. Visual Artifacts table in PROGRESS.md can be filled manually."*

(No `.claude/visual-capture.md` written when 'none' selected — Phase 1's manual flow applies by default.)

8. **GIT** stages + commits scaffold:
```
chore: initialise project structure, CLAUDE.md, CONSTITUTION.md, and project rules
```

9. **PROD** summarizes created + prompts: *"Run `/feature [name]` to start your first feature."*

---
