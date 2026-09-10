---
name: verify-install
description: Run every plugin installer into a throwaway HOME and assert the result, then check the plugin-only invariants for agentic-engineering and jtbd. Never touches the real ~/.claude. Use before committing installer, SKILL.md, command, agent, or rules-library changes.
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
---

# verify-install

This repo has no test suite. Two different things are under test and they need
different harnesses.

**Five plugins ship a per-plugin `install.sh`** that writes to `~/.claude`.
Running one directly clobbers real config — never do that. `HOME` is the only
seam, so redirect it to a temp dir.

**`agentic-engineering` and `jtbd` ship no installer.** Both are marketplace-only,
and their content resolves through `${CLAUDE_PLUGIN_ROOT}`. There is nothing to
sandbox; what needs verifying is that their agents register under the names their
commands dispatch, and that nothing has drifted back to a `~/.claude` literal.

## Part 1 — Run the installers

```bash
set -uo pipefail
REPO="$(git rev-parse --show-toplevel)"
SANDBOX="$(mktemp -d)"
echo "sandbox: $SANDBOX"

for p in flutter-motion premortem-skill smart-setup squash-merge update-dependencies; do
  echo "--- $p"
  HOME="$SANDBOX" bash "$REPO/$p/install.sh" >/dev/null || echo "  !! installer FAILED: $p"
done

# agentic-engineering and jtbd have no installer — the top-level one must say so
# and write nothing.
for p in agentic-engineering jtbd; do
  mkdir -p "$SANDBOX/notice-$p"
  ( cd "$SANDBOX/notice-$p" && HOME="$SANDBOX" bash "$REPO/install.sh" --tool=claude-code --skill="$p" )
done

# Multi-tool path writes into the current directory, so run it inside the sandbox.
mkdir -p "$SANDBOX/cursor-test"
( cd "$SANDBOX/cursor-test" && HOME="$SANDBOX" bash "$REPO/install.sh" --tool=cursor --skill=agentic-engineering >/dev/null ) \
  || echo "  !! cursor install FAILED"
```

## Part 1 assertions

| # | Assertion | Why it matters |
|---|---|---|
| 1 | Neither `$REPO/agentic-engineering/install.sh` nor `$REPO/jtbd/install.sh` exists | both plugins are marketplace-only; an installer here means someone reintroduced a hand-copy path that `${CLAUDE_PLUGIN_ROOT}` cannot survive |
| 2 | `--tool=claude-code` for **each** of `agentic-engineering` and `jtbd` printed the `/plugin marketplace add` instructions and wrote **nothing** under `$SANDBOX/.claude/skills/<plugin>` | writing nothing is the correct outcome, not a failure |
| 3 | `$SANDBOX/.claude/skills/smart-setup/SKILL.md` does **not** contain `user-invocable` | patching it shadows `/smart-setup` — same-name skill/command collisions resolve in favor of the skill |
| 4 | Same for `flutter-motion` | same collision rule for `/flutter-motion` |
| 5 | Repo source `*/skills/*/SKILL.md` contains no `user-invocable` | the claude.ai packager rejects it |
| 6 | Every name in each surviving installer's `USER_COMMANDS` has a file in `$SANDBOX/.claude/commands/` | user-facing commands actually landed |
| 7 | `$SANDBOX/cursor-test/.cursor/rules/*.mdc` exist and their **frontmatter** key is `globs:`, not `paths:` | one-way frontmatter rewrite for Cursor. Scope the check to the frontmatter — `grep -l 'paths:'` over the whole file matches prose (`testing-conventions.md` says "Critical paths: 100%") and reports a failure that isn't one. Use `head -3` or an awk range on the `---` block |
| 8 | Re-run any one installer; assert no duplicated `<!-- <plugin>:start` block in the written `AGENTS.md` | idempotency depends on the marker comments |

## Part 2 — plugin invariants (agentic-engineering, jtbd)

