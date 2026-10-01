#!/usr/bin/env bash
# worktree.sh — deterministic git worktree lifecycle for agentic-engineering.
#
# Two kinds, same mechanics:
#   story — /ship-all's parallel path: one worktree per [P] story, shipped there by
#           another session, merged back by the next /ship-all
#   task  — one /feature, /ship, /fix or /improve run that this session moves into
#
# The command bodies (shared/worktree.md) own every decision and every human gate;
# this script owns only mechanics that must not be improvised. It never deletes
# anything unless the caller names the destructive flag, and it never forces.
#
#   worktree.sh pref
#   worktree.sh where
#   worktree.sh create <ID> <branch> [--kind story|task] [--carry-focus] [--base REF] [--dir DIR]
#   worktree.sh seed-focus <path> <STORY-ID> <title> <feature> <base-branch>
#   worktree.sh list [--kind story|task]
#   worktree.sh merge <path>
#   worktree.sh remove <path> [--delete-branch | --discard]
#
# pref and where run anywhere; everything else from the MAIN worktree root.
# Exit codes: 0 ok · 2 usage · 3 merge conflict outside append-only files (merge
# aborted, tree unchanged) · 4 refused (dirty tree, not merged, wrong location) ·
# 1 other git failure.
#
# Output lines start with an upper-case verb (PREF, MAIN, WORKTREE, CREATED,
# IGNORED, CARRIED, LOCAL-ONLY, NOTE, SEEDED, MERGED, APPENDED, CONFLICT, REFUSED,
# REMOVED, KEPT) so the caller can parse them.

set -uo pipefail

# Claude Code's own `claude -w` and EnterWorktree use this directory; EnterWorktree
# can only switch between worktrees that live here.
DIR=".claude/worktrees"

die() { echo "REFUSED: $*" >&2; exit 4; }
usage() { sed -n '2,29p' "$0" >&2; exit 2; }

main_root() {
  local gd gc
  gd="$(cd "$(git rev-parse --git-dir 2>/dev/null)" 2>/dev/null && pwd -P)" || die "not inside a git repository"
  gc="$(cd "$(git rev-parse --git-common-dir 2>/dev/null)" 2>/dev/null && pwd -P)"
  # Inside a submodule git-dir != common-dir too, but show-superproject-working-tree
  # is non-empty there; a linked worktree is the only case we refuse.
  if [ "$gd" != "$gc" ] && [ -z "$(git rev-parse --show-superproject-working-tree 2>/dev/null)" ]; then
    die "run from the main worktree, not a linked one ($(git rev-parse --show-toplevel))"
  fi
  git rev-parse --show-toplevel
}

slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-' '-' | sed 's/--*/-/g; s/^-//; s/-$//'; }

is_clean() { [ -z "$(git -C "$1" status --porcelain --untracked-files=normal 2>/dev/null)" ]; }

# Ignore a path through .git/info/exclude: local, shared by every worktree of the
# repo, never committed. A worktree directory that is not ignored gets committed
# wholesale by the next `git add -A` in the main tree; an unignored .agentic/ in the
# new worktree (its .gitignore line still uncommitted in main) gets committed there.
exclude() {
  local ex; ex="$(git rev-parse --git-common-dir)/info/exclude"
  mkdir -p "$(dirname "$ex")"
  [ -s "$ex" ] && [ -n "$(tail -c1 "$ex")" ] && echo >> "$ex"
  echo "$1" >> "$ex"
  echo "IGNORED: added $1 to .git/info/exclude (local, never committed)"
}

