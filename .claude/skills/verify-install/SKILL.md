---
name: verify-install
description: Run every plugin installer into a throwaway HOME and assert the result. Never touches the real ~/.claude. Use before committing installer, SKILL.md, command, or rules-library changes.
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
---

# verify-install

This repo has no test suite. The installers *are* the thing under test, and all
eight of them write to `~/.claude`. Running one directly clobbers real config —
never do that. This skill redirects `HOME` to a temp dir so the same code paths
run against a sandbox.

## Run

```bash
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
SANDBOX="$(mktemp -d)"
echo "sandbox: $SANDBOX"

# Every installer resolves paths through ~ , so overriding HOME contains them.
for p in agentic-engineering flutter-motion jtbd premortem-skill smart-setup squash-merge update-dependencies; do
  echo "--- $p"
  HOME="$SANDBOX" bash "$REPO/$p/install.sh" >/dev/null || echo "  !! installer FAILED: $p"
done

# Multi-tool path writes into the current directory, so run it inside the sandbox.
mkdir -p "$SANDBOX/cursor-test"
( cd "$SANDBOX/cursor-test" && HOME="$SANDBOX" bash "$REPO/install.sh" --tool=cursor --skill=agentic-engineering >/dev/null ) \
  || echo "  !! cursor install FAILED"
```

## Assert

Check each of these against `$SANDBOX`. Report pass/fail per line; do not
summarize away a failure.

| # | Assertion | Why it matters |
|---|---|---|
| 1 | `$SANDBOX/.claude/skills/agentic-engineering/SKILL.md` contains `user-invocable: false` | installer must patch it post-copy |
| 2 | `$SANDBOX/.claude/skills/smart-setup/SKILL.md` does **not** contain `user-invocable` | patching it shadows `/smart-setup` — same-name skill/command collision resolves in favor of the skill |
| 3 | `$SANDBOX/.claude/skills/jtbd/SKILL.md` does **not** contain `user-invocable` | same collision rule for `/jtbd` |
| 3b | `$SANDBOX/.claude/skills/flutter-motion/SKILL.md` does **not** contain `user-invocable` | same collision rule — patching it shadows `/flutter-motion` |
| 4 | Repo source `*/skills/*/SKILL.md` still contains no `user-invocable` | the claude.ai packager rejects it; it belongs only in the installed copy |
| 5 | Every name in `USER_COMMANDS` has a file in `$SANDBOX/.claude/commands/` | user-facing commands actually landed |
| 6 | `frontend.md`, `implement.md`, `review.md` are **absent** from `$SANDBOX/.claude/commands/` | internal commands stay hidden; they are called by `/ship` |
| 7 | All 8 agentic-engineering agents exist in `$SANDBOX/.claude/agents/` — `ae-req.md`, `ae-doc.md`, `ae-scribe.md` as single files; `ae-red/`, `ae-test/`, `ae-sec/`, `ae-ux/`, `ae-edge/` as dirs | mixed single-file/dir shape is easy to break |
| 8 | `$SANDBOX/cursor-test/.cursor/rules/*.mdc` exist and use `globs:` — no file still says `paths:` | one-way frontmatter rewrite for Cursor |
| 9 | Re-run any one installer; assert no duplicated `<!-- <plugin>:start` block in the written `AGENTS.md` | idempotency depends on the marker comments |

## Clean up

```bash
rm -rf "$SANDBOX"
```

## Gotchas

- **Never run an installer without overriding `HOME`.** There is no `--prefix`
  flag; `HOME` is the only seam.
- Assertion 2 and 3 are inversions of assertion 1. If you find yourself
  "fixing" them to match, you are about to break `/smart-setup` and `/jtbd`.
- A failed installer still leaves partial output. Report the failure; do not
  infer success from files that happen to exist.
