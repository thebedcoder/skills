# Worktrees

Loaded on demand only. Two kinds, one helper:

| Kind | Made by | Who works in it | Sections |
|---|---|---|---|
| `task` | `/feature`, `/ship`, `/fix`, `/improve` on `main` — user picked **New worktree**, or `agentic.worktree=always` | **this** session, moved in with `EnterWorktree` | §W4 enter · §W5 finish at chain end |
| `story` | `/ship-all`, one per `[P]` story, opt-in | **other** sessions, one per story | §W1 create · §W3 `/ship` inside · §W2 finish |

§W2 also runs from `/worktree` for both kinds. Every other run never opens this file. A `[P]` group built in parallel **in this session** uses `shared/parallel-build.md` instead: Claude Code makes each implementer's worktree, `worktree.sh pin` / `adopt` turn it into a `story` worktree of this branch, and one that is not merged there (conflict, failed build) is listed and finished by §W2 like any other.

**Helper:** `${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh` — mechanics only (`pref`, `where`, `create`, `seed-focus`, `list`, `merge`, `remove`). Every decision and every gate below stays here, in the parent. `create`, `list`, `merge`, `remove` run from the **main** worktree root and refuse from a linked one.

**Location:** `.claude/worktrees/<name>` — where `claude -w` puts its own, and the only place `EnterWorktree` can switch between. The helper ignores it through `.git/info/exclude`: local, never committed. `list` shows only worktrees the helper made (branch config `agenticBase`); a `claude -w` worktree is the user's, never finished here.

---

## §W1 — Create story worktrees (opt-in, from `/ship-all`)

Group = `[P]` stories of the lowest open priority level, ≥2, none depending on an unchecked story. `[P]` never crosses a level.

1. Per story: `worktree.sh create STORY-XXX feat/<feature>-story-xxx` — base = current branch.
2. **Baseline** per worktree. Install deps if the project needs them there (`node_modules` absent → `npm ci`; per `CLAUDE.md` otherwise), then run the project test command inside the worktree — non-watch, see SKILL.md "Test Execution Rules". Note `pass N / fail M` from the runner's own summary line.
   Baseline red → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"Baseline already fails in `<path>` — M failures before any change. Continue?"* → **Investigate first (Recommended)** · **Ship on a red baseline** · **Remove this worktree**. A red baseline makes every later failure ambiguous; never hide it.
3. `worktree.sh seed-focus <path> STORY-XXX "<title>" <feature> <base-branch>` — writes that worktree's `.agentic/focus.md` (CURRENT + `worktree_of:` + `worktree_base:`). Main tree's focus untouched.
4. Close each story's PLAN line with `in worktree <path> — ship there`.
5. Print, then **end the session**. Main tree cannot take the next story until the group merges back — priority order forbids it, and dependents wait on the group anyway.

```
━━━ WORKTREES READY ━━━
STORY-003  .claude/worktrees/story-003  feat/notes-story-003  baseline 12 pass / 0 fail
STORY-004  .claude/worktrees/story-004  feat/notes-story-004  baseline 12 pass / 0 fail

Each story in its own terminal:  cd <path> && claude   then  /ship STORY-XXX
Next: when they are shipped, run /ship-all here to merge them back.
```

---

## §W2 — Finish (from the main tree)

Callers: `/ship-all` Step 0c (`list --kind story`), `/worktree` (`list`, both kinds). One `WORKTREE <path> branch=… kind=… state=… ahead=… base=… merged=…` line each. Per worktree:

