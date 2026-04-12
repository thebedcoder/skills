## `/ae-note` — Capture Backlog Item

**Agents active: FIXER (bugs), PROD (ideas/improvements)**

Use to quickly capture anything you want to implement later without interrupting
current work. Saves to `./docs/BACKLOG.md` with enough context to act on later.

Input received: $ARGUMENTS

---

### Phase 1 — Classify

Determine the type from the description:
- **bug** — something broken or behaving incorrectly
- **idea** — new capability or feature not yet planned
- **improvement** — existing feature that could work better

If unclear, ask: *"Is this a bug, idea, or improvement?"*

---

### Phase 2 — Quick Investigation

**For bugs** — FIXER does a fast read of the codebase:
```
FIXER — Quick Investigation:

Likely location: [file(s) most likely involved]
Probable cause: [hypothesis from reading code — caveman rules]
Complexity: S / M / L
Can reproduce with: [how to trigger it, if determinable from code]
Risk if left unfixed: low / medium / high
```

**For ideas/improvements** — PROD does a quick assessment:
```
PROD — Quick Assessment:

What it solves: [user problem or friction point]
Related feature: [which existing feature this touches, or 'new feature']
Complexity: S / M / L
Value: low / medium / high
Dependencies: [anything that needs to exist first]
```

If the codebase read reveals the item is already fixed or implemented, say so and skip saving.

---

### Phase 3 — Write to BACKLOG.md

Generate a unique ID: `NOTE-XXX` (increment from last item in BACKLOG.md).

Prepend to `./docs/BACKLOG.md` (newest first, after the header):

```markdown
## NOTE-XXX: [short title] — [date]
**Type:** bug | idea | improvement
**Status:** backlog
**Complexity:** S / M / L
**Priority:** low | medium | high

**Description:**
[Full description of the item]

**Investigation:**
[FIXER or PROD findings from Phase 2]

**Acceptance criteria (draft):**
- [ ] [What done looks like]
- [ ] [What done looks like]

**Related feature:** [feature name or 'TBD']
**Related files:** [key files if known]
```

---

### Phase 4 — Update agent changelog

Prepend to `./docs/CHANGELOG.md`:
```markdown
## [date]
- [NOTE-XXX] noted([type]): [short title]
```

---

### Phase 5 — Confirm

```
━━━ NOTE SAVED ━━━
ID:         NOTE-XXX
Type:       [bug/idea/improvement]
Title:      [short title]
Complexity: S/M/L
Priority:   low/medium/high

Saved to: ./docs/BACKLOG.md

When ready to implement: run /ae-ship — it will pick this up and promote it automatically.
```
