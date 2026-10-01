# Auto mode (`--auto`)

Read by §A of `preamble.md` whenever `$ARGUMENTS` carries `--auto` — before the first gate. Never read otherwise: without the flag every gate asks.

Long-running commands accept `--auto`: `/feature`, `/fix`, `/improve`, `/ship`, `/ship-all`, `/implement`, `/design`, `/doc`, `/converge`. Per-invocation only — no persistent toggle.


Under `--auto`, every checkpoint is consulted by its tag:

| Tag | Behavior under `--auto` |
|---|---|
| `[AUTO: skip]` | Always skipped. For pure ceremony — a gate whose only options are "start" and "don't start". |
| `[AUTO: ask-if-ambiguous]` | Skip if answer is obvious from CONSTITUTION.md or context. Ask otherwise. |
| `[AUTO: always-ask]` | Never skipped. For architectural / destructive / unrecoverable choices. |
| (untagged) | Defaults to `always-ask` (safe failure). |

## Hard-Override List

Regardless of tag, auto mode pauses + asks when **any** of these:

1. `/review` reports a blocker — high-severity bug, requirements miss, constitution violation.
2. Operation touches: CI configs (`.github/workflows/*`, `.gitlab-ci.yml`, etc.), secrets (`.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`) — creating, editing, staging or sending one; copying an ignored `.env*` from the main folder into a task worktree of the same repo (`shared/worktree.md` §W4) is not, since it stays on this machine, unchanged and ignored — force-push, DB migrations creating/dropping tables, mass file deletion (>10 files).
3. `CONSTITUTION.md` explicitly contradicts the recommended action.
4. Required project state missing — no test framework, no design tool chosen, no feature directory.

## Ambiguity Heuristic (for `[AUTO: ask-if-ambiguous]`)

- Multiple viable options, no constitution directive → ambiguous → ask.
- One option matches a constitution directive → not ambiguous → proceed + cite.
- Single viable option only → not ambiguous → proceed.
- Decision has cascading effects (>3 files, public-interface change, data-model change, new dependency) → treat as ambiguous regardless.

## Visibility

Every auto-decision is announced inline + appended to `.agentic/auto-log.md` (gitignored, alongside `.agentic/focus.md`):

```
DECISION: <choice>
  reason: <why, citing CONSTITUTION.md when applicable>
  [auto]
```

`SKIPPED:` for ceremonial skips. `HARD-PAUSE:` for forced pauses. Command ends with the one-line summary in `preamble.md` §C: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`.

## Composition with /focus

When CURRENT is written by an `--auto` command, `set_by:` gets ` (auto)` suffix. Auto-mode behaviour of `/focus done` is defined in `shared/focus-release.md` — that file is the single source of truth; don't restate its rules here.
