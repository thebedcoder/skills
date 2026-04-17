## `/ae-plan-all` — Plan All Epics

**Agents active: PROD (lead), ARCH (validator)**

Use after `/ae-bootstrap` or when you have epics in `./docs/INDEX.md` but no stories yet.
Runs `/ae-feature` for each unplanned epic in sequence, pausing for human approval at the PRD step.
After completion, run `/ae-ship-all` to implement everything.

---

### Phase 1 — Epic Inventory

PROD reads `./docs/INDEX.md` and identifies all epics without stories:

```
PROD — Epic Inventory:

Needs planning (no STORIES.md yet):
  1. [epic name] — [one line description]
  2. [epic name] — [one line description]

Already planned (has STORIES.md):
  3. [epic name] — X stories, Y complete ← skip

Total to plan: X epics
```

⚠️ **Human checkpoint:** *"Reply 'go' to plan all, or list specific numbers to plan (e.g. '1,3')."*

---

### Phase 2 — Planning Loop

For each selected epic, run the full `/ae-feature` flow:

**Between epics — compact:**
```
/compact Focus on: epics planned so far, next epic to plan, INDEX.md state.
Discard: full PRD contents, story details from previous epics.
```

**Per epic:**

```
━━━ PLANNING EPIC [X] of [Y]: [name] ━━━
```

Runs: approach analysis → PROD challenge → **human picks approach** → PRD → **human approves** → stories → ARCH validates → INDEX.md updated.

Uses **ultra caveman** for all agent reports during planning loop to keep context lean.

---

### Phase 3 — Plan-All Complete

```
━━━ PLAN-ALL COMPLETE ━━━

Epics planned: X
Total stories created: Y

PLANNED ✅
- [epic]: X stories → ./docs/features/[name]/
- [epic]: X stories → ./docs/features/[name]/

Git: X commits (chore: add PRD, epics and stories per feature)

Ready to build. Run /ae:ship-all to implement all planned stories.
```

### Gotchas

- **Don't plan ten features in one session without compacting.** Each feature's planning output — three approach options, a PRD, stories — is substantial. Context fills fast. Compact between features, same as ship-all compacts between stories.
- **Don't produce cookie-cutter approach options across features.** If every feature's Option A is "server-rendered with forms", Option B is "SPA with API", you're pattern-matching instead of thinking about what this specific feature needs. Features with different user contexts need different option sets.
- **Don't silently merge related features.** If two planned features overlap substantially, surface it to the user as "these could be one feature or need clearer scope" — don't decide unilaterally.
- **Plan-all generates docs, not decisions.** If the user approves all the PRDs without engagement, that's a problem with the session, not a success. The clarification pass should surface real ambiguities; if it doesn't, the PRDs are probably vague.
- **Constitution violations found during plan-all must pause the session.** Don't continue planning additional features while one has unresolved constitution conflicts.

---
