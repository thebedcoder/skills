# Focus — Current Task Pointer + Short-Term Queue

**Date:** 2026-05-20
**Plugin:** `agentic-engineering/`
**Status:** Design approved, ready for implementation plan.

## Problem

Working in parallel (multiple worktrees, multiple Claude Code sessions on the same machine, context-switching between features) loses focus. A user returning to a session — or glancing at one of N statuslines — can't immediately tell what's being worked on. Mid-flow ideas ("after this is done I want to do X") get forgotten because there's no short-term queue separate from the long-term `BACKLOG.md`.

## Goals

1. **Visible focus.** A 1-line statusline answer to "what am I doing in this worktree?" without typing anything.
2. **Per-worktree isolation.** Worktree A and worktree B don't stomp each other's focus.
3. **Short-term queue.** Capture "do this next, right after current" without polluting the long-term `BACKLOG.md`.
4. **Auto + manual.** Long-running commands stamp focus automatically. User can override with `/focus <text>`.
5. **Opt-in per project.** A user's other (non-agentic-engineering) projects should not get a statusline command they didn't ask for.

## Non-Goals

- Multi-tasking across multiple CURRENT items (singular by design).
- Replacing `BACKLOG.md` (which `/note` still owns for long-term items).
- Cross-worktree sync (intentional; parallel work is the whole point).
- History/audit log of past focus changes (out of scope for v1; can be added later if needed).

## Design

### Storage

Single per-worktree file: `.agentic/focus.md`.

**`.gitignore` lifecycle:**
- `/init` (and `/bootstrap`) appends `.agentic/` to the project `.gitignore` when scaffolding agentic-engineering.
- If `/focus` or `/next` runs before `/init` (uncommon but possible), the first write checks `.gitignore` and appends `.agentic/` if missing. Idempotent grep-then-append, no duplicates.
- If the project has no `.gitignore` at all, one is created with `.agentic/` as its sole entry.

Format:

```markdown
# CURRENT
title: STORY-005 — Add OAuth flow
feature: auth
since: 2026-05-20 14:32
set_by: /implement
note: implementing token refresh path

# NEXT
1. NOTE-012 — investigate rate limit handling
2. Refactor TokenStore for multi-provider
3. Run /review on STORY-005 after manual QA
```

`title` is the only required field in CURRENT. NEXT is an ordered numbered list (plain markdown). Empty CURRENT is represented by the section being absent or having only a blank `title:`.

### Commands

**Two new user-facing commands:** `/focus`, `/next`.

| Invocation | Behavior |
|---|---|
| `/focus <text>` | Set CURRENT manually. Overwrites prior CURRENT. `set_by: manual`. `since:` = now. |
| `/focus done` | Clear CURRENT. If NEXT non-empty, prompt: *"Next is `<item>` — start it? (y / n / move to backlog)"*. On `y`, top-of-NEXT becomes CURRENT (rest of NEXT shifts up). On `move to backlog`, runs `/note` on that item then removes from NEXT. On `n`, just clears CURRENT and leaves NEXT untouched. |
| `/focus clear` | Clear CURRENT and NEXT, no prompt. Escape hatch. |
| `/next <text>` | Append to NEXT. |
| `/next drop <n>` | Remove item `n` (1-indexed) from NEXT. |

No `/focus show` — `/status` already displays it (see below). No `/next reorder` in v1 — user edits `.agentic/focus.md` directly if needed.

### Auto-write Integration

