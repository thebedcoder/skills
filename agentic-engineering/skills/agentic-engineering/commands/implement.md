## `/implement` — Implement Next Story

**Goal:** Ship one story end-to-end — plan cleared, code + tests written, acceptance criteria verified, progress recorded.

**Agents:** `ae-arch` (plan, session model), PROD (validation, inline), `ae-red` + `ae-sec` (pre-review of the plan), `ae-impl` (build, Sonnet by default)

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- `./docs/INDEX.md` — current feature
- `./docs/features/[feature-name]/STORIES.md` + `PROGRESS.md` — find next unchecked story
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/implement <STORY-ID> --auto`. Nested inside `/ship` → inherit the parent's flag.

### Step 0b — PLAN

Nested under `/ship` or `/ship-all` → **do not write a PLAN**; advance the parent's.

Standalone → write one PLAN line per phase (plan (ae-arch) · build (ae-impl) · verify AC · record progress) into `.agentic/focus.md` — SKILL.md "Progress Tracking".


### Step 0 — Auto-write focus

Before planning, run **§B** of `shared/preamble.md` — `title: <STORY-ID> — <story title>`, `feature: <feature-name>`, `set_by: /implement`. CURRENT already names this story (parent `/ship` or `/ship-all`) → only `note: phase: implementing` + `set_by:` change.

### Flow

Run `shared/story-flow.md` — constraints, `ae-arch` plan with Contract claims and Failure states, PROD review, `ae-red` + `ae-sec` pre-review, the escalation gate, `ae-impl` build test-first on its tier, mechanical verify, record. Its gates and tags apply as written. No plan-approval gate: the plan prints and the build starts — escalations are the only stop.

### Step N — Release focus

Run `shared/focus-release.md` (`auto` under `--auto`). `set_by:` contains `/ship` or `/ship-all` → skip; the parent releases.

### Step N — Auto-mode summary

Run **§C** of `shared/preamble.md`.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Plan approval | **none** — execution runs; the plan prints and the build starts |
| Escalation: new library, public API change, disputed Contract claim, hard-override op, missing state | `[AUTO: always-ask]` — `shared/story-flow.md` §1 |
| Implementer stuck after a session-model retry | `[AUTO: always-ask]` — `shared/story-flow.md` §2 |
| Pre-review itself (`ae-red` + `ae-sec` on the plan) | not a checkpoint — always runs, never pauses |

---
