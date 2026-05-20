# Focus — Current Task Pointer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/focus` and `/next` commands with per-worktree state at `.agentic/focus.md`, project-local Claude Code statusline integration, and auto-write hooks across seven long-running commands.

**Architecture:** New per-worktree file `.agentic/focus.md` holds CURRENT (singleton) + NEXT (ordered list). Two new user-facing commands (`/focus`, `/next`). Seven existing commands gain an auto-write preamble that uses a story-id-match heuristic to avoid flicker when one command nests inside another (e.g. `/ship` includes `/implement` + `/review` inline). `/status` renders FOCUS + NEXT at the top of its report. Statusline opt-in via project-local `.claude/settings.local.json` written by `/init` and `/bootstrap`.

**Tech Stack:** Markdown skill files (Claude Code agentic-engineering plugin), one bash statusline script, shell installer. No automated test framework in this repo — verification is by running the installer and inspecting filesystem state.

**Spec:** `docs/superpowers/specs/2026-05-20-focus-current-task-pointer-design.md`

**Working directory:** `/Users/getman/DevWorkspaces/bedcode/skills` (the monorepo root).

---

## File Structure

### New files
- `agentic-engineering/agentic-statusline.sh` — bash script, installed to `~/.claude/agentic-statusline.sh`.
- `agentic-engineering/skills/agentic-engineering/commands/focus.md` — real `/focus` command body.
- `agentic-engineering/skills/agentic-engineering/commands/next.md` — real `/next` command body.
- `agentic-engineering/commands/focus.md` — thin wrapper.
- `agentic-engineering/commands/next.md` — thin wrapper.

### Modified files
- `agentic-engineering/install.sh` — copy script, add `focus`/`next` to `USER_COMMANDS`, print new commands.
- `agentic-engineering/skills/agentic-engineering/SKILL.md` — add `focus`/`next` to command table.
- `agentic-engineering/skills/agentic-engineering/commands/status.md` — render FOCUS + NEXT block at top.
- `agentic-engineering/skills/agentic-engineering/commands/init.md` — write `.gitignore` entry, write `.claude/settings.local.json`.
- `agentic-engineering/skills/agentic-engineering/commands/bootstrap.md` — same gitignore + settings work.
- `agentic-engineering/skills/agentic-engineering/commands/feature.md` — auto-write preamble.
- `agentic-engineering/skills/agentic-engineering/commands/fix.md` — auto-write preamble.
- `agentic-engineering/skills/agentic-engineering/commands/design.md` — auto-write preamble.
- `agentic-engineering/skills/agentic-engineering/commands/review.md` — auto-write preamble.
- `agentic-engineering/skills/agentic-engineering/commands/doc.md` — auto-write preamble.
- `agentic-engineering/skills/agentic-engineering/commands/frontend.md` — auto-write preamble (note-only since always nested under /ship).
- `agentic-engineering/skills/agentic-engineering/commands/implement.md` — auto-write preamble + `/focus done` on success.
- `agentic-engineering/skills/agentic-engineering/commands/ship.md` — auto-write preamble + `/focus done` on success.
- `agentic-engineering/skills/agentic-engineering/commands/ship-all.md` — suppress `/focus done` until final story.
- `agentic-engineering/adapters/AGENTS.md.template` — document `/focus` and `/next` for non-Claude tools.

---

### Task 1: Statusline script

**Files:**
- Create: `agentic-engineering/agentic-statusline.sh`

- [ ] **Step 1: Create the script**

Write `agentic-engineering/agentic-statusline.sh`:

```bash
#!/usr/bin/env bash
# agentic-statusline.sh — Claude Code statusline for agentic-engineering.
# Prints the current focus title from .agentic/focus.md.
# Falls back to git branch. Empty string if neither available.

set -eu

# Resolve project dir: CLAUDE_PROJECT_DIR (set by Claude Code) → PWD.
project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
focus_file="$project_dir/.agentic/focus.md"

if [[ -f "$focus_file" ]]; then
  # Extract `title:` from the CURRENT section only.
  title=$(awk '
    /^# CURRENT/        { in_current=1; next }
    /^# / && in_current { exit }
    in_current && /^title:/ {
      sub(/^title:[[:space:]]*/, "")
      print
      exit
    }
  ' "$focus_file")

  if [[ -n "${title:-}" ]]; then
    printf '🎯 %s' "$title"
    exit 0
  fi
fi

# Fallback: git branch.
if branch=$(git -C "$project_dir" branch --show-current 2>/dev/null) && [[ -n "$branch" ]]; then
  printf '🌿 %s' "$branch"
fi
```

