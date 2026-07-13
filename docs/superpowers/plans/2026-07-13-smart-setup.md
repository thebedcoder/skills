# smart-setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `smart-setup` plugin — scans or interviews a project, then generates a right-sized, project-local Claude Code setup across Skills, Memory, Agents, Rules, Tools.

**Architecture:** Standalone plugin following the monorepo per-plugin shape: thin wrapper command → thin SKILL.md router → one real command body that consults six reference files (method) and five exemplars (quality bar). A sizing rubric caps output per tier; a manifest gate blocks all writes until user approval. Spec: `docs/superpowers/specs/2026-07-13-smart-setup-design.md`.

**Tech Stack:** Markdown (SKILL.md, command files, references, exemplars) + bash installer. No build system, no test framework — verification is installer runs and file inspection (repo convention).

## Global Constraints

- Claude Code only. Do NOT create an `adapters/` dir, do NOT touch `.claude-plugin/marketplace.json`, do NOT touch the top-level `install.sh`.
- Source `skills/smart-setup/SKILL.md` must NOT contain `user-invocable: false` — the installer patches it post-copy (repo convention).
- All skill-internal content (SKILL.md body, command body, references, exemplars) written in caveman register: drop articles/filler/hedging, fragments OK, technical terms and paths verbatim. `README.md` is normal prose.
- Exemplars: exactly one file per artifact type (procedure-skill, domain-skill, agent, memory-scaffold, manifest). Never more.
- `rules-library/` stays in `agentic-engineering/` — smart-setup's installer copies from the sibling dir; never duplicate the files into `smart-setup/` source.
- Commits: Conventional Commits with scope — `feat(smart-setup): …`, `docs(smart-setup): …`.
- All file paths below are relative to repo root `/Users/getman/DevWorkspaces/bedcode/skills/`.

---

### Task 1: Plugin scaffold — plugin.json, wrapper command, SKILL.md router

**Files:**
- Create: `smart-setup/.claude-plugin/plugin.json`
- Create: `smart-setup/commands/smart-setup.md`
- Create: `smart-setup/skills/smart-setup/SKILL.md`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: SKILL.md router referencing `commands/smart-setup.md`, `references/{sizing-rubric,interview-protocol,authoring-guidelines,memory-spec,docs-spec-rules,tool-detection}.md`, `exemplars/` — later tasks MUST use these exact filenames.

- [ ] **Step 1: Write plugin.json**

````json
{
  "name": "smart-setup",
  "version": "0.1.0",
  "description": "Project-tailored Claude Code setup — scans or interviews a project, then generates right-sized Skills, Memory, Agents, Rules, and Tools (SMART)",
  "author": {
    "name": "thebedcoder",
    "url": "https://github.com/thebedcoder"
  },
  "homepage": "https://github.com/thebedcoder/skills/tree/main/smart-setup",
  "repository": "https://github.com/thebedcoder/skills",
  "license": "MIT",
  "keywords": [
    "setup",
    "scaffolding",
    "project-config",
    "skills",
    "memory",
    "agents",
    "rules",
    "mcp"
  ]
}
````

Write to `smart-setup/.claude-plugin/plugin.json`.

- [ ] **Step 2: Write the thin wrapper command**

Write to `smart-setup/commands/smart-setup.md`:

````markdown
---
description: Scan or interview project, then generate right-sized SMART setup — Skills, Memory, Agents, Rules, Tools
argument-hint: [update]
---
Read commands/smart-setup.md from the smart-setup skill, then follow those instructions with arguments: $ARGUMENTS
````

- [ ] **Step 3: Write SKILL.md router**

Write to `smart-setup/skills/smart-setup/SKILL.md`. NOTE: no `user-invocable` key — installer adds it.

````markdown
---
name: smart-setup
description: >
  Project-tailored Claude Code setup. Use when user wants to set up a project
  for agentic work, generate project-specific skills, agents, rules, memory,
  or MCP config. Triggers on: "/smart-setup", "/smart-setup update",
  "setup this project", "tailor Claude to this project", "configure this repo
  for Claude", or re-auditing an existing generated setup.
---

# smart-setup

Generate right-sized project config across five dimensions: **S**kills, **M**emory, **A**gents, **R**ules, **T**ools.

## How to use

Command invoked → read `commands/smart-setup.md`. Full instructions there.

## Command → File Map

| Command | File | Does |
|---|---|---|
| `/smart-setup` | `commands/smart-setup.md` | Scan/interview → tier → manifest → generate |
| `/smart-setup update` | `commands/smart-setup.md` (Update mode section) | Re-audit setup, diff vs codebase, amend |

## Core principle

Tier caps output — structural limit, not suggestion. Most projects need almost nothing. Manifest gate before any file written. "NOT generating" list mandatory in every manifest.

## References

