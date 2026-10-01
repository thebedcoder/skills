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
set_by: [manual | /ship | /fix | /improve | ...]

# PLAN
- [x] [completed step]
- [ ] [pending step]

# NEXT
1. [queued task]
```

CURRENT may also carry `feature:` and `note:` (chain commands), and `worktree_of:` + `worktree_base:` — written only by `/ship-all`'s parallel path into a story worktree (`shared/worktree.md`). `/ship` reads `worktree_of:` to defer its shared-doc phases to the merge.

`# PLAN` **is** the progress record; a harness task list, where the session exposes one, is a mirror of it. Chain commands (`/ship`, `/ship-all`, `/plan-all`, `/fix`, `/improve`, `/feature`, `/doc-all`) write PLAN at start and tick steps as phases close. A one-step task needs no PLAN; absent is valid.

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

Run **§B step 1** of `shared/preamble.md` — creates `.agentic/` and gitignores it, idempotent.

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

Run `shared/focus-release.md` — `$ARGUMENTS` containing `auto` selects its auto-promote branch.

---

### Phase 4 — `/focus clear`

Wipe CURRENT, PLAN, and NEXT (delete file or leave headers empty). Destructive gate per SKILL.md — print what's about to be wiped before the widget. Print after:
```
━━━ FOCUS CLEARED ━━━
CURRENT + PLAN + NEXT wiped.
```

---

### Auto-write protocol (for other commands)

Commands write CURRENT through **§B** of `shared/preamble.md` (create + gitignore `.agentic/`, story-id match heuristic, ` (auto)` suffix). A new title — not a same-story update — also clears PLAN. Chain commands (`/ship`, `/ship-all`, `/plan-all`, `/fix`, `/improve`, `/feature`, `/doc-all`) then write their phase list into PLAN and tick it as phases close. Release on success → `shared/focus-release.md`.