- [ ] **Step 2: Make it executable**

Run:
```bash
chmod +x agentic-engineering/agentic-statusline.sh
```

- [ ] **Step 3: Smoke test it manually**

Run, from the monorepo root:
```bash
# No focus file, no git context — should print empty.
( cd /tmp && bash /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agentic-statusline.sh ); echo "<end>"

# Set up a fake focus file in a temp dir.
mkdir -p /tmp/agentic-statusline-test/.agentic
cat > /tmp/agentic-statusline-test/.agentic/focus.md <<'EOF'
# CURRENT
title: STORY-005 — Add OAuth flow
feature: auth
since: 2026-05-20 14:32
set_by: /implement

# NEXT
1. NOTE-012 — investigate rate limit handling
EOF
CLAUDE_PROJECT_DIR=/tmp/agentic-statusline-test bash agentic-engineering/agentic-statusline.sh; echo "<end>"

# Cleanup.
rm -rf /tmp/agentic-statusline-test
```

Expected output:
```
<end>
🎯 STORY-005 — Add OAuth flow<end>
```
(First line empty because no focus and no git branch at `/tmp`. Second prints the title.)

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agentic-statusline.sh
git commit -m "feat(agentic-engineering): add statusline script for focus pointer"
```

---

### Task 2: Update installer — copy script, add focus/next to USER_COMMANDS

**Files:**
- Modify: `agentic-engineering/install.sh`

- [ ] **Step 1: Add `focus` and `next` to USER_COMMANDS and copy the statusline script**

Edit `agentic-engineering/install.sh`. Find the `USER_COMMANDS` array (lines 52-66) and add `focus` and `next`:

```bash
USER_COMMANDS=(
  bootstrap
  init
  feature
  design
  ship
  ship-all
  plan-all
  fix
  note
  focus
  next
  doc
  doc-all
  status
  analyze
)
```

Find the "Copying commands..." block (around line 51-70). Immediately after the `for cmd ... done` loop, add a new section to copy the statusline script:

```bash
# Install statusline script (shared utility; per-project trigger is written by /init or /bootstrap).
echo "  → Copying statusline script..."
cp "$SCRIPT_DIR/agentic-statusline.sh" ~/.claude/agentic-statusline.sh
chmod +x ~/.claude/agentic-statusline.sh
```

Then find the printed "Available commands" block at the bottom of the file (lines 75-89) and add lines for the two new commands, right after the `/note` line:

```bash
echo "  /focus        set current task (or /focus done|clear)"
echo "  /next         queue a task for after current is done"
```

- [ ] **Step 2: Run the installer**

Run, from the monorepo root:
```bash
bash agentic-engineering/install.sh
```

Expected output includes:
```
  → Copying statusline script...
…
  /focus        set current task (or /focus done|clear)
  /next         queue a task for after current is done
```

- [ ] **Step 3: Verify the statusline script landed**

Run:
```bash
ls -l ~/.claude/agentic-statusline.sh
```

Expected: file exists and is executable (`-rwxr-xr-x`). The wrappers `/focus` and `/next` will fail to copy at this point because they don't exist yet — that's fine, fix in Tasks 4 and 7.

- [ ] **Step 4: Commit**

```bash
git add agentic-engineering/install.sh
git commit -m "feat(agentic-engineering): wire focus/next commands and statusline into installer"
```

---

### Task 3: `/focus` real command body

**Files:**
- Create: `agentic-engineering/skills/agentic-engineering/commands/focus.md`

- [ ] **Step 1: Write the real command body**

Create `agentic-engineering/skills/agentic-engineering/commands/focus.md`:

````markdown
## `/focus` — Current Task Pointer

**Agents:** PROD

Set, clear, or advance the current task pointer for this worktree. State lives at `.agentic/focus.md` (per-worktree, gitignored).

Input received: $ARGUMENTS

---

### Phase 1 — Parse intent

Inspect `$ARGUMENTS`:

- Empty → show current focus + NEXT (read-only). Same render as `/status` FOCUS block. Then exit.
- `done` → go to Phase 3 (clear CURRENT + promote NEXT).
- `clear` → go to Phase 4 (clear both).
- Anything else → go to Phase 2 (set CURRENT manually).

---

### Phase 2 — Set CURRENT manually

Ensure `.agentic/` exists and is gitignored. Idempotent:

```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