# Move CURRENT and PLAN out of the main tree's focus into the new worktree: the task
# now lives there. NEXT stays — it is the main tree's queue. Fields written before
# any heading are CURRENT with its `# CURRENT` line missing (a model slip seen in
# practice); they move too, under a restored heading.
carry_focus() {
  local path="$1" src=".agentic/focus.md" has_cur=0
  if [ ! -f "$src" ]; then echo "CARRIED nothing (no .agentic/focus.md)"; return 0; fi
  grep -q '^# CURRENT[[:space:]]*$' "$src" && has_cur=1
  mkdir -p "$path/.agentic"
  awk -v has_cur="$has_cur" '
    /^# / { sec = $0; if (sec ~ /^# (CURRENT|PLAN)[[:space:]]*$/) print; next }
    sec == "" { if (NF && !has_cur) { if (!hdr) { print "# CURRENT"; hdr = 1 } print }; next }
    sec ~ /^# (CURRENT|PLAN)[[:space:]]*$/ { print }
  ' "$src" > "$path/.agentic/focus.md"
  local rest
  rest="$(awk -v has_cur="$has_cur" '
    /^# / { sec = $0; keep = (sec !~ /^# (CURRENT|PLAN)[[:space:]]*$/) }
    sec == "" { if (has_cur) print; next }
    keep
  ' "$src")"
  if [ -n "$(printf '%s' "$rest" | tr -d '[:space:]')" ]; then printf '%s\n' "$rest" > "$src"; else rm -f "$src"; fi
  echo "CARRIED CURRENT + PLAN to $path/.agentic/focus.md (NEXT stays here)"
}

cmd_create() {
  local id="${1:-}" branch="${2:-}" base="" kind="story" carry=0
  [ -n "$id" ] && [ -n "$branch" ] || usage
  shift 2
  while [ $# -gt 0 ]; do
    case "$1" in
      --dir) DIR="$2"; shift 2 ;;
      --base) base="$2"; shift 2 ;;
      --kind) kind="$2"; shift 2 ;;
      --carry-focus) carry=1; shift ;;
      *) usage ;;
    esac
  done
  case "$kind" in story|task) ;; *) usage ;; esac
  local root; root="$(main_root)" || exit 4
  cd "$root" || exit 1
  [ -n "$base" ] || base="$(git rev-parse --abbrev-ref HEAD)"
  local name; name="$(slug "$id")"
  [ -n "$name" ] || die "'$id' gives an empty directory name"
  local path="$DIR/$name"
  [ -e "$path" ] && die "$path already exists"
  git show-ref --verify --quiet "refs/heads/$branch" && die "branch $branch already exists"
  local dirty; dirty="$(git status --porcelain --untracked-files=normal | wc -l | tr -d ' ')"
  mkdir -p "$DIR"
  git check-ignore -q "$DIR/" 2>/dev/null || exclude "/$DIR/"
  git worktree add -q -b "$branch" "$path" "$base" || { echo "git worktree add failed" >&2; exit 1; }
  # The base also lives in focus.md, but /focus done clears CURRENT there. Branch
  # config survives it, and `git branch -d/-D` removes it with the branch.
  git config "branch.$branch.agenticBase" "$base"
  git config "branch.$branch.agenticKind" "$kind"
  echo "CREATED $root/$path $branch $base"
  git -C "$path" check-ignore -q .agentic/focus.md 2>/dev/null || exclude ".agentic/"
  [ "$dirty" -gt 0 ] && echo "NOTE main tree has $dirty uncommitted file(s) — they stay here; the worktree starts from $base"
  [ "$carry" = 1 ] && carry_focus "$path"
  # Ignored local config the worktree will not have. Listed, never copied here:
  # copying is the caller's decision.
  local f
  for f in .env*; do
    [ -f "$f" ] && git check-ignore -q "$f" && echo "LOCAL-ONLY $f"
  done
  return 0
}

cmd_seed_focus() {
  local path="${1:-}" story="${2:-}" title="${3:-}" feature="${4:-}" base="${5:-}"
  [ -n "$path" ] && [ -n "$story" ] && [ -n "$base" ] || usage
  [ -d "$path" ] || die "no worktree at $path"
  local root; root="$(main_root)" || exit 4
  mkdir -p "$path/.agentic"
  cat > "$path/.agentic/focus.md" <<EOF
# CURRENT
title: $story — $title
feature: $feature
since: $(date '+%Y-%m-%d %H:%M')
set_by: /ship-all (worktree)
note: run /ship $story in this worktree; Phase 5 docs + Phase 7 cleanup run at merge
worktree_of: $root
worktree_base: $base
EOF
  echo "SEEDED $path/.agentic/focus.md"
}