| File | Holds |
|---|---|
| `references/sizing-rubric.md` | tier signals + output caps |
| `references/interview-protocol.md` | greenfield + domain-knowledge questioning |
| `references/authoring-guidelines.md` | caveman rules + frontmatter contracts + quality bar |
| `references/memory-spec.md` | 3-layer memory definition |
| `references/docs-spec-rules.md` | docs/specs conventions per tier |
| `references/tool-detection.md` | config file → MCP/CLI map |

## Exemplars

`exemplars/` — exactly one per artifact type: `procedure-skill.md`, `domain-skill.md`, `agent.md`, `memory-scaffold.md`, `manifest.md`. Read matching exemplar before generating first artifact of that type. Exemplar = quality bar, not padding template.
````

- [ ] **Step 4: Verify frontmatter and structure**

Run: `head -1 smart-setup/skills/smart-setup/SKILL.md && grep -c "user-invocable" smart-setup/skills/smart-setup/SKILL.md; python3 -c "import json; json.load(open('smart-setup/.claude-plugin/plugin.json')); print('json ok')"`

Expected: `---`, then `0` (grep exits 1 — that is correct: no user-invocable in source), then `json ok`.

- [ ] **Step 5: Commit**

```bash
git add smart-setup/.claude-plugin/plugin.json smart-setup/commands/smart-setup.md smart-setup/skills/smart-setup/SKILL.md
git commit -m "feat(smart-setup): plugin scaffold — manifest, wrapper command, SKILL.md router"
```

---

### Task 2: Input-method references — sizing-rubric.md, interview-protocol.md

**Files:**
- Create: `smart-setup/skills/smart-setup/references/sizing-rubric.md`
- Create: `smart-setup/skills/smart-setup/references/interview-protocol.md`

**Interfaces:**
- Consumes: filenames declared in Task 1's SKILL.md references table.
- Produces: tier names `0 — scratch`, `1 — solo product`, `2 — production system` and the agent role palette `QA, SecOps, Lead, Frontend, Backend, Infra, Product, Designer` — Task 4 exemplars and Task 5 command body MUST use these exact names.

- [ ] **Step 1: Write sizing-rubric.md**

````markdown
# Sizing Rubric

Classify project BEFORE proposing anything. Tier caps generation budget — hard limit, not suggestion.

## Signals → Tier

| Signal | Points toward |
|---|---|
| No git repo, single file or dir of scripts | 0 |
| "just testing" / "experiment" / "throwaway" in user answers | 0 |
| No tests, no CI, no deploy config, < ~20 source files | 0–1 |
| Tests exist, or user wants them | 1 |
| Deploy target exists (vercel.json, Dockerfile, fastlane/, etc.) | 1–2 |
| CI pipeline (.github/workflows/, .gitlab-ci.yml, etc.) | 2 |
| Multiple contributors (`git shortlog -sn` > 1) | 2 |
| External users in production | 2 |

Ambiguous → propose LOWER tier. User can always bump up. Never silently exceed confirmed tier.

## Tier Caps

| Tier | Name | Max output |
|---|---|---|
| 0 | scratch | `CLAUDE.md` ≤ 20 lines. Nothing else. |
| 1 | solo product | `CLAUDE.md` + procedure skills + stack rules + memory scaffold + ≤ 2 agents + `.mcp.json` |
| 2 | production system | Tier 1 + domain skills + agents as justified + docs/specs conventions. May recommend agentic-engineering install for phase-gated SDLC. |

`.claude/setup-manifest.md` exempt from caps — bookkeeping, written at every tier.

## Procedure

1. Collect signals (scan or interview).
2. Propose tier + one-line reason citing signals.
3. Ask user: confirm or override. One question. Never proceed unconfirmed.
4. Record confirmed tier in manifest.
````

- [ ] **Step 2: Write interview-protocol.md**

````markdown
# Interview Protocol

## Rules

- One question per message. Never batch.
- Multiple choice when options enumerable. Open-ended otherwise.
- Skip questions scan already answered. Never ask what code shows.
- Stop when manifest inputs complete — no curiosity questions.

## Greenfield facts (no code to scan)

Ask in order, skip already known:

1. Project one-liner — what + for whom?
2. Stack — language, framework, DB, deploy target?
3. Tier signals — throwaway or real? users planned? team size?
4. Test framework preference?
5. Conventions to enforce from day one?

## Domain knowledge (tier 2 default; tier 1 only when user asks)

Goal: facts agent cannot infer from code. Per candidate domain area:

1. "Concepts or invariants agent must never violate?" (examples: "balance never negative", "events immutable")
2. "What did past contributors get wrong repeatedly?"
3. "Which module hides most surprises? What are they?"

Each answer → candidate domain skill or rule. Candidate goes into manifest, user prunes there.

## Preference questions (all tiers > 0)