Overwrite the CURRENT section of `.agentic/focus.md` (preserve NEXT section if present). Fields:

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

Read `.agentic/focus.md`. Two sub-cases:

**NEXT empty (or file absent):** Clear CURRENT (delete the section, keep file with empty CURRENT or remove file entirely if NEXT also empty). Print:
```
━━━ FOCUS DONE ━━━
🎯 (none)
NEXT queue empty.
```
Exit.

**NEXT non-empty:** Read item #1 of NEXT. Ask user:

```
━━━ FOCUS DONE ━━━
🎯 (cleared)

Next queued: [item #1 text]

Pick it up?
  y  → promote to CURRENT, shift NEXT up by one
  n  → just clear CURRENT, leave NEXT alone
  b  → move that item to BACKLOG (via /note), shift NEXT up by one

Reply y / n / b:
```

Apply choice:
- `y` → rewrite CURRENT with `title: <item #1 text>`, `since: now`, `set_by: /focus done (promoted)`. Remove item #1 from NEXT; renumber remaining items.
- `n` → clear CURRENT only.
- `b` → invoke the `/note` workflow with the item text. Remove from NEXT; renumber.

Confirm result.

---

### Phase 4 — `/focus clear`

Wipe both CURRENT and NEXT (delete file or leave headers with no content). Print:
```
━━━ FOCUS CLEARED ━━━
CURRENT + NEXT wiped.
```

---

### Auto-write protocol (for other commands)

When another command (`/feature`, `/implement`, `/ship`, `/fix`, `/design`, `/review`, `/doc`, `/frontend`) starts, it runs this protocol before doing its real work:

1. Ensure `.agentic/` exists + gitignored (same idempotent block as Phase 2).
2. Read existing CURRENT.
3. **Story-id match heuristic:** if the new task references the same STORY-ID (or same feature, when no story) as the existing CURRENT, **only** update `note:` and `set_by:` — leave `title:` and `since:` alone. (Prevents flicker when `/ship` includes `/implement` and `/review` inline.)
4. Otherwise overwrite CURRENT with the new title/feature/set_by, fresh `since:`.

