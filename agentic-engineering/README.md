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
│ 📖 DOC    │ Convention alignment           │ Notices code drift     │
│ ✍️ SCRIBE  │ End-user product docs (MDX)   │ Writes for app users,  │
│           │                                │ not the dev team       │
│ 🔀 GIT    │ Commits, branches, PRs         │ Conventional always    │
│ 🔐 SEC    │ Security vulnerabilities       │ High-confidence only   │
└───────────┴────────────────────────────────┴────────────────────────┘
```

Six review agents (RED, REQ, TEST, DOC, SEC, EDGE) run as **parallel Haiku subagents** after every story — results back simultaneously, main context stays clean. Now includes `ae-edge`, which adversarially probes backend code for missing edge cases (boundary, null, race, malformed, resource, error-path) and emits failing test code + suggested fixes into the consolidated blocker list.

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
│   /init      │  Create docs scaffold + CLAUDE.md + CONSTITUTION.md
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
│    │ implement   │  ARCH plans → PROD validates → code + tests       │
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
│                                                                      │
│  /ship-all — chains /ship across all stories                         │
│    Shows [P] parallel groups upfront                                 │
│    Mandatory /compact between stories                                │
└──────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│    /fix      │  Bug reported → FIXER diagnoses → fix → review → docs
└──────────────┘
```

---

## Commands

| Command | What it does |
|---|---|
| `/bootstrap` | Scaffold a new project — stack, deps, structure, epic roadmap |
| `/init` | Create docs scaffold, CLAUDE.md, and CONSTITUTION.md |
| `/feature [name]` | Research → PRD → clarifications → constitution check → stories |
| `/design` | Mobile-first mockups via Figma, Pencil.dev, or Markdown |
| `/ship` | Full story: implement → 6-agent review → frontend → UX check → docs → git. Every shipped story writes an **AC Coverage matrix** to `PROGRESS.md`, mapping each Acceptance Criterion to the tests that prove it. `ae-test` validates the matrix during `/review` — missing AC or stale test references become blockers. The matrix's `Level` column (`unit`/`integration`/`e2e`) lets `/status` and `ae-test` report the pyramid mix per story and per feature, with a soft warning when over half the tests are e2e or zero unit tests exist. |
| `/ship-all` | Loop `/ship` across all unchecked stories |
| `/plan-all` | Plan all unplanned epics from INDEX.md |
| `/fix [desc]` | Diagnose bug → fix → review → docs |
| `/note [desc]` | Capture bug/idea/improvement to BACKLOG.md |
| `/doc [feature]` | Document a feature interactively with Q&A |
| `/doc-all [--full]` | Document multiple features (`--full` adds guides + index) |
| `/status` | Progress overview across all features + backlog (runs in forked context) |
| `/analyze [question]` | Answer any question — searches docs and codebase (runs in forked context) |

---

## Docs structure

Created automatically by `/init` and maintained by agents throughout development.

```
your-project/
├── CLAUDE.md                    ← project conventions
├── docs/
│   ├── INDEX.md                 ← read first every session
│   ├── CHANGELOG.md             ← agent changelog, terse, newest first
│   ├── CONSTITUTION.md          ← non-negotiable project principles
│   ├── BACKLOG.md               ← captured bugs and ideas
│   ├── improvements.md          ← ARCH/RED suggestions
│   ├── specs/                   ← design handoff specs
│   └── features/
│       └── [name]/
│           ├── PRD.md
│           ├── EPICS.md
│           ├── STORIES.md       ← stories with [P] parallel markers
│           ├── PROGRESS.md
│           ├── data-model.md    ← generated when feature touches DB
│           └── reviews/         ← review output per story
└── app-docs/                   ← END-USER product documentation (like a landing-page "Docs" section)
    ├── index.mdx               ← docs landing page the user opens first
    ├── CHANGELOG.mdx           ← product release notes, written to users
    ├── features/               ← one .mdx per user-facing feature: overview + how-to + tutorial + FAQ
    └── guides/                 ← user guides (getting-started, shortcuts, troubleshooting)
```