- Memory: default layers OK? (permanent `CLAUDE.md` / decisions `docs/decisions.md` / disposable `.claude/scratch.md`)
- Agents: which role handles wanted from palette — QA, SecOps, Lead, Frontend, Backend, Infra, Product, Designer? Only roles with something concrete to verify get generated.
````

- [ ] **Step 3: Verify files exist and match SKILL.md references**

Run: `for f in sizing-rubric interview-protocol; do test -f "smart-setup/skills/smart-setup/references/$f.md" && grep -q "references/$f.md" smart-setup/skills/smart-setup/SKILL.md && echo "$f ok"; done`

Expected: `sizing-rubric ok`, `interview-protocol ok`.

- [ ] **Step 4: Commit**

```bash
git add smart-setup/skills/smart-setup/references/
git commit -m "feat(smart-setup): sizing rubric + interview protocol references"
```

---

### Task 3: Output-contract references — authoring-guidelines.md, memory-spec.md, docs-spec-rules.md, tool-detection.md

**Files:**
- Create: `smart-setup/skills/smart-setup/references/authoring-guidelines.md`
- Create: `smart-setup/skills/smart-setup/references/memory-spec.md`
- Create: `smart-setup/skills/smart-setup/references/docs-spec-rules.md`
- Create: `smart-setup/skills/smart-setup/references/tool-detection.md`

**Interfaces:**
- Consumes: tier names from Task 2.
- Produces: generated-artifact target paths — `.claude/skills/<name>/SKILL.md`, `.claude/agents/<name>.md`, `.claude/rules/<topic>.md`, `docs/decisions.md`, `.claude/scratch.md`, `docs/specs/<feature>.md`, `.mcp.json` — Task 4 exemplars and Task 5 command body MUST use these exact paths. Agent body contract: three mandatory sections **Dispatch trigger / Checks / Report format**.

- [ ] **Step 1: Write authoring-guidelines.md**

````markdown
# Authoring Guidelines

Every generated artifact follows these. Read before generating anything.

## Caveman rules

Apply to: generated skills, rules, agent prompts, memory scaffolds, manifest.

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- **Keep:** technical terms exact, code blocks unchanged, file paths verbatim
- **Pattern:** `[thing] [problem/action] [reason]. [next step].`
- **Fragments OK.** Short synonyms: fix not "implement solution", use not "utilize"

NOT caveman (normal prose): README content, end-user docs, human checkpoint messages.

## Frontmatter contracts

### Project skill — `.claude/skills/<name>/SKILL.md`

```yaml
---
name: <kebab-case>
description: >
  <what it does>. Use when <explicit trigger conditions — phrases user types,
  situations, file patterns>.
---
```

Trigger conditions in description mandatory. Skill without trigger = never fires = dead file.

### Agent — `.claude/agents/<name>.md`

Frontmatter: `name` + `description` (one line, project-specific). Body must contain three sections:

- **Dispatch trigger** — when main conversation calls this agent
- **Checks** — concrete list, project-specific, verifiable
- **Report format** — caveman, severity-ordered

### Rule — `.claude/rules/<topic>.md`

Every rule file needs `CLAUDE.md` pointer line: `editing <pattern> → read .claude/rules/<topic>.md`. Rule without pointer = never read = do not generate.

## Quality bar

- Procedure skill earns existence only if procedure non-obvious (> 1 command, or has gotchas). Single obvious command → `CLAUDE.md` line instead.
- Every memory layer states read-trigger. No read-trigger → not generated.
- Match exemplar density — files in `exemplars/` are the bar. Do not pad past them.
- Test commands in generated content: non-watch invocations only — `vitest run`, `jest`, `pytest`, `go test ./...`. Never bare `vitest`, never `--watch`.
````

- [ ] **Step 2: Write memory-spec.md**

````markdown
# Memory Spec — 3 Layers

Every layer defines four things: location, write-trigger, read-trigger, lifecycle. Layer missing read-trigger = write-only noise = do not generate.

| Layer | Location | Write when | Read when | Lifecycle |
|---|---|---|---|---|
| Permanent | `CLAUDE.md` | setup + "remember this" moments | auto-loaded every session | git, slow change |
| Decisions | `docs/decisions.md` | architectural / tooling / scope decision made | `CLAUDE.md` instruction: "before architectural changes or questioning existing patterns, read `docs/decisions.md`" | git, append-only, newest first, never rewritten |
| Disposable | `.claude/scratch.md` | task state, next steps, working notes | `CLAUDE.md` instruction: read at session start | gitignored, prune freely |

## Decisions entry format (ADR-lite)

```markdown
## YYYY-MM-DD <decision title>
- **Decision:** <what>
- **Why:** <reason>
- **Rejected:** <alternatives + why>
```

## Generation requirements

