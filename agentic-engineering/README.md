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
│ ✍️ SCRIBE  │ MDX documentation             │ Humans first           │
│ 🔀 GIT    │ Commits, branches, PRs         │ Conventional always    │
│ 🔐 SEC    │ Security vulnerabilities       │ High-confidence only   │
└───────────┴────────────────────────────────┴────────────────────────┘
```

Five review agents (RED, REQ, TEST, DOC, SEC) run as **parallel Haiku subagents** after every story — results back simultaneously, main context stays clean.

One UX subagent (ae-ux) runs after the frontend pass with a structured checklist across 6 dimensions.

---

## Workflow

```
┌──────────────┐
│ /ae-bootstrap│  New project — pick stack, scaffold, install deps,
│              │  create base structure, plan core epics.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  /ae-init    │  Create docs scaffold + CLAUDE.md + CONSTITUTION.md
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         FEATURE LOOP                                 │
│                                                                      │
│  /ae-feature [name]                                                  │
│    1. ARCH proposes 3 approach options                               │
│    2. PROD generates PRD with [NEEDS CLARIFICATION] markers          │
│    3. Clarification pass — batch resolve all ambiguous items         │
│    4. REQ constitution check — violations block story breakdown      │
│    5. ARCH generates data-model.md (if DB changes)                  │
│    6. PROD writes stories tagged [P] where parallelisable            │
│                                                                      │
│  /ae-design  (if UI)                                                 │
│    Mobile-first → desktop → handoff spec in ./docs/specs/            │
│                                                                      │
│  /ae-ship  (per story)                                               │
│    ┌─────────────┐                                                   │
│    │ implement   │  ARCH plans → PROD validates → code + tests       │
│    └──────┬──────┘                                                   │
│           │                                                          │
│    ┌──────▼──────────────────────────────────────────────────┐      │
│    │              5 PARALLEL REVIEW AGENTS                   │      │
│    │  🔴 RED    bug hunt (null/async/logic/resources)         │      │
│    │  ✅ REQ    requirements + constitution audit             │      │
│    │  🧪 TEST   coverage quality + framework patterns        │      │
│    │  📖 DOC    convention alignment                         │      │
│    │  🔐 SEC    security vulnerabilities                     │      │
│    └──────┬──────────────────────────────────────────────────┘      │
│           │  consolidated: blockers / should-fix / clean             │
│           │                                                          │
│    ┌──────▼──────┐                                                   │
│    │  frontend   │  (if story has UI)                                │
│    │  + ae-ux    │  🎨 fidelity check — states/forms/a11y/responsive │
│    └──────┬──────┘                                                   │
│           │                                                          │
│    ✍️ SCRIBE  updates app-docs + both changelogs                     │
│    🔀 GIT    commits with conventional message + PR description      │
│                                                                      │
│  /ae-ship-all — chains /ae-ship across all stories                   │
│    Shows [P] parallel groups upfront                                 │
│    Mandatory /compact between stories                                │
└──────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   /ae-fix    │  Bug reported → FIXER diagnoses → fix → review → docs
└──────────────┘
```

---

## Commands

| Command | What it does |
|---|---|
| `/ae-bootstrap` | Scaffold a new project — stack, deps, structure, epic roadmap |
| `/ae-init` | Create docs scaffold, CLAUDE.md, and CONSTITUTION.md |
| `/ae-feature [name]` | Research → PRD → clarifications → constitution check → stories |
| `/ae-design` | Mobile-first mockups via Figma, Pencil.dev, or Markdown |
| `/ae-ship` | Full story: implement → 5-agent review → frontend → UX check → docs → git |
| `/ae-ship-all` | Loop `/ae-ship` across all unchecked stories |
| `/ae-plan-all` | Plan all unplanned epics from INDEX.md |
| `/ae-fix [desc]` | Diagnose bug → fix → review → docs |
| `/ae-note [desc]` | Capture bug/idea/improvement to BACKLOG.md |
| `/ae-doc [feature]` | Document a feature interactively with Q&A |
| `/ae-doc-all [--full]` | Document multiple features (`--full` adds guides + index) |
| `/ae-status` | Progress overview across all features + backlog |
| `/ae-analyze [question]` | Answer any question — searches docs and codebase |

---

## Docs structure

Created automatically by `/ae-init` and maintained by agents throughout development.

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
└── app-docs/
    ├── index.mdx
    ├── CHANGELOG.mdx            ← human-readable changelog
    ├── features/
    └── guides/
```

