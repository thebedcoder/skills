## `/note` — Capture Backlog Item

**Agents:** FIXER (bugs), PROD (ideas/improvements)

Use to quickly capture anything to implement later without interrupting current work. Saves to `./docs/BACKLOG.md` with enough context to act on later.

Input received: $ARGUMENTS

---

### Phase 1 — Classify

Determine type from description:
- **bug** — something broken or behaving incorrectly
- **idea** — new capability or feature not yet planned
- **improvement** — existing feature that could work better

Unclear → ⚠️ **Human checkpoint** `[ASK: single]`: *"What kind of item is this?"* → **Bug** (something broken) · **Idea** (new capability) · **Improvement** (existing feature could work better). Classification is unambiguous from the description → skip the gate, don't ask ceremonially.

---

### Phase 2 — Quick Investigation

**Bugs** — FIXER does fast codebase read:
```
FIXER — Quick Investigation:

Likely location: [file(s) most likely involved]
Probable cause: [hypothesis from reading code — caveman rules]
Complexity: S / M / L
Can reproduce with: [how to trigger, if determinable from code]
Risk if left unfixed: low / medium / high
```

**Ideas/improvements** — PROD does quick assessment:
```
PROD — Quick Assessment:

What it solves: [user problem or friction point]
Related feature: [which existing feature this touches, or 'new feature']
Complexity: S / M / L
Value: low / medium / high
Dependencies: [anything that needs to exist first]
```

Codebase read reveals item already fixed or implemented → say so + skip saving.

---

### Phase 3 — Write to BACKLOG.md

Generate unique ID: `NOTE-XXX` (increment from last item).

Prepend to `./docs/BACKLOG.md` (newest first, after header):

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

Next: [routing line — see table below]
```

Last line routes by `Type` — print exactly one:

| Type | Line |
|---|---|
| bug | `Next: /fix [short title] — diagnose and fix it on a branch.` |
| improvement | `Next: /improve — picks this up from BACKLOG.md, or /improve [short title] to name it directly.` |
| idea | `Next: /ship — promotes this item into docs/features/ and ships it.` |
