# Shared command preamble

Three blocks that every multi-phase command runs before its own work. They used
to be copy-pasted into 8–12 command files; they live here once. A command body
says which blocks it runs — read this file, run them, then continue with the
command.

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

Tag taxonomy, hard-override list and ambiguity heuristic → "Auto Mode" in
`SKILL.md`. Checkpoint tags → the table at the bottom of the calling command.

---

## §B — Auto-write focus

1. Ensure `.agentic/` exists and is gitignored (idempotent):

```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Write CURRENT using the **story-id-match heuristic**:

- Existing `CURRENT.title` already references this STORY-ID or branch (typical
  when a parent chain set it) → update `note:` and `set_by:` only. Leave
  `title:` and `since:` alone.
- Otherwise → overwrite CURRENT with the calling command's own title, `since:
  [now]`, `set_by: /<command>`.

Under `--auto`: append ` (auto)` to the `set_by:` value.

The calling command supplies the `title:` / `note:` values — everything else
above is the same wherever this runs.

---

## §C — Auto-mode summary

Last line of a command that ran with `AUTO=true`:

```
🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md
```

`AUTO=false` → print nothing.

---

## §D — Project memory inputs

Every command that changes code or docs reads these first, in this order:

| File | How much |
|---|---|
| `./docs/MEMORY.md` | in full — it is line-capped for exactly this reason |
| `./docs/DECISIONS.md` | **titles only** (`## DEC-NNN — …` lines). Read a full entry only when the current change touches its subject |
| `./docs/CONSTITUTION.md` | in full |

Missing file → skip it silently; a project may predate the doc.

These exist to be read. `/cleanup` rewrites `MEMORY.md` and appends to
`DECISIONS.md` after every `/ship`, `/fix` and `/improve`; a command that
writes them and never reads them is a write-only log.