These commands write CURRENT at their start (overwriting prior CURRENT, but only if `title` differs — re-running the same story doesn't reset `since:`):

- `/feature <name>` → `title: researching feature: <name>`, `set_by: /feature`
- `/implement` → `title: <STORY-ID> — <story title>`, `feature: <feature>`, `set_by: /implement`
- `/ship` → same as `/implement`, with `note: ship chain` appended
- `/fix` → `title: fixing: <bug summary>`, `set_by: /fix`
- `/design` → `title: designing UI for <feature>`, `set_by: /design`
- `/review` → `title: reviewing <STORY-ID|branch>`, `set_by: /review`
- `/doc` → `title: documenting <feature>`, `set_by: /doc`

These do **not** write CURRENT (read-only, capture-only, batch, or pre-project):

- `/status`, `/analyze`, `/note`, `/doc-all`, `/plan-all`, `/bootstrap` (project doesn't exist yet), `/init` (writes the scaffold itself; first focus is set by the next real command).

**Nested invocations.** `/ship` internally calls `/implement` → `/review` → `/frontend` → `/review`. If each sub-call wrote CURRENT, focus would flicker. Rule: when a command is invoked by another agentic-engineering command (not directly by the user), it skips the `title:`/`set_by:` overwrite and instead updates `note:` with the current sub-phase (e.g., `note: implementing` → `note: reviewing` → `note: frontend pass` → `note: re-reviewing`). The orchestrating command (`/ship` here) is responsible for stamping `title:` at the start and calling `/focus done` at the end. Implementation detail: each auto-writing command's preamble checks an `AGENTIC_PARENT_CMD` env var (or equivalent state in the skill router) to detect nesting.

On success, `/implement` (when invoked directly) and `/ship` automatically run `/focus done` — which triggers the NEXT promote prompt. `/review`, `/doc`, `/feature`, `/fix`, `/design` do **not** auto-`/focus done` on success — those are inputs to a larger flow; the user decides when "this task" is actually done.

**Exception for `/ship-all`:** A mid-chain story completion advances CURRENT directly (the chain logic sets CURRENT to the next story). It does **not** consult NEXT. Only the final story of the chain fires `/focus done` → which then triggers the NEXT promote prompt.

### Statusline Integration

**Script (shared utility, user-global):** `~/.claude/agentic-statusline.sh`. Installed once by the per-plugin installer. ~15 lines of bash. Reads `$CLAUDE_PROJECT_DIR/.agentic/focus.md` and prints the first-line `title:` value. Falls back to `git branch --show-current` if no focus file. If neither, prints empty string.

**Trigger (per-project, per-developer):** `<project>/.claude/settings.local.json` (intentionally `.local.json`, not `.json` — the local variant is gitignored by Claude Code's defaults, so other developers don't inherit it unless they opt in themselves).

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/agentic-statusline.sh"
  }
}
```

**Setup:** Written automatically by `/init` when scaffolding agentic-engineering docs for a new project. Idempotent: if `statusLine` is already set in `.local.json`, `/init` leaves it alone. README documents the snippet for users who want to add it to existing projects without re-running `/init`.

Projects that have never run `/init` get nothing — no statusline trigger means no statusline.

### `/status` Extension

`/status` reads `.agentic/focus.md` and prepends it to the existing report:

```
━━━ PROJECT STATUS ━━━

FOCUS 🎯 STORY-005 — Add OAuth flow  (auth, since 14:32, via /implement)
NEXT 1. NOTE-012 — investigate rate limit handling
     2. Refactor TokenStore for multi-provider
     3. Run /review on STORY-005 after manual QA