> `./docs/` is for people who **build** the app. `./app-docs/` is for people who **use** the app. They never overlap — no file paths or code in app-docs, no user tutorials in docs. SCRIBE updates app-docs as the final step of every `/ship` and `/fix` so the published docs always match what the app can actually do.

---

## Key concepts

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

### Human checkpoints

The workflow never auto-proceeds past:
- Approach selection (after 3 options presented)
- PRD approval (after clarification pass resolves all `[NEEDS CLARIFICATION]` items)
- Constitution violations (must be resolved before stories are written)
- Implementation plan (before any code is written)
- Design approval (mobile and desktop separately)

### Parallel stories `[P]`

Stories tagged `[P]` have no dependencies on other stories. `/ship-all` surfaces these upfront — you can run them in separate Claude Code sessions simultaneously.

### Two changelogs

Both maintained automatically — never skip this step:

- **`./docs/CHANGELOG.md`** — agent-readable engineering log, terse, one line per action. Read at every session start alongside INDEX.md to orient without scanning the codebase. Every ship/fix appends here.
- **`./app-docs/CHANGELOG.mdx`** — **product release notes, written to end users.** Only gets an entry when a ship or fix actually changed something a user can see. Pure internal refactors do not appear here — they stay in the engineering log.

### Context management

Long sessions stay lean through three mechanisms:
- **Caveman rules** — agent-to-agent output drops filler words (~75% token reduction), technical terms kept exact
- **Mandatory `/compact`** between stories in `ship-all` and `plan-all`
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

Rules are starting points — copy what fits, edit as needed, delete what doesn't. Each rule is under 2KB so the context budget stays reasonable.

You can add your own rules any time by dropping a markdown file with YAML frontmatter into `./.claude/rules/`. See `~/.claude/skills/agentic-engineering/rules-library/README.md` for the full reference.

---

## Review agent knowledge base

Each review agent loads reference files on demand based on what's in the diff. No generic checklists, no pattern-matching noise — each reference defines what "vulnerable", "broken", or "missing" looks like in that specific context with real code examples.

### 🔴 RED — Bug Hunter
```
references/
  null-safety.md          null dereference, forced unwrap, map access
  async-concurrency.md    unhandled promises, goroutine bugs, deadlocks
  error-handling.md       swallowed errors, fail-open, wrong propagation
  type-data.md            overflow, float precision, NaN, coercion
  resource-management.md  file/connection/goroutine leaks
  logic-bugs.md           off-by-one, wrong comparators, mutation in loop
  state-bugs.md           mutable defaults, shared state, closure capture
languages/
  python.md  javascript.md  go.md  rust.md  swift.md  kotlin-java.md  dart.md
```

### 🧪 TEST — Coverage Reviewer
```
references/
  coverage-principles.md  what to test, scenario types, regression thinking
  test-doubles.md         mocks/stubs/fakes and when each is right
  async-testing.md        async test patterns, fake timers, timing bugs
  test-quality.md         trivial tests, over-mocking, flaky patterns
languages/
  pytest.md  jest.md  go-test.md  rust-test.md  xctest.md  junit.md  flutter-test.md
```

### 🔐 SEC — Security Reviewer
```
references/
  injection.md          SQL, NoSQL, OS command, LDAP, template
  xss.md                reflected, stored, DOM-based XSS
  authorization.md      IDOR, privilege escalation, JWT issues
  authentication.md     password hashing, sessions, OAuth flows
  cryptography.md       weak algorithms, insecure random, TLS
  data-protection.md    hardcoded secrets, PII, sensitive logging
  ssrf.md               server-side request forgery
  csrf.md               cross-site request forgery
  file-security.md      path traversal, file upload, XXE, zip slip
  api-security.md       mass assignment, GraphQL, rate limiting
  business-logic.md     race conditions, workflow bypass, numeric issues
  modern-threats.md     LLM injection, WebSocket, prototype pollution
  misconfiguration.md   debug mode, CORS, hardcoded config
  error-handling.md     verbose errors, fail-open patterns
  deserialization.md    pickle, YAML, Java ObjectInputStream
  supply-chain.md       dependency confusion, CI/CD injection
languages/
  python.md  javascript.md  go.md  rust.md  java.md  swift.md  kotlin.md  dart.md
```

