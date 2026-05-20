#!/usr/bin/env bash
# agentic-statusline.sh — Claude Code statusline for agentic-engineering.
# Prints the current focus title from .agentic/focus.md.
# Falls back to git branch. Empty string if neither available.

set -eu

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
focus_file="$project_dir/.agentic/focus.md"

if [[ -f "$focus_file" ]]; then
  title=$(awk '
    /^# CURRENT/        { in_current=1; next }
    /^# / && in_current { exit }
    in_current && /^title:/ {
      sub(/^title:[[:space:]]*/, "")
      print
      exit
    }
  ' "$focus_file")

  if [[ -n "${title:-}" ]]; then
    printf '🎯 %s' "$title"
    exit 0
  fi
fi

if branch=$(git -C "$project_dir" branch --show-current 2>/dev/null) && [[ -n "$branch" ]]; then
  printf '🌿 %s' "$branch"
fi