Features: 4 total
…
```

If CURRENT is empty: `FOCUS 🎯 (none — run /focus <text> to set)`. NEXT section omitted entirely if empty.

### Lifecycle Edge Cases

- **Stale focus:** CURRENT with `since:` ≥ 7 days old → `/status` flags it: `FOCUS 🎯 ... ⚠️ stale (7d old) — still working on this?`.
- **Worktree spawn:** `.agentic/` is per-worktree by virtue of being gitignored; new worktrees start with no focus state. No copy or sync.
- **`/focus done` with empty NEXT:** Just clears CURRENT, no prompt.
- **`/focus <text>` with non-empty CURRENT:** Overwrite silently; user is explicitly setting a new focus.
- **Repeat auto-write of same title:** If the about-to-be-written `title` matches the existing CURRENT `title`, only `note:` and `set_by:` are updated; `since:` is preserved.
- **Caveman rules:** The focus file is internal agent-readable state. Field values follow caveman style (terse, fragments OK). The `/status` rendering for the user uses normal prose.

## Files

### New

- `agentic-engineering/skills/agentic-engineering/commands/focus.md` — real command body (`/focus`, `/focus done`, `/focus clear`).
- `agentic-engineering/skills/agentic-engineering/commands/next.md` — real command body (`/next`, `/next drop <n>`).
- `agentic-engineering/commands/focus.md` — thin wrapper (4-line shim per monorepo convention).
- `agentic-engineering/commands/next.md` — thin wrapper.
- `agentic-engineering/agentic-statusline.sh` — the bash script, installed to `~/.claude/agentic-statusline.sh`.

### Modified

- `agentic-engineering/skills/agentic-engineering/SKILL.md` — add `focus` and `next` to the command table.
- `agentic-engineering/skills/agentic-engineering/commands/{feature,implement,ship,fix,design,review,doc,frontend}.md` — add an "auto-write focus" preamble step (with nesting check: when invoked by a parent command, update `note:` only, not `title:`).
- `agentic-engineering/skills/agentic-engineering/commands/{implement,ship}.md` — add `/focus done` call on success (suppressed inside `/ship-all` until final story).
- `agentic-engineering/skills/agentic-engineering/commands/status.md` — read `.agentic/focus.md`, render FOCUS + NEXT block above feature list, stale check.
- `agentic-engineering/skills/agentic-engineering/commands/init.md` — write `.claude/settings.local.json` with statusline config; ensure `.agentic/` is in `.gitignore`.
- `agentic-engineering/skills/agentic-engineering/commands/bootstrap.md` — same `.gitignore` + `.claude/settings.local.json` work that `/init` does (since `/bootstrap` is the new-project entry point).
- `agentic-engineering/install.sh` — add `focus`, `next` to `USER_COMMANDS`; copy `agentic-statusline.sh` to `~/.claude/`.
- `agentic-engineering/adapters/AGENTS.md.template` — document `/focus` and `/next` for non-Claude tools. Statusline section noted as Claude-Code-only.

## Open Questions

None blocking. Resolved during brainstorming:

- Trigger model: auto + manual.
- Storage scope: untracked per-worktree.
- Queue shape: ordered list + auto-promote prompt.
- Auto-write list includes `/review` and `/doc`.
- Statusline: project-local via `.claude/settings.local.json`, written by `/init`.
- `/ship-all`: only final story triggers `/focus done`.

## Composition with Auto Mode (addendum)

See `2026-05-20-auto-mode-design.md` for the full auto-mode spec. Three small interaction points apply to this design:

1. **`set_by:` suffix.** When CURRENT is written by a command running under `--auto`, `set_by:` gets an `(auto)` suffix — e.g. `set_by: /ship (auto)`. `/status` renders the suffix as-is.
2. **Silent NEXT promotion.** Under `--auto`, `/focus done` auto-promotes NEXT item #1 with no y/n/b prompt. The promoted CURRENT's `set_by:` becomes `/focus done (auto-promoted)`. The skipped prompt is logged in `.agentic/auto-log.md`.
3. **`.agentic/auto-log.md`** lives in the same `.agentic/` directory and is already covered by the single `.agentic/` `.gitignore` entry written by `/init` / `/bootstrap` / `/focus`. No additional gitignore work.

The `/ship-all` chain rule is preserved: mid-chain story completion does not fire `/focus done` even under `--auto`. Only the final story's release triggers NEXT promotion (then auto-promoted under auto, prompted under interactive).

## Out of Scope (Future)

- Focus history / audit log.
- `/next reorder` command.
- Auto-resolve `STORY-XXX` references in `/next <text>` (e.g., scrape title from `STORIES.md`).
- Cross-worktree focus dashboard.
- Stale-focus auto-clear (just flagging is enough for v1).
