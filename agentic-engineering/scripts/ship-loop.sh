#!/usr/bin/env bash
# ship-loop.sh — ship the open stories unattended, one fresh headless session each.
#
#   ship-loop.sh [--max N] [--budget-usd N] [--model M] [--plugin-dir DIR]
#                [--permission-mode MODE] [--dry-run]
#
# Each story runs `/agentic-engineering:ship --auto` in its own `claude -p`
# session under a fresh --session-id: zero context carried from one story to the
# next, no compaction ever, and nothing written into a session that launched the loop.
# Run from the project root, on the feature branch. STORIES.md is the state, so the
# loop resumes wherever it stopped: run it again.
#
# Stops, and says how to continue, when:
#   - no unchecked story is left                       → exit 0 (DONE)
#   - --max stories shipped                            → exit 0 (MAX)
#   - a run hard-paused or paused for a human          → exit 3 (PAUSED)
#   - a run shipped nothing (a gate, an error, budget) → exit 4 (STALLED)
#   - claude failed to run                             → exit 1
# A paused or stalled run prints `claude --resume <session>` to answer it by hand.
#
# Unattended means the session runs Bash, edits and git without asking: tools are
# allowed explicitly (--permission-mode acceptEdits + --allowedTools). Every
# hard-override pause in the workflow still stops the loop.
#
# Lines: .agentic/ship-loop.log · transcripts: .agentic/ship-loop/<n>.jsonl

set -uo pipefail

MAX=20
BUDGET=5
MODEL=""
PLUGIN_DIR=""
PERM="acceptEdits"
DRY=0
TOOLS="Bash Read Write Edit MultiEdit Glob Grep Agent Task Skill TodoWrite TaskCreate TaskUpdate TaskList EnterWorktree ExitWorktree"
NOTE="Unattended run by ship-loop.sh: no human is present and AskUserQuestion is unavailable. Ship exactly one story, then stop. When a gate or a hard pause needs a human, print the question with its options and end your turn."

usage() { sed -n '2,24p' "$0" >&2; exit 2; }
while [ $# -gt 0 ]; do
  case "$1" in
    --max) MAX="$2"; shift 2 ;;
    --budget-usd) BUDGET="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --plugin-dir) PLUGIN_DIR="$2"; shift 2 ;;
    --permission-mode) PERM="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage ;;
    *) echo "ship-loop: unknown option $1" >&2; usage ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "ship-loop: not in a git repository" >&2; exit 2; }
cd "$ROOT" || exit 2
[ -f docs/INDEX.md ] || { echo "ship-loop: no docs/INDEX.md — run /init first" >&2; exit 2; }
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
case "$BRANCH" in
  main|master)
    [ "$(git config --get agentic.worktree 2>/dev/null)" = "always" ] \
      || { echo "ship-loop: on $BRANCH — check out the feature branch first (/ship would stop to ask where to work)" >&2; exit 2; } ;;
esac

open_stories() { cat docs/features/*/STORIES.md 2>/dev/null | grep -oE '^- \[ \] STORY-[0-9]+' | sed 's/^- \[ \] //'; }
done_stories() { cat docs/features/*/STORIES.md 2>/dev/null | grep -oE '^- \[[xX]\] STORY-[0-9]+' | sed -E 's/^- \[[xX]\] //' | sort; }
field() { sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\).*/\1/p" "$2" | head -n 1; }
new_id() {
  if [ -r /proc/sys/kernel/random/uuid ]; then cat /proc/sys/kernel/random/uuid
  elif command -v uuidgen >/dev/null 2>&1; then uuidgen | tr '[:upper:]' '[:lower:]'
  else python3 -c 'import uuid; print(uuid.uuid4())'; fi
}
money() { local v; [ -n "$1" ] && v="$(LC_NUMERIC=C printf '%.2f' "$1" 2>/dev/null)" && printf '%s' "$v" || printf '?'; }
# Variables that bind a `claude` process to the session that launched it — the local
# CLI's, and a cloud session's ingress. Inherited, they make every run write into the
# parent's transcript under the parent's id. Auth and config variables stay.
UNSET=(CLAUDECODE CLAUDE_CODE_SESSION_ID CLAUDE_CODE_ENTRYPOINT CLAUDE_PROJECT_DIR
       CLAUDE_CODE_REMOTE_SESSION_ID CLAUDE_CODE_CHILD_SESSION CLAUDE_CODE_SESSION_ATTENDED
       SESSION_INGRESS_URL CLAUDE_SESSION_INGRESS_TOKEN_FILE CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2
       CLAUDE_CODE_SYNC_SESSION_REFS CLAUDE_CODE_MESSAGING_SOCKET CLAUDE_CODE_MESSAGING_TOKEN
       CLAUDE_CODE_TEE_SDK_STDOUT)