```bash
cd "$SANDBOX" && mkdir -p plugin-test && cd plugin-test && git init -q
for p in agentic-engineering jtbd; do
  echo "=== $p"
  claude -p --model haiku --plugin-dir "$REPO/$p" \
    "List the exact names of every agent type available to the Agent tool, one per line." </dev/null
done
```

| # | Assertion | Why it matters |
|---|---|---|
| 9 | Exactly **nine** `agentic-engineering:ae-*` names: `ae-red`, `ae-req`, `ae-test`, `ae-doc`, `ae-sec`, `ae-edge`, `ae-lean`, `ae-ux`, `ae-scribe` | this is the flagship mechanism. Anything else means dispatch silently degrades to the main model role-playing the reviewers |
| 10 | Exactly **five** `jtbd:jtbd-*` names: `jtbd-researcher`, `jtbd-analyst`, `jtbd-scout`, `jtbd-copywriter`, `jtbd-scriptwriter` | MODE 0/1/2B/3/4 dispatch these by name; a miss degrades to inline role-play with no error |
| 11 | **No** doubled name (`agentic-engineering:ae-red:ae-red`, `jtbd:jtbd-scout:jtbd-scout`) | a directory-form agent came back |
| 12 | **No** `:references:` or `:languages:` entry from either plugin | reference docs drifted back under `agents/` and became phantom agent types |
| 13 | `grep -rn '~/\.claude' agentic-engineering/{skills,agents,references,commands,adapters,capture-tools,rules-library}` returns nothing | a `~/.claude` literal resolves to nothing under the plugin cache and fails silently |
| 14 | `grep -rn '~/\.claude' jtbd/{agents,references,commands,adapters}` returns nothing. **`jtbd/skills/jtbd/SKILL.md` is excluded**: its `PostToolUse` hook appends to `~/.claude/jtbd-usage.log`, which is a runtime log write, not a content path | same failure mode, minus the one legitimate use |
| 15 | No reviewer agent declares `Bash` in `tools:` — `awk` the frontmatter of `agentic-engineering/agents/ae-*.md` | `Bash(git diff:*)` is not honoured as a restriction; the agent gets full Bash and can write to the repo under review |
| 16 | `python3 .claude/hooks/desc-length.py agentic-engineering/skills/agentic-engineering/SKILL.md` ≤ 1024 | over the cap the tail is truncated, and the tail holds the "do NOT trigger on" disambiguation |
| 17 | Every `.md` under `agentic-engineering/agents/` and `jtbd/agents/` is a flat file — `find <plugin>/agents -mindepth 2` is empty | the nested form both mis-registers the agent and turns its neighbours into phantom agents |
| 18 | Every `${CLAUDE_PLUGIN_ROOT}/references/...` path named in `jtbd/agents/*.md` and `agentic-engineering/agents/*.md` resolves to a file that exists | the agents' only pointer to their references; a stale path fails silently mid-dispatch |

Assertions 13, 15, 16 and 17 are also enforced by `.claude/hooks/check-integrity.sh`
on every edit (checks I, H, J, G). Running them here catches drift introduced
outside the hook, e.g. by a `git mv`. Assertions 14 and 18 exist **only** here —
the hook has no equivalent, because check I stops at agentic-engineering (jtbd's
SKILL.md legitimately writes `~/.claude/jtbd-usage.log`) and nothing walks an
agent's reference paths to see whether the files are still there.

## Clean up

```bash
rm -rf "$SANDBOX"
```

## Gotchas

- **Never run a per-plugin installer without overriding `HOME`.** There is no
  `--prefix` flag; `HOME` is the only seam.
- Assertions 3 and 4 are inversions of the `user-invocable` patch. If you find
  yourself "fixing" them to match, you are about to break `/smart-setup` and
  `/flutter-motion`.
- **Assertion 2 passing means nothing was written.** Don't "fix" it by adding an
  installer back to agentic-engineering or jtbd.
- A failed installer still leaves partial output. Report the failure; do not
  infer success from files that happen to exist.
