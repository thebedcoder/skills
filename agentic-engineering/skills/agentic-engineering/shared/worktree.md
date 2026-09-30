# Worktree lifecycle for `[P]` stories

Loaded on demand only. `/ship-all` reads §W1 when user opts into one worktree per story, §W2 when `.worktrees/` holds story worktrees. `/ship` reads §W3 only when CURRENT carries `worktree_of:`. Every other run never opens this file.

**Helper:** `${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh` — mechanics only (create, seed focus, list, merge, remove). Every decision and every gate below stays here, in the parent. Run it from the **main** worktree root; it refuses from a linked one.

**Not `EnterWorktree`.** That tool moves *this* session into a worktree. These worktrees are for *other* sessions, one per story; this session stays in the main tree to merge them back.

---

## §W1 — Create (opt-in, from `/ship-all`)

Group = `[P]` stories of the lowest open priority level, ≥2, none depending on an unchecked story. `[P]` never crosses a level.

1. Per story: `worktree.sh create STORY-XXX feat/<feature>-story-xxx` — base = current branch. Output `IGNORED:` → `.worktrees/` was not ignored; **GIT** commits `.gitignore`: `chore: ignore .worktrees/`. Unignored worktree dir = whole tree committed by next `git add -A`.
2. **Baseline** per worktree. Install deps if the project needs them there (`node_modules` absent → `npm ci`; per `CLAUDE.md` otherwise), then run the project test command inside the worktree — non-watch, see SKILL.md "Test Execution Rules". Note `pass N / fail M` from the runner's own summary line.
   Baseline red → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"Baseline already fails in `<path>` — M failures before any change. Continue?"* → **Investigate first (Recommended)** · **Ship on a red baseline** · **Remove this worktree**. A red baseline makes every later failure ambiguous; never hide it.
3. `worktree.sh seed-focus <path> STORY-XXX "<title>" <feature> <base-branch>` — writes that worktree's `.agentic/focus.md` (CURRENT + `worktree_of:` + `worktree_base:`). Main tree's focus untouched.
4. Close each story's PLAN line with `in worktree <path> — ship there`.
5. Print, then **end the session**. Main tree cannot take the next story until the group merges back — priority order forbids it, and dependents wait on the group anyway.

```
━━━ WORKTREES READY ━━━
STORY-003  .worktrees/story-003  feat/notes-story-003  baseline 12 pass / 0 fail
STORY-004  .worktrees/story-004  feat/notes-story-004  baseline 12 pass / 0 fail

Each story in its own terminal:  cd <path> && claude   then  /ship STORY-XXX
Next: when they are shipped, run /ship-all here to merge them back.
```

---

## §W2 — Finish (first step of every `/ship-all` while `.worktrees/` has story worktrees)

`worktree.sh list` → one `WORKTREE <path> branch=… state=… ahead=… base=… merged=…` line each. Per worktree:

- `state=dirty` → story unfinished there. Report path, touch nothing.
- Story unchecked on its branch (`git show <branch>:docs/features/<feature>/STORIES.md`) → still in progress. Report, touch nothing.
- `merged=yes` (landed via PR since last run) → run the deferred phases (step 3 below), then offer removal (step 4) behind the same gate.
- Otherwise ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]` — body shows branch, `git log --oneline <base>..<branch>`, files changed: *"STORY-XXX is shipped in `<path>`. What now?"* → **Merge into `<base>` (Recommended)** · **Push and open a PR** · **Keep the worktree** · **Discard it**. Never skipped under `--auto`: every path but Keep ends in removal or deletion.

**Merge:**
1. `worktree.sh merge <path>`. `APPENDED docs/features/…/PROGRESS.md` = both stories' entries kept, theirs after ours — expected for parallel stories. Exit 3 `CONFLICT <files>` = merge aborted, tree unchanged: report files, stop for this story (resolve by hand, or Keep).
2. Test command on the merged result, non-watch. Red → stop. Worktree and branch stay; nothing pushed, merge is local. Report failures; `Next: /fix <failure>` on this branch.
3. Deferred phases in the main tree, merge order = story order: `/ship` Phase 5 (SCRIBE + both changelogs + docs commit), then Phase 7 (cleanup). Shared docs get written here, once, never on the story branches.
4. `worktree.sh remove <path> --delete-branch` — refuses an unmerged branch; merged is proven by now.

**Push and open a PR:** `git -C <path> push -u origin <branch>`, then the forge CLI if present (`gh pr create`, `glab mr create`), else report the URL the push printed. Keep the worktree — PR feedback gets fixed there. Deferred phases run when a later `/ship-all` sees `merged=yes`.

**Keep:** nothing. PLAN line stays open.

**Discard:** show exactly what dies — branch, `git log --oneline <base>..<branch>`, path — then second ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: confirm]`: *"Permanently delete `<branch>` and `<path>`?"* → **Keep it (Recommended)** · **Delete it**. Delete → `worktree.sh remove <path> --discard`. Story stays unchecked in main.

**Removal refused** (`REFUSED:` + file list) → those files exist only in the worktree. Show them, ⚠️ `[AUTO: always-ask]` `[ASK: single]` → **Commit them on the branch (Recommended)** · **Move them to the main tree** · **Leave the worktree in place**. Never delete by hand, never `--force`.

---

## §W3 — `/ship` inside a seeded worktree

CURRENT has `worktree_of:` → this run is one story of a parallel group.

- Phases 1–4 and 6 run unchanged on this branch.
- Phase 5 (end-user docs + changelogs) and Phase 7 (cleanup) → close their PLAN lines `deferred to merge (worktree)`. `docs/CHANGELOG.md`, `app-docs/`, `DECISIONS.md`, `MEMORY.md` are shared: two branches writing them in parallel conflict at merge and collide on `DEC-NNN` numbers. §W2 step 3 writes them once, in the main tree.
- Story-scoped files still land here: code, tests, `STORIES.md` checkbox, `PROGRESS.md` entry, `reviews/`.
- Release focus as normal — this worktree's `.agentic/focus.md` only.
- Chain-complete block: `Docs: deferred to merge` · `Cleanup: deferred to merge`, and `Next: run /ship-all in <worktree_of> to merge STORY-XXX back.`
