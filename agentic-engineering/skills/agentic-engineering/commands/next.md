## `/next` — Queue Task for After Current

**Agents:** PROD

Append a task to NEXT queue in `.agentic/focus.md`. NEXT is an ordered list; item #1 is offered for promotion when `/focus done` (or `/ship` / `/implement` success) clears CURRENT.

Input received: $ARGUMENTS

---

### Phase 1 — Parse intent

- Empty → show current NEXT list (read-only). Exit.
- `drop <N>` (N = 1-based index) → Phase 3.
- Anything else → Phase 2 (append to NEXT).

---

### Phase 2 — Append to NEXT

Ensure `.agentic/` exists + gitignored:

```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

Read existing `.agentic/focus.md`. Locate `# NEXT` section (create if absent). Append new numbered item with `$ARGUMENTS` as text. Renumber if needed (always 1..N sequential).

Confirm:
```
━━━ QUEUED ━━━
NEXT #N: $ARGUMENTS

Current NEXT queue:
1. ...
2. ...
N. $ARGUMENTS
```

---

### Phase 3 — `/next drop <N>`

Parse `<N>` from `$ARGUMENTS` (must be positive integer; reject otherwise with clear error).

Read NEXT, remove item N, renumber remaining items sequentially. Write back.

Confirm:
```
━━━ DROPPED ━━━
Removed NEXT #N: [original text]

Remaining NEXT queue:
1. ...
2. ...
```

If NEXT empty after drop, print `(queue empty)` instead of list.
