# Parallel build — a `[P]` group planned and built at once, in this session

Loaded only when `/ship-all` reaches a `[P]` group and builds it in parallel here (the start gate's answer, or the default). Plans and builds run concurrently — each implementer in its own isolated worktree **pinned to the feature branch**, so it holds every story already shipped there. Everything after the build — review, frontend, docs, cleanup — runs per story in this tree, in plan order, as `/ship` Phases 2–7.

## §P1 — Preconditions

Any fails → the group ships one after another (`/ship-all` Step 1–3 per story). One line why, no gate.

- `bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh where` → `MAIN`, or `kind=task`. Inside a story worktree → no.
- `git status --porcelain` empty. The worktrees see commits only — commit what the chain left first.
- Group = 2–4 `[P]` stories of the lowest open level, none depending on an unchecked story. More than 4 → the first 4 now, the rest as the next group.
- Ignored local files the tests need (`.env*` and the like): each listed in `.worktreeinclude`, which is the only way Claude Code copies them into a subagent worktree. One missing → sequential; say *"add it to `.worktreeinclude` to build `[P]` stories in parallel"*.

Record `BASE` = `git rev-parse --abbrev-ref HEAD`, `BASE_SHA` = `git rev-parse HEAD`.

## §P2 — Plan the group

1. One `agentic-engineering:ae-arch` per story, **all in one message** — prompt as `shared/story-flow.md` §1, plus `parallel: yes`.
2. PROD reviews each plan (story-flow §1).
3. Pre-review: `ae-red` + `ae-sec` Mode B for every plan that needs it — **all in one message**.
4. Escalation gate per story, as story-flow §1. A story that escalates leaves the group and ships after it, alone.
5. **Split check** — a story stays in the group only when:
   - its `Files to create` / `Files to modify` share no path with an earlier story's (`PROGRESS.md` excepted: append-only, `merge` joins it);
   - its plan says `Test isolation: yes` — parallel suites collide on fixed ports, shared databases, files outside the repo.
   Fewer than 2 left → sequential.
6. Briefs as story-flow §1, three header lines added:
   ```
   base: <BASE> @ <BASE_SHA>
   branch: feat/<feature>-<story-slug>
   setup: <plan's Setup command, or none>
   ```
7. Plan records as story-flow §1, one commit for the group: `docs(<feature>): STORY-003, STORY-004 — plans`. Then `BASE_SHA` = `git rev-parse HEAD` again — the pin must hold the records, and §P5 merges into a clean tree.

Print `PARALLEL BUILD — STORY-003, STORY-004 from <BASE> @ <short sha>`.

## §P3 — Build: one isolated implementer per story, one message

Dispatch `agentic-engineering:ae-impl` once per story, **all in one message**, each with `isolation: "worktree"` and `model: <tier>`. Prompt:

```
brief: <ABSOLUTE path to this tree's .agentic/briefs/<STORY-ID>.md>
mode: build
plugin root: ${CLAUDE_PLUGIN_ROOT}
pin: <BASE_SHA> feat/<feature>-<story-slug>
```

**Never `isolation` without `pin:`.** Claude Code creates a subagent's worktree from the repository's default branch unless `worktree.baseRef` is `"head"` — without the pin the implementer builds on `main`, blind to every story already on the feature branch. It pins first (`worktree.sh pin`), runs the brief's `setup:`, records a baseline run, then builds as in `agents/ae-impl.md`. Each returns its status plus `worktree: <path> · branch <branch>`.

## §P4 — Verify each, in its worktree

The main session, never the implementer's word. Per `DONE` story:

```bash
( cd <wt> && bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh check docs/features/<feature>/PROGRESS.md <STORY-ID> )   # → fresh
git -C <wt> status --porcelain                                                                           # vs the plan's file list
```

PROD acceptance check against the tests in `<wt>` (story-flow §3). Then:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh adopt <wt> <BASE> <BASE_SHA>
git -C <wt> add -A && git -C <wt> commit -m "feat(<feature>): STORY-XXX — <title>"
```

Not `DONE`, not `fresh`, a file outside the plan, or `adopt` refused → that story leaves the group. Its worktree stays exactly as it is — removing one is a human answer (`shared/worktree.md`). It rebuilds after the merge, alone, from its existing brief. One line says so.

## §P5 — Merge back, in plan order

`bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh merge <wt>` per verified story:

- `MERGED` → next.
- `CONFLICT` (exit 3) → nothing changed. The story leaves the group and rebuilds alone on the merged branch — re-plan only when its plan cites a file the merges touched. Its worktree is kept and named in the session-complete block.

Then once, on the merged result:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh run --phase merge -- <project test command>
```

Red → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: print the merge commits and the failing tests, then *"Each story passed alone; together they fail. How do you want to proceed?"* → **Work through it together (Recommended)** · **Undo the merges** — `git reset --hard <BASE_SHA>`; the story branches still hold the work · **Stop here**.

Green → paste that one row into each merged story's `### Evidence` table — one run on code holding every merged story is evidence for each, and the ledger verifies it for all of them. Tick each merged story in `STORIES.md` (orchestrator, last), commit `docs(<feature>): STORY-003, STORY-004 — merged, evidence recorded`, then `worktree.sh remove <wt> --delete-branch` per merged story (it refuses anything unmerged).

## §P6 — Continue, one story at a time

Each merged story runs `/ship` from Phase 2 in plan order. Its review diff is its own merge: `range: <merge>^1..<merge>` (`commands/review.md` Step 0c). Frontend is built here, by a non-isolated `ae-impl`, as in `/ship` Phase 3. Stories that left the group ship after, as ordinary `/ship` chains.

## Gotchas

- **Isolation without `pin:` builds on the default branch.** `/diagnose` flags `DEVIATION base`.
- **Uncommitted work is invisible to the worktrees.** §P1 refuses a dirty tree for that reason.
- **A story's own green run proves the story alone.** Only §P5's run proves the stories together.
- **Never remove an unmerged worktree without a human answer** — `shared/worktree.md`'s rule holds here too.
- **The implementer never commits or merges.** It pins, builds, records; the orchestrator verifies, commits, adopts, merges.
