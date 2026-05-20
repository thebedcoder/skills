# Auto Mode — `--auto` Flag for Long-Running Commands

**Date:** 2026-05-20
**Plugin:** `agentic-engineering/`
**Status:** Design approved, ready for implementation plan.
**Related:** `2026-05-20-focus-current-task-pointer-design.md` (composition notes below).

## Problem

Long-running agentic-engineering commands (`/ship`, `/feature`, `/fix`, etc.) pause at multiple checkpoints to ask the user to approve plans, confirm decisions, or pick options. Many of those pauses are pure ceremony — the recommended action is obvious, the constitution gives a clear default, and the user types "go" without thinking. Other pauses are genuinely important (architectural choices, destructive operations, review blockers). The current behavior treats all checkpoints the same. Users want a mode that stops only on the important ones.

## Goals

1. **Skip ceremonial checkpoints** automatically when the recommended action is unambiguous.
2. **Preserve user control** at decisions that have real architectural, security, or data-loss consequences.
3. **High visibility** of every auto-decision so the user can audit and override.
4. **Predictable behavior** — tagged in source, not inferred at runtime.
5. **Compose cleanly** with the `/focus` pointer (separately specced) so auto runs don't fight focus state.

## Non-Goals

- Project- or session-level "always auto" mode. Per-invocation only.
- A `--dry-run` companion. Different concern, separate work.
- Replay / undo of auto-decisions. The audit log is read-only.
- Auto mode on `/init`, `/bootstrap`, `/doc` (too input-heavy), or `/review`, `/note`, `/status`, `/analyze`, `/focus`, `/next`, `/plan-all`, `/doc-all` (no skippable checkpoints).

## Design

### Activation

Per-invocation flag: `--auto`. No persistent state, no session toggle, no project default. Each command run opts in explicitly.

Supported on:
- `/feature [name] --auto`
- `/fix <bug> --auto`
- `/ship --auto`
- `/ship-all --auto`
- `/implement --auto`
- `/design --auto`

The flag is detected by the wrapper at `commands/<name>.md`, threaded into the real command body via `$ARGUMENTS`, and propagated to internal sub-phases (e.g. `/ship --auto` runs its internal `/implement` and `/review` phases in auto mode too).

### Checkpoint Tagging

Each pause in a command's instructions gets an annotation:

| Tag | Meaning |
|---|---|
| `[AUTO: skip]` | Pure ceremony (e.g. "Reply 'go' to start"). Always skipped under `--auto`. |
| `[AUTO: ask-if-ambiguous]` | Has a clear default? Apply silently. Otherwise ask. See "Ambiguity Heuristic" below. |
| `[AUTO: always-ask]` | Never skipped under `--auto`. Reserved for architectural, destructive, unrecoverable choices. |

