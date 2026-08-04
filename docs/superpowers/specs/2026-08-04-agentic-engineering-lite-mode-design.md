# agentic-engineering: project mode + cleanup mechanism

**Date:** 2026-08-04
**Status:** approved, not implemented
**Scope:** `agentic-engineering/` plugin only

## Problem

`agentic-engineering` assumes every project is a production system. On a small project
(landing page, single-purpose tool) two things are ceremony:

1. **`/init`'s docs scaffold** — `PRD.md`, `EPICS.md`, `improvements.md`, `specs/`, and a full
   `app-docs/` tree get created before a line of code exists.
2. **`/feature`'s planning ceremony** — research → PRD → epics → numbered story breakdown.

Everything else the workflow does is wanted at every size: `/ship`'s phase chain, the 6-agent
parallel review, `app-docs/` content, human checkpoints, mandatory tests.

A second problem, independent of size: work in progress lives only in `.agentic/focus.md`
(CURRENT + NEXT pointer) and per-feature `PROGRESS.md`. Nothing consolidates a finished task
into durable project knowledge, and nothing records *why* a choice was made at project level —
`/archive` captures binding decisions but only per-feature and only at archive time.

## Non-goals

- A second skill. Size is a parameter of this workflow, not a different workflow. Two copies of
  19 command bodies drift the moment `review.md` or `ship.md` changes.
- A dependency on `smart-setup`. `agentic-engineering` must work standalone and ask its own
  sizing question.
- Changing `/implement` or `/review`. They consume `STORIES.md` + `PROGRESS.md`, which both
  modes produce, and must stay mode-blind.

## Design

### 1. Project mode marker

`docs/INDEX.md` gains YAML frontmatter (it has none today — the file starts at `# Docs Index`):

```yaml
---
mode: lite   # lite | full
---
```

`INDEX.md` is already the mandated session-start read (`SKILL.md` → Context Management), so no
new read cost.

`/init` asks once via `[ASK: single]`, two options, proposing a default from observable signals:

| Signal | Proposes |
|---|---|
| No test framework, no CI config, no deploy config | lite |
| `git shortlog -sn` shows one contributor, < ~20 source files | lite |
| CI pipeline present (`.github/workflows/`, `.gitlab-ci.yml`) | full |
| Deploy config present (`vercel.json`, `Dockerfile`, `fastlane/`) | full |
| Multiple contributors, or user says "production" / "users" | full |

Ambiguous → propose lite. The user can bump up; `/init` re-run updates the marker in place.

Missing `docs/INDEX.md` → mode undefined → the command reports "run `/init` first" and exits.

**Only `/init`, `/feature`, `/status`, and `/cleanup` read the marker** — `/cleanup` solely to
pick the `MEMORY.md` line cap. No other command branches on it. `/doc` creating `app-docs/` on
first use is an existence check, not a mode check.

### 2. What lite mode drops

| Artifact | full | lite |
|---|---|---|
| `docs/INDEX.md` | ✅ | ✅ |
| `docs/CHANGELOG.md` | ✅ | ✅ |
| `docs/BACKLOG.md` | ✅ | ✅ |
| `docs/CONSTITUTION.md` | full articles + Default Decisions | ~10 lines: `## Default Decisions` + `## Governance` only |
| `docs/DECISIONS.md` | ✅ | ✅ |
| `docs/MEMORY.md` | ✅ | ✅ |
| `docs/improvements.md` | ✅ at init | created on first write |
| `docs/specs/` | ✅ at init | created on first write |
| `app-docs/` tree | ✅ at init | created by `/doc` on first use |
| `docs/features/<name>/PRD.md` | ✅ | never |
| `docs/features/<name>/EPICS.md` | ✅ | never |
| `docs/features/<name>/STORIES.md` | ✅ | ✅ |
| `docs/features/<name>/PROGRESS.md` | ✅ | ✅ |
| `docs/features/<name>/reviews/` | ✅ | ✅ |

Lite deliberately keeps a short `CONSTITUTION.md`. `review.md` feeds it to `ae-req` and
`ae-edge`, and auto-mode hard-override #3 reads it. Ten lines is not the overkill being
addressed, and dropping it would force a mode branch into `review.md`.