- `CLAUDE.md` gets "Memory" section wiring read-triggers for decisions + scratch.
- `.gitignore` entry for `.claude/scratch.md` — generate if missing.
- Do NOT duplicate harness auto-memory (`~/.claude/projects/.../memory/`) — that layer is personal-per-machine. These layers = project-shared via git (except disposable).
````

- [ ] **Step 3: Write docs-spec-rules.md**

````markdown
# Docs / Specs Rules

Principle: doc exists only if it changes future work. Every doc type has read-trigger. No ceremony.

## Per tier

| Tier | Docs |
|---|---|
| 0 | none |
| 1 | `docs/decisions.md` + specs for multi-session / cross-cutting features only |
| 2 | tier 1 + `docs/CHANGELOG.md` — agent-facing, prepend after significant change, read at session start |

## Spec format — `docs/specs/<feature>.md`

Four sections, nothing more:

```markdown
# <feature>
## Problem
## Decision
## Scope
## Out of scope
```

Read-trigger: `CLAUDE.md` instruction — "implementing <feature area> → read its spec first."

## Banned

- Feature directories (PRD / EPICS / STORIES / PROGRESS trees)
- Story checkboxes
- Docs without read-trigger
- Per-feature review folders

Project needs phase-gated SDLC → manifest recommends agentic-engineering install. Do not reimplement it.
````

- [ ] **Step 4: Write tool-detection.md**

````markdown
# Tool Detection Map

Detection only. Never catalog. Never install — config + docs output only.

| Detected in repo | Suggest |
|---|---|
| `playwright.config.*` | Playwright MCP → `.mcp.json` |
| `vercel.json` / `.vercel/` | Vercel CLI → CLAUDE.md Required CLIs |
| `supabase/` | Supabase MCP → `.mcp.json` |
| `Dockerfile` / `compose.yaml` / `docker-compose.yml` | docker CLI |
| `.github/workflows/` | gh CLI |
| `fastlane/` | fastlane CLI |
| `firebase.json` | firebase CLI |
| `wrangler.toml` / `wrangler.jsonc` | wrangler CLI |
| `*.tf` | terraform CLI |
| `prisma/schema.prisma` | prisma CLI |

## Output rules

- MCP servers → `.mcp.json` entry. Merge with existing file — never overwrite existing keys.
- CLIs → `CLAUDE.md` "Required CLIs" section: name + install hint + what for.
- Suggestion unconfirmed by user → not written. Manifest lists each suggestion with detection evidence.

Map extension over time allowed — detection entries only, never a browsable catalog.
````

- [ ] **Step 5: Verify all four files exist and match SKILL.md references**

Run: `for f in authoring-guidelines memory-spec docs-spec-rules tool-detection; do test -f "smart-setup/skills/smart-setup/references/$f.md" && grep -q "references/$f.md" smart-setup/skills/smart-setup/SKILL.md && echo "$f ok"; done`

Expected: four `ok` lines.

- [ ] **Step 6: Commit**

```bash
git add smart-setup/skills/smart-setup/references/
git commit -m "feat(smart-setup): authoring, memory, docs-spec, tool-detection references"
```

---

### Task 4: Exemplars — one per artifact type

**Files:**
- Create: `smart-setup/skills/smart-setup/exemplars/procedure-skill.md`
- Create: `smart-setup/skills/smart-setup/exemplars/domain-skill.md`
- Create: `smart-setup/skills/smart-setup/exemplars/agent.md`
- Create: `smart-setup/skills/smart-setup/exemplars/memory-scaffold.md`
- Create: `smart-setup/skills/smart-setup/exemplars/manifest.md`

**Interfaces:**
- Consumes: frontmatter contracts + agent three-section body from Task 3; tier names + role palette from Task 2.
- Produces: manifest table shape (Generating / NOT generating) that Task 5 command body instructs the model to reproduce.

- [ ] **Step 1: Write procedure-skill.md**

````markdown
<!-- EXEMPLAR: quality bar for generated procedure skills. Match density. Do not pad. -->
---
name: release
description: >
  Cut App Store release for this Flutter app. Use when user says "release",
  "cut release", "ship to TestFlight", or bumps version in pubspec.yaml.
---

# Release

## Steps

1. `flutter test` — all pass or stop.
2. Bump version in `pubspec.yaml` — `version: x.y.z+build`. Build number always increments, even for same version.
3. `flutter build ipa --release --obfuscate --split-debug-info=build/symbols`
4. `xcrun altool --upload-app -f build/ios/ipa/*.ipa` — needs `APP_STORE_API_KEY` env var set.
5. Tag: `git tag vX.Y.Z && git push --tags`

## Gotchas

- Build fails on "pod install" → `cd ios && pod repo update` first. Happens after every Flutter upgrade.
- `build/symbols` gitignored — never commit.
````