envcmd=(env); for v in "${UNSET[@]}"; do envcmd+=(-u "$v"); done

mkdir -p .agentic/ship-loop
# Transcripts and the log are working state: never let a story's `git add -A` take them.
git check-ignore -q .agentic/ship-loop.log 2>/dev/null \
  || echo ".agentic/" >> "$(git rev-parse --git-common-dir)/info/exclude"
LOG=".agentic/ship-loop.log"
say() { printf '%s\n' "$1"; printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M')" "$1" >> "$LOG"; }

cmd=(claude -p --output-format stream-json --verbose --permission-mode "$PERM" --max-budget-usd "$BUDGET"
     --append-system-prompt "$NOTE")
[ -n "$MODEL" ] && cmd+=(--model "$MODEL")
[ -n "$PLUGIN_DIR" ] && cmd+=(--plugin-dir "$PLUGIN_DIR")
cmd+=(--allowedTools $TOOLS)

if [ "$DRY" = 1 ]; then
  echo "DRY RUN — branch $BRANCH, $(open_stories | wc -l | tr -d ' ') open stories, up to $MAX this run:"
  open_stories | sed 's/^/  /'
  echo "per story: printf '/agentic-engineering:ship --auto' | ${cmd[*]} --session-id <fresh uuid>"
  exit 0
fi

shipped=0
n=0
while :; do
  if [ -z "$(open_stories)" ]; then say "DONE: no unchecked story left · $shipped shipped this run"; exit 0; fi
  if [ "$shipped" -ge "$MAX" ]; then say "MAX: $shipped shipped, stopping as asked · run again to continue"; exit 0; fi
  n=$((n + 1))
  out=".agentic/ship-loop/$n.jsonl"
  before="$(done_stories)"
  log_before=0; [ -f .agentic/auto-log.md ] && log_before="$(wc -l < .agentic/auto-log.md)"
  start=$(date +%s)
  sid="$(new_id)"
  printf '%s' "/agentic-engineering:ship --auto" \
    | "${envcmd[@]}" "${cmd[@]}" --session-id "$sid" > "$out" 2> "$out.err"
  rc=$?
  secs=$(( $(date +%s) - start ))
  started="$(field session_id "$out")"
  cost="$(money "$(field total_cost_usd "$out")")"
  new="$(comm -13 <(printf '%s\n' "$before") <(done_stories) | tr '\n' ' ' | sed 's/ $//')"
  paused=0
  if [ -f .agentic/auto-log.md ] && tail -n "+$((log_before + 1))" .agentic/auto-log.md | grep -q 'HARD-PAUSE'; then paused=1; fi
  grep -q '"type":"result"' "$out" && grep '"type":"result"' "$out" | grep -qE 'HARD-PAUSE|PAUSED' && paused=1
  resume="resume by hand: claude --resume $sid"
  if [ "$paused" = 1 ]; then
    [ -n "$new" ] && say "SHIPPED $new · \$$cost · ${secs}s · session $sid" && shipped=$((shipped + $(wc -w <<<"$new")))
    say "PAUSED: run $n stopped for a human answer — $resume · transcript $out"
    exit 3
  fi
  if [ -z "$new" ]; then
    if [ "$rc" -ne 0 ] && [ -z "$started" ]; then say "FAILED: claude exited $rc before a session started — see $out.err"; exit 1; fi
    say "STALLED: run $n shipped nothing (exit $rc) — $resume · transcript $out"
    exit 4
  fi
  shipped=$((shipped + $(wc -w <<<"$new")))
  say "SHIPPED $new · \$$cost · ${secs}s · session $sid"
done