`/implement` and `/ship` additionally call Phase 3 (`/focus done` flow) on success — except `/ship` suppresses this when it is mid-chain inside `/ship-all` (the chain's caller decides when to release focus).
````

- [ ] **Step 2: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/focus.md
git commit -m "feat(agentic-engineering): add /focus command body"
```

---

### Task 4: `/focus` thin wrapper

**Files:**
- Create: `agentic-engineering/commands/focus.md`

- [ ] **Step 1: Write the wrapper**

Create `agentic-engineering/commands/focus.md`:

```markdown
---
description: Set/clear/advance current task pointer for this worktree
argument-hint: <task> | done | clear
---
Read commands/focus.md from the agentic-engineering skill, then follow those instructions for: $ARGUMENTS
```

- [ ] **Step 2: Re-run installer + verify**

Run:
```bash
bash agentic-engineering/install.sh
ls ~/.claude/commands/focus.md ~/.claude/skills/agentic-engineering/commands/focus.md
```

Expected: both files exist.

- [ ] **Step 3: Commit**

```bash
git add agentic-engineering/commands/focus.md
git commit -m "feat(agentic-engineering): add /focus wrapper"
```

---

### Task 5: Manual verification of `/focus`

**Files:** none — verification only.

- [ ] **Step 1: Restart Claude Code to pick up the new command**

Manual step: restart Claude Code. The new `/focus` slash command should appear in the palette.

- [ ] **Step 2: Exercise /focus in a scratch directory**

Run in a fresh terminal:
```bash
mkdir -p /tmp/focus-test && cd /tmp/focus-test && git init
# Inside Claude Code, with cwd=/tmp/focus-test:
#   /focus working on signup form
#   cat .agentic/focus.md       (verify CURRENT.title = "working on signup form")
#   cat .gitignore              (verify .agentic/ is present)
#   /focus done                 (no NEXT yet → clears CURRENT, prints "(none)")
#   /focus clear                (idempotent — should print cleared msg)
```

Expected: `.agentic/focus.md` written, `.gitignore` contains `.agentic/`, both `done` and `clear` behave as spec.

- [ ] **Step 3: No commit** (this task is verification only)

---

### Task 6: `/next` real command body

**Files:**
- Create: `agentic-engineering/skills/agentic-engineering/commands/next.md`

- [ ] **Step 1: Write the real command body**

Create `agentic-engineering/skills/agentic-engineering/commands/next.md`:

````markdown
## `/next` — Queue Task for After Current

**Agents:** PROD

Append a task to the NEXT queue in `.agentic/focus.md`. NEXT is an ordered list; item #1 is offered for promotion when `/focus done` (or `/ship` / `/implement` success) clears CURRENT.

Input received: $ARGUMENTS

---

### Phase 1 — Parse intent

- Empty → show current NEXT list (read-only). Exit.
- `drop <N>` (N = 1-based index) → go to Phase 3.
- Anything else → go to Phase 2 (append to NEXT).

---

### Phase 2 — Append to NEXT

Ensure `.agentic/` exists + gitignored:

```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

Read existing `.agentic/focus.md`. Locate the `# NEXT` section (create if absent). Append a new numbered item with `$ARGUMENTS` as its text. Renumber if needed (always 1..N sequential).

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

Parse `<N>` from `$ARGUMENTS` (must be a positive integer; reject otherwise with a clear error).

Read NEXT, remove item N, renumber remaining items sequentially. Write back.

Confirm:
```
━━━ DROPPED ━━━
Removed NEXT #N: [original text]

Remaining NEXT queue:
1. ...
2. ...
```

If NEXT is empty after the drop, print `(queue empty)` instead of a list.
````

- [ ] **Step 2: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/next.md
git commit -m "feat(agentic-engineering): add /next command body"
```

---

### Task 7: `/next` thin wrapper

**Files:**
- Create: `agentic-engineering/commands/next.md`

- [ ] **Step 1: Write the wrapper**

Create `agentic-engineering/commands/next.md`:

```markdown
---
description: Queue a task in NEXT to be picked up after current finishes
argument-hint: <task> | drop <N>
---
Read commands/next.md from the agentic-engineering skill, then follow those instructions for: $ARGUMENTS
```

- [ ] **Step 2: Re-run installer + verify**

```bash
bash agentic-engineering/install.sh
ls ~/.claude/commands/next.md ~/.claude/skills/agentic-engineering/commands/next.md
```

Expected: both files exist.

- [ ] **Step 3: Commit**

```bash
git add agentic-engineering/commands/next.md
git commit -m "feat(agentic-engineering): add /next wrapper"
```

---

### Task 8: Manual verification of `/next` and auto-promote flow

**Files:** none — verification only.

- [ ] **Step 1: Restart Claude Code**

- [ ] **Step 2: Exercise the full queue flow**

In a fresh `/tmp/focus-test-2` git-init'd dir, via Claude Code:
```
/focus working on auth flow
/next investigate rate limit handling
/next refactor TokenStore
/next                          (no args → show queue)
/next drop 1                   (drops "investigate rate limit handling")
/focus done                    (should offer "refactor TokenStore" as next — answer 'y')
```

After the `y`, verify `.agentic/focus.md` shows CURRENT.title = "refactor TokenStore", set_by = "/focus done (promoted)", and NEXT is empty.

Also test the `b` branch: queue an item, `/focus done`, answer `b` → confirm a BACKLOG.md entry was created via `/note`'s flow.

- [ ] **Step 3: No commit** (verification only)

---

### Task 9: Extend `/status` to render FOCUS + NEXT

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/status.md`

- [ ] **Step 1: Add the FOCUS block to the report template**

Edit `agentic-engineering/skills/agentic-engineering/commands/status.md`. After the `**Agent:** PROD` line and before "Read `./docs/INDEX.md`...", insert:

```markdown
### Step 1 — Read focus state

Read `.agentic/focus.md` if it exists. Parse:
- CURRENT.title, CURRENT.feature, CURRENT.since, CURRENT.set_by, CURRENT.note
- NEXT items (numbered list)

If `since:` is ≥ 7 days old → mark FOCUS stale (⚠️).

### Step 2 — Read project state

(existing instructions follow)
```

Then update the report template at the top. Replace the existing report block with:

```
━━━ PROJECT STATUS ━━━

FOCUS 🎯 [CURRENT.title]  ([feature], since [HH:MM], via [set_by])[⚠️ stale (Nd old) if >= 7d]
NEXT   1. [item 1]
       2. [item 2]
       …

Features: X total
…
```

Rules for rendering:
- CURRENT empty → `FOCUS 🎯 (none — run /focus <text> to set)`.
- NEXT empty → omit the entire NEXT block.
- Stale → append `⚠️ stale (Nd old) — still working on this?`

- [ ] **Step 2: Re-run installer + manually verify**

```bash
bash agentic-engineering/install.sh
```

Restart Claude Code. In a project with `.agentic/focus.md` populated, run `/status` and confirm the FOCUS block renders first.

- [ ] **Step 3: Commit**

```bash
git add agentic-engineering/skills/agentic-engineering/commands/status.md
git commit -m "feat(agentic-engineering): render FOCUS + NEXT in /status output"
```

---

### Task 10: `/init` updates — write `.gitignore` + statusline config

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/init.md`

- [ ] **Step 1: Add gitignore + settings.local.json writes to the ARCH scaffold step**

Edit `agentic-engineering/skills/agentic-engineering/commands/init.md`. Find the ARCH scaffolding section (right after the folder structure block). Add a new step before any "seeds changelog files" step:

```markdown
**ARCH** also writes per-developer ephemera (worktree-local, gitignored):

1. Ensure `.gitignore` exists and contains `.agentic/`:

```bash
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Write or update `.claude/settings.local.json` to enable the focus statusline:

```bash
mkdir -p .claude
```

If `.claude/settings.local.json` does not exist, create it with:
```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/agentic-statusline.sh"
  }
}
```

If it exists but lacks a `statusLine` key, merge the `statusLine` block into the existing JSON (preserve other keys). Do NOT overwrite an existing `statusLine` — leave the user's choice alone.

3. Note in `./docs/INDEX.md` (or a project-conventions section): `.agentic/focus.md` is the per-worktree current-task pointer; managed by `/focus` and `/next`.
```