- `state=dirty` → work unfinished there. Report path, touch nothing.
- `kind=story`, story unchecked on its branch (`git show <branch>:docs/features/<feature>/STORIES.md`) → still in progress. Report, touch nothing.
- `ahead=0` → nothing was committed there. Offer removal only: ⚠️ `[AUTO: always-ask]` `[ASK: single]` *"`<path>` has no commits. Remove it?"* → **Remove it (Recommended)** · **Keep it**. Remove → `worktree.sh remove <path> --delete-branch`.
- `merged=yes` (landed via PR since) → `kind=story`: run the deferred phases (Merge step 3); then offer removal (Merge step 4) behind the same gate.
- Otherwise ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]` — body shows branch, `git log --oneline <base>..<branch>`, files changed: *"`<branch>` is finished in `<path>`. What now?"* → **Merge into `<base>` (Recommended)** · **Push and open a PR** · **Keep the worktree** · **Discard it**. Never skipped under `--auto`: every path but Keep ends in removal or deletion.

**Merge:**
1. `worktree.sh merge <path>`. `APPENDED docs/features/…/PROGRESS.md` = both stories' entries kept, theirs after ours — expected for parallel stories. Exit 3 `CONFLICT <files>` = merge aborted, tree unchanged: report files, stop for this worktree (resolve by hand, or Keep). `REFUSED` main tree dirty → report, stop; never stash for the user.
2. Test command on the merged result, non-watch. Red → stop. Worktree and branch stay; nothing pushed, merge is local. Report failures; `Next: /fix <failure>` on this branch.
3. `kind=story` only — deferred phases in the main tree, merge order = story order: `/ship` Phase 5 (SCRIBE + both changelogs + docs commit), then Phase 7 (cleanup). Shared docs get written here, once, never on the story branches. `kind=task` wrote its docs on the branch; nothing deferred.
4. `worktree.sh remove <path> --delete-branch` — refuses an unmerged branch; merged is proven by now. `CARRIED …auto-log.md` = that run's auto-mode log joined this tree's.

**Push and open a PR:** `git -C <path> push -u origin <branch>`, then the forge CLI if present (`gh pr create`, `glab mr create`), else report the URL the push printed. Keep the worktree — PR feedback gets fixed there. Deferred phases (story) and removal run when a later finish sees `merged=yes`.

**Keep:** nothing. A story's PLAN line stays open.

**Discard:** show exactly what dies — branch, `git log --oneline <base>..<branch>`, path — then second ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: confirm]`: *"Permanently delete `<branch>` and `<path>`?"* → **Keep it (Recommended)** · **Delete it**. Delete → `worktree.sh remove <path> --discard`. A story stays unchecked in main.

**Removal refused** (`REFUSED:` + file list) → those files exist only in the worktree. Show them, ⚠️ `[AUTO: always-ask]` `[ASK: single]` → **Commit them on the branch (Recommended)** · **Move them to the main tree** · **Leave the worktree in place**. Never delete by hand, never `--force`.

---

## §W3 — `/ship` inside a seeded story worktree

CURRENT has `worktree_of:` → this run is one story of a parallel group.

- Phases 1–4 and 6 run unchanged on this branch.
- Phase 5 (end-user docs + changelogs) and Phase 7 (cleanup) → close their PLAN lines `deferred to merge (worktree)`. `docs/CHANGELOG.md`, `app-docs/`, `DECISIONS.md`, `MEMORY.md` are shared: two branches writing them in parallel conflict at merge and collide on `DEC-NNN` numbers. §W2 step 3 writes them once, in the main tree.
- Story-scoped files still land here: code, tests, `STORIES.md` checkbox, `PROGRESS.md` entry, `reviews/`.
- Release focus as normal — this worktree's `.agentic/focus.md` only.
- Chain-complete block: `Docs: deferred to merge` · `Cleanup: deferred to merge`, and `Next: run /ship-all in <worktree_of> to merge STORY-XXX back.`

---

## §W4 — Enter a task worktree

Caller passes `<name>` and `<branch>` (its table below). A task worktree is a branch in its own folder: the chain runs in full there, docs and cleanup included — same result as **New branch**, but `main`'s folder stays untouched and other sessions can keep working in it.