- [ ] **Step 2: Write domain-skill.md**

````markdown
<!-- EXEMPLAR: quality bar for generated domain skills. Facts agent cannot infer from code. -->
---
name: sync-engine
description: >
  Sync engine invariants for this app. Use before editing anything under
  lib/sync/ or when debugging sync conflicts, duplicate events, offline queue.
---

# Sync Engine

## Invariants — never violate

- Events immutable after write. Fix = compensating event, never edit.
- Client clock untrusted. Ordering by server `seq`, not timestamp.
- Offline queue replays idempotently — every mutation carries client-generated UUID key.

## Past mistakes (repeated)

- Deduplication by timestamp — broke twice (DST + clock skew). Dedupe by UUID only.
- "Quick fix" editing synced row directly → ghost conflicts on next pull.

## Surprise module

`lib/sync/merge.dart` — merge order matters: remote-wins for profile, LWW-per-field for settings, append-only for events. Comment block at top of file is source of truth.
````

- [ ] **Step 3: Write agent.md**

````markdown
<!-- EXEMPLAR: quality bar for generated agents. Role handle + verification-shaped prompt. -->
---
name: qa
description: QA agent for this Flutter app — verifies widget states + platform channels after UI changes
---

# QA

## Dispatch trigger

Main conversation finished UI change touching `lib/ui/` or platform channel code → dispatch before commit.

## Checks

- Every new widget: empty, error, loading states handled — not just happy path.
- `setState` after `await` → `mounted` guard present.
- Platform channel calls wrapped — `PlatformException` handled per channel contract in `lib/channels/README.md`.
- Golden tests updated when visual change intentional. Missing → flag.

## Report format

Caveman. Severity order: blocker → warn → note. Per finding: `file:line` + what + why + fix. No findings → single line: `QA pass. N widgets checked.`
````

- [ ] **Step 4: Write memory-scaffold.md**

````markdown
<!-- EXEMPLAR: memory scaffold — three pieces generated together. Generator fills real date. -->

## Piece 1 — CLAUDE.md "Memory" section (appended)

```markdown
## Memory

- Decisions log: `docs/decisions.md` — read BEFORE architectural changes or questioning existing patterns. Append ADR-lite entry after any architectural / tooling / scope decision.
- Scratch: `.claude/scratch.md` — read at session start. Holds current task state + next steps. Prune freely.
```

## Piece 2 — docs/decisions.md (seeded)

```markdown
# Decisions
<!-- Append-only, newest first. ADR-lite: Decision / Why / Rejected. -->

## YYYY-MM-DD smart-setup initialized
- **Decision:** project configured at tier N via smart-setup
- **Why:** <one line from manifest>
- **Rejected:** —
```

## Piece 3 — .claude/scratch.md (seeded) + .gitignore entry

```markdown
# Scratch
<!-- Session state. Gitignored. Prune freely. -->

## Current
(nothing)

## Next
(nothing)
```

`.gitignore` gains line: `.claude/scratch.md`
````

- [ ] **Step 5: Write manifest.md**

````markdown
<!-- EXEMPLAR: manifest shown to user before generation. Whole footprint, one screen. -->

# Setup Manifest — <project>

Tier: **1 — solo product** (tests exist, one contributor, no CI)

## Generating

| # | Artifact | Path | Why |
|---|---|---|---|
| 1 | CLAUDE.md | `CLAUDE.md` | stack facts, commands, conventions |
| 2 | Procedure skill: release | `.claude/skills/release/SKILL.md` | 5-step release, 2 gotchas |
| 3 | Stack rules: flutter | `.claude/rules/flutter.md` | rules-library template, trimmed |
| 4 | Memory scaffold | `docs/decisions.md`, `.claude/scratch.md`, CLAUDE.md section | per memory-spec |
| 5 | Agent: qa | `.claude/agents/qa.md` | widget states + platform channels need adversarial check |
| 6 | MCP: playwright | `.mcp.json` | playwright.config.ts detected |

## NOT generating

| Artifact | Why not |
|---|---|
| Domain skills | tier 1, none requested |
| Backend / Infra / SecOps agents | no backend, no infra in repo |
| docs/CHANGELOG.md | tier 2 artifact |
| CI conventions | no CI configured |

Approve, edit rows, or override tier. Nothing written until approved.
````

- [ ] **Step 6: Verify exemplar set is exactly five files**

Run: `ls smart-setup/skills/smart-setup/exemplars/ | sort && ls smart-setup/skills/smart-setup/exemplars/ | wc -l`

Expected: `agent.md domain-skill.md manifest.md memory-scaffold.md procedure-skill.md` (one per line) and count `5`.

- [ ] **Step 7: Commit**

```bash
git add smart-setup/skills/smart-setup/exemplars/
git commit -m "feat(smart-setup): five exemplars — quality bar per artifact type"
```

