## `/ae-ship-all` — Ship All Unchecked Stories

**Loops `/ae-ship` across every unchecked story across all active features**

Read `./docs/INDEX.md`, `./docs/CONSTITUTION.md`, then scan feature `STORIES.md` files for unchecked stories.

Use when you want to build out all remaining stories in a feature without manually
triggering `/ae-ship` each time. You stay in the loop — every story pauses for plan
approval before code is written. Only the mechanical chaining is automatic.

---

### How it runs

**On start**, PROD gives you a session overview, grouping `[P]` parallel stories together:

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
Reply 'go' to start, or 'stop' at any plan prompt to end the session.
```

---

**For each story**, the loop runs:

**Step 1 — Plan** *(always pauses)*

ARCH and PROD generate the implementation plan as in `/ae-ship`.

```
━━━ STORY-XXX ([X] of [Y]) ━━━

ARCH — Implementation Plan:
[plan]

PROD — Plan Review:
[validation]

Reply 'go' to ship · 'skip' to skip this story · 'stop' to end session
```

**Step 2 — Ship chain** *(runs automatically on 'go')*

Runs the full `/ae-ship` chain for this story:
implement → review → frontend → review → docs → git commits

Pauses only if review blockers are found, same as `/ae-ship`.

**Step 3 — Story complete + compact**

```
✅ STORY-XXX shipped ([X] of [Y] done)
[1 line of what was built]
```

Before moving to next story, run:
```
/compact Focus on: [feature name], STORY-XXX complete, next story is STORY-XXX,
branch [name], any open blockers. Discard: file contents read, review reports, diffs.
```

Then proceed to next story plan.

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

**GIT** generates a single PR description covering all stories shipped in the session,
not one per story.

---

### Guardrails

- **Never skips plan approval.** The 'go' prompt is non-negotiable between stories.
- **Compact between every story.** Non-negotiable — context must be cleared before next story starts.
- **Blocker pauses propagate.** If a review finds blockers mid-chain, the session pauses exactly as in `/ae-ship`. After fixing, the session resumes from where it stopped.
- **'stop' is always available** at any plan prompt — it ends the session cleanly without abandoning in-progress work.
- **Skipped stories stay unchecked** in `STORIES.md` so `/ae-status` reflects reality.

---
