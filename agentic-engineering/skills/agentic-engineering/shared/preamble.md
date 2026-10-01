# Shared command preamble

Blocks multi-phase commands share. A command body names the blocks it runs.

---

## §A — Parse `--auto`

Detect whether `$ARGUMENTS` contains the `--auto` token.

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- `AUTO` → §B appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- `AUTO` → ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /<command> <ARGS> --auto
  ```
- **Propagate `AUTO=true` into every nested command** this one dispatches.
- `AUTO` → **read `shared/auto-mode.md` now**, before the first gate: tag behavior,
  Hard-Override List, ambiguity heuristic, auto-log line formats. `AUTO=false` →
  don't open it.

Checkpoint tags → the table at the bottom of the calling command.

---

## §B — Auto-write focus

1. Ensure `.agentic/` exists and is gitignored (idempotent):

```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Write CURRENT using the **story-id-match heuristic**. Fields go under a `# CURRENT` heading, then `# PLAN`, then `# NEXT` — shape in `commands/focus.md`. Hook, statusline and worktree carry find the task by heading.

- Existing `CURRENT.title` already references this STORY-ID or branch (typical
  when a parent chain set it) → update `note:` and `set_by:` only. Leave
  `title:` and `since:` alone.
- Otherwise → overwrite CURRENT with the calling command's own title, `since:
  [now]`, `set_by: /<command>`.

Under `--auto`: append ` (auto)` to the `set_by:` value. A new title (not a
same-story update) also clears PLAN — it belonged to the previous task.

The calling command supplies the `title:` / `feature:` / `note:` values —
everything else above is the same wherever this runs.

---

## §C — Auto-mode summary

Last line of a command that ran with `AUTO=true`. Count the `DECISION:`, `RULING:`, `SKIPPED:` and `HARD-PAUSE:` lines this run appended to `.agentic/auto-log.md` — a chain counts its nested commands' lines too:

```
🤖 Auto mode: <D> decisions, <R> rulings, <S> skips, <H> hard-pauses. See .agentic/auto-log.md
```

`AUTO=false` → print nothing.

---

## §D — Project memory inputs

Every command that changes code or docs reads these first, in this order:

| File | How much |
|---|---|
| `./docs/MEMORY.md` | in full — it is line-capped for exactly this reason |
| `./docs/DECISIONS.md` | **titles only** (`## DEC-NNN — …` lines), **skipping any marked `[superseded]`**. Read a full entry only when the current change touches its subject |
| `./docs/CONSTITUTION.md` | in full |

Missing file → skip it silently; a project may predate the doc.

```bash
grep '^## DEC-' docs/DECISIONS.md | grep -v '\[superseded\]'
```

**Superseded titles are skipped** because a bare title of a reversed decision
asserts the opposite of current truth — its `status:` line sits below the heading.
Still read a superseded entry in full when the change touches its subject.

These exist to be read. `/cleanup` rewrites `MEMORY.md` and appends to
`DECISIONS.md` after every `/ship`, `/fix` and `/improve`; a command that
writes them and never reads them is a write-only log.