| Caller | `<name>` | `<branch>` |
|---|---|---|
| `/feature` | `<feature-name>` | `feat/<feature-name>` |
| `/ship` | `<story-id>`; nested in `/ship-all` → `<feature>` | `feat/<story-slug>`; nested → `feat/<feature>` |
| `/fix` | `fix-<bug-slug>` | `fix/<bug-slug>` |
| `/improve` | `improve-<slug>` | `improve/<slug>` |

1. `worktree.sh create <name> <branch> --kind task --carry-focus`, from the main root. `CARRIED` = CURRENT + PLAN moved into the worktree; NEXT stays in main. `NOTE … uncommitted` → relay it: those edits stay in `main`, the worktree starts from the last commit. `REFUSED` (name or branch taken) → report, re-ask the caller's gate without the worktree option.
2. `AUTO` → write this run's auto-log header again into `<path>/.agentic/auto-log.md`; later lines land there. §C counts both files.
3. `LOCAL-ONLY <file>` lines (ignored `.env*` in main) → ⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: single]`: *"`<files>` exist only in the main folder. Copy them into the worktree?"* → **Copy them (Recommended)** · **Don't copy**. Under `--auto`: copy, log `DECISION: copied <files> into worktree [auto] — stays on this machine, still ignored`. Hard-override #2 carves this copy out explicitly; a file that is *not* ignored is never copied this way. `cp` only, never `git add`.
4. **Move this session in:** `EnterWorktree` with `path: <absolute path from CREATED>`. The human's **New worktree** answer, or `agentic.worktree=always`, is the explicit instruction that tool requires. Tool absent or refused → print `cd <path> && claude`, then the same command, and stop: the worktree is ready and the task's focus waits in it. Subagents dispatched after the move run in the worktree too — reviewers see this branch.
5. **Baseline**, now inside: deps (as §W1 step 2), then the project test command, non-watch. Red →
   - `/fix` → expected when the bug has a failing test. Note the failures; Phase 1 reproduction tells the bug's own from unrelated ones.
   - others → ⚠️ same gate as §W1 step 2, with **Work on a red baseline** for the second option.
6. Print, then continue the calling command from its next step:

```
━━━ WORKTREE READY ━━━
Path:     .claude/worktrees/<name>
Branch:   <branch> (from <base>)
Baseline: <N pass / M fail>
Everything below runs here. main's folder is untouched until you merge.
```

---

## §W5 — Finish a task worktree (chain end)

Run by `/ship` (not nested), `/ship-all` (after its last story), `/fix`, `/improve` — after focus release, before §C. Not `/feature`: its work is the stories ahead.

1. `worktree.sh where` → anything but `kind=task` → skip silently (main tree, story worktree, a `claude -w` worktree).
2. Chain ended in an unresolved blocker pause → skip; print `Worktree kept: <path> — unfinished.`
3. ⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: single]` — body shows branch, `git log --oneline <base>..<branch>`: *"Work is committed on `<branch>`. What now?"* → **Merge into `<base>`** · **Push and open a PR** · **Keep working here** · **Discard it**. `(Recommended)`: `/ship` with unchecked stories left in the feature → **Keep working here**; otherwise **Merge**. Under `--auto`: SKIP → Keep, log `DECISION: worktree <path> kept [auto] — merge, PR and discard need a human`.
   - **Merge** → `ExitWorktree` `action: keep` (session back in the main folder), then §W2 Merge steps 1, 2, 4. `ExitWorktree` reports no worktree session (this session started inside the folder) → it cannot remove its own working directory: print `Leave this session, then run /worktree in <main>.` and stop.
   - **Push and open a PR** → §W2 PR path, run from here. Session stays — review fixes happen here.
   - **Keep working here** → nothing. Print `Later: /worktree in <main> merges, PRs or discards it.`
   - **Discard** → §W2 Discard confirmation; confirmed → `ExitWorktree` `action: keep`, then `worktree.sh remove <path> --discard`. Same no-session fallback as Merge.
