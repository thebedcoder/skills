## `/ship-all` — Ship All Unchecked Stories

Loops `/ship` across every unchecked story in all active features.

Read `./docs/INDEX.md`, `./docs/CONSTITUTION.md`, then scan feature `STORIES.md` files. Skip features marked `archived` in INDEX — no stories left there.

Use to ship all remaining stories without manual trigger. User stays in loop — every story pauses for plan approval before code. Only mechanical chaining is automatic.

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/ship-all --auto`. **Propagate `AUTO=true` to every story's `/ship` invocation**, and through each story's nested `/implement` and `/review`.

### Step 0b — Write the story PLAN

Per "Progress Tracking" in SKILL.md, write one PLAN line per unchecked story into `.agentic/focus.md` before the session starts — subject `STORY-XXX: [title]`, in the recommended order. This is the chain's progress bar; the per-story `/ship` does **not** write a nested plan, it advances this one.

- Mark each story in progress at its plan gate, closed after its ship chain closes.
- User picks **Skip this story** → close the line with `skipped` noted; story stays unchecked in `STORIES.md`.
- User picks **End session** → leave remaining lines open; they show as unfinished, which is accurate.

Mirror into a harness task list **if this session exposes one** — it is a convenience view, not the record. PLAN survives compaction and session end.


### Step 0 — Auto-write focus

At the start of the chain, update `.agentic/focus.md`:

1. Run **§B step 1** of `shared/preamble.md` — creates `.agentic/` and gitignores it, idempotent.

2. Overwrite CURRENT to represent the whole chain: `title: ship-all: <feature> (N stories)`, `since: [now]`, `set_by: /ship-all`, `note: starting`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value. Propagate `--auto` to every internal `/ship` invocation in the chain.

Between stories: update `note:` to `phase: shipping STORY-X (k of N)`. Do **not** overwrite `title:` per story — it represents the whole chain.

---

### On start

PROD shows session overview, grouping `[P]` parallel stories:

```
PROD — Ship-All Session: [Feature Name]

Stories to ship: X

Can run in parallel [P]:
  - STORY-XXX: [title]
  - STORY-XXX: [title]
  (note: these have no dependencies — you could open multiple Claude Code sessions)

Sequential (depend on others):
  - STORY-XXX: [title] — needs STORY-XXX first
  - STORY-XXX: [title]

Recommended order: [suggested sequence]
You'll approve each implementation plan before it runs.
```

⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: confirm]`: *"Start the ship-all session?"* → Start / Cancel. Under `--auto`: SKIP and proceed.

---

### Per story

**Step 1 — Plan** *(always pauses)*

ARCH + PROD generate plan as in `/ship`, including the Contract claims and Failure
states sections and the `ae-red` + `ae-sec` pre-review pass over them.

```
━━━ STORY-XXX ([X] of [Y]) ━━━

ARCH — Implementation Plan:
[plan, incl. Contract claims + Failure states]

PROD — Plan Review:
[validation]

Pre-review (ae-red + ae-sec on the plan):
[findings, or "no findings" / "skipped — no external contract, no partial state"]
```

⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: single]`: *"STORY-XXX ([X] of [Y]) — proceed?"* → **Ship it (Recommended)** · **Skip this story** · **End session**. Under `--auto`: SKIP and proceed to the ship chain — **unless** pre-review left an unresolved finding on a Contract claim, which escalates to `[AUTO: always-ask]`. (Each story's internal `/ship --auto` still respects hard-overrides.)

**Step 2 — Ship chain** *(automatic on 'go')*

Full `/ship` chain: implement → review → frontend → review → docs → git commits.

Pauses only on review blockers, same as `/ship`.

**Step 3 — Story complete + compact**

```
✅ STORY-XXX shipped ([X] of [Y] done)
[1 line of what was built]
```

Before next story — **the model cannot compact; only the human can.** Print the block, then gate:

```
/compact Focus on: [feature name], STORY-XXX complete, next story is STORY-XXX,
branch [name], any open blockers. Discard: file contents read, review reports, diffs.
```

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: confirm]`: *"Context is full for this story. Run the compact command above, then choose Continue."* → **Continue (Recommended)** · **End session here**

Continue chosen without compacting → proceed anyway. That is the human's call; do not re-ask, do not refuse to continue.

Then next story plan.

---

### Session complete

```
━━━ SHIP-ALL COMPLETE ━━━

Shipped:  X stories
Skipped:  Y stories
Stopped:  [early / no — ran to completion]

DONE ✅
- STORY-XXX: [title]
- STORY-XXX: [title]

SKIPPED ⏭
- STORY-XXX: [title] — [reason if given]

REMAINING 🔜
- STORY-XXX: [title] — [if stopped early]

Git: [X] commits on [branch]
PR desc: ✅ updated to cover all shipped stories
```

**GIT** generates single PR desc covering all shipped stories — not one per story.

### Step N — Release focus

After the final story completes successfully (chain end):

- If invoked with `--auto` → run `/focus done auto` (auto-promotes NEXT silently per `commands/focus.md` Phase 3).
- Else → run `/focus done` (interactive prompt y/n/b).

Mid-chain story completions do NOT call `/focus done` — only the final story triggers release.

---

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` across all stories in this chain.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses across <Y> stories. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Chain start ('go' to begin session) | `[AUTO: skip]` |
| Per-story 'go' prompt | `[AUTO: skip]` |
| Constitution conflict surfaced by a story | `[AUTO: always-ask]` (hard-override #3) |
| Recurring blocker class across multiple stories | `[AUTO: always-ask]` — stop + ask whether to update constitution |

### Guardrails

- **Never skip plan approval.** 'go' prompt non-negotiable between stories. *(Exception: `--auto` mode skips per-story 'go' prompts but still pauses on hard-overrides.)*
- **Compact between every story.** Mandatory — context must clear before next story.
- **Blocker pauses propagate.** Review finds blockers → pause exactly as in `/ship`. After fix, resumes.
- **'stop' always available** at any plan prompt — ends session cleanly.
- **Skipped stories stay unchecked** in `STORIES.md` so `/status` reflects reality.

### Gotchas

- **Compaction is the human's action, not yours.** `/compact` is a user command; no tool invokes it. After 3-4 stories context fills and quality drops, so always surface the gate — but never claim the chain compacted by itself, and never stall waiting for it.
- **One story = its own commit(s).** No batching. User must revert story without touching others.
- **`[P]` markers are user-facing suggestions, not self-instructions.** Ship-all runs sequential. No interleaving.
- **Recurring blockers → stop + fix pattern.** Same blocker class 3 stories in row → update constitution/conventions, not more fixes.
- **PR description = commits, not PRD.** Show log. Users can read.
- **Test runners non-watch mode.** Ship-all multiplies ship's test invocations by every story. Leaked worker from STORY-001 still chews CPU at STORY-008. `vitest run`, `go test ./...`. See SKILL.md "Test Execution Rules."

---