cmd_list() {
  local want=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --kind) want="$2"; shift 2 ;;
      *) usage ;;
    esac
  done
  local root; root="$(main_root)" || exit 4
  local wt="" br=""
  # Only worktrees this script created: their branch carries agenticBase. A
  # worktree from `claude -w` or a hand-made `git worktree add` is not ours to finish.
  git -C "$root" worktree list --porcelain | while IFS= read -r line; do
    case "$line" in
      "worktree "*) wt="${line#worktree }" ;;
      "branch "*) br="${line#branch refs/heads/}" ;;
      "")
        local base=""
        [ -n "$br" ] && base="$(git -C "$root" config "branch.$br.agenticBase" 2>/dev/null)"
        if [ -n "$wt" ] && [ "$wt" != "$root" ] && [ -n "$base" ]; then
          local kind; kind="$(git -C "$root" config "branch.$br.agenticKind" 2>/dev/null)"
          kind="${kind:-story}"
          if [ -z "$want" ] || [ "$kind" = "$want" ]; then
            local state="clean"; is_clean "$wt" || state="dirty"
            local ahead; ahead="$(git -C "$root" rev-list --count "$base..$br" 2>/dev/null || echo "?")"
            local merged="no"
            git -C "$root" merge-base --is-ancestor "$br" HEAD 2>/dev/null && merged="yes"
            echo "WORKTREE $wt branch=$br kind=$kind state=$state ahead=$ahead base=$base merged=$merged"
          fi
        fi
        wt=""; br="" ;;
    esac
  done
}

# `PREF ask (default)` = nobody chose yet. Commands that already ask on main add the
# worktree option either way; /feature, which never asked, asks only on an explicit
# `ask`.
cmd_pref() {
  local v; v="$(git config --get agentic.worktree 2>/dev/null)"
  case "$v" in
    ask|always|never) echo "PREF $v" ;;
    "") echo "PREF ask (default)" ;;
    *) echo "PREF ask (default — agentic.worktree=$v is not ask, always or never, ignored)" ;;
  esac
}

cmd_where() {
  local top; top="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
  local main; main="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
  if [ "$(cd "$top" && pwd -P)" = "$(cd "$main" && pwd -P)" ]; then
    echo "MAIN $main"
    return 0
  fi
  local br; br="$(git rev-parse --abbrev-ref HEAD)"
  local base kind
  base="$(git config "branch.$br.agenticBase" 2>/dev/null)"
  kind="$(git config "branch.$br.agenticKind" 2>/dev/null)"
  if [ -z "$kind" ]; then
    if [ -n "$base" ]; then kind="story"; else kind="external"; fi
  fi
  echo "WORKTREE $top branch=$br kind=$kind base=${base:-?} main=$main"
}

# Append-only story logs: two branches that each appended one entry conflict at
# EOF. Taking both entries is the correct resolution — but NOT via
# `git merge-file --union`: git refines the conflict by aligning the lines the two
# entries share (### AC Coverage, the table header, ### Files changed), and union
# then splices one story's rows into the other's entry. Resolve by construction
# instead: keep our file whole, append exactly what their side added past the
# merge base, and only when their side is a pure append.
appendable() { [[ "$1" =~ ^docs/features/[^/]+/PROGRESS\.md$ ]]; }

