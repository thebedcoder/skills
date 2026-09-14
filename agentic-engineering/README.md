# 🏗 Agentic Engineering

> A structured, phase-gated SDLC workflow for Claude Code powered by named specialist agents.

Stop vibe-coding. Get a repeatable system: one feature at a time, human checkpoints at every phase gate, parallel specialist reviews, and a git history that tells a story.

---

## The problem this solves

AI coding assistants are powerful but undisciplined. Left to their own devices they skip tests, implement the wrong thing, miss security issues, lose context between sessions, and create documentation debt. Agentic Engineering enforces a workflow that prevents all of this without sacrificing speed.

---

## How it works

Commands are handled by a cast of named specialist agents. Each has a distinct role and bias. They challenge each other, check each other's work, and hand off cleanly.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT ROSTER                                │
├───────────┬────────────────────────────────┬────────────────────────┤
│ 🏗 ARCH   │ Architecture & planning        │ Suspicious of debt     │
│ 📋 PROD   │ PRD, stories, criteria         │ Challenges vague specs │
│ 🎨 UX     │ Design flows, mockups,         │ Never skips states,    │
│           │ fidelity review                │ uses reference checks  │
│ 🔴 RED    │ Bug hunt — null/async/logic    │ Traces failure paths   │
│ 🔧 FIXER  │ Root cause, surgical fixes     │ One bug, one fix       │
│ ✅ REQ    │ Requirements + constitution    │ Binary — met or not    │
│ 🧪 TEST   │ Coverage & test quality        │ Flags useless tests    │
│ 🔍 EDGE   │ Adversarial edge-case probe    │ Hunts what's missing   │
│ 📖 DOC    │ Convention alignment           │ Notices code drift     │
│ ✍️ SCRIBE  │ End-user product docs         │ Writes for app users,  │
│           │                                │ not the dev team       │
│ 🔀 GIT    │ Commits, branches, PRs         │ Conventional always    │
│ 🔐 SEC    │ Security vulnerabilities       │ High-confidence only   │
└───────────┴────────────────────────────────┴────────────────────────┘
```

Seven review agents (RED, REQ, TEST, DOC, SEC, EDGE, LEAN) run as **parallel subagents** after every story — RED, SEC, EDGE and LEAN on Sonnet, REQ, TEST and DOC on Haiku — results back simultaneously, main context stays clean. Now includes `ae-edge`, which adversarially probes backend code for missing edge cases (boundary, null, race, malformed, resource, error-path) and emits failing test code + suggested fixes into the consolidated blocker list.

One UX subagent (ae-ux) runs after the frontend pass with a structured checklist across 6 dimensions.

---

## Workflow

```
┌──────────────┐
│  /bootstrap  │  New project — pick stack, scaffold, install deps,
│              │  create base structure, plan core epics.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   /init      │  Pick project mode (lite or full), then create the
│              │  docs scaffold + CLAUDE.md + CONSTITUTION.md
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         FEATURE LOOP                                 │
│                                                                      │
│  /feature [name]                                                     │
│    1. ARCH proposes 3 approach options                               │
│    2. PROD generates PRD with [NEEDS CLARIFICATION] markers          │
│    3. Clarification pass — batch resolve all ambiguous items         │
│    4. REQ constitution check — violations block story breakdown      │
│    5. ARCH generates data-model.md (if DB changes)                   │
│    6. PROD writes stories tagged [P] where parallelisable            │
│                                                                      │
│  /design  (if UI)                                                    │
│    Mobile-first → desktop → handoff spec in ./docs/specs/            │
│                                                                      │
│  /ship  (per story)                                                  │
│    ┌─────────────┐                                                   │
│    │ implement   │  ARCH plans (Contract claims + Failure states)    │
│    │             │  → RED + SEC pre-review the PLAN, not the code    │
│    │             │  → PROD validates → code + tests                  │
│    └──────┬──────┘                                                   │
│           │                                                          │
│    ┌──────▼──────────────────────────────────────────────────┐       │
│    │              6 PARALLEL REVIEW AGENTS                   │       │
│    │  🔴 RED    bug hunt (null/async/logic/resources)        │       │
│    │  ✅ REQ    requirements + constitution audit            │       │
│    │  🧪 TEST   coverage quality + framework patterns        │       │
│    │  📖 DOC    convention alignment                         │       │
│    │  🔐 SEC    security vulnerabilities                     │       │
│    │  🔍 EDGE   edge case hunting (boundary/race/malformed)  │       │
│    └──────┬──────────────────────────────────────────────────┘       │
│           │  consolidated: blockers / should-fix / clean             │
│           │                                                          │
│    ┌──────▼──────┐                                                   │
│    │  frontend   │  (if story has UI)                                │
│    │  + ae-ux    │  🎨 fidelity check — states/forms/a11y/responsive │
│    └──────┬──────┘                                                   │
│           │                                                          │
│    ✍️ SCRIBE  updates end-user app-docs + both changelogs            │
│              (final step before commit — keeps product docs in sync) │
│    🔀 GIT    commits with conventional message + PR description      │
│    🧹 CLEAN  records DEC- decisions + refreshes docs/MEMORY.md       │
│                                                                      │
│  /ship-all — chains /ship across all stories                         │
│    Shows [P] parallel groups upfront                                 │
│    Prompts you to /compact between stories                                │
└──────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│    /fix      │  Bug reported → FIXER diagnoses → fix → review → docs
└──────────────┘
┌──────────────┐
│   /improve   │  Non-bug change → ARCH plans → apply → review → docs
└──────────────┘   (new shortcut, new format, faster path, refactor)
```

---

## Commands

| Command | What it does |
|---|---|
| `/bootstrap` | Scaffold a new project — stack, deps, structure, epic roadmap |
| `/init` | Pick project mode (lite or full), then create the docs scaffold, CLAUDE.md, and CONSTITUTION.md |
| `/feature [name]` | Research → PRD → clarifications → constitution check → stories → spec audit. PRD acceptance criteria are numbered `FR-1…FR-n` and each story declares which it delivers (`Implements: FR-2, FR-5`), so every requirement is traceable to the work that closes it — an unmapped FR stops the breakdown. Each story also carries a `Priority:` of `P1`/`P2`/`P3`, where the P1 set alone must be deployable. The final stage dispatches `ae-req` in spec-audit mode over the PRD, epics and stories, checking ambiguity, duplication, underspecification, FR coverage, constitution conflicts and terminology drift before a line of code exists. In lite mode: stories only, no PRD or epics — the spec audit still runs, scoped to stories and the constitution |
| `/design` | Mobile-first mockups via Figma, Pencil.dev, or Markdown |
| `/ship` | Full story, seven phases: implement → 7-agent review → frontend (+ visual capture) → 6-agent review + UX fidelity → end-user docs & changelogs → PR description → cleanup. Every shipped story writes an **AC Coverage matrix** to `PROGRESS.md`, mapping each Acceptance Criterion to the tests that prove it. `ae-test` validates the matrix during `/review` — missing AC or stale test references become blockers. The matrix's `Level` column (`unit`/`integration`/`e2e`) lets `/status` and `ae-test` report the pyramid mix per story and per feature, with a soft warning when over half the tests are e2e or zero unit tests exist. UI-touching stories also record a Visual Artifacts table in PROGRESS.md (screenshots/recordings per AC); `ae-ux` validates the references during the frontend pass — stale or missing references become should-fix warnings. Projects opt into automated capture during `/init` by picking a tool from the 15-entry catalog (`agentic-engineering/capture-tools/`); `/ship` Phase 3 then dispatches per mechanism and auto-populates the table. To require captures, add a "Visual artifacts" article to CONSTITUTION.md — `ae-ux` then escalates missing-artifact findings to blockers. |
| `/ship-all` | Loop `/ship` across all unchecked stories, in priority order — never a `P2` while a `P1` is open. The session-start gate offers shipping the P1 set only, which finishes cleanly with the rest listed as remaining. Features whose stories predate the `Priority:` field ship in file order, unchanged |
| `/plan-all` | Plan all unplanned epics from INDEX.md |
| `/converge [feature]` | Audit a feature's shipped code against its PRD. `/review` is diff-scoped and story-scoped — after eight stories nobody has compared the requirements against the repository, and the checkboxes were written by the same process that claimed completion. `/converge` builds an inventory from the `FR-` ids, resolves each to the code that should exist, and classifies what it finds as `missing`, `partial`, `contradicts` or `unrequested`. Work that is simply queued in an unchecked story is reported as pending, never as a gap; a requirement claimed by a **checked** story with no matching code is the blocker it exists to catch. Findings with remaining work are appended to `STORIES.md` behind an approval gate, marked `Source: converge`. It never edits the PRD, never touches code, and never fixes anything — repairs go back through `/ship` or `/fix` with a full review behind them. Run it before `/archive`, which deletes the artifacts it audits against |
| `/fix [desc]` | Diagnose bug → fix → review → docs |
| `/improve [desc]` | A change that is neither a bug nor a whole feature — a new keyboard shortcut, support for a new file format, an extra export option, a faster query, a long module split in two. ARCH plans it against the precedent set by whatever already does the same kind of thing, states 2–4 inline `Done when:` conditions (printed only — never written to `STORIES.md` or a PRD), applies it, then `ae-red` + `ae-test` plus one specialist picked from the diff review it. The Phase 1 `Change type` (`feat` / `perf` / `refactor`) fixes the commit prefix up front, so additive work lands as `feat(` and gets its minor-version bump. Called bare, it picks an `improvement`-typed item out of `BACKLOG.md`. |
| `/note [desc]` | Capture bug/idea/improvement to BACKLOG.md |
| `/focus [task\|done\|clear]` | Set, clear, or advance the current-task pointer and step plan for this worktree (`.agentic/focus.md` — shown in the status bar, see below) |
| `/next [task\|drop N]` | Queue a task to be picked up after the current one finishes |
| `/doc [feature]` | Document a feature interactively with Q&A |
| `/doc-all [--full]` | Document multiple features (`--full` adds guides + index) |
| `/status` | Progress overview across all features + backlog (runs in forked context) |
| `/analyze [question]` | Answer any question — searches docs and codebase (runs in forked context) |
| `/archive [feature\|--all]` | Compact a shipped feature's docs (PRD, stories, progress, reviews, artifacts) into a single `SUMMARY.md` with story digests, links to the feature's `DEC-` entries, and a frozen test rollup. Originals are deleted — git history preserves them; `data-model.md` stays. `/status` and `/ship-all` skip archived features, keeping their scans fast as shipped features accumulate. `--all` archives every fully-shipped feature behind one combined confirmation, with a separate commit per feature so each can be reverted individually. |
| `/cleanup [story\|feature]` | Promote finished work into durable docs: binding decisions appended to `docs/DECISIONS.md` as `DEC-NNN` entries, and `docs/MEMORY.md` rewritten within a hard line cap. Runs automatically as the last phase of every `/ship`, `/fix`, and `/improve`; use it standalone for work done outside those chains. |

---

## Docs structure

Created automatically by `/init` and maintained by agents throughout development.

```
your-project/
├── CLAUDE.md                    ← project conventions
├── docs/
│   ├── INDEX.md                 ← read first every session (carries the mode: marker)
│   ├── MEMORY.md                ← durable project knowledge, rewritten and size-capped
│   ├── DECISIONS.md             ← binding decisions, DEC-NNN, superseded never deleted
│   ├── CHANGELOG.md             ← agent changelog, terse, newest first
│   ├── CONSTITUTION.md          ← non-negotiable project principles
│   ├── BACKLOG.md               ← captured bugs and ideas
│   ├── improvements.md          ← suggestions + won't-fix log (read at /review consolidation)
│   ├── specs/                   ← design handoff specs
│   └── features/
│       └── [name]/
│           ├── PRD.md                        ← full mode only
│           ├── EPICS.md                      ← full mode only
│           ├── STORIES.md       ← stories with [P] parallel markers
│           ├── PROGRESS.md
│           ├── data-model.md    ← generated when feature touches DB
│           ├── reviews/         ← review output per story
│           ├── artifacts/       ← captured screenshots/recordings per story
│           └── SUMMARY.md       ← replaces all of the above after /archive
│                                  (data-model.md survives)
└── app-docs/                   ← END-USER product documentation (like a landing-page "Docs" section)
    ├── index.md                ← docs landing page the user opens first
    ├── CHANGELOG.md            ← product release notes, written to users
    ├── features/               ← one .md per user-facing feature: overview + how-to + tutorial + FAQ
    └── guides/                 ← user guides (getting-started, shortcuts, troubleshooting)
```

> `./docs/` is for people who **build** the app. `./app-docs/` is for people who **use** the app. They never overlap — no file paths or code in app-docs, no user tutorials in docs. SCRIBE updates app-docs as the final step of every `/ship` and `/fix`, and of every `/improve` that changes something a user can see, so the published docs always match what the app can actually do.

A **lite** project (see below) starts with a much smaller subset of this tree — no `PRD.md`, no `EPICS.md`, no `app-docs/`, no `specs/` — and grows the rest only when something actually needs to be written.

---

## Key concepts

### Project mode — lite or full

Not every project is a production system. A landing page does not need a PRD, an epic breakdown, and an end-user documentation site before the first line of CSS. But it still benefits from stories with acceptance criteria, real tests, and a six-agent review.

So `/init` asks once, and records the answer in `docs/INDEX.md` frontmatter:

```yaml
---
mode: lite
---
```

| | lite | full |
|---|---|---|
| Planning | stories straight from your description | research → 3 approaches → PRD → epics → stories |
| `PRD.md`, `EPICS.md` | never created | always |
| `improvements.md`, `specs/`, `app-docs/` | created on first write | created at `/init` |
| `CONSTITUTION.md` | short form, ~10 lines | full articles |
| Stories, acceptance criteria, `PROGRESS.md` | identical | identical |
| 7-agent parallel review | identical | identical |
| Mandatory tests, human checkpoints | identical | identical |

`/init` proposes a mode from what it can observe — test framework, CI config, deploy config, contributor count — and defaults to lite when the signals are ambiguous. You can override at the prompt, and re-running `/init` changes the marker.

In lite mode the shipping path is `/note` → `/ship` rather than `/feature` → `/ship`: capture the thing, then ship it. `/ship` promotes a backlog item into `docs/features/main/` when no feature exists yet. `/feature` still works when you want a group of related stories planned at once — it just skips the research and PRD stages.

Only four commands behave differently between modes (`/init`, `/feature`, `/status`, `/cleanup`). Everything else — `/ship`, `/implement`, `/review`, `/fix`, `/doc` — is identical, because it reads `STORIES.md` and `PROGRESS.md`, which both modes produce.

### Three memory documents

Finished work leaves behind three different kinds of knowledge, and mixing them is how documentation rots. `/cleanup` — the last phase of every `/ship`, `/fix`, and `/improve` — keeps them separate:

| File | Answers | How it's written |
|---|---|---|
| `docs/CHANGELOG.md` | what shipped, and when | appended, newest first, grows forever |
| `docs/DECISIONS.md` | why it's built this way | appended as `DEC-NNN`; a reversed decision is marked superseded, never deleted |
| `docs/MEMORY.md` | what you need to know before touching anything | **rewritten** every cleanup, with a hard cap of 150 lines (50 in lite) |

`MEMORY.md` is the only project document with a size ceiling, and that is the point: it is what an agent reads at session start instead of scanning the codebase, so it has to stay short enough to be worth reading. When a rewrite would blow the cap, cleanup compresses the least valuable section and tells you which one.

Most stories produce no `DEC-` entry at all. That is the expected outcome — a decision earns a line only when it constrains code that hasn't been written yet.

`CONSTITUTION.md` sits apart from all three: it holds rules that must not be broken, not choices that were made.

### Constitution

Every project gets a `CONSTITUTION.md` — non-negotiable principles created at `/init`, checked by REQ at every review. Principles must be specific and verifiable:

```markdown
# Project Constitution

## Article I: Testing
No implementation code before failing tests are written and approved.

## Article II: Architecture  
Every feature must be a standalone module before integrating into app code.

## Article III: API Design
All APIs must follow JSON:API specification.
```

Constitution violations found in review are always blockers.

### Contract claims, failure states, and plan pre-review

Two required sections in ARCH's implementation plan, both of which outlive it.

**Contract claims** — every behaviour the story depends on but does not own: another module's return shape on a miss, whether a call is idempotent, what a library actually guarantees. Each needs a `file:line` in real source, or a probe command *and its pasted output*. Reasoning from the name of a thing is not proof, and an unproven claim is the defect class that ships silently: code built on a wrong belief still runs, still returns a plausible value, and still passes the tests its author wrote from that same belief.

**Failure states** — whenever a story can fail partway (a commit, rollback, migration, batch write), a table of failure point × per-resource state × what the outcome reports, written *before* the code. These bugs do not arrive one at a time; a reversal path designed in prose and implemented ad hoc produces a cluster of individually plausible defects, all found late.

**Pre-review** dispatches RED and SEC against the plan rather than the codebase. They re-open each cited `file:line` and ask whether it says what the claim says — and whether the claim's converse is also consistent with it — then look for a failure point the table omits. It runs under `--auto` and never pauses; a disputed claim escalates the plan gate instead. Both sections are persisted into `PROGRESS.md`, because "it was in the plan" is unverifiable once the session ends.

### Human checkpoints

Interactively, the workflow stops at each of these:
- Approach selection (after 3 options presented)
- PRD approval (after the clarification pass resolves all `[NEEDS CLARIFICATION]` items)
- Constitution violations (must be resolved before stories are written)
- Implementation plan (before any code is written)
- Design approval (mobile and desktop separately)
- Review blockers

**Under `--auto`, the plan and PRD gates are skipped** — they are approval ceremony, and that is what auto mode exists to skip. Three things re-arm them anyway: a plan that adds a dependency or changes a public interface, an unresolved pre-review finding on a Contract claim, and anything on the hard-override list below. Constitution violations, review blockers and destructive operations are never skipped under any flag.

### Auto mode (`--auto`)

Long-running commands (`/feature`, `/fix`, `/improve`, `/ship`, `/ship-all`, `/implement`, `/design`) accept a per-invocation `--auto` flag. Ceremonial checkpoints are skipped, unambiguous decisions proceed automatically (citing `CONSTITUTION.md` when it settles the choice), and everything that matters still pauses: review blockers, anything touching CI configs / secrets / DB migrations / mass deletions, constitution conflicts, and any architectural or destructive choice. Every auto-decision is announced inline and logged to `.agentic/auto-log.md` (gitignored), and the command ends with a one-line summary of decisions and hard-pauses.

### Parallel stories `[P]`

Stories tagged `[P]` have no dependencies on other stories. `/ship-all` surfaces these upfront — you can run them in separate Claude Code sessions simultaneously.

### Two changelogs

Both maintained automatically — never skip this step:

- **`./docs/CHANGELOG.md`** — agent-readable engineering log, terse, one line per action. Read at every session start alongside INDEX.md to orient without scanning the codebase. Every ship/fix/improve appends here.
- **`./app-docs/CHANGELOG.md`** — **product release notes, written to end users.** Only gets an entry when a ship, fix, or improvement actually changed something a user can see. Pure internal refactors do not appear here — they stay in the engineering log.

### Context management

Long sessions stay lean through three mechanisms:
- **Caveman rules** — agent-to-agent output drops filler words (~75% token reduction), technical terms kept exact
- **A compact checkpoint** between stories in `ship-all` and between epics in `plan-all`. `/compact` is a user command — the workflow prints the command and asks you to run it; it cannot run it for you
- **On-demand loading** — only the command file for the current command is loaded into context, not the full skill

### Context forking

`/status` and `/analyze` use `context: fork` — they run in an isolated subagent context. The main conversation only sees the final result, not the intermediate tool calls and file reads. This keeps the main context lean on long sessions where you might check status or run analysis queries repeatedly.

Other commands (`/ship`, `/feature`, `/design`) stay in the main context because they have human checkpoints that require conversation continuity.

### Built-in gotchas

Each command file documents the specific failure modes Claude tends toward when executing it — things like dispatching review subagents sequentially instead of batched, scope-creeping during bug fixes, or writing tests after the implementation and calling it TDD. These aren't generic warnings; they're patterns observed in practice and written directly into the skill so Claude course-corrects before hitting them.

Command files are also framed as goals and constraints rather than rigid step-by-step instructions. This gives Claude room to orchestrate intelligently while keeping the non-negotiables (human checkpoints, output formats, quality gates) locked in.

---

## Rules library

Every project gets path-scoped rules in `./.claude/rules/` that auto-load when Claude Code works with matching files. During `/init`, ARCH shows a curated library of starter rules — pick the ones that match your stack and drop them in.

**Stack rules** — activate on file pattern:

| Rule | Stack |
|---|---|
| `react-typescript` | React + TypeScript |
| `nextjs-app-router` | Next.js 13+ app directory |
| `react-native` | React Native (Expo or bare) |
| `python-fastapi` | FastAPI APIs |
| `python-django` | Django web apps |
| `node-express` | Node + Express APIs |
| `go` | Go projects |
| `rust` | Rust projects |
| `flutter` | Flutter apps |
| `swiftui` | SwiftUI-first iOS/macOS |
| `ios-native` | iOS with UIKit |
| `android-native` | Android Kotlin/Java |

**Cross-cutting rules** — apply regardless of stack:

| Rule | Covers |
|---|---|
| `testing-conventions` | What to test, mocks, fixtures, flaky test policy |
| `git-conventions` | Conventional commits, branch names, PR flow |
| `api-design` | REST conventions, status codes, pagination, errors |
| `secrets-management` | Env var handling, rotation, never-in-code policy |

Rules are starting points — copy what fits, edit as needed, delete what doesn't. Most are 2–4KB; they load only for files matching their `paths:` glob, so the ones that don't apply cost nothing.

You can add your own rules any time by dropping a markdown file with YAML frontmatter into `./.claude/rules/`. The full reference is [`rules-library/README.md`](rules-library/README.md) in this repo.

---

## Review agent knowledge base

Each review agent loads reference files on demand based on what's in the diff. No generic checklists, no pattern-matching noise — each reference defines what "vulnerable", "broken", or "missing" looks like in that specific context with real code examples.

RED carries 7 bug-category references and 7 language guides; TEST 4 references and 7 framework guides; SEC 17 topic references and 8 language guides; EDGE 4 probe categories; UX 6 fidelity dimensions. The full file listing is in [`docs/review-agent-references.md`](docs/review-agent-references.md).

---

## Design tool support

Configured once during `/init`, used by `/design`:

| Tool | Notes |
|---|---|
| **Pencil.dev** | Free, IDE-native, `.pen` files version-controlled in repo — recommended |
| **Figma** | Requires paid plan + Figma MCP configured |
| **None** | SCRIBE generates detailed Markdown wireframe specs instead |

---

## Installation

### Claude Code — the marketplace plugin

```
/plugin marketplace add thebedcoder/skills
/plugin install agentic-engineering@thebedcoder
```

Restart Claude Code — commands appear in the `/` palette as `/bootstrap`, `/init`, `/ship`, etc. (or fully namespaced as `/agentic-engineering:ship`).

**Updates:** `/plugin update agentic-engineering`. **Uninstall:** `/plugin uninstall agentic-engineering`.

> **This is the only supported Claude Code install, and it is deliberate.** The plugin resolves its rules library, capture-tools catalog, statusline script and every agent reference file through `${CLAUDE_PLUGIN_ROOT}`, which only a marketplace install sets. Earlier versions also shipped a `bash install.sh` that copied files into `~/.claude/`; that path is gone. If you used it, uninstall it first — see below.

**Uninstalling an old shell install.** Versions before 2.0.0 wrote directly into your home directory. Remove them or you will run two copies of everything — duplicate skills, duplicate agents, and slash commands that resolve to whichever loaded first:

```bash
rm -rf ~/.claude/skills/agentic-engineering
rm -f  ~/.claude/agents/ae-*.md
rm -rf ~/.claude/agents/ae-red ~/.claude/agents/ae-test ~/.claude/agents/ae-sec \
       ~/.claude/agents/ae-ux ~/.claude/agents/ae-edge
rm -f  ~/.claude/agentic-statusline.sh
cd ~/.claude/commands && rm -f bootstrap.md init.md feature.md design.md ship.md \
  ship-all.md plan-all.md fix.md improve.md note.md focus.md next.md doc.md \
  doc-all.md status.md analyze.md archive.md cleanup.md
```

Then re-run `/init` in each project so the statusline points at the project-local copy of the script rather than the deleted `~/.claude/agentic-statusline.sh`.

### Other coding agents — the portable workflow

The full workflow (slash commands + specialist subagents) is Claude Code-native and doesn't port. The **portable workflow rules** do — plain markdown any agent can follow. Run the installer with `--tool=<name>` from your project root:

```bash
# From inside your project:
curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash -s -- --tool=<tool>
```

| `--tool=` | What gets written | How the tool picks it up |
|---|---|---|
| `cursor` | `AGENTS.md` + `.cursor/rules/*.mdc` | Auto-loaded; rules scoped by glob |
| `codex` | `AGENTS.md` | Codex CLI reads it from project root |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot in VS Code / JetBrains reads automatically |
| `cline` | `.clinerules` | Cline VS Code extension reads on activation |
| `windsurf` | `.windsurfrules` | Windsurf / Codeium reads from project root |
| `aider` | `CONVENTIONS.md` | Pass via `/add` or `.aider.conf.yml` |
| `gemini` | `GEMINI.md` | Gemini CLI reads from project root |
| `zed` | `AGENTS.md` | Zed assistant reads from project root |
| `openhands` | `AGENTS.md` | OpenHands reads from project root |
| `agents-md` | `AGENTS.md` | Generic — any AGENTS.md-aware tool |
| `copilot-cli` | (instructions only) | Copilot CLI uses its own marketplace |
| `auto` | Detects installed tools and runs each | — |

`--tool=claude-code` prints the marketplace instructions above and writes nothing. That is the intended outcome.

**Re-running is safe.** The script wraps content between `<!-- agentic-engineering:start v1 -->` and `<!-- agentic-engineering:end v1 -->` markers — repeat runs replace the block in place, leaving other content untouched.

**Global scope.** Pass `--scope=user` for `cursor`, `codex`, `gemini` to write to `~/.cursor/`, `~/.codex/`, `~/.gemini/`.

**Override paths.** `CURSOR_RULES_DIR`, `CLINERULES`, `WINDSURFRULES`, `AIDER_CONVENTIONS`, `GEMINI_MD`.

### Claude.ai

Upload `agentic-engineering.skill` via **Settings → Customize → Skills → Upload**. This is the skill only — no subagents, so `/review` runs as a single pass rather than six parallel ones.

**What's inside the plugin:**

```
agentic-engineering/
├── .claude-plugin/plugin.json    ← plugin metadata
├── skills/agentic-engineering/
│   ├── SKILL.md                  ← router + the policy every command inherits
│   ├── commands/                 ← 22 command bodies, loaded on demand
│   └── shared/preamble.md        ← blocks many command bodies reuse
├── agents/                       ← 9 flat agent files, nothing else
│   ├── ae-red.md                 ← bug hunter
│   ├── ae-req.md                 ← requirements + constitution
│   ├── ae-test.md                ← test quality + AC coverage matrix
│   ├── ae-doc.md                 ← convention drift
│   ├── ae-sec.md                 ← security (Sonnet, with ae-red and ae-edge)
│   ├── ae-edge.md                ← adversarial edge-case prober
│   ├── ae-lean.md                ← reuse, simplification, efficiency, altitude
│   ├── ae-ux.md                  ← UX fidelity (runs after the frontend pass)
│   └── ae-scribe.md              ← end-user docs writer
├── references/<agent>/           ← the agents' on-demand reference + language docs
├── commands/                     ← 21 slash-command wrappers
├── rules-library/                ← 16 rule templates for /init to offer
├── capture-tools/                ← 15-entry visual-capture catalog for /init to offer
├── adapters/AGENTS.md.template   ← portable rules for non-Claude tools
├── agentic-statusline.sh         ← copied into your project by /init
├── docs/                         ← reference material split out of this README
├── CHANGELOG.md
└── CLAUDE.md                     ← authoring guide for this plugin
```

**Why `references/` sits outside `agents/`:** under a plugin install, every `.md`
file beneath `agents/<name>/` registers as its own dispatchable subagent type.
The nested layout produced 59 phantom agents named after reference documents.

## Status bar focus hint

`/init` and `/bootstrap` wire this up automatically: they copy the statusline script into your project's `.claude/` and point `.claude/settings.local.json` at it. Nothing to do on new projects.

```
~/dev/myapp  feat/payments  Sonnet 4.6  ctx:42%
🎯 STORY-003: Stripe webhook handler
```

Already have a custom `statusLine`? They leave it untouched. Merge the focus hint in yourself — recipes in [`docs/statusline.md`](docs/statusline.md).

---

## Starting a new project

```bash
/bootstrap      # scaffold project
/init           # docs structure + CLAUDE.md + CONSTITUTION.md
/feature auth   # plan first feature
/design         # design UI (if applicable)
/ship           # implement story by story
```

## Adding to an existing project

```bash
/init               # create docs structure
/doc-all --full     # generate docs from existing codebase
/feature [name]     # start planning new features normally
```

---

## Example session

```
You:    /status
PROD:   2 features in progress. 5 stories remaining. 1 backlog item.

You:    /feature payments
ARCH:   Option A: Stripe direct. Option B: payment abstraction layer. Option C: ...
You:    Option A

PROD:   PRD draft ready. 2 items need clarification:
        1. Should failed payments retry automatically?
        2. Which currencies need to be supported at launch?
You:    Yes, 3 retries with backoff. USD and EUR only.

REQ:    Constitution check — Article III (API design): Stripe webhook handler
        returns 200 before processing. Violates JSON:API response spec.
        Fix before proceeding.
You:    Good catch, noted.

PROD:   8 stories written. 3 tagged [P] (can run in parallel):
        [P] STORY-001: Stripe customer creation
        [P] STORY-002: Payment method storage
        [P] STORY-003: Webhook handler setup
        Sequential: STORY-004 through STORY-008

You:    /ship
ARCH:   Plan for STORY-001: [implementation plan]
You:    go

        → implement + tests
        → 6 parallel reviews return simultaneously
        → 1 blocker: hardcoded Stripe key in config (SEC)
        → fix blocker
        → SCRIBE updates changelogs
        → GIT: feat(payments): add Stripe customer creation

ARCH:   STORY-001 done. Run /ship for next story.
```

---

## Credits

Built with Claude Code. Informed by:
- [Spec Kit](https://github.com/github/spec-kit) — constitution and spec-driven development
- [getsentry/skills](https://github.com/getsentry/skills) — reference-backed skill architecture
- [anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review) — confidence-based security review approach

---

## License

MIT