---

## Key concepts

### Constitution

Every project gets a `CONSTITUTION.md` — non-negotiable principles created at `/ae-init`, checked by REQ at every review. Principles must be specific and verifiable:

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

Stories tagged `[P]` have no dependencies on other stories. `/ae-ship-all` surfaces these upfront — you can run them in separate Claude Code sessions simultaneously.

### Two changelogs

Both maintained automatically — never skip this step:

- **`./docs/CHANGELOG.md`** — agent-readable, terse, one line per action. Read at every session start alongside INDEX.md to orient without scanning the codebase.
- **`./app-docs/CHANGELOG.mdx`** — human-readable, release-style. For stakeholders, onboarding, and team visibility.

### Context management

Long sessions stay lean through three mechanisms:
- **Caveman rules** — agent-to-agent output drops filler words (~75% token reduction), technical terms kept exact
- **Mandatory `/compact`** between stories in `ship-all` and `plan-all`
- **On-demand loading** — only the command file for the current command is loaded into context, not the full skill

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

Configured once during `/ae-init`, used by `/ae-design`:

| Tool | Notes |
|---|---|
| **Pencil.dev** | Free, IDE-native, `.pen` files version-controlled in repo — recommended |
| **Figma** | Requires paid plan + Figma MCP configured |
| **None** | SCRIBE generates detailed Markdown wireframe specs instead |

---

## Installation

### Option A — Claude Code CLI

```bash
unzip ae-skill.zip
cd ae-skill
./install.sh
```

Restart Claude Code. Commands appear in the `/` palette immediately.

**What gets installed:**

```
~/.claude/
├── skills/
│   └── agentic-engineering/
│       ├── SKILL.md              ← 95-line router
│       └── commands/             ← 16 command files, loaded on demand
├── agents/
│   ├── ae-red/                   ← bug hunter
│   │   ├── AGENT.md
│   │   ├── references/           ← 7 bug category references
│   │   └── languages/            ← 7 language guides
│   ├── ae-req.md                 ← requirements + constitution
│   ├── ae-test/                  ← test quality reviewer
│   │   ├── AGENT.md
│   │   ├── references/           ← 4 testing concept references
│   │   └── languages/            ← 7 framework guides
│   ├── ae-doc.md                 ← convention checker
│   ├── ae-scribe.md              ← MDX documentation writer
│   ├── ae-sec/                   ← security reviewer
│   │   ├── AGENT.md
│   │   ├── references/           ← 16 vulnerability references
│   │   └── languages/            ← 8 language guides
│   └── ae-ux/                    ← UX fidelity reviewer
│       ├── AGENT.md
│       └── references/           ← 6 UX review checklists
└── commands/
    └── ae-*.md                   ← 13 user-facing command wrappers
```

### Option B — Claude.ai

Upload `agentic-engineering.skill` via **Settings → Customize → Skills → Upload**.

---

## Starting a new project

```bash
/ae-bootstrap      # scaffold project
/ae-init           # docs structure + CLAUDE.md + CONSTITUTION.md
/ae-feature auth   # plan first feature
/ae-design         # design UI (if applicable)
/ae-ship           # implement story by story
```

## Adding to an existing project

```bash
/ae-init               # create docs structure
/ae-doc-all --full     # generate docs from existing codebase
/ae-feature [name]     # start planning new features normally
```

---

## Example session

```
You:    /ae-status
PROD:   2 features in progress. 5 stories remaining. 1 backlog item.

You:    /ae-feature payments
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

You:    /ae-ship
ARCH:   Plan for STORY-001: [implementation plan]
You:    go

        → implement + tests
        → 5 parallel reviews return simultaneously
        → 1 blocker: hardcoded Stripe key in config (SEC)
        → fix blocker
        → SCRIBE updates changelogs
        → GIT: feat(payments): add Stripe customer creation

ARCH:   STORY-001 done. Run /ae-ship for next story.
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
