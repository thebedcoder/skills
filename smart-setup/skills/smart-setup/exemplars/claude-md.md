<!-- EXEMPLAR: quality bar for generated CLAUDE.md. Artifact #1 at every tier — section order fixed: Stack, Commands, Required CLIs, Rules, Workflow, Memory. Tier 0 = Stack + Commands only, ≤ 20 lines. -->
# CLAUDE.md

## Stack
- Node.js, built-in `http` module — no framework (`server.js`)
- Test framework: vitest ^2.0.0 (`package.json`)
- Deploy target: Vercel (`vercel.json`)

## Commands
- Dev: `node server.js`
- Test (non-watch): `vitest run`

## Required CLIs
- Vercel CLI — deploy + env management. Install: `npm i -g vercel`. Detected via `vercel.json`.

## Rules
- Editing `**/*.test.*` → read `.claude/rules/testing-conventions.md`

## Workflow
- Non-trivial change → dispatch `qa` agent (review-after-implement) before commit. Fix blockers before committing.

## Memory
- Decisions log: `docs/decisions.md` — read BEFORE architectural changes or questioning existing patterns. Append ADR-lite entry after any architectural / tooling / scope decision.
- Scratch: `.claude/scratch.md` — read at session start. Holds current task state + next steps. Prune freely.