Untagged checkpoints default to `always-ask` (safe failure mode for legacy or new commands that haven't been tagged yet).

### Hard Override — Auto Mode Always Pauses For

Regardless of tag, auto mode stops and asks when any of:

1. `/review` reports a blocker — ≥1 high-severity bug from `ae-red`, requirements violation from `ae-req`, or constitution violation from any reviewer.
2. Operation touches: CI config files (`.github/workflows/*`, `.gitlab-ci.yml`, `circleci/`, `azure-pipelines.yml`), secrets / credential files (`.env*`, anything matching `*secret*`, `*credential*`, `*.pem`, `*.key`), force-push, DB migrations creating or dropping tables, mass deletion (>10 files), or destructive git operations.
3. Project `CONSTITUTION.md` explicitly contradicts the recommended action.
4. Required project state is missing — no test framework configured, no design tool chosen, no feature directory for the current story.

The hard-override list is documented inline in each command file as a reminder. Adding new override conditions is a deliberate spec change.

### Ambiguity Heuristic

Used at `[AUTO: ask-if-ambiguous]` checkpoints:

- Multiple viable options, **no constitution directive** → ambiguous → ask.
- One option **matches a constitution directive** → not ambiguous → proceed + cite the matching line.
- **Single** viable option only → not ambiguous → proceed.
- Decision has **cascading effects** — touches >3 files, changes a public interface, alters data model, introduces a new dependency — → treat as ambiguous regardless of option count.

### Decision Visibility (the trust mechanism)

**Inline announcement** at each auto-skip or auto-decide moment:

```
DECISION: use Postgres for token store
  reason: CONSTITUTION.md → "DB: Postgres primary"
  [auto]
```

For skipped ceremonial checkpoints:
```
SKIPPED: plan-approval checkpoint (clear story, no ambiguity) [auto]
```

For hard-overrides:
```
HARD-PAUSE: /review found 1 high-severity bug — surfacing for user [auto]
```

**Persistent audit log:** `.agentic/auto-log.md` (gitignored, same dir as `focus.md`), append-only. Each command run gets a dated section:

```markdown
## 2026-05-20 14:32 — /ship STORY-005 --auto
- SKIPPED: plan-approval checkpoint (clear story, no ambiguity)
- DECISION: use Postgres for token store
  reason: CONSTITUTION.md → "DB: Postgres primary"
- DECISION: keep TokenStore interface unchanged
  reason: low-risk, matches feature/auth pattern
- HARD-PAUSE: /review found 1 high-severity bug — surfacing for user
- (resumed after user fix)
- SUMMARY: 7 decisions, 1 hard-pause, command completed
```

**End-of-command summary** (terse footer in chat):
```
🤖 Auto mode: 7 decisions, 1 hard-pause. See .agentic/auto-log.md
```

### Constitution as the Authority

Auto mode reads `./docs/CONSTITUTION.md` first and uses it as the source of truth for default decisions. Recommended scaffold addition by `/init`: a `## Default Decisions` section with one-liners.

```markdown
## Default Decisions
- DB: Postgres unless feature explicitly requires SQLite
- HTTP client: built-in fetch, no axios
- Tests: pytest, non-watch only
- Frontend: Tailwind for layout, no CSS-in-JS
```

Auto mode's `DECISION:` lines cite the matching default-decisions line in their `reason:` when applicable. This makes the constitution discoverable as the "lever" for shaping auto behavior — a user who wants different auto choices edits the constitution.

The section is optional. If absent, auto mode falls back to the rest of the constitution + general best-practice judgment.

### Composition with `/focus`

Auto mode interacts with the focus pointer in three small ways:

1. **`set_by:` suffix.** When CURRENT is written by a command running under `--auto`, `set_by:` gets an `(auto)` suffix: `set_by: /ship (auto)`. `/status` renders this so it's visible.
2. **Silent NEXT promotion.** `/focus done` auto-promotes NEXT item #1 silently when invoked under auto mode (no y/n/b prompt). `set_by:` on the promoted CURRENT becomes `/focus done (auto-promoted)`. Logged as a DECISION line.
3. **`.agentic/auto-log.md` joins the gitignore family.** Same `.agentic/` directory as `focus.md`. `/init` and `/bootstrap` ensure both are covered by a single `.agentic/` entry in `.gitignore` (already the case from the focus spec — no extra work).

The non-overlap rule: auto mode never overrides the focus spec's `/ship-all` chain rule. Mid-chain story completion under `/ship-all --auto` still does not fire `/focus done`; only the final story triggers release, and at that point the NEXT promote prompt is auto-answered `y`.

### Files Touched

#### Modified — command bodies that gain `--auto`
- `skills/agentic-engineering/commands/feature.md`
- `skills/agentic-engineering/commands/fix.md`
- `skills/agentic-engineering/commands/ship.md`
- `skills/agentic-engineering/commands/ship-all.md`
- `skills/agentic-engineering/commands/implement.md`
- `skills/agentic-engineering/commands/design.md`

For each: parse `--auto` from `$ARGUMENTS`, propagate to internal phases, tag every checkpoint with `[AUTO: ...]`, emit `DECISION:` / `SKIPPED:` / `HARD-PAUSE:` inline + append to `.agentic/auto-log.md`, print summary footer.

#### Modified — wrappers that document the flag
- `commands/feature.md`
- `commands/fix.md`
- `commands/ship.md`
- `commands/ship-all.md`
- `commands/design.md`
- (no wrapper for `/implement` — internal command, no top-level invocation)

`argument-hint:` extended to include `--auto`. Body unchanged otherwise (wrappers stay thin per monorepo convention).

#### Modified — composition with /focus
- `skills/agentic-engineering/commands/focus.md` — `/focus done` checks if invoked under auto mode (read `.agentic/auto-log.md` for active command, or simpler: parent passes an env-style flag in `$ARGUMENTS`); silently promotes NEXT #1 with `(auto-promoted)` suffix.
- `skills/agentic-engineering/commands/init.md` — scaffold a `## Default Decisions` section in `CONSTITUTION.md` with the four example one-liners (commented as optional).

#### Modified — discoverability
- `skills/agentic-engineering/SKILL.md` — new section after "Caveman Communication Rules" documenting `--auto`, the three tags, the hard-override list, and `.agentic/auto-log.md`.
- `adapters/AGENTS.md.template` — short paragraph inside the agentic-engineering marker block describing `--auto` for non-Claude tools.

No installer changes (flag is runtime behavior).

## Open Questions

None blocking. Resolved during brainstorming:

- Activation model: per-invocation flag only.
- Skip policy: tagged per checkpoint with three explicit tags.
- Visibility: inline + persistent log + end-of-command summary.

## Out of Scope (Future)

- `--auto` on `/init`, `/bootstrap`, `/doc`.
- Replay / undo log.
- `--dry-run` mode.
- Per-tag granularity flags (`--auto=skip-only`).
- Auto-mode metrics dashboard.