### 3. Lite-mode command behaviour

**`/feature`** — skips the research phase, `PRD.md`, and `EPICS.md`. PROD writes stories
directly to `docs/features/<name>/STORIES.md` with acceptance criteria inline, plus an empty
`PROGRESS.md`. The existing human checkpoint on the story list is kept; the PRD checkpoint
is not rendered.

**`/ship`** — one contained change, applying to both modes: when no feature directory exists
and a `BACKLOG.md` item is being promoted, default the target to `docs/features/main/`,
creating it if absent. Today `ship.md` resolves `./docs/features/[feature-name]/STORIES.md`
with no rule for "no feature exists yet", which is the normal state in lite mode where
`/note` → `/ship` is the primary path.

**`/status`** — reports against the mode's expected artifact set. Absent `PRD.md` in a lite
project is not a gap.

### 4. Task/plan doc

The current-task document stays at `.agentic/focus.md` — gitignored, per-worktree. Renaming
would churn `focus.md`, `next.md`, `status.md`, `ship.md`, and two `SKILL.md` references for no
functional gain. Parallel worktrees must not collide on it, which rules out a committed file.

It gains a third section:

```markdown
# CURRENT
title: [task]
since: [YYYY-MM-DD HH:MM]
set_by: [manual | /ship | /fix] [(auto)]

# PLAN
- [x] [completed step]
- [ ] [pending step]

# NEXT
1. [queued task]
```

Rules:

- `/ship` and `/fix` write and tick `PLAN` steps as phases complete. The PLAN mirrors the
  harness task list; it is the on-disk record that survives a session boundary.
- `/focus` (no args) renders CURRENT + PLAN + NEXT.
- `/focus done` clears CURRENT **and** PLAN, then promotes NEXT item 1 as today.
- `/focus clear` wipes all three. Existing destructive-gate rule applies: show what is being
  destroyed before the widget.
- PLAN absent or empty is valid — a single-step task needs no plan.

### 5. Cleanup

A new `/cleanup` command plus an automatic final phase in `/ship` and `/fix`. Same body, two
entry points; `/cleanup` accepts an optional story or feature argument, otherwise operates on
whatever `.agentic/focus.md` CURRENT names.

Steps:

1. **Read** — `.agentic/focus.md` PLAN, the story's `PROGRESS.md` entry, and
   `docs/features/<name>/reviews/` output for the story.
2. **Log** — prepend 1–3 lines to `docs/CHANGELOG.md`. `/ship` and `/fix` already do this;
   cleanup absorbs that step rather than adding a second write.
3. **Decisions** — extract binding decisions and append to `docs/DECISIONS.md`.
4. **Memory** — rewrite `docs/MEMORY.md`.
5. **Clear** — delegate to `/focus done` (with `auto` when running under `--auto`).

Cleanup is idempotent: re-running on an already-cleaned story adds nothing. It never runs when
`/ship` or `/fix` ended in a blocker pause — an unfinished task has nothing durable to record.

#### `docs/DECISIONS.md`

Append-only, newest first. One entry per binding decision:

```markdown
## DEC-007 — [decision, one line]
date: 2026-08-04 · story: STORY-012 · status: active

**Chose:** [what]
**Because:** [why]
**Rules out:** [what this forecloses]
```

- `status:` is `active` or `superseded by DEC-0NN`. Superseded entries are marked, never
  deleted — the reason a rejected approach was rejected is the value.
- A "binding decision" constrains future work: API contracts, chosen libraries, rejected
  approaches, data-model shape. Implementation details are not decisions.
- `/archive` stops writing its own `## Binding decisions` block into `SUMMARY.md` and links to
  the relevant `DEC-` ids instead. This removes the duplication rather than adding to it.

#### `docs/MEMORY.md`

**Rewritten, not appended.** This is the only project doc with a hard size ceiling — 150 lines
in full mode, 50 in lite. Fixed sections:

```markdown
# Project Memory
<!-- Rewritten by /cleanup. Durable knowledge only — what an agent must know at session start.
     Not a log: docs/CHANGELOG.md is the log. Hard cap: 150 lines (50 in lite mode). -->

## What this is
## How it's built
## Non-obvious constraints
## Known rough edges
```