---

### Task 5: Real command body — scan/interview → tier → manifest → generate → verify, plus update mode

**Files:**
- Create: `smart-setup/skills/smart-setup/commands/smart-setup.md`

**Interfaces:**
- Consumes: every reference filename (Tasks 2–3), every exemplar filename (Task 4), tier names, role palette, generated-artifact paths, agent three-section contract.
- Produces: `.claude/setup-manifest.md` format (written into target projects at runtime) — the update mode in this same file consumes it.

- [ ] **Step 1: Write the command body**

Write to `smart-setup/skills/smart-setup/commands/smart-setup.md`:

````markdown
# /smart-setup — SMART Project Setup

`$ARGUMENTS` contains `update` → jump to **Update mode** section at bottom.

## Mode detect

1. Meaningful source files present (any code beyond configs/README)? Yes → scan path. No → greenfield path.
2. `.claude/setup-manifest.md` exists + no `update` arg → ask user: re-run full setup, or run `/smart-setup update` instead? One question, then proceed per answer.

## Step 1 — Facts

**Scan path.** Collect, cite evidence (file paths) for each fact:

- Stack: languages, frameworks, package manifests
- Commands: run, test, build, deploy — from package.json scripts, Makefile, README, CI files
- Test framework + its non-watch invocation
- CI: `.github/workflows/`, `.gitlab-ci.yml`, etc.
- Deploy + tool configs — walk `references/tool-detection.md` map
- Conventions observed: naming, error handling, layer boundaries — read 3–5 representative source files
- Contributors: `git shortlog -sn | head -5`

**Greenfield path.** `references/interview-protocol.md` → Greenfield facts section. One question at a time.

## Step 2 — Tier

Read `references/sizing-rubric.md`. Propose tier + one-line reason citing signals. Ask user: confirm or override. Never proceed unconfirmed. Confirmed tier caps everything downstream.

## Step 3 — Interview gaps

`references/interview-protocol.md`:

- Tier 2 (or tier 1 + user explicitly asked): domain knowledge questions
- Tier > 0: preference questions
- Skip everything scan already answered

## Step 4 — Manifest

Read `exemplars/manifest.md`. Build manifest:

- Every artifact: type + path + one-line why
- **NOT generating** table mandatory — near-miss artifacts + reason each. Empty NOT-generating table = manifest rejected, rebuild it.
- Tier 2 + project needs phase-gated SDLC → row recommending agentic-engineering install. Do not reimplement its workflow.

Present manifest. User approves / edits rows / overrides tier.

**HARD GATE: nothing written to disk before approval.**

## Step 5 — Generate

Read `references/authoring-guidelines.md` first. Before generating first artifact of each type, read matching exemplar from `exemplars/`.

Order:

1. `CLAUDE.md` — create, or append clearly-marked sections. Never rewrite existing user content.
2. Memory scaffold per `references/memory-spec.md` + `exemplars/memory-scaffold.md` — includes `.gitignore` entry for `.claude/scratch.md`
3. Procedure skills → `.claude/skills/<name>/SKILL.md`
4. Domain skills → `.claude/skills/<name>/SKILL.md`
5. Rules — rules-library templates (installed at `~/.claude/skills/smart-setup/rules-library/`) trimmed to project, + observed-convention rules → `.claude/rules/<topic>.md` + pointer line per rule in `CLAUDE.md`
6. Agents → `.claude/agents/<name>.md` — role handle from palette (QA, SecOps, Lead, Frontend, Backend, Infra, Product, Designer), verification-shaped, three mandatory sections: Dispatch trigger / Checks / Report format
7. Tools — `.mcp.json` (merge, never clobber existing keys) + `CLAUDE.md` "Required CLIs" section
8. Docs conventions per `references/docs-spec-rules.md` (tier-gated)

All artifacts caveman-formatted. Tier caps already enforced at manifest — do not exceed during generation.

## Step 6 — Verify

- Read back every generated file. Frontmatter parses — `name` + `description` present where contract requires.
- Every skill description contains trigger conditions.
- Every rule has `CLAUDE.md` pointer line. Every memory layer read-trigger wired in `CLAUDE.md`.
- `.mcp.json` touched → validate: `python3 -c "import json; json.load(open('.mcp.json'))"`
- Report to user: files written, one line each.

## Step 7 — Record

Write `.claude/setup-manifest.md`:

```markdown
# setup-manifest
<!-- Written by smart-setup. Anchor for /smart-setup update. -->

- tier: <N — name>
- date: <YYYY-MM-DD>
- smart-setup version: 0.1.0

## Artifacts

| Type | Path | Why |
|---|---|---|
| ... | ... | ... |
```

Exempt from tier caps — written at every tier. Then tell user: restart Claude Code session to load generated skills.

## Update mode