cmd_merge() {
  local path="${1:-}"
  [ -n "$path" ] || usage
  local root; root="$(main_root)" || exit 4
  cd "$root" || exit 1
  [ -d "$path" ] || die "no worktree at $path"
  is_clean "$path" || die "worktree $path has uncommitted changes — commit or stash them there first"
  is_clean "$root" || die "main tree has uncommitted changes — commit or stash them first"
  local branch; branch="$(git -C "$path" rev-parse --abbrev-ref HEAD)"
  local into; into="$(git rev-parse --abbrev-ref HEAD)"
  local merge_out
  if merge_out="$(git merge --no-ff --no-edit -q "$branch" 2>&1)"; then
    echo "MERGED $branch into $into $(git rev-parse --short HEAD)"
    return 0
  fi
  local conflicted; conflicted="$(git diff --name-only --diff-filter=U)"
  if [ -z "$conflicted" ]; then
    # Not a conflict: no identity, hook refusal, unrelated histories … say which.
    git merge --abort 2>/dev/null
    echo "git merge failed, tree unchanged:" >&2
    printf '%s\n' "$merge_out" | sed 's/^/  /' >&2
    exit 1
  fi
  local f other="" tmp; tmp="$(mktemp -d)"
  while IFS= read -r f; do
    appendable "$f" || { other="$other $f"; continue; }
    git show ":1:$f" > "$tmp/base" 2>/dev/null || : > "$tmp/base"
    git show ":3:$f" > "$tmp/theirs" 2>/dev/null || : > "$tmp/theirs"
    local n; n="$(wc -c < "$tmp/base" | tr -d ' ')"
    # Their side must be base + appended bytes; an edit above the tail is a real conflict.
    cmp -s -n "$n" "$tmp/base" "$tmp/theirs" || other="$other $f(edited-not-appended)"
  done <<< "$conflicted"
  if [ -n "$other" ]; then
    rm -rf "$tmp"
    git merge --abort
    echo "CONFLICT$other — merge aborted, tree unchanged. Resolve by hand, or merge this branch alone."
    exit 3
  fi
  while IFS= read -r f; do
    git show ":1:$f" > "$tmp/base" 2>/dev/null || : > "$tmp/base"
    git show ":2:$f" > "$tmp/ours"
    git show ":3:$f" > "$tmp/theirs"
    local n; n="$(wc -c < "$tmp/base" | tr -d ' ')"
    {
      cat "$tmp/ours"
      [ -s "$tmp/ours" ] && [ -n "$(tail -c1 "$tmp/ours")" ] && echo
      tail -c "+$((n + 1))" "$tmp/theirs"
    } > "$f"
    git add -- "$f"
    echo "APPENDED $f (their new entries after ours)"
  done <<< "$conflicted"
  rm -rf "$tmp"
  local commit_out
  commit_out="$(git commit -q --no-edit 2>&1)" || { echo "merge commit failed:" >&2; printf '%s\n' "$commit_out" | sed 's/^/  /' >&2; exit 1; }
  echo "MERGED $branch into $into $(git rev-parse --short HEAD)"
}

cmd_remove() {
  local path="${1:-}" mode="${2:-}"
  [ -n "$path" ] || usage
  case "$mode" in ""|--delete-branch|--discard) ;; *) usage ;; esac
  local root; root="$(main_root)" || exit 4
  cd "$root" || exit 1
  [ -d "$path" ] || die "no worktree at $path"
  local branch; branch="$(git -C "$path" rev-parse --abbrev-ref HEAD)"
  if ! is_clean "$path"; then
    echo "REFUSED: $path holds uncommitted files that exist nowhere else:" >&2
    git -C "$path" status --porcelain --untracked-files=normal >&2
    exit 4
  fi
  if [ "$mode" = "--delete-branch" ] && ! git merge-base --is-ancestor "$branch" HEAD; then
    die "$branch is not merged into $(git rev-parse --abbrev-ref HEAD) — merge it, or discard explicitly"
  fi
  # The run's auto-log lives in the worktree's ignored .agentic/; keep it.
  if [ -s "$path/.agentic/auto-log.md" ]; then
    mkdir -p .agentic
    cat "$path/.agentic/auto-log.md" >> .agentic/auto-log.md
    echo "CARRIED $path/.agentic/auto-log.md into .agentic/auto-log.md"
  fi
  git worktree remove "$path" || { echo "git worktree remove failed" >&2; exit 1; }
  git worktree prune
  echo "REMOVED $path"
  case "$mode" in
    --delete-branch) git branch -d -q "$branch" && echo "REMOVED branch $branch" ;;
    --discard) git branch -D -q "$branch" && echo "REMOVED branch $branch (discarded, unmerged)" ;;
    *) echo "KEPT branch $branch" ;;
  esac
}

sub="${1:-}"
[ -n "$sub" ] || usage
shift
case "$sub" in
  pref) cmd_pref "$@" ;;
  where) cmd_where "$@" ;;
  create) cmd_create "$@" ;;
  seed-focus) cmd_seed_focus "$@" ;;
  list) cmd_list "$@" ;;
  merge) cmd_merge "$@" ;;
  remove) cmd_remove "$@" ;;
  *) usage ;;
esac