Rules:

- If a rewrite would exceed the cap, compress the lowest-value section rather than truncating
  the file. Cleanup reports what it compressed.
- Nothing derivable from the code, `git log`, or `CLAUDE.md` belongs here.
- No dates, no story ids, no "we changed X to Y" — that is `CHANGELOG.md`'s job.

The three-way split: `CHANGELOG.md` = what shipped when (append, unbounded).
`DECISIONS.md` = why, per choice (append, unbounded, superseding). `MEMORY.md` = what to know
now (rewritten, capped).

### 6. `CLAUDE.md` pointer block

`/init` writes into the generated `CLAUDE.md`, after the existing sections:

```markdown
## Project Docs
- `docs/INDEX.md` — read first, navigation + feature table
- `docs/MEMORY.md` — durable project knowledge, read at session start
- `docs/DECISIONS.md` — binding decisions, don't re-litigate
- `.agentic/focus.md` — current task + plan (per-worktree, gitignored; absent = no active task)
```

Idempotent on re-init: if a `## Project Docs` section exists, replace it; otherwise append.

### 7. `.mdx` → `.md`

`app-docs/` switches from `.mdx` to `.md` throughout. Mechanical — no template in `doc.md` or
`doc-all.md` uses JSX components. Affects `init.md`, `doc.md`, `doc-all.md`, `archive.md`'s
pointer line, and `README.md`.

Known trade-off: a Mintlify docs site pointed at `app-docs/` requires `.mdx`. Accepted.

## Files touched

| File | Change |
|---|---|
| `skills/agentic-engineering/commands/init.md` | mode gate + marker, lite/full scaffold split, `DECISIONS.md` + `MEMORY.md` seeds, `## Project Docs` block in CLAUDE.md, `.mdx` → `.md` |
| `skills/agentic-engineering/commands/feature.md` | lite branch: skip research / PRD / EPICS |
| `skills/agentic-engineering/commands/ship.md` | default feature dir `docs/features/main/`; cleanup as final phase; PLAN writes |
| `skills/agentic-engineering/commands/fix.md` | cleanup as final phase; PLAN writes |
| `skills/agentic-engineering/commands/focus.md` | PLAN section: render, write, clear on `done` / `clear` |
| `skills/agentic-engineering/commands/status.md` | mode-aware artifact expectations; render PLAN |
| `skills/agentic-engineering/commands/archive.md` | drop `## Binding decisions` block, link `DEC-` ids; `.mdx` → `.md` |
| `skills/agentic-engineering/commands/doc.md` | `.mdx` → `.md`; create `app-docs/` if absent (existence check, not mode check) |
| `skills/agentic-engineering/commands/doc-all.md` | `.mdx` → `.md` |
| `skills/agentic-engineering/commands/cleanup.md` | **new** — real command body |
| `commands/cleanup.md` | **new** — thin wrapper |
| `skills/agentic-engineering/SKILL.md` | command table row; new `## Project Mode` section |
| `install.sh` | `USER_COMMANDS` += `cleanup` |
| `README.md` | document lite mode, the three memory docs, `.md` app-docs |

## Verification

No test suite. Verify by installer sandbox per `CLAUDE.md`:

```bash
SANDBOX=$(mktemp -d)
HOME="$SANDBOX" bash agentic-engineering/install.sh
ls "$SANDBOX/.claude/commands/" | grep cleanup
```

Then `/verify-install`, and `.claude/hooks/check-integrity.sh` must pass for the new
wrapper/real-command pair and the `USER_COMMANDS` entry.

Behavioural check, in a throwaway repo: `/init` → choose lite → confirm no `PRD.md`,
`EPICS.md`, `app-docs/`, `specs/`, `improvements.md`; `/note` → `/ship` → confirm
`docs/features/main/STORIES.md` is created, review still runs six agents, and cleanup writes
`DECISIONS.md` + `MEMORY.md` and clears PLAN.

## Authoring constraints

Content inside `agentic-engineering/` follows the caveman rules in `SKILL.md` — drop articles
and hedging, prefer fragments, keep file paths and technical terms verbatim. Human checkpoint
messages, `━━━` summary blocks, and `README.md` use normal prose.
