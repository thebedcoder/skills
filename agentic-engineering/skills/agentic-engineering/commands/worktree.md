## `/worktree [name]` — Finish Worktrees

Lists worktrees this workflow created and finishes them: merge, PR, keep or discard. Two kinds — `task` (one `/feature`, `/ship`, `/fix` or `/improve` run, made by their branch guard on `main`) and `story` (one `[P]` story, made by `/ship-all`). Creating one is not this command's job. A `claude -w` worktree is the user's own and never listed.

Read-only until a gate is answered. Runs in the main context: every finish needs a human answer.

### Step 1 — Main tree only

`bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh where`:

- `MAIN <root>` → continue.
- `WORKTREE … main=<root>` → this session sits inside a worktree and cannot merge or remove the folder it runs in. Moved here with `EnterWorktree` → `ExitWorktree` `action: keep`, then continue. `ExitWorktree` reports no worktree session → print `Run /worktree from the main folder: cd <root> && claude` and stop.

### Step 2 — List

`worktree.sh list` and `worktree.sh pref`. `$ARGUMENTS` names one (folder name or branch) → keep only that line; no match → say so, show the full list, stop.

```
━━━ WORKTREES ━━━
fix-login      fix/login              task   clean · 2 ahead of main · not merged
story-003      feat/notes-story-003   story  dirty · 1 ahead of feat/notes

Preference: agentic.worktree=ask  (git config agentic.worktree ask|always|never)
```

No lines → print `No worktrees from agentic-engineering here. On main, /feature, /ship, /fix and /improve offer one.` plus the preference line, and stop.

### Step 3 — Finish

Run **§W2** of `shared/worktree.md` for each listed worktree, in list order. Dirty and in-progress ones are reported, never touched.

### Step 4 — Summary

```
━━━ WORKTREES DONE ━━━
Merged:    fix/login → main (worktree removed)
PR:        feat/export-csv — <url>
Kept:      story-003 (dirty — work in progress)
```

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Finish — merge / PR / keep / discard (§W2) | `[AUTO: always-ask]` — removal and branch deletion are destructive |
| Discard confirmation | `[AUTO: always-ask]` |
| Remove a worktree with no commits | `[AUTO: always-ask]` |

### Gotchas

- **Never by hand.** No `rm -rf .claude/worktrees/…`, no `git worktree remove --force`, no `git branch -D` outside `worktree.sh remove`. A refusal lists the files that exist only there — show them.
- **Merge is local.** Nothing is pushed unless the human picks the PR path.
- **The test run after a merge is not optional.** Two branches that each passed can fail together; red → stop with the worktree and branch intact.
