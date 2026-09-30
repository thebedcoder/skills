#!/usr/bin/env bash
# Throwaway fixture projects for behavioral scenarios. Every builder takes a
# fresh directory and leaves a git repo with a clean tree on a feature branch.
# Node's built-in runner (`node --test`) keeps the fixtures dependency-free.

_git() { git -c user.name=fixture -c user.email=fixture@example.invalid -c init.defaultBranch=main "$@"; }

# fixture_base DIR MODE — scaffolded project (docs/INDEX.md etc.), one passing test.
fixture_base() {
  local dir="$1" mode="${2:-lite}"
  mkdir -p "$dir"/{src,test,docs}
  cd "$dir" || return 1
  _git init -q
  cat > package.json <<'EOF'
{
  "name": "fixture",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "test": "node --test" }
}
EOF
  cat > src/math.js <<'EOF'
export function add(a, b) {
  return a + b;
}
EOF
  cat > test/math.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/math.js';

test('add sums two numbers', () => {
  assert.equal(add(2, 3), 5);
});
EOF
  printf '.agentic/\nnode_modules/\n' > .gitignore
  cat > CLAUDE.md <<'EOF'
# Fixture project

Tiny Node module used by the agentic-engineering behavioral tests.

- Test command: `npm test` (runs `node --test`, non-watch)
- ES modules, no dependencies
EOF
  cat > docs/INDEX.md <<EOF
---
mode: $mode
---

# Docs Index

## How to navigate
- Read ./docs/MEMORY.md for durable project knowledge
- Read ./docs/CONSTITUTION.md for non-negotiable project principles
- Go to ./docs/features/[name]/ for stories and progress
- \`.agentic/focus.md\` — current task + plan for this worktree. Gitignored.

## Features

| Feature | Status | Folder |
|---------|--------|--------|
EOF
  cat > docs/MEMORY.md <<'EOF'
# Memory

## What this is
A math utility module. Tests run with `npm test`.
EOF
  cat > docs/CONSTITUTION.md <<'EOF'
# Project Constitution

## Article I: Testing
Every behavior change ships with a test. `npm test` must pass.

## Article II: Data
Schema changes go through numbered SQL files in `migrations/`.
EOF
  printf '# Changelog\n' > docs/CHANGELOG.md
  printf '# Backlog\n' > docs/BACKLOG.md
  _git add -A && _git commit -q -m "chore: initial fixture"
}

# fixture_feature_row DIR FEATURE STATUS — append a row to INDEX.md's table.
fixture_feature_row() {
  printf '| %s | %s | ./docs/features/%s/ |\n' "$2" "$3" "$2" >> "$1/docs/INDEX.md"
}

# fixture_focus DIR TITLE FEATURE SET_BY PLAN_DONE_LINES... -- PLAN_OPEN_LINES...
fixture_focus() {
  local dir="$1" title="$2" feature="$3" set_by="$4"
  shift 4
  mkdir -p "$dir/.agentic"
  {
    printf '# CURRENT\ntitle: %s\nfeature: %s\nsince: 2026-09-30 09:00\nset_by: %s\n\n# PLAN\n' \
      "$title" "$feature" "$set_by"
    local open=0
    for l in "$@"; do
      if [ "$l" = "--" ]; then open=1; continue; fi
      if [ "$open" = 1 ]; then printf -- '- [ ] %s\n' "$l"; else printf -- '- [x] %s\n' "$l"; fi
    done
  } > "$dir/.agentic/focus.md"
}

fixture_commit() {
  ( cd "$1" && _git add -A && _git commit -q -m "$2" )
}

fixture_branch() {
  ( cd "$1" && _git checkout -q -b "$2" )
}