- [ ] **Step 2: Re-run installer + manually verify**

```bash
bash agentic-engineering/install.sh
```

In a fresh `/tmp/init-test` dir, run `/init` via Claude Code. After completion, verify:
- `.gitignore` exists and contains `.agentic/`
- `.claude/settings.local.json` exists and contains the `statusLine` block

- [ ] **Step 3: Commit**

```bash
git add agentic-engineering/skills/agentic-engineering/commands/init.md
git commit -m "feat(agentic-engineering): /init writes .gitignore + statusline settings"
```

---

### Task 11: `/bootstrap` updates — same gitignore + statusline

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/bootstrap.md`

- [ ] **Step 1: Add the same gitignore + settings.local.json work**

Edit `agentic-engineering/skills/agentic-engineering/commands/bootstrap.md`. At the end of the scaffolding section (after the project structure has been created but before any final confirmation step), insert the same block written in Task 10 Step 1 (everything under "**ARCH** also writes per-developer ephemera"). Wording can be adjusted to fit bootstrap's voice, but the three actions must match exactly: gitignore append, settings.local.json merge, INDEX.md note.

- [ ] **Step 2: Re-run installer + manually verify**

```bash
bash agentic-engineering/install.sh
```

In a fresh `/tmp/bootstrap-test` dir, run `/bootstrap` via Claude Code. After completion verify the same three artifacts as Task 10.

- [ ] **Step 3: Commit**

```bash
git add agentic-engineering/skills/agentic-engineering/commands/bootstrap.md
git commit -m "feat(agentic-engineering): /bootstrap writes .gitignore + statusline settings"
```

---

### Task 12: Auto-write preamble for non-terminal commands (feature, fix, design, review, doc, frontend)

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/feature.md`
- Modify: `agentic-engineering/skills/agentic-engineering/commands/fix.md`
- Modify: `agentic-engineering/skills/agentic-engineering/commands/design.md`
- Modify: `agentic-engineering/skills/agentic-engineering/commands/review.md`
- Modify: `agentic-engineering/skills/agentic-engineering/commands/doc.md`
- Modify: `agentic-engineering/skills/agentic-engineering/commands/frontend.md`

