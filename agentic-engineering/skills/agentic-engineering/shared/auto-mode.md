# Auto mode (`--auto`)

Read by §A of `preamble.md` whenever `$ARGUMENTS` carries `--auto` — before the first gate. Never read otherwise: without the flag every gate asks.

Which commands accept the flag → SKILL.md "Auto Mode" (single list, pinned by `test_command_tables.py`). Per-invocation only — no persistent toggle.


Under `--auto`, every checkpoint is consulted by its tag:

| Tag | Behavior under `--auto` |
|---|---|
| `[AUTO: skip]` | Always skipped. For pure ceremony — a gate whose only options are "start" and "don't start". |
| `[AUTO: ask-if-ambiguous]` | Skip if answer is obvious from CONSTITUTION.md or context. Ambiguous but contained → decide and log a `RULING:` (below). Ask otherwise. |
| `[AUTO: always-ask]` | Never skipped. For architectural / destructive / unrecoverable choices. |
| (untagged) | Defaults to `always-ask` (safe failure). |

## Hard-Override List

Regardless of tag, auto mode pauses + asks when **any** of these:

1. A review blocker survives the fix loop (`shared/fix-loop.md` — three implementer rounds, each re-reviewed), or needs a decision rather than a fix — high-severity bug, requirements miss, constitution violation. Standalone `/review` with blockers always asks.
2. Operation touches: CI configs (`.github/workflows/*`, `.gitlab-ci.yml`, etc.), secrets (`.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`) — creating, editing, staging or sending one; copying an ignored `.env*` from the main folder into a task worktree of the same repo (`shared/worktree.md` §W4) is not, since it stays on this machine, unchanged and ignored — force-push, DB migrations creating/dropping tables, mass file deletion (>10 files).
3. `CONSTITUTION.md` explicitly contradicts the recommended action.
4. Required project state missing — no test framework, no design tool chosen, no feature directory.

## Ambiguity Heuristic (for `[AUTO: ask-if-ambiguous]`)

- Multiple viable options, no constitution directive → ambiguous → ask.
- One option matches a constitution directive → not ambiguous → proceed + cite.
- Single viable option only → not ambiguous → proceed.
- Decision has cascading effects (>3 files, public-interface change, data-model change, new dependency) → treat as ambiguous regardless.

**Ambiguous ≠ always ask.** When the worst case of guessing wrong is rework *inside the current task* — the files this story or improvement already touches, reversible by one edit — decide, log a ruling, proceed:

```
RULING: <choice>
  why: <reason — cite CONSTITUTION.md when it applies>
  cost if wrong: <what breaks, how much rework>
  reversal: <the edit that undoes it>
  [auto]
```

Still **ask** when cost if wrong is not contained: anything in the cascading list above, anything on the Hard-Override List, anything irreversible (data written, message sent, file deleted), anything a human has to live with outside this task. A ruling with an empty or vague `cost if wrong` is not a ruling — ask.

Rulings outlive the run: `/cleanup` reads this task's `RULING:` lines and promotes any that set a pattern later work must follow to a `DEC-NNN` entry.

## Visibility

Every auto-decision is announced inline + appended to `.agentic/auto-log.md` (gitignored, alongside `.agentic/focus.md`):

```
DECISION: <choice>
  reason: <why, citing CONSTITUTION.md when applicable>
  [auto]
```

`RULING:` for contained ambiguous calls (format above). `SKIPPED:` for ceremonial skips. `HARD-PAUSE:` for forced pauses. Command ends with the one-line summary in `preamble.md` §C: `🤖 Auto mode: <D> decisions, <R> rulings, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`.

## Composition with /focus

When CURRENT is written by an `--auto` command, `set_by:` gets ` (auto)` suffix. Auto-mode behaviour of `/focus done` is defined in `shared/focus-release.md` — that file is the single source of truth; don't restate its rules here.
