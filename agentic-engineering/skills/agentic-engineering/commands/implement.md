## `/implement` — Implement Next Story

**Goal:** Ship one story end-to-end — plan approved, code + tests written, acceptance criteria verified, progress recorded.

**Agents:** ARCH (plan), PROD (validation), `ae-red` + `ae-sec` (pre-review of the plan)

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- `./docs/INDEX.md` — current feature
- `./docs/features/[feature-name]/STORIES.md` + `PROGRESS.md` — find next unchecked story
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/implement <STORY-ID> --auto`. Nested inside `/ship` → inherit the parent's flag.

### Step 0b — PLAN

Nested under `/ship` or `/ship-all` → **do not write a PLAN**; advance the parent's. The parent also owns the start gate — nested, this command's own gate does not fire.

Standalone → write one PLAN line per phase (plan · implement + tests · verify AC · record progress) into `.agentic/focus.md` — SKILL.md "Progress Tracking".


### Step 0 — Auto-write focus

Before planning, run **§B** of `shared/preamble.md` — `title: <STORY-ID> — <story title>`, `feature: <feature-name>`, `set_by: /implement`. CURRENT already names this story (parent `/ship` or `/ship-all`) → only `note: phase: implementing` + `set_by:` change.

### Flow

Run `shared/story-flow.md` — constraints, plan with Contract claims and Failure states, `ae-red` + `ae-sec` pre-review, the plan-approval gate, implement test-first, verify with fresh evidence, record `PROGRESS.md`. Its gates and tags apply as written.

### Step N — Release focus

Run `shared/focus-release.md` (`auto` under `--auto`). `set_by:` contains `/ship` or `/ship-all` → skip; the parent releases.

### Step N — Auto-mode summary

Run **§C** of `shared/preamble.md`.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Plan-approval ('go' to start) | `[AUTO: skip]` — proceed silently when plan has no new deps / interface changes |
| Plan introduces new library or alters public API | `[AUTO: always-ask]` — escalates from skip to ask |
| Pre-review disputes a Contract claim, unresolved | `[AUTO: always-ask]` — escalates from skip to ask |
| Pre-review itself (`ae-red` + `ae-sec` on the plan) | not a checkpoint — always runs, never pauses |
| Tests passing → commit | `[AUTO: skip]` — tests verify correctness; no user judgment needed |

---