1. Read `.claude/setup-manifest.md`. Missing → tell user: run `/smart-setup` first. Stop.
2. Re-scan — Step 1 scan path.
3. Diff current codebase vs manifest:
   - **New:** deps, deploy targets, stacks, CI appearing since setup
   - **Changed:** commands that moved (test script renamed, build tool swapped)
   - **Dead:** generated skills/rules referencing removed code or procedures
   - **Tier drift:** signals now point to different tier
4. Build amendment manifest: add / update / delete per artifact + why. Same mandatory NOT-generating discipline. Same HARD GATE.
5. User approves → apply → rewrite `.claude/setup-manifest.md` with new date + artifact list.

## Hard rules

- One question per message during interviews.
- No file written before manifest approval. No exceptions.
- Tier caps structural — exceed only via explicit user tier override.
- Existing user files: append marked sections, merge JSON — never rewrite (`CLAUDE.md`, `.gitignore`, `.mcp.json`).
- Test commands in generated content: non-watch only (`vitest run`, `jest`, `pytest`, `go test ./...`).
````

- [ ] **Step 2: Verify every referenced file exists**

Run: `cd smart-setup/skills/smart-setup && grep -oE '(references|exemplars)/[a-z-]+\.md' commands/smart-setup.md | sort -u | while read f; do test -f "$f" && echo "$f ok" || echo "$f MISSING"; done; cd ../../..`

Expected: every line ends `ok`, no `MISSING`.

- [ ] **Step 3: Commit**

```bash
git add smart-setup/skills/smart-setup/commands/smart-setup.md
git commit -m "feat(smart-setup): command body — scan, tier, manifest gate, generate, update mode"
```

---

### Task 6: Installer + README, verified by running the installer

**Files:**
- Create: `smart-setup/install.sh`
- Create: `smart-setup/README.md`

**Interfaces:**
- Consumes: source tree from Tasks 1–5; sibling `agentic-engineering/rules-library/`.
- Produces: installed skill at `~/.claude/skills/smart-setup/` (with `rules-library/` and patched `user-invocable: false`) + wrapper at `~/.claude/commands/smart-setup.md`.

- [ ] **Step 1: Write install.sh**

````bash
#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧰 Installing smart-setup..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/commands

echo "  → Copying skill..."
rm -rf ~/.claude/skills/smart-setup
cp -r "$SCRIPT_DIR/skills/smart-setup" ~/.claude/skills/

# rules-library single source of truth lives in agentic-engineering (sibling plugin)
RULES_SRC="$SCRIPT_DIR/../agentic-engineering/rules-library"
if [ -d "$RULES_SRC" ]; then
  echo "  → Copying rules-library from sibling plugin..."
  cp -r "$RULES_SRC" ~/.claude/skills/smart-setup/
else
  echo "  ⚠ rules-library not found at $RULES_SRC — stack rule templates unavailable"
fi

# Patch SKILL.md for Claude Code CLI — hide /smart-setup skill from command palette.
# (user-invocable: false is valid in CLI but rejected by claude.ai packager, so added post-install)
SKILL_FILE="$HOME/.claude/skills/smart-setup/SKILL.md"
if ! grep -q "user-invocable" "$SKILL_FILE"; then
  python3 - "$SKILL_FILE" <<'EOF'
import re, sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
# Insert before the closing --- of the YAML frontmatter (the one followed by the H1 heading).
content = re.sub(r'^---\n(?=\s*#)', 'user-invocable: false\n---\n', content, count=1, flags=re.MULTILINE)
with open(path, 'w') as f:
    f.write(content)
EOF
fi

echo "  → Copying command..."
cp "$SCRIPT_DIR/commands/smart-setup.md" ~/.claude/commands/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /smart-setup           scan/interview → tier → manifest → generate"
echo "  /smart-setup update    re-audit existing setup, propose amendments"
````

Make executable: `chmod +x smart-setup/install.sh`

- [ ] **Step 2: Write README.md** (normal prose — user-facing)

````markdown
# smart-setup

Project-tailored Claude Code setup. Scans your codebase (or interviews you, for a brand-new project), sizes the project into a tier, then generates only the configuration that project actually needs across five dimensions:

| Letter | Dimension | What gets generated |
|---|---|---|
| **S** | Skills | Procedure skills (run, test, release…) and domain skills (invariants, gotchas) in `.claude/skills/` |
| **M** | Memory | Three layers: permanent (`CLAUDE.md`), decisions (`docs/decisions.md`), disposable (`.claude/scratch.md`, gitignored) |
| **A** | Agents | Role-named, verification-shaped subagents in `.claude/agents/` — only where the project gives them something to check |
| **R** | Rules | Stack rules from the shared rules-library plus conventions observed in your code, in `.claude/rules/` |
| **T** | Tools | `.mcp.json` entries and required-CLI documentation, detected from config files |

