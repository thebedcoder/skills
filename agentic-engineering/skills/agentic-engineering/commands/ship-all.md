## `/ship-all` — Ship All Unchecked Stories

Loops `/ship` across every unchecked story in all active features.

Read `./docs/INDEX.md`, `./docs/CONSTITUTION.md`, then scan feature `STORIES.md` files.

Use to ship all remaining stories without manual trigger. User stays in loop — every story pauses for plan approval before code. Only mechanical chaining is automatic.

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
Reply 'go' to start, or 'stop' at any plan prompt to end the session.
```

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

Reply 'go' to ship · 'skip' to skip this story · 'stop' to end session
```

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

---

### Guardrails

- **Never skip plan approval.** 'go' prompt non-negotiable between stories.
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
