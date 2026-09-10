#!/usr/bin/env bash
# PostToolUse integrity check for the bedcode plugin monorepo.
#
# This repo has no compiler and no tests. Its invariants are structural: one
# logical change fans out across a wrapper command, a real command body, an
# installer array, and a manifest. Nothing else verifies that fan-out.
#
# Reads the hook payload on stdin, checks only the file class that was edited,
# and exits 2 with an explanation on stderr so Claude sees and fixes the drift.
# Exits 0 when the edit is not one of the load-bearing file classes.
#
# Every check here must be zero-false-positive. A linter that cries wolf gets
# disabled, and then the invariants go unchecked again.

set -uo pipefail

REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel 2>/dev/null)" || exit 0
[[ -n "$REPO" ]] || exit 0

FILE="$(python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception: print("")' 2>/dev/null)"

[[ -n "$FILE" ]] || exit 0
[[ "$FILE" == "$REPO"/* ]] || exit 0
REL="${FILE#"$REPO"/}"

ERRORS=()
fail() { ERRORS+=("$1"); }

# --- A. Root wrapper command must have something real behind it --------------
# <plugin>/commands/<n>.md is a thin shim. It is valid if EITHER a real command
# body exists under skills/*/commands/, OR it points at a same-name skill
# (the smart-setup/squash-merge pattern, where the wrapper targets SKILL.md).
if [[ "$REL" =~ ^([^/]+)/commands/([^/]+)\.md$ ]]; then
  plugin="${BASH_REMATCH[1]}"
  name="${BASH_REMATCH[2]}"
  if ! compgen -G "$REPO/$plugin/skills/*/commands/$name.md" >/dev/null \
     && [[ ! -f "$REPO/$plugin/skills/$name/SKILL.md" ]]; then
    fail "Wrapper $REL has no body. Create $plugin/skills/<skill>/commands/$name.md, or point it at $plugin/skills/$name/SKILL.md."
  fi
fi

# --- B. agentic-engineering command bodies must be routable ------------------
# agentic-engineering is marketplace-only: plugin auto-discovery registers every
# commands/*.md, so there is no USER_COMMANDS gate any more. What still breaks
# silently is a body the router cannot reach — SKILL.md's Command -> File Map is
# the only thing telling the model which file to read.
if [[ "$REL" =~ ^agentic-engineering/skills/[^/]+/commands/([^/]+)\.md$ ]]; then
  name="${BASH_REMATCH[1]}"
  skillmd="$REPO/agentic-engineering/skills/agentic-engineering/SKILL.md"
  if [[ -f "$skillmd" ]] && ! grep -q "commands/$name\.md" "$skillmd"; then
    fail "Command body '$name' is not in SKILL.md's Command -> File Map. The router dispatches from that table; a body missing from it is unreachable. Add a row."
  fi
fi

# --- B2. Root wrappers need an absolute base and must pass arguments --------
# Under a plugin install, <plugin>/commands/<n>.md IS the wrapper, so a bare
# relative "read commands/<n>.md" instruction is self-recursion. And a wrapper
# that never forwards its arguments swallows --auto and every other flag.
if [[ "$REL" =~ ^agentic-engineering/commands/([^/]+)\.md$ ]]; then
  name="${BASH_REMATCH[1]}"
  grep -q 'CLAUDE_PLUGIN_ROOT' "$FILE" 2>/dev/null \
    || fail "$REL names no absolute base directory. Point it at CLAUDE_PLUGIN_ROOT/skills/agentic-engineering/commands/$name.md — a bare 'commands/$name.md' resolves to this wrapper itself under a plugin install."
  grep -q 'ARGUMENTS' "$FILE" 2>/dev/null \
    || fail "$REL never forwards its arguments. Every wrapper passes them through, even for a command that takes none — otherwise --auto and every flag are dropped before the body runs."
fi

# --- C. 'user-invocable' must never appear in a source SKILL.md --------------
# The field is valid in the CLI but rejected by the claude.ai skill packager.
# agentic-engineering is marketplace-only with no installer to patch it in, so
# there is nowhere for it to live at all. Source must stay clean.
#
# Two scoping rules, both learned from false positives:
#   1. First segment must not start with a dot. Plain `[^/]+` also matches
#      `.claude`, so this fired on the repo's OWN internal skills under
#      `.claude/skills/` — which are not shipped and never packaged.
#   2. Only the YAML frontmatter counts. `user-invocable` is a frontmatter key;
#      a file that merely *documents* it in prose (verify-install/SKILL.md
#      asserts on it by name) is clean.
if [[ "$REL" =~ ^[^./][^/]*/skills/[^/]+/SKILL\.md$ ]]; then
  if awk 'NR==1 && $0!="---"{exit} NR>1 && $0=="---"{exit} {print}' "$FILE" 2>/dev/null \
       | grep -q 'user-invocable'; then
    fail "$REL contains 'user-invocable' in its frontmatter — it leaked into source. The claude.ai packager rejects it. Remove it."
  fi
fi

# --- D. Plugin manifests must parse, and marketplace sources must resolve ----
if [[ "$REL" =~ ^(.*/)?\.claude-plugin/[^/]+\.json$ ]]; then
  if ! python3 -m json.tool "$FILE" >/dev/null 2>&1; then
    fail "$REL is not valid JSON."
  elif [[ "$REL" == ".claude-plugin/marketplace.json" ]]; then
    missing="$(python3 -c '
import json,os,sys
repo, path = sys.argv[1], sys.argv[2]
d = json.load(open(path))
for p in d.get("plugins", []):
    src = p.get("source", "")
    if src.startswith("./") and not os.path.isdir(os.path.join(repo, src[2:])):
        print(f'"'"'{p.get("name")} -> {src}'"'"')
' "$REPO" "$FILE" 2>/dev/null)"
    [[ -n "$missing" ]] && fail "marketplace.json references missing plugin dirs: $missing"
  fi
fi

# --- E. Adapter templates must keep their idempotency markers ---------------
# install.sh:203 replaces an existing block by matching
#   <!-- {marker}:start ... {marker}:end[^>]*-->
# Lose either marker and re-installs append duplicate blocks instead of
# replacing in place.
if [[ "$REL" =~ ^([^/]+)/adapters/AGENTS\.md\.template$ ]]; then
  plugin="${BASH_REMATCH[1]}"
  grep -q "<!-- ${plugin}:start" "$FILE" 2>/dev/null \
    || fail "$REL is missing its '<!-- ${plugin}:start ... -->' marker — re-installs will append duplicates instead of replacing."
  grep -qE "<!-- ${plugin}:end[^>]*-->" "$FILE" 2>/dev/null \
    || fail "$REL is missing its '<!-- ${plugin}:end ... -->' marker — re-installs will append duplicates instead of replacing."
fi

# --- F. Agent files must declare a name: in frontmatter ---------------------
# Claude Code drops any agent file lacking 'name:' SILENTLY — no warning, no
# filename fallback. A review still runs and still emits a report; it is just
# the main model role-playing the reviewers inline. Nothing else surfaces this.
# Confirmed 2026-08-04: all 8 agentic-engineering agents were missing it.
#
# Only two shapes define an agent: agents/<n>.md and agents/<n>/AGENT.md.
# references/ and languages/ files sit a level deeper and are excluded by the
# path depth, so they are never checked.
agent_slug=""
if [[ "$REL" =~ ^[^/]+/agents/([^/]+)\.md$ ]]; then
  agent_slug="${BASH_REMATCH[1]}"
elif [[ "$REL" =~ ^[^/]+/agents/([^/]+)/AGENT\.md$ ]]; then
  agent_slug="${BASH_REMATCH[1]}"
fi
if [[ -n "$agent_slug" && "$agent_slug" != "README" && -f "$FILE" ]]; then
  declared="$(awk '
    NR==1 && $0=="---" { inside=1; next }
    inside && $0=="---" { exit }
    inside && /^name:/ {
      sub(/^name:[[:space:]]*/, ""); gsub(/["\047]/, ""); sub(/[[:space:]]+$/, "")
      print; exit
    }' "$FILE" 2>/dev/null)"
  if [[ -z "$declared" ]]; then
    fail "$REL has no 'name:' in its frontmatter. Claude Code drops such agents silently — it will never register, and every dispatch to it degrades to inline role-play with no error. Add 'name: $agent_slug'."
  elif [[ "$declared" != "$agent_slug" ]]; then
    fail "$REL declares 'name: $declared' but lives at agents/$agent_slug. Dispatch resolves by the declared name, so callers referencing '$agent_slug' (install.sh, commands/review.md) silently get nothing. Make them match."
  fi
fi


# --- G. agents/ holds nothing but flat agent files --------------------------
# Verified against 2.1.267 with --plugin-dir: a plugin's agents/<n>/AGENT.md
# registers as `plugin:<n>:<n>` (so every dispatch by `<n>` fails), and EVERY
# other .md under agents/<n>/ registers as its own agent type. One plugin
# contributed 59 phantom subagents named after reference docs, each sitting in
# the Agent tool description of every turn of every session.
#
# Nothing else catches this: the dispatch failure is silent, and /review still
# emits a normal-looking report from the main model role-playing six reviewers.
#
# SCOPED to the migrated plugins. `premortem-skill` (1 agent, 2 reference files)
# still carries the nested layout and has the same defect, but it has not been
# migrated yet. Add it to the alternation on the day it moves; until then a
# repo-wide check would fire on every premortem edit and get itself disabled.
if [[ "$REL" =~ ^(agentic-engineering|jtbd)/agents/(.+)$ ]]; then
  g_plugin="${BASH_REMATCH[1]}"
  g_rest="${BASH_REMATCH[2]}"
  if [[ "$g_rest" == */* ]]; then
    fail "$REL is nested under agents/. Agent files must be flat: $g_plugin/agents/<name>.md. A directory here registers as '$g_plugin:<dir>:<dir>' instead of '$g_plugin:<dir>', and every other .md beside it becomes a phantom agent type. Move reference material to $g_plugin/references/<agent>/ and address it as CLAUDE_PLUGIN_ROOT/references/<agent>/<file>."
  fi
fi

# --- H. Reviewer agents must not hold Bash ----------------------------------
# `tools:` accepts permission-rule syntax but does not enforce it: an agent
# declaring `Bash(git diff:*)` gets a general Bash tool (verified — the agent
# ran `git status`). Reviewers that can write have clobbered a test another
# agent had just written and left debug lines in a committed file.
if [[ "$REL" =~ ^agentic-engineering/agents/ae-(red|sec|edge|test|ux|req|doc|lean)\.md$ ]]; then
  if awk 'NR==1 && $0!="---"{exit} NR>1 && $0=="---"{exit} /^tools:/{print}' "$FILE" 2>/dev/null \
       | grep -q 'Bash'; then
    fail "$REL declares Bash in its tools:. Reviewers are read-only, and 'Bash(git diff:*)' is NOT honoured as a restriction — the agent gets full Bash. /review captures the diff into .agentic/review/<STORY-ID>.diff and passes the path; read that."
  fi
fi

# --- I. No ~/.claude literal in shipped agentic-engineering content ----------
# The plugin is marketplace-only; its files live under
# ~/.claude/plugins/cache/<owner>/<plugin>/<version>/, so a ~/.claude/skills/…
# or ~/.claude/agents/… path resolves to nothing and fails silently — a missing
# rules library, a statusline that never renders, an agent with no references.
if [[ "$REL" =~ ^agentic-engineering/(skills|agents|references|commands|adapters|capture-tools|rules-library)/ ]]; then
  if grep -q '~/\.claude' "$FILE" 2>/dev/null; then
    fail "$REL contains a literal ~/.claude path. agentic-engineering installs only through the marketplace, where its files live in the plugin cache. Use CLAUDE_PLUGIN_ROOT/... instead."
  fi
fi

# --- J. SKILL.md description must fit the 1,024-character cap ---------------
# Over the cap the TAIL is truncated — and the tail is exactly where the
# "do NOT trigger on" disambiguation lives.
if [[ "$REL" =~ ^[^./][^/]*/skills/[^/]+/SKILL\.md$ ]]; then
  helper="$(dirname "${BASH_SOURCE[0]}")/desc-length.py"
  if [[ -f "$helper" ]]; then
    desc_len="$(python3 "$helper" "$FILE" 2>/dev/null)"
    if [[ -n "$desc_len" ]] && ((desc_len > 1024)); then
      fail "$REL description is $desc_len characters, over the 1024 cap. The tail is silently truncated, and the tail is where the 'do NOT trigger on' disambiguation lives. Trim it."
    fi
  fi
fi

if ((${#ERRORS[@]})); then
  printf 'Plugin integrity check failed:\n' >&2
  printf '  - %s\n' "${ERRORS[@]}" >&2
  exit 2
fi
exit 0