These commands set CURRENT on entry but do **not** call `/focus done` on success.

- [ ] **Step 1: Add the auto-write preamble to each file**

For each of the six files, insert at the very top (before the first `### Step` or `### Phase` heading) the following block, with the per-command `<TITLE>` and `<SET_BY>` values filled in:

```markdown
### Step 0 — Auto-write focus

Before doing anything else, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - If existing CURRENT.title contains the same STORY-ID / feature reference as the new title → **only** update `note:` (to the per-command value below) and `set_by:`. Leave `title:` and `since:` untouched.
   - Otherwise → overwrite CURRENT with the new `title:`, `feature:` (if known), fresh `since: [now]`, `set_by: <SET_BY>`, optional `note:`.

3. Continue with the command's real work below.
```

Per-command `<TITLE>` / `<SET_BY>` / `<NOTE>`:

| File | title | set_by | note (when nested) |
|---|---|---|---|
| `feature.md` | `researching feature: <name>` | `/feature` | `phase: researching feature <name>` |
| `fix.md` | `fixing: <bug summary>` | `/fix` | `phase: fixing <bug summary>` |
| `design.md` | `designing UI for <feature>` | `/design` | `phase: designing UI` |
| `review.md` | `reviewing <STORY-ID or branch>` | `/review` | `phase: reviewing` |
| `doc.md` | `documenting <feature>` | `/doc` | `phase: documenting` |
| `frontend.md` | (always nested under /ship — `title:` write is suppressed by heuristic) | `/frontend` | `phase: frontend pass` |

For `frontend.md` specifically: the preamble still runs, but the heuristic will always find a matching CURRENT (set by `/ship`), so only `note:` and `set_by:` are updated. This is correct behavior — frontend is never invoked standalone.

- [ ] **Step 2: Re-run installer**

```bash
bash agentic-engineering/install.sh
```

- [ ] **Step 3: Manual verification**

In a test project with `.agentic/focus.md` empty, run `/feature TestFeature` via Claude Code. After the command starts, `cat .agentic/focus.md` should show:
```
# CURRENT
title: researching feature: TestFeature
since: <today's date>
set_by: /feature
```

- [ ] **Step 4: Commit**

```bash
git add agentic-engineering/skills/agentic-engineering/commands/{feature,fix,design,review,doc,frontend}.md
git commit -m "feat(agentic-engineering): auto-write focus on /feature /fix /design /review /doc /frontend"
```

---

### Task 13: Auto-write preamble + `/focus done` for terminal commands (implement, ship)

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/implement.md`
- Modify: `agentic-engineering/skills/agentic-engineering/commands/ship.md`
- Modify: `agentic-engineering/skills/agentic-engineering/commands/ship-all.md`

These commands set CURRENT on entry **and** call `/focus done` on success.

- [ ] **Step 1: Add the preamble to implement.md and ship.md**

Same preamble block as Task 12, but with these values:

| File | title | set_by | note (when nested) |
|---|---|---|---|
| `implement.md` | `<STORY-ID> — <story title>` | `/implement` | `phase: implementing` |
| `ship.md` | `<STORY-ID> — <story title>` (with `feature: <feature-name>`) | `/ship` | `phase: ship chain` |

The heuristic ensures that when `/ship` triggers `/implement` and `/review` internally, those inner steps only update `note:` rather than overwriting `title:`.

- [ ] **Step 2: Add `/focus done` to the success path of implement.md**

At the end of `implement.md` (after the GIT commit step, after the "story complete" confirmation), add:

```markdown
### Step N — Release focus

