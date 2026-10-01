#!/usr/bin/env bash
# SessionStart hook for agentic-engineering (matcher: startup|clear|compact).
#
# Emits ONE JSON object on stdout: hookSpecificOutput.additionalContext. That is
# the only field Claude Code consumes for SessionStart context. Emitting a second
# shape (additional_context, top-level additionalContext) makes Claude Code inject
# the text twice.
#
# Contract:
#   - no docs/INDEX.md in the project  -> router only, marked "not set up here"
#   - docs/INDEX.md present            -> router + memory-doc read list
#   - active CURRENT in .agentic/focus.md -> + task title, PLAN progress
#   - linked worktree (scaffolded)     -> + branch + main folder (unless focus names worktree_of)
#   - main folder with .claude/worktrees/* -> + count, pointer to /worktree
#   - injected text never exceeds 40 lines
#   - always exit 0; never write to stderr on the happy path
#   - AGENTIC_SESSION_HOOK=0 -> emit nothing (headless drivers wanting bare context)
#
# Pure bash + awk + sed. No jq, no python: the hook runs on every session start
# of every project the plugin is enabled in.

set -u

[ "${AGENTIC_SESSION_HOOK:-1}" = "0" ] && exit 0

payload=""
if [ ! -t 0 ]; then
  payload="$(cat 2>/dev/null || true)"
fi

# Pull a top-level string field out of the one-line hook payload. Good enough for
# "source" and "cwd"; anything unparseable falls back to the default.
payload_field() {
  printf '%s' "$payload" | tr -d '\n' \
    | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n 1
}

source_kind="$(payload_field source)"
proj="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$proj" ]; then
  proj="$(payload_field cwd)"
fi
[ -n "$proj" ] && [ -d "$proj" ] || proj="$PWD"

# Single-line, printable, bounded. Focus titles are user-written text headed into
# JSON: control characters would make the whole object invalid and the context
# would be dropped silently.
clean() {
  local max="$1" s
  s="$(printf '%s' "$2" | tr -d '\000-\010\012-\037\177')"
  s="${s:0:$max}"
  if command -v iconv >/dev/null 2>&1; then
    # Truncation can split a UTF-8 sequence; drop the broken tail.
    s="$(printf '%s' "$s" | iconv -c -f UTF-8 -t UTF-8 2>/dev/null || printf '%s' "$s")"
  fi
  printf '%s' "$s"
}

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\t'/\\t}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\n'/\\n}"
  printf '%s' "$s"
}

lines=()
add() { lines+=("$1"); }

add "agentic-engineering router (SessionStart hook). Intent → command, invoke via Skill tool as agentic-engineering:<name>:"
add "  bug · failing test · crash · regression       → /fix"
add "  idea or \"we should…\" for later               → /note"
add "  small change to existing feature (shortcut, format, option, perf, split) → /improve"
add "  new feature or capability                     → /feature"
add "  \"what's left\" · \"what's next\" · \"where are we\" → /status"
add "Explicit slash command or system-prompt instruction wins over this table. Intent unclear → ask, don't guess."

index="$proj/docs/INDEX.md"
if [ ! -f "$index" ]; then
  add "No docs/INDEX.md here — workflow not set up in this project. Ordinary requests stay ordinary work; use table only when user invokes a command or asks to set up (/init, /bootstrap)."
else
  mode="$(awk 'NR==1 && $0!="---"{exit} NR>1 && $0=="---"{exit} /^mode:/{sub(/^mode:[[:space:]]*/,""); sub(/[[:space:]#].*$/,""); print; exit}' "$index" 2>/dev/null)"
  reads="docs/INDEX.md"
  [ -f "$proj/docs/MEMORY.md" ] && reads="$reads, docs/MEMORY.md"
  [ -f "$proj/docs/CONSTITUTION.md" ] && reads="$reads, docs/CONSTITUTION.md"
  add "Workflow active (mode: $(clean 10 "${mode:-full}")). Before changing code or docs, read in full: $reads."
fi

