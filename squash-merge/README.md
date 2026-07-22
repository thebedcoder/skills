# squash-merge

Collapse the current branch into a single commit on a target branch — with clean preconditions, a Conventional Commit message synthesized from the squashed history, and an explicit push/delete prompt afterward. Nothing is pushed or deleted without your say-so.

## Command

```
/squash-merge [target-branch]
```

- `target-branch` is optional. Omit it and the skill asks, suggesting the repo's default branch.
- Also fires on natural phrasing: "squash merge this into main", "collapse this branch into develop", "squash-merge my branch".

## What it does

1. **Checks preconditions** — must be a git repo, working tree must be clean, no merge/rebase in progress. Stops (never works around) on any failure.
2. **Resolves branches** — source is the current branch; target is your argument or a prompt. Verifies the target exists, the two differ, and the source actually has commits to merge.
3. **Drafts the commit message** — reads the squashed commits (`git log <target>..<source>`) and the file-level diff, then synthesizes one Conventional Commit message and shows it to you to edit or approve before anything is committed.
4. **Squash-merges** — `git checkout <target>` → `git merge --squash <source>` → `git commit` with the approved message. Stops and hands conflicts back to you; never auto-resolves.
5. **Prompts post-merge** — pick one:
   - **Push + delete old branch**
   - **Just push**
   - **Just delete branch**
   - **Do nothing**

## Safety

- **Clean tree required.** A dirty tree stops the run — commit or stash first.
- **You approve the message.** Nothing is committed with a message you haven't seen.
- **Never force-pushes.** A rejected push is reported and handed back to you.
- **Deletes are explicit and separate.** After a squash-merge git considers the source branch "not fully merged" (a squash records no merge parent) — that's expected. The skill explains it and asks before `git branch -D`. Deleting the *remote* branch (`git push origin --delete`) is a second, separate confirmation, never bundled in.

## Install

### Claude Code (plugin marketplace)

```
/plugin marketplace add thebedcoder/skills
/plugin install squash-merge@thebedcoder
```

### From a local checkout

```bash
bash squash-merge/install.sh
```

Copies the skill to `~/.claude/skills/squash-merge/` and the `/squash-merge` command to `~/.claude/commands/`. Restart Claude Code afterward.
