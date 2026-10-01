#!/usr/bin/env bash
# scripts/worktree.sh end to end: a feature with two [P] stories shipped in two
# worktrees and merged back, PROGRESS.md correct in the main tree, nothing removed
# before it is asked for, and every destructive path refusing what it should. Then
# the task kind: preference, location, focus carried in, auto-log carried out.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$HERE/../../scripts/worktree.sh"
FAILS=0
PASSES=0
pass() { PASSES=$((PASSES + 1)); echo "  [PASS] $1"; }
fail() { FAILS=$((FAILS + 1)); echo "  [FAIL] $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/         /'; }
check() { local d="$1"; shift; if out="$("$@" 2>&1)"; then pass "$d"; else fail "$d" "$out"; fi; }
g() { git -c user.name=t -c user.email=t@example.invalid "$@"; }
# The scripts under test commit too (worktree.sh merge). CI runners have no git
# identity; give every git call in this test one, never touching global config.
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@example.invalid GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@example.invalid

echo "--- worktree lifecycle"
W=.claude/worktrees
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
R="$T/repo"
mkdir -p "$R/docs/features/notes" "$R/src"
cd "$R" || exit 1
g init -q -b main
printf ".agentic/\n" > .gitignore; touch src/.gitkeep
cat > docs/features/notes/STORIES.md <<'MD'
## Notes — Stories

- [ ] STORY-001: Create a note [P]
  **Priority:** P1
  **Acceptance Criteria:**
  - [ ] AC-1: createNote returns the note
  **Parallel:** yes — no dependency on other stories

- [ ] STORY-002: List notes [P]
  **Priority:** P1
  **Acceptance Criteria:**
  - [ ] AC-1: listNotes returns every note
  **Parallel:** yes — no dependency on other stories
MD
printf '# Notes — Progress\n' > docs/features/notes/PROGRESS.md
g add -A && g commit -q -m "chore(notes): add stories"
g checkout -q -b feat/notes

# --- create ------------------------------------------------------------------
check "create worktree for STORY-001" bash "$WT" create STORY-001 feat/notes-story-001
check "create worktree for STORY-002" bash "$WT" create STORY-002 feat/notes-story-002
check "both worktree dirs exist" test -d $W/story-001 -a -d $W/story-002
check "$W/ is git-ignored after create" git check-ignore -q $W/story-001
check "ignored through .git/info/exclude: .gitignore untouched, main tree clean" bash -c "
  grep -qxF '/$W/' .git/info/exclude && [ -z \"\$(git status --porcelain)\" ]"
check "exclude line written once across two creates" bash -c "[ \$(grep -cxF '/$W/' .git/info/exclude) -eq 1 ]"
check "refuses a second worktree for the same story" bash -c "! bash '$WT' create STORY-001 feat/other"
check "refuses to run from inside a linked worktree" \
  bash -c "cd $W/story-001 && ! bash '$WT' create STORY-009 feat/x"

# --- seed focus --------------------------------------------------------------
bash "$WT" seed-focus $W/story-001 STORY-001 "Create a note" notes feat/notes >/dev/null
bash "$WT" seed-focus $W/story-002 STORY-002 "List notes" notes feat/notes >/dev/null
check "seeded focus names the story, worktree_of and worktree_base" bash -c "
  grep -q '^title: STORY-001 — Create a note' $W/story-001/.agentic/focus.md &&
  grep -q '^worktree_of: $R' $W/story-001/.agentic/focus.md &&
  grep -q '^worktree_base: feat/notes' $W/story-001/.agentic/focus.md &&
  grep -q '^set_by: /ship-all (worktree)' $W/story-001/.agentic/focus.md"
check "base recorded in branch config (survives /focus done)" \
  bash -c "[ \"\$(git config branch.feat/notes-story-001.agenticBase)\" = feat/notes ]"
check "seeded focus.md is not tracked (per-worktree, ignored)" \
  bash -c "cd $W/story-001 && git check-ignore -q .agentic/focus.md"

# --- ship each story in its own worktree (simulated /ship Phases 1-4) --------
ship_story() {
  local wt="$1" id="$2" file="$3" fn="$4"
  (
    cd "$wt" || exit 1
    printf 'export function %s() {}\n' "$fn" > "src/$file"
    sed -i.bak "s/^- \[ \] $id:/- [x] $id:/" docs/features/notes/STORIES.md && rm -f docs/features/notes/STORIES.md.bak
    cat >> docs/features/notes/PROGRESS.md <<MD

## $id: $fn — 2026-09-30

### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | $fn works | test/$file:$fn | unit |

### Files changed
- src/$file
MD
    g add -A && g commit -q -m "feat(notes): $id — $fn"
  )
}
ship_story $W/story-001 STORY-001 create.js createNote
ship_story $W/story-002 STORY-002 list.js listNotes

rm -f $W/story-002/.agentic/focus.md   # as after /focus done in that worktree
check "list shows both worktrees, clean, one commit ahead, not merged" bash -c "
  out=\$(bash '$WT' list); echo \"\$out\";
  [ \$(echo \"\$out\" | grep -c 'kind=story state=clean ahead=1 base=feat/notes merged=no') -eq 2 ]"

# --- destructive paths refuse ------------------------------------------------
echo scratch > $W/story-002/notes.tmp
check "remove refuses a dirty worktree and leaves it in place" \
  bash -c "! bash '$WT' remove $W/story-002 --discard && test -f $W/story-002/notes.tmp"
rm $W/story-002/notes.tmp
check "remove --delete-branch refuses an unmerged branch and removes nothing" \
  bash -c "! bash '$WT' remove $W/story-002 --delete-branch && test -d $W/story-002 &&
           git show-ref --verify --quiet refs/heads/feat/notes-story-002"
echo wip > wip.txt
check "merge refuses while the main tree is dirty" bash -c "! bash '$WT' merge $W/story-001"
rm wip.txt

# --- merge back ----------------------------------------------------------------
check "merge STORY-001 (clean merge)" bash "$WT" merge $W/story-001
out="$(bash "$WT" merge $W/story-002 2>&1)"; rc=$?
if [ $rc -eq 0 ] && echo "$out" | grep -q 'APPENDED docs/features/notes/PROGRESS.md'; then
  pass "merge STORY-002: PROGRESS.md EOF conflict resolved by appending their entry"
else
  fail "merge STORY-002: PROGRESS.md EOF conflict resolved by appending their entry" "$out"
fi

P=docs/features/notes/PROGRESS.md
check "main PROGRESS.md has no conflict markers" bash -c "! grep -qE '^(<<<<<<<|=======|>>>>>>>)' $P"
check "main PROGRESS.md holds both story entries, each intact and in merge order" python3 - "$P" <<'PY'
import re, sys
text = open(sys.argv[1]).read()
blocks = re.split(r"(?m)^(?=## STORY-)", text)
ids = [re.match(r"## (STORY-\d+)", b).group(1) for b in blocks if b.startswith("## STORY-")]
assert ids == ["STORY-001", "STORY-002"], ids
for b, fn in zip(blocks[1:], ["createNote", "listNotes"]):
    for needle in ("### AC Coverage", "| AC-1 |", "### Files changed", fn):
        assert needle in b, (needle, b)
    assert b.count("### AC Coverage") == 1, b
print("ok")
PY
check "main STORIES.md has both stories checked" \
  bash -c "grep -q '^- \[x\] STORY-001' docs/features/notes/STORIES.md && grep -q '^- \[x\] STORY-002' docs/features/notes/STORIES.md"
check "both stories' code landed in main" test -f src/create.js -a -f src/list.js
check "merge removed nothing: both worktrees and branches still exist" bash -c "
  test -d $W/story-001 && test -d $W/story-002 &&
  git show-ref --verify --quiet refs/heads/feat/notes-story-001 &&
  git show-ref --verify --quiet refs/heads/feat/notes-story-002"

# A conflict outside the append-only log aborts and leaves the tree unchanged.
bash "$WT" create STORY-003 feat/notes-story-003 >/dev/null
( cd $W/story-003 && echo 'export const x = 1;' > src/create.js && g commit -qam "feat: clash" )
echo 'export const x = 2;' > src/create.js && g commit -qam "feat: clash in main"
head_before="$(git rev-parse HEAD)"
out="$(bash "$WT" merge $W/story-003 2>&1)"; rc=$?
if [ $rc -eq 3 ] && echo "$out" | grep -q 'CONFLICT src/create.js' && [ "$(git rev-parse HEAD)" = "$head_before" ] \
   && [ -z "$(git status --porcelain)" ]; then
  pass "code conflict: merge aborted, exit 3, tree and HEAD unchanged"
else
  fail "code conflict: merge aborted, exit 3, tree and HEAD unchanged" "rc=$rc $out"
fi

# PROGRESS.md edited (not appended) on their side is a real conflict, never auto-resolved.
bash "$WT" create STORY-004 feat/notes-story-004 >/dev/null
( cd $W/story-004 && sed -i.bak 's/^# Notes — Progress$/# Notes — Progress log/' docs/features/notes/PROGRESS.md \
  && rm -f docs/features/notes/PROGRESS.md.bak && printf '\n## STORY-004: x\n' >> docs/features/notes/PROGRESS.md \
  && g commit -qam "feat: story 4 rewrites the log header" )
printf '\n## STORY-005: y\n' >> docs/features/notes/PROGRESS.md && g commit -qam "feat: story 5"
head_before="$(git rev-parse HEAD)"
out="$(bash "$WT" merge $W/story-004 2>&1)"; rc=$?
if [ $rc -eq 3 ] && echo "$out" | grep -q 'PROGRESS.md(edited-not-appended)' && [ "$(git rev-parse HEAD)" = "$head_before" ]; then
  pass "PROGRESS.md edited above the tail: merge aborted, not appended"
else
  fail "PROGRESS.md edited above the tail: merge aborted, not appended" "rc=$rc $out"
fi
bash "$WT" remove $W/story-004 --discard >/dev/null

# --- cleanup only on request -------------------------------------------------
check "remove merged worktree + branch (--delete-branch)" bash -c "
  bash '$WT' remove $W/story-001 --delete-branch &&
  ! test -d $W/story-001 && ! git show-ref --verify --quiet refs/heads/feat/notes-story-001"
check "remove without a flag keeps the branch" bash -c "
  bash '$WT' remove $W/story-002 | grep -q 'KEPT branch feat/notes-story-002' &&
  git show-ref --verify --quiet refs/heads/feat/notes-story-002"
check "--discard removes an unmerged worktree and force-deletes its branch" bash -c "
  bash '$WT' remove $W/story-003 --discard &&
  ! test -d $W/story-003 && ! git show-ref --verify --quiet refs/heads/feat/notes-story-003"
check "no stale worktree registrations left" bash -c "[ \$(git worktree list | wc -l) -eq 1 ]"

# --- task worktrees -------------------------------------------------------------
# A fresh repo whose committed .gitignore lacks .agentic/ (the line /init would add
# is still uncommitted): the worktree must not see .agentic/ as untracked files.
R2="$T/repo2"
mkdir -p "$R2/src"
cd "$R2" || exit 1
g init -q -b main
printf "node_modules/\n.env\n" > .gitignore
printf 'export const add = (a, b) => a - b;\n' > src/add.js
printf 'EXAMPLE=1\n' > .env.example
g add -A && g commit -q -m "chore: init"
printf 'SECRET=x\n' > .env
printf ".agentic/\n" >> .gitignore   # uncommitted, as after /init in an old repo
mkdir -p .agentic
cat > .agentic/focus.md <<'MD'
# CURRENT
title: fixing: add() subtracts
since: 2026-10-01 10:00
set_by: /fix

# PLAN
- [ ] Diagnose — reproduce + root cause
- [ ] Fix + regression test

# NEXT
1. export notes as CSV
MD

check "pref unset reads as ask, marked default" bash -c "bash '$WT' pref | grep -qx 'PREF ask (default)'"
git config agentic.worktree ask
check "pref set to ask is not marked default" bash -c "bash '$WT' pref | grep -qx 'PREF ask'"
git config agentic.worktree always
check "pref reads git config agentic.worktree" bash -c "bash '$WT' pref | grep -qx 'PREF always'"
git config agentic.worktree sometimes
check "pref falls back to default ask on an unknown value, and says so" bash -c "bash '$WT' pref | grep -q '^PREF ask (default — agentic.worktree=sometimes'"
git config agentic.worktree always
check "where in the main tree says MAIN" bash -c "bash '$WT' where | grep -qx 'MAIN $R2'"

bash "$WT" create fix-add-subtracts fix/add-subtracts --kind task --carry-focus > "$T/create.out" 2>&1; rc=$?
check "create --kind task --carry-focus succeeds" test "$rc" -eq 0
TW="$W/fix-add-subtracts"
check "task worktree lives under $W/" test -d "$TW"
check "kind recorded in branch config" bash -c "[ \"\$(git config branch.fix/add-subtracts.agenticKind)\" = task ]"
check "warns that uncommitted main-tree files stay behind" grep -q '^NOTE main tree has 1 uncommitted' "$T/create.out"
check "lists the ignored .env as LOCAL-ONLY, not the tracked .env.example" bash -c "
  grep -qx 'LOCAL-ONLY .env' '$T/create.out' && ! grep -q 'LOCAL-ONLY .env.example' '$T/create.out'"
check ".env is not copied by the script" test ! -e "$TW/.env"
check "CURRENT + PLAN moved into the worktree, NEXT left behind" bash -c "
  grep -q '^title: fixing: add() subtracts' $TW/.agentic/focus.md &&
  grep -q '^- \[ \] Fix + regression test' $TW/.agentic/focus.md &&
  ! grep -q '^# NEXT' $TW/.agentic/focus.md"
check "main focus keeps NEXT only" bash -c "
  grep -q '^1. export notes as CSV' .agentic/focus.md && ! grep -q '^# CURRENT' .agentic/focus.md &&
  ! grep -q '^# PLAN' .agentic/focus.md"
check ".agentic/ ignored inside the worktree though .gitignore there lacks it" \
  bash -c "cd $TW && git check-ignore -q .agentic/focus.md && [ -z \"\$(git status --porcelain)\" ]"
check "where inside the task worktree names kind, base and main tree" bash -c "
  cd $TW && bash '$WT' where | grep -q '^WORKTREE .*branch=fix/add-subtracts kind=task base=main main=$R2\$'"

g worktree add -q -b scratch "$T/scratch" main
check "where in a hand-made worktree says kind=external" bash -c "cd '$T/scratch' && bash '$WT' where | grep -q 'kind=external'"
check "list shows only worktrees this script made" bash -c "
  out=\$(bash '$WT' list); [ \$(printf '%s\n' \"\$out\" | grep -c '^WORKTREE') -eq 1 ] && printf '%s' \"\$out\" | grep -q 'kind=task'"
check "list --kind story skips task worktrees" bash -c "[ -z \"\$(bash '$WT' list --kind story)\" ]"
g worktree remove "$T/scratch" && g branch -q -D scratch

( cd "$TW" && printf 'export const add = (a, b) => a + b;\n' > src/add.js && g commit -qam "fix: add() adds" \
  && printf '## 2026-10-01 10:05 — /fix add --auto\nDECISION: diagnosis gate skipped\n' > .agentic/auto-log.md )
check "list: task worktree one commit ahead of main, not merged" bash -c "bash '$WT' list | grep -q 'kind=task state=clean ahead=1 base=main merged=no'"
g add .gitignore && g commit -q -m "chore: ignore .agentic/"
rm -f .agentic/focus.md
check "merge the task branch back into main" bash "$WT" merge "$TW"
check "the fix landed in main" grep -q 'a + b' src/add.js
check "remove --delete-branch carries the run's auto-log into the main tree" bash -c "
  bash '$WT' remove $TW --delete-branch | grep -q '^CARRIED' &&
  grep -q 'DECISION: diagnosis gate skipped' .agentic/auto-log.md && ! test -d $TW"

# Focus written without its `# CURRENT` heading (seen from a real /fix run): the
# bare fields are still the task, so they move — under a restored heading.
printf 'title: fixing: rounding\nset_by: /fix (auto)\n\n# PLAN\n- [ ] Diagnose\n\n# NEXT\n1. export CSV\n' > .agentic/focus.md
bash "$WT" create fix-rounding fix/rounding --kind task --carry-focus >/dev/null 2>&1
check "header-less CURRENT carried under a restored heading, NEXT left in main" bash -c "
  head -1 $W/fix-rounding/.agentic/focus.md | grep -qx '# CURRENT' &&
  grep -q '^title: fixing: rounding' $W/fix-rounding/.agentic/focus.md &&
  grep -q '^- \[ \] Diagnose' $W/fix-rounding/.agentic/focus.md &&
  ! grep -q '^title:' .agentic/focus.md && grep -q '^1. export CSV' .agentic/focus.md"
bash "$WT" remove $W/fix-rounding --delete-branch >/dev/null 2>&1

echo "  worktree lifecycle: $PASSES passed, $FAILS failed — $([ $FAILS -eq 0 ] && echo PASSED || echo "FAILED ($FAILS)")"
[ "$FAILS" -eq 0 ]