focus="$proj/.agentic/focus.md"
if [ -f "$focus" ]; then
  # CURRENT fields + PLAN counts + first open PLAN line, one awk pass.
  parsed="$(awk '
    /^# CURRENT/ { sec="c"; next }
    /^# PLAN/    { sec="p"; next }
    /^# /        { sec=""; next }
    sec=="c" && /^(title|feature|since|set_by|note|worktree_of):/ {
      k=$0; sub(/:.*/, "", k); v=$0; sub(/^[^:]*:[[:space:]]*/, "", v); print "C_" k "\t" v; next
    }
    sec=="p" && /^[[:space:]]*- \[[xX]\]/ { done++; total++; next }
    sec=="p" && /^[[:space:]]*- \[ \]/ {
      total++
      if (nextstep == "") { nextstep=$0; sub(/^[[:space:]]*- \[ \][[:space:]]*/, "", nextstep) }
      next
    }
    END { print "P_done\t" done+0; print "P_total\t" total+0; print "P_next\t" nextstep }
  ' "$focus" 2>/dev/null)"

  get() { printf '%s\n' "$parsed" | awk -F '\t' -v k="$1" '$1==k { sub(/^[^\t]*\t/, ""); print; exit }'; }

  title="$(clean 120 "$(get C_title)")"
  if [ -n "$title" ]; then
    meta=""
    f="$(clean 40 "$(get C_feature)")"; [ -n "$f" ] && meta="feature: $f"
    s="$(clean 20 "$(get C_since)")";   [ -n "$s" ] && meta="${meta:+$meta · }since $s"
    b="$(clean 40 "$(get C_set_by)")";  [ -n "$b" ] && meta="${meta:+$meta · }via $b"
    add "Active task (.agentic/focus.md): $title"
    [ -n "$meta" ] && add "  $meta"
    n="$(clean 120 "$(get C_note)")"; [ -n "$n" ] && add "  note: $n"
    w="$(clean 120 "$(get C_worktree_of)")"; [ -n "$w" ] && add "  worktree of: $w"
    total="$(get P_total)"
    if [ "${total:-0}" -gt 0 ] 2>/dev/null; then
      step="$(clean 100 "$(get P_next)")"
      add "  PLAN $(get P_done)/$total done${step:+ · next: $step}"
    fi
    add "Name this task in first reply and offer to resume it, unless user asks for something else."
    [ "$source_kind" = "compact" ] && add "Context compacted: PLAN in .agentic/focus.md = where chain stopped. Re-read before resuming."
  fi
fi

# Worktrees, read from files only (no git call). A linked worktree's .git is a file
# pointing into <main>/.git/worktrees/<name>; a submodule's points elsewhere.
if [ -f "$index" ] && [ -z "${w:-}" ]; then
  if [ -f "$proj/.git" ]; then
    gd="$(sed -n '1s/^gitdir:[[:space:]]*//p' "$proj/.git" 2>/dev/null)"
    case "$gd" in /*) ;; ?*) gd="$proj/$gd" ;; esac
    case "$gd" in
      */.git/worktrees/*)
        br="$(sed -n '1s#^ref: refs/heads/##p' "$gd/HEAD" 2>/dev/null)"
        main="$(cd "${gd%/.git/worktrees/*}" 2>/dev/null && pwd -P)"
        add "In a worktree: branch $(clean 80 "${br:-detached}"), main folder $(clean 120 "${main:-?}"). Commits land on this branch only. Chain end offers merge/PR/keep/discard; later: /worktree from main folder."
        ;;
    esac
  elif [ -d "$proj/.claude/worktrees" ]; then
    n=0
    for d in "$proj"/.claude/worktrees/*/; do [ -f "${d}.git" ] && n=$((n + 1)); done
    [ "$n" -gt 0 ] && add "Worktrees: $n under .claude/worktrees/. /worktree lists them and merges or removes finished ones."
  fi
fi

# Hard cap. The router is 7 lines and state adds at most 10, so this never trims
# in practice; it exists so a future edit cannot quietly blow the budget.
text=""
i=0
for l in "${lines[@]}"; do
  i=$((i + 1))
  [ "$i" -gt 40 ] && break
  text="${text}${l}"$'\n'
done

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$(json_escape "$text")"
exit 0