## Why

Full SDLC workflows are overkill for most projects. smart-setup sizes first: a throwaway script gets a 20-line `CLAUDE.md` and nothing else; a production system gets domain skills, agents, and doc conventions. Before writing a single file it shows you a manifest — including an explicit list of what it is *not* generating and why — and waits for your approval.

## Install

```bash
bash smart-setup/install.sh
```

Restart Claude Code afterwards.

## Usage

- `/smart-setup` — scan or interview → tier proposal → manifest → generate
- `/smart-setup update` — re-audit an existing setup against the current codebase and propose amendments

## Tiers

| Tier | Meaning | Ceiling |
|---|---|---|
| 0 — scratch | throwaway, experiment | `CLAUDE.md` ≤ 20 lines |
| 1 — solo product | real project, one dev | + procedure skills, stack rules, memory, ≤ 2 agents, `.mcp.json` |
| 2 — production system | team, CI, users | + domain skills, agents as justified, docs/specs conventions |

If a project genuinely needs a phase-gated SDLC, smart-setup recommends installing the `agentic-engineering` plugin instead of reimplementing it.
````

- [ ] **Step 3: Syntax-check the installer**

Run: `bash -n smart-setup/install.sh && echo "syntax ok"`

Expected: `syntax ok`.

- [ ] **Step 4: Run the installer and inspect the result**

Run: `bash smart-setup/install.sh && ls ~/.claude/skills/smart-setup/ && ls ~/.claude/skills/smart-setup/rules-library/ | head -3 && grep -c "user-invocable: false" ~/.claude/skills/smart-setup/SKILL.md && grep -c "user-invocable" smart-setup/skills/smart-setup/SKILL.md || true`

Expected: installer output ends `✅ Done.`; skill dir lists `SKILL.md commands exemplars references rules-library`; rules-library shows files; installed SKILL.md grep prints `1`; source SKILL.md grep prints `0` (source stays unpatched).

- [ ] **Step 5: Re-run installer to confirm idempotency**

Run: `bash smart-setup/install.sh && grep -c "user-invocable" ~/.claude/skills/smart-setup/SKILL.md`

Expected: completes without error, grep prints `1` (not `2` — patch guard works).

- [ ] **Step 6: Commit**

```bash
git add smart-setup/install.sh smart-setup/README.md
git commit -m "feat(smart-setup): installer with sibling rules-library copy + README"
```

---

### Task 7: End-to-end tier-0 smoke test (manual, fresh session)

**Files:**
- Create: none in repo (writes into a scratch dir only)

**Interfaces:**
- Consumes: installed skill from Task 6.
- Produces: verification evidence that the tier system holds at the bottom end.

- [ ] **Step 1: Create a scratch project**

```bash
mkdir -p /tmp/smart-setup-smoke && cd /tmp/smart-setup-smoke
printf '#!/usr/bin/env python3\nprint("hello")\n' > hello.py
```

- [ ] **Step 2: Run /smart-setup in a fresh Claude Code session**

Open a new Claude Code session in `/tmp/smart-setup-smoke`, run `/smart-setup`.

Expected behavior, in order:
1. Detects existing code (scan path), collects facts.
2. Proposes **tier 0 — scratch** with a one-line reason.
3. After confirmation, presents a manifest whose Generating table contains only `CLAUDE.md`, with a non-empty NOT-generating table.
4. Writes nothing before approval.
5. After approval: `CLAUDE.md` exists and is ≤ 20 lines (`wc -l CLAUDE.md`); `.claude/setup-manifest.md` exists; **no** `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, `docs/` created.

- [ ] **Step 3: Run /smart-setup against a real project (tier 1/2 path)**

Open a new Claude Code session in a real existing project (any repo with tests or a deploy config).

Expected behavior:
1. Scan cites evidence (file paths) for stack, commands, test framework.
2. Proposes tier 1 or 2 with reason; asks confirmation.
3. Manifest shows Generating table scoped to the confirmed tier's cap (tier 1: ≤ 2 agents) and a non-empty NOT-generating table.
4. After approval: generated files match the manifest exactly — nothing extra. Skills have trigger descriptions; rules have `CLAUDE.md` pointer lines; memory read-triggers wired in `CLAUDE.md`; `.claude/scratch.md` gitignored.
5. Restart the session in that project: generated skills appear in the available-skills list and fire on their trigger phrases.

- [ ] **Step 4: Record outcome**

Any deviation (tier over-proposal, extra artifacts, missing NOT-generating table, writes before approval, skills not loading) → fix the responsible source file (`sizing-rubric.md`, `commands/smart-setup.md`, or the matching exemplar), re-run installer, repeat the failed test. Commit fixes as `fix(smart-setup): <what>`.

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/smart-setup-smoke
```
