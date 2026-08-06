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

# --- B. agentic-engineering commands must be gated by USER_COMMANDS ----------
# Every command is either user-facing (in the USER_COMMANDS array, so the
# installer copies it to ~/.claude/commands/) or deliberately internal
# (dispatched by /ship, never exposed). Anything else is an unreachable command.
# Scoped to agentic-engineering: jtbd modes and premortem commands are all
# internal by design and have no wrapper.
if [[ "$REL" =~ ^agentic-engineering/(skills/[^/]+/)?commands/([^/]+)\.md$ ]]; then
  name="${BASH_REMATCH[2]}"
  installer="$REPO/agentic-engineering/install.sh"
  if [[ -f "$installer" ]]; then
    user_cmds="$(awk '/^USER_COMMANDS=\(/,/^\)/' "$installer" | grep -v 'USER_COMMANDS\|^)' | tr -d ' \t')"
    case "$name" in
      frontend|implement|review) : ;;  # documented internal — called by /ship
      *)
        if ! grep -qx "$name" <<<"$user_cmds"; then
          fail "Command '$name' is in neither USER_COMMANDS (agentic-engineering/install.sh) nor the internal set (frontend/implement/review). It will not install and cannot be invoked."
        fi ;;
    esac
  fi
fi

# --- C. 'user-invocable' must never appear in a source SKILL.md --------------
# The field is valid in the CLI but rejected by the claude.ai skill packager.
# agentic-engineering's installer patches it in post-copy; source must stay clean.
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
    fail "$REL contains 'user-invocable' in its frontmatter — it leaked into source. The claude.ai packager rejects it; agentic-engineering/install.sh adds it post-copy. Remove it."
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

if ((${#ERRORS[@]})); then
  printf 'Plugin integrity check failed:\n' >&2
  printf '  - %s\n' "${ERRORS[@]}" >&2
  exit 2
fi
exit 0
