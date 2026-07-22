---
name: squash-merge
description: >
  Squash-merge the current branch into a target branch. Collapses every commit
  on the current branch into a single commit on the target, with a Conventional
  Commit message synthesized from the squashed history, then prompts to push
  and/or delete the old branch. Use when user says "squash merge", "squash this
  into main", "squash-merge my branch", "collapse this branch into <branch>", or
  asks to merge the current branch as one commit.
argument-hint: "[target-branch]"
---

# squash-merge

Collapse current branch into one commit on target branch. Clean tree required. Message reviewed before commit. Nothing pushed or deleted without explicit choice.

`$ARGUMENTS` (if present) = target branch. Absent → ask (Step 1).

## Preconditions — check before anything

Run each. On failure, stop + tell user why. No workarounds.

1. **In git repo.** `git rev-parse --git-dir` succeeds. Else stop.
2. **Tree clean.** `git status --porcelain` empty. Dirty → stop, tell user commit or stash first. Squash-merge with local changes risks losing them or mixing them into the merge commit.
3. **Merge/rebase in progress** (`.git/MERGE_HEAD`, `.git/rebase-*`) → stop, tell user finish or abort first.

## Step 1 — Resolve source and target

- **Source** = current branch: `git branch --show-current`. Empty (detached HEAD) → stop, tell user check out a branch.
- **Target** = `$ARGUMENTS` if given, else ask. Suggest repo default branch — detect via `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`), fall back to whichever of `main` / `master` exists locally.
- **Target exists locally**: `git show-ref --verify --quiet refs/heads/<target>`. Missing → stop. Do not create it.
- **Source ≠ target.** Equal → stop, nothing to merge.
- **Source ahead of target**: `git rev-list --count <target>..<source>`. `0` → stop, tell user branch has no commits to merge.

## Step 2 — Prepare commit message

Gather what gets squashed, `<target>` to `<source>`:

- Commit subjects + bodies: `git log --format='%s%n%b' <target>..<source>`
- File scope: `git diff --stat <target>...<source>` (three dots — diff against merge base)

Synthesize one Conventional Commit message:

- **Subject**: `<type>(<scope>): <summary>` — infer type/scope from dominant change. Under ~72 chars. Repo history uses a convention (`git log --oneline -20 <target>`) → match it.
- **Body**: bulleted digest of squashed commits (one line each, deduped — drop noise like "wip", "fix typo", "address review"). Trailing line: `Squashed from <source> (<n> commits).`

Show drafted message to user. Let them edit or approve before commit. Never commit a message user has not seen.

## Step 3 — Squash-merge

Only after message approved:

```bash
git checkout <target>
git merge --squash <source>
```

- **Conflicts** → stop. Show `git status`, list conflicted files, tell user resolve them (or `git merge --abort`). Never auto-resolve or `-X ours/theirs` unless user asks.
- **Clean** → commit with approved message:

```bash
git commit -m "<subject>" -m "<body>"
```

`git merge --squash` stages changes but does not create the commit or record `<source>` as parent — why the commit is a normal single-parent commit, and why git later treats `<source>` as "not merged" (Step 4).

Report: new commit SHA, `<target>` now N commits ahead of upstream.

## Step 4 — Post-merge prompt

Ask user pick one. Present all four:

| Choice | Action |
|---|---|
| **a. Push + delete old branch** | Push `<target>`, then delete `<source>` (see below) |
| **b. Just push** | Push `<target>` only |
| **c. Just delete branch** | Delete `<source>` only |
| **d. Do nothing** | Leave everything local; report state and stop |

**Push** (`<target>` checked out): `git push`. No upstream → `git push -u origin <target>`. Rejected because remote moved on → report it. Do not force-push. Tell user pull/rebase `<target>` + re-run push themselves.

**Delete `<source>`** (local): `git branch -d <source>`.

- After squash-merge, `<source>` has no merge commit pointing at it → `git branch -d` usually refuses with "not fully merged". Expected — work IS on `<target>`, as a squashed commit. Explain to user, ask before forcing.
- On confirmation: `git branch -D <source>`.
- **Remote branch** (`origin/<source>`): destructive, separate step. Ask separately — never fold into the local delete. Explicit yes → `git push origin --delete <source>`.

## Hard rules

- Never proceed past a failed precondition. No workaround for a dirty tree.
- Never commit a message user has not seen + approved.
- Never auto-resolve conflicts.
- Never force-push. Rejected push = information — report it, hand back.
- Never `git branch -D` or `git push origin --delete` without explicit, separate confirmation.
- Never create the target branch. Never touch any branch other than `<source>` + `<target>`.
