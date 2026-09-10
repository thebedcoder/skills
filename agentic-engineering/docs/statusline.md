# Status bar focus hint

`/focus <task>` writes a current-task pointer to `.agentic/focus.md`
(per-worktree, gitignored). Surfacing it in Claude Code's status bar keeps it
visible while you work.

`/init` and `/bootstrap` set this up for you: they copy
`${CLAUDE_PLUGIN_ROOT}/agentic-statusline.sh` into your project's `.claude/` and
point `.claude/settings.local.json` at the local copy. The copy is deliberate —
it survives plugin version bumps, and the plugin cache path changes on every
update. If you already have a custom `statusLine`, they leave it alone; merge the
focus hint in yourself using one of the recipes below.

The shipped script prints one line: the focus `title:`, falling back to the git
branch, and nothing at all outside an agentic project.

```
~/dev/myapp  feat/payments  Sonnet 4.6  ctx:42%
🎯 STORY-003: Stripe webhook handler
```

## Ask Claude to merge it into an existing status line

```
/statusline extend my status bar with a second line that reads `title:` and `note:` from .agentic/focus.md
```

Claude Code routes to the `statusline-setup` agent, which reads your current
`statusLine` config, extends the existing script in place (so your
dir/branch/model/context segments stay), and reloads the bar.

## Merge it by hand

**If you already have a custom status-line script** (your `statusLine.command`
points at one), paste this before the trailing `printf '\n'`. It prints `title:`
and, unlike the shipped script, a dimmed `note:` beneath it:

```sh
# Focus from .agentic/focus.md — second line, dim note below
if [ -f "$cwd/.agentic/focus.md" ]; then
  focus=$(grep -m1 '^title:' "$cwd/.agentic/focus.md" | sed 's/^title:[[:space:]]*//')
  [ -n "$focus" ] && printf '\n\033[36m🎯 %s\033[0m' "$focus"
  note=$(grep -m1 '^note:' "$cwd/.agentic/focus.md" | sed 's/^note:[[:space:]]*//')
  [ -n "$note" ] && printf '\n\033[90m   %s\033[0m' "$note"
fi
```

The script reads `$cwd` (the workspace dir Claude Code passes via stdin JSON) so
it stays silent in projects without `.agentic/focus.md`.

**If you have no custom status line and don't want the shipped script**, add this
to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "[ -f .agentic/focus.md ] && awk '/^title:/{sub(/^title:[ ]*/,\"\");print \"🎯 \"$0} /^note:/{sub(/^note:[ ]*/,\"\");print \"   \"$0}' .agentic/focus.md"
  }
}
```

Restart Claude Code to pick up the change. The relative path works because status
line commands run in the workspace directory.
