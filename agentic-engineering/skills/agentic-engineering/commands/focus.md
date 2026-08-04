## `/focus` — Current Task Pointer

**Agents:** PROD

Set, clear, or advance current task pointer for this worktree. State lives at `.agentic/focus.md` (per-worktree, gitignored).

Input received: $ARGUMENTS

### File shape

Three sections. All optional — absent section means empty.

```markdown
# CURRENT
title: [task]
since: [YYYY-MM-DD HH:MM]
set_by: [manual | /ship | /fix | ...]

# PLAN
- [x] [completed step]
- [ ] [pending step]

# NEXT
1. [queued task]
```

`# PLAN` is the on-disk mirror of the harness task list. Chain commands (`/ship`, `/fix`, `/ship-all`) write it at start and tick steps as phases close — the harness list dies with the session, PLAN survives it. A one-step task needs no PLAN; absent is valid.

**Never hand-edit PLAN from `/focus <text>`** — setting a new CURRENT wipes PLAN, because a plan for the previous task is worse than none.

---

### Phase 1 — Parse intent

Inspect `$ARGUMENTS`:

- Empty → show current focus + PLAN + NEXT (read-only). Same render as `/status` FOCUS block. Exit.
- `done` → Phase 3 (clear CURRENT + promote NEXT).
- `done auto` → Phase 3, auto-promote branch (no prompt). Parent command running under `--auto` passes this.
- `clear` → Phase 4 (clear both).
- Anything else → Phase 2 (set CURRENT manually).

---

### Phase 2 — Set CURRENT manually

Ensure `.agentic/` exists + gitignored. Idempotent:

```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

Overwrite CURRENT section of `.agentic/focus.md` (preserve NEXT section if present, **drop PLAN** — it belonged to the previous task). Fields:

```markdown
# CURRENT
title: $ARGUMENTS
since: [now, YYYY-MM-DD HH:MM]
set_by: manual
```

Confirm:
```
━━━ FOCUS SET ━━━
🎯 $ARGUMENTS
```

Exit.

---

### Phase 3 — `/focus done` (clear CURRENT, promote NEXT)

Read `.agentic/focus.md`. **PLAN is cleared in every sub-case below** — it describes the task being closed. `/cleanup` reads PLAN, so a chain command that wants its steps recorded must run cleanup *before* calling `/focus done`.

Three sub-cases:

**NEXT empty (or file absent):** Clear CURRENT + PLAN (delete sections, or remove file if NEXT also empty). Print:
```
━━━ FOCUS DONE ━━━
🎯 (none)
NEXT queue empty.
```
Exit.

**Auto-mode short-circuit (NEXT non-empty + `$ARGUMENTS` contains `auto` token):** Parent command runs under `--auto`. Skip y/n/b prompt entirely. Promote NEXT item #1 to CURRENT with `set_by: /focus done (auto-promoted)`, `since: now`. Renumber NEXT (remove item 1, shift up). Append DECISION line to `.agentic/auto-log.md` (create if missing) describing promotion. Print:
```
━━━ FOCUS DONE (auto-promoted) ━━━
🎯 [promoted item]
```
Exit.

**NEXT non-empty (interactive):** Read item #1 of NEXT. Print state, then gate:

```
━━━ FOCUS DONE ━━━
🎯 (cleared)

Next queued: [item #1 text]
```

⚠️ **Human checkpoint** `[ASK: single]`: *"Pick up '[item #1 text]' next?"*

| Option | Effect |
|---|---|
| **Pick it up (Recommended)** | Rewrite CURRENT with `title: <item #1 text>`, `since: now`, `set_by: /focus done (promoted)`. Remove item #1 from NEXT; renumber. |
| **Leave it queued** | Clear CURRENT only. NEXT untouched. |
| **Move to backlog** | Invoke `/note` workflow with the item text. Remove from NEXT; renumber. |

Confirm result.

---

### Phase 4 — `/focus clear`

Wipe CURRENT, PLAN, and NEXT (delete file or leave headers empty). Destructive gate per SKILL.md — print what's about to be wiped before the widget. Print after:
```
━━━ FOCUS CLEARED ━━━
CURRENT + PLAN + NEXT wiped.
```

---

### Auto-write protocol (for other commands)

When another command (`/feature`, `/implement`, `/ship`, `/fix`, `/design`, `/review`, `/doc`, `/frontend`) starts, it runs this protocol before doing real work:

1. Ensure `.agentic/` exists + gitignored (same idempotent block as Phase 2).
2. Read existing CURRENT.
3. **Story-id match heuristic:** if new task references same STORY-ID (or same feature, when no story) as existing CURRENT, **only** update `note:` and `set_by:` — leave `title:`, `since:`, and PLAN alone. Prevents flicker when `/ship` includes `/implement` + `/review` inline.
4. Otherwise overwrite CURRENT with new title/feature/set_by, fresh `since:`, and clear PLAN.
5. Under `--auto`: append ` (auto)` suffix to `set_by:` value.
6. Chain commands (`/ship`, `/fix`, `/ship-all`) then write their phase list into PLAN and tick it as phases close. Single-phase commands write no PLAN.

`/implement` and `/ship` additionally call Phase 3 (`/focus done`) on success — except `/ship` suppresses this when it is mid-chain inside `/ship-all` (chain caller decides when to release focus). Under `--auto`, the caller passes `auto` as the `$ARGUMENTS` to `/focus done` so it auto-promotes silently.