If this `/implement` run is **not** part of a parent `/ship` or `/ship-all` chain (detect by inspecting CURRENT.set_by — if it equals `/ship`, the parent owns the release), then run the `/focus done` workflow (see `commands/focus.md` Phase 3). This will offer to promote the top NEXT item.

If invoked from `/ship` → skip; the parent ship.md handles release.
```

- [ ] **Step 3: Add `/focus done` to the success path of ship.md**

At the end of `ship.md` (after all phases complete, after the final commit), add:

```markdown
### Step N — Release focus

If this `/ship` run is **not** part of `/ship-all` (detect via CURRENT.set_by — if it equals `/ship-all`, the chain owns release), run the `/focus done` workflow (see `commands/focus.md` Phase 3) to offer NEXT promotion.

If invoked from `/ship-all` → skip; the chain releases focus only at the end of the final story.
```

- [ ] **Step 4: Update ship-all.md to set/release focus across the chain**

Edit `agentic-engineering/skills/agentic-engineering/commands/ship-all.md`. Add:

1. At the very start of the chain (Step 0): overwrite CURRENT with `title: ship-all: <feature> (N stories)`, `set_by: /ship-all`, `note: starting`.
2. Between stories: update `note:` to `phase: shipping STORY-X (k of N)`. Do **not** overwrite `title:` per story (the title represents the whole chain).
3. After the final story completes successfully: run the `/focus done` workflow once. Mid-chain story completions do NOT call `/focus done`.

- [ ] **Step 5: Re-run installer**

```bash
bash agentic-engineering/install.sh
```

- [ ] **Step 6: Manual verification**

End-to-end: in a project with at least one ready story, run `/ship` via Claude Code. Confirm:
- `.agentic/focus.md` CURRENT shows the story being shipped within a couple of seconds.
- After success, `/focus done` triggers (with NEXT prompt if any items queued, or "queue empty" message).

For `/ship-all`, queue up two stories and run. Confirm CURRENT.title stays "ship-all: …" across both stories (only `note:` changes), and `/focus done` only fires after the final story.

- [ ] **Step 7: Commit**

```bash
git add agentic-engineering/skills/agentic-engineering/commands/{implement,ship,ship-all}.md
git commit -m "feat(agentic-engineering): auto-write + auto-release focus on /implement /ship /ship-all"
```

---

### Task 14: Update SKILL.md command table

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/SKILL.md`

- [ ] **Step 1: Add `/focus` and `/next` to the command table**

Edit `agentic-engineering/skills/agentic-engineering/SKILL.md`. Find the "Command → File Map" table (around lines 26-44). Add two rows after the `/note` row (which is around line 41):

```markdown
| `/focus [task\|done\|clear]` | `commands/focus.md` | Set, clear, or advance the current task pointer for this worktree |
| `/next [task\|drop N]` | `commands/next.md` | Queue a task to be picked up after current finishes |
```

- [ ] **Step 2: Re-run installer + verify**

```bash
bash agentic-engineering/install.sh
grep -A1 'focus' ~/.claude/skills/agentic-engineering/SKILL.md | head
```

Expected: the `/focus` row appears in the installed copy.

- [ ] **Step 3: Commit**

```bash
git add agentic-engineering/skills/agentic-engineering/SKILL.md
git commit -m "feat(agentic-engineering): list /focus and /next in SKILL.md command table"
```

---

### Task 15: Document `/focus` and `/next` in adapters/AGENTS.md.template

**Files:**
- Modify: `agentic-engineering/adapters/AGENTS.md.template`

- [ ] **Step 1: Add the two commands inside the agentic-engineering marker block**

Open `agentic-engineering/adapters/AGENTS.md.template`. Locate the section between `<!-- agentic-engineering:start v1 -->` and `<!-- agentic-engineering:end -->`. Find where other commands are documented and append:

