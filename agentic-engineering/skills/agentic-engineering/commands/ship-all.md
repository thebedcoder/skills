## `/ship-all` — Ship All Unchecked Stories

Loops `/ship` across every unchecked story in all active features.

Read `./docs/INDEX.md`, `./docs/CONSTITUTION.md`, then scan feature `STORIES.md` files. Skip features marked `archived` in INDEX — no stories left there.

Use to ship all remaining stories without manual trigger. User stays in loop — every story pauses for plan approval before code. Only mechanical chaining is automatic.

### Step 0a — Parse `--auto` flag

Detect whether `$ARGUMENTS` contains the `--auto` token.

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- If `AUTO`: Step 0 (below) appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- If `AUTO`: ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /ship-all --auto
  ```
- **Propagate `AUTO=true` to every story's `/ship` invocation in the chain.** Each story's nested `/implement` and `/review` phases also inherit auto.

See "Auto Mode" in SKILL.md for the tag taxonomy, hard-override list, and ambiguity heuristic. Apply checkpoint tags from the table at the bottom of this file.

### Step 0b — Open the story task list

Per "Progress Tracking" in SKILL.md, create one task per unchecked story before the session starts — subject `STORY-XXX: [title]`, in the recommended order. This is the chain's progress bar; the per-story `/ship` does **not** open a nested list, it advances this one.

- Mark each story `in_progress` at its plan gate, `completed` after its ship chain closes.
- User picks **Skip this story** → complete the task with `skipped` noted; story stays unchecked in `STORIES.md`.
- User picks **End session** → leave remaining tasks `pending`; they show as unfinished, which is accurate.

### Step 0 — Auto-write focus

At the start of the chain, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

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

ARCH + PROD generate plan as in `/ship`.

```
━━━ STORY-XXX ([X] of [Y]) ━━━

ARCH — Implementation Plan:
[plan]

PROD — Plan Review:
[validation]
```

⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: single]`: *"STORY-XXX ([X] of [Y]) — proceed?"* → **Ship it (Recommended)** · **Skip this story** · **End session**. Under `--auto`: SKIP and proceed to the ship chain. (Each story's internal `/ship --auto` still respects hard-overrides.)

**Step 2 — Ship chain** *(automatic on 'go')*

Full `/ship` chain: implement → review → frontend → review → docs → git commits.

Pauses only on review blockers, same as `/ship`.

**Step 3 — Story complete + compact**

```
✅ STORY-XXX shipped ([X] of [Y] done)
[1 line of what was built]
```

Before next story:
```
/compact Focus on: [feature name], STORY-XXX complete, next story is STORY-XXX,
branch [name], any open blockers. Discard: file contents read, review reports, diffs.
```

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

- **Compact non-negotiable.** After 3-4 stories, context fills → quality drops. Never skip because "stories are small."
- **One story = its own commit(s).** No batching. User must revert story without touching others.
- **`[P]` markers are user-facing suggestions, not self-instructions.** Ship-all runs sequential. No interleaving.
- **Recurring blockers → stop + fix pattern.** Same blocker class 3 stories in row → update constitution/conventions, not more fixes.
- **PR description = commits, not PRD.** Show log. Users can read.
- **Test runners non-watch mode.** Ship-all multiplies ship's test invocations by every story. Leaked worker from STORY-001 still chews CPU at STORY-008. `vitest run`, `go test ./...`. See SKILL.md "Test Execution Rules."

---