### 🎨 UX — Fidelity Reviewer
Runs after frontend implementation — not in the parallel pass.
```
references/
  interaction-states.md   loading, empty, error, disabled, success states
  forms-validation.md     input feedback, error messages, submission handling
  visual-consistency.md   spacing, hierarchy, color, typography
  copy-feedback.md        labels, error text, empty states, confirmations
  responsive.md           breakpoints, mobile behavior, touch targets
  accessibility.md        keyboard nav, screen readers, contrast, focus
```

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

### Option A — Claude Code plugin (recommended)

```
/plugin marketplace add thebedcoder/skills
/plugin install agentic-engineering@thebedcoder
```

Restart Claude Code — commands appear in the `/` palette as `/bootstrap`, `/init`, `/ship`, etc. (or fully namespaced as `/agentic-engineering:ship`).

**Updates:** `/plugin update agentic-engineering` — Claude Code pulls latest from the marketplace.

**Uninstall:** `/plugin uninstall agentic-engineering`.

### Option B — Shell installer (fallback, pre-plugin Claude Code)

```bash
curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash
```

Clones the repo into `~/.local/share/bedcode-skills` and copies skill files into `~/.claude/`. Re-run the same command to update.

Override the cache location with `BEDCODE_SKILLS_DIR=~/dev/bedcode-skills`.

### Option C — Local clone

```bash
git clone https://github.com/thebedcoder/skills.git
cd skills
./install.sh
```

Re-run `./install.sh` after `git pull` to update.

### Option D — Other coding agents (portable workflow)

The full workflow (slash commands + specialist agents) is Claude Code-native and doesn't port directly. The **portable workflow rules** do — they're plain markdown that any agent can follow. Run the installer with `--tool=<name>` from your project root and it writes the right file in the right place:

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

**Re-running is safe.** The script wraps content between `<!-- agentic-engineering:start -->` and `<!-- agentic-engineering:end -->` markers — repeat runs replace the block in place, leaving any other content in the file untouched.

**Global scope.** Some tools support user-global config — pass `--scope=user` for `cursor`, `codex`, `gemini` to write to `~/.cursor/`, `~/.codex/`, `~/.gemini/` respectively.

**Override paths.** Use environment variables like `CURSOR_RULES_DIR`, `CLINERULES`, `WINDSURFRULES`, `AIDER_CONVENTIONS`, `GEMINI_MD` if you want a non-default location.

### Option E — Claude.ai

Upload `agentic-engineering.skill` via **Settings → Customize → Skills → Upload**.

**What's inside the plugin:**

```
agentic-engineering/
├── .claude-plugin/plugin.json    ← plugin metadata
├── skills/
│   └── agentic-engineering/
│       ├── SKILL.md              ← skill router
│       └── commands/             ← 16 command implementation files, loaded on demand
├── agents/
│   ├── ae-red/                   ← bug hunter
│   │   ├── AGENT.md
│   │   ├── references/           ← 7 bug category references
│   │   └── languages/            ← 7 language guides
│   ├── ae-req.md                 ← requirements + constitution
│   ├── ae-test/                  ← test quality reviewer (AGENT.md + references + languages)
│   ├── ae-doc.md                 ← convention checker
│   ├── ae-scribe.md              ← MDX documentation writer
│   ├── ae-sec/                   ← security reviewer (AGENT.md + references + languages)
│   └── ae-ux/                    ← UX fidelity reviewer (AGENT.md + references)
├── commands/                     ← 16 user-facing slash-command wrappers
└── rules-library/                ← 16 rule templates for /init to offer
```

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