```markdown
### Focus pointer (Claude Code only feature uses native statusline; other tools just use the files)

- `.agentic/focus.md` is a per-worktree pointer. Section `# CURRENT` holds the active task; section `# NEXT` is an ordered list of queued items. The file is gitignored.
- Command `/focus <task>` overwrites CURRENT. `/focus done` clears CURRENT and (if NEXT non-empty) offers to promote item #1 to CURRENT. `/focus clear` wipes both.
- Command `/next <task>` appends to NEXT. `/next drop <N>` removes item N.
- Long-running commands (`/feature`, `/implement`, `/ship`, `/fix`, `/design`, `/review`, `/doc`) auto-write CURRENT at their start. `/implement` and `/ship` also call `/focus done` on success.
- Claude Code users: statusline integration is set up automatically by `/init` and `/bootstrap`. Other tools can render the focus title themselves by reading `.agentic/focus.md`.
```

Preserve the marker comments verbatim — the installer's idempotency depends on them.

- [ ] **Step 2: Smoke-test the multi-tool installer doesn't break**

Run, from monorepo root:
```bash
mkdir -p /tmp/agents-md-test && cd /tmp/agents-md-test
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
grep -c '^<!-- agentic-engineering:' .cursor/rules/*.md AGENTS.md 2>/dev/null || true
ls AGENTS.md 2>/dev/null
grep -c 'agentic-engineering' AGENTS.md
```

Expected: the marker block appears exactly once in `AGENTS.md` with the new Focus section inside it. Re-running should not duplicate.

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/adapters/AGENTS.md.template
git commit -m "docs(agentic-engineering): document /focus and /next in portable AGENTS.md adapter"
```

---

### Task 16: End-to-end manual verification

**Files:** none.

- [ ] **Step 1: Fresh-project end-to-end**

In a brand-new scratch dir, exercise the full happy path through Claude Code:

```
cd /tmp && rm -rf focus-e2e && mkdir focus-e2e && cd focus-e2e && git init
# Restart Claude Code with cwd=/tmp/focus-e2e
# Run:
#   /init                          (scaffolds docs/, writes .gitignore, writes .claude/settings.local.json)
#   /focus exploring auth options  (manual focus)
#   /next investigate OAuth        (queue item)
#   /next investigate magic links  (queue item)
#   /status                        (verify FOCUS + NEXT render at top)
#   /focus done                    (prompts to promote "investigate OAuth" — answer y)
#   /status                        (verify CURRENT = "investigate OAuth", NEXT has 1 item)
#   /focus clear                   (wipes both)
#   /focus done                    (NEXT empty → "(none)")
```

- [ ] **Step 2: Statusline visibility check**

After Step 1 finishes, check the Claude Code statusline visually shows `🎯 <title>` while CURRENT is set, and falls back to `🌿 <branch>` after `/focus clear`.

- [ ] **Step 3: Parallel-worktree isolation check**

```bash
cd /tmp/focus-e2e && git add -A && git commit -m "initial"
git worktree add /tmp/focus-e2e-wt-b -b branch-b
```

Open a second Claude Code session in `/tmp/focus-e2e-wt-b`. Run `/focus working on branch B`. Confirm worktree A's `.agentic/focus.md` is untouched and worktree B has its own.

- [ ] **Step 4: Auto-write + nested ship check**

Set up a project with at least one story ready to ship. Run `/ship`. Observe `.agentic/focus.md`:
- Before /ship: CURRENT is whatever it was.
- After /ship preamble: CURRENT.title = "STORY-XXX — <title>", set_by = /ship.
- During internal /implement and /review phases: `note:` changes ("implementing", "reviewing"), `title:` stays the same.
- After /ship success: `/focus done` flow fires.

- [ ] **Step 5: No commit** (verification only)

---

## Self-Review Checklist

After implementing, run this once before declaring done.

1. **Spec coverage:** Every requirement in the spec's "Design" section maps to one or more tasks above. Re-read the spec, point to a task per requirement.
2. **Placeholder scan:** Grep the plan and the produced files for `TBD`, `TODO`, `XXX`, `FIXME` — none should remain in committed content.
3. **Type / name consistency:** The field names `title:`, `feature:`, `since:`, `set_by:`, `note:` and the section headers `# CURRENT` / `# NEXT` are used identically across statusline.sh, focus.md, next.md, status.md, and the auto-write preambles in Tasks 12 and 13.
4. **`.gitignore` writes are idempotent everywhere:** the same `grep -qxF` guard is used in `/init`, `/bootstrap`, `/focus`, and `/next`.
5. **Story-id-match heuristic:** Tasks 12 and 13 both use the same wording for the heuristic. `/ship` calling `/implement` and `/review` inline never causes a title flicker.
