## `/ship-all` — Ship All Unchecked Stories

Loops `/ship` across every unchecked story in all active features.

Read `./docs/INDEX.md`, `./docs/CONSTITUTION.md`, then scan feature `STORIES.md` files. Skip features marked `archived` in INDEX — no stories left there.

Use to ship all remaining stories without a manual trigger. Planning is done, so execution runs (SKILL.md "Planning asks, execution runs"): one question at the start, then story after story with no stop — except a plan escalation, a blocker that survives the fix loop or needs a decision, a hard override, or a stuck implementer.

**Fresh context per story.** Each story's plan (`ae-arch`), build and fix rounds (`ae-impl`) and reviews run in subagents. The main session keeps the plan, two short statuses and the consolidated review per story — no compact gate between stories. If the session auto-compacts anyway, the SessionStart hook re-injects CURRENT and PLAN; re-read this file and resume at the first open PLAN line.

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/ship-all --auto`. **Propagate `AUTO=true` to every story's `/ship` invocation**, and through each story's nested `/implement` and `/review`.

### Step 0b — Write the story PLAN

Per "Progress Tracking" in SKILL.md, write one PLAN line per unchecked story into `.agentic/focus.md` before the session starts — subject `STORY-XXX: [title]`, in the recommended order (priority first, dependency second). This is the chain's progress bar; the per-story `/ship` does **not** write a nested plan, it advances this one.

- Mark each story in progress when its plan step starts, closed after its ship chain closes.
- User picks **Skip this story** → close the line with `skipped` noted; story stays unchecked in `STORIES.md`.
- User picks **End session** → leave remaining lines open; they show as unfinished, which is accurate.


### Step 0 — Auto-write focus

Run **§B** of `shared/preamble.md`, always overwriting: `title: ship-all: <feature> (N stories)`, `set_by: /ship-all`, `note: starting`. Between stories update only `note:` → `phase: shipping STORY-X (k of N)`; `title:` stays — it names the whole chain. `--auto` propagates to every story's `/ship`.

### Step 0c — Finish parallel worktrees

`bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh list --kind story` prints any `WORKTREE` line → story worktrees from an earlier run: run **§W2** of `shared/worktree.md` before anything else — merge, PR, keep or discard each shipped one. Merged stories count as shipped for the order below. No output → skip silently, never read the file.

---

### On start

PROD shows session overview, grouping `[P]` parallel stories:

```
PROD — Ship-All Session: [Feature Name]

Stories to ship: X   (MVP: N are P1)

P1 — the MVP slice:
  - STORY-XXX: [title] [P]
  - STORY-XXX: [title] — needs STORY-XXX first

P2 — completes the feature:
  - STORY-XXX: [title] [P]

P3 — cuttable:
  - STORY-XXX: [title]

Recommended order: [suggested sequence]
Parallel [P] within a level have no dependencies — you could open multiple
Claude Code sessions for those instead of shipping them here.

Stories ship one after another without stopping. You're asked only when a plan
needs a decision, a review blocker survives three fix rounds, or an operation
is on the always-pause list.
```

**Order is priority first, dependency second.** Never start a P2 story while a P1 story is unchecked. Within a level, dependencies decide the sequence and `[P]` stories can go in any order.

**Backward compatibility.** No story in the feature carries a `Priority:` line → the feature predates the field. Drop priority grouping, list stories in file order, print `(unprioritised — feature predates Priority:)` under the count. Never retro-label. Mixed — some labelled, some not → unlabelled ship last, grouped as `Unprioritised`.

**Entered from a planning command's Build gate** (`/feature`, `/design`, `/plan-all` — the human just answered *Build now*) → scope was chosen there; skip this gate, and `[P]` groups ship here, sequentially.

Otherwise ⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: single]` — **the chain's one question, asked once, never mid-chain**: *"Start the ship-all session?"* → **Ship everything (Recommended)** · **Ship the P1 set only** · **Cancel**. Under `--auto`: SKIP and ship everything. When a parallel group exists (below), the same `AskUserQuestion` call carries its question as a second question — one widget, two answers.

**Ship the P1 set only** → chain covers P1 stories, then ends at the normal Session-complete block; P2/P3 listed under `REMAINING 🔜`. That is a clean finish, not an early stop. Unprioritised feature → drop that option; there is no P1 set to offer.

**Parallel group.** Lowest open level has ≥2 `[P]` stories with no unchecked dependency → second question of the start gate, `[AUTO: skip]` `[ASK: single]`: *"STORY-003 and STORY-004 can run in parallel. How should they ship?"* → **Here, one after another (Recommended)** · **One worktree per story** · **Skip the group**. Under `--auto`, or entered from a Build gate: ship them here, sequentially; worktrees are opt-in only. Second option → run **§W1** of `shared/worktree.md`, which ends this session with the worktrees ready. A `[P]` group in a later level never asks — it ships here, sequentially.

---

### Per story

**Step 1 — Plan** *(no pause — `shared/story-flow.md` §1)*

`ae-arch` plans (session model, fresh context), PROD validates, `ae-red` + `ae-sec` pre-review the Contract claims and Failure states, the brief is written.

```
━━━ STORY-XXX ([X] of [Y]) ━━━

ARCH — Implementation Plan:
[plan, incl. Contract claims + Failure states]

PROD — Plan Review:
[validation]

Pre-review (ae-red + ae-sec on the plan):
[findings, or "no findings" / "skipped — no external contract, no partial state"]
```

No per-story gate. The story flow's escalation gate is the only stop here (`[AUTO: always-ask]`): new dependency, public interface change, unresolved pre-review finding on a Contract claim, hard-override operation, missing project state. Its options gain **Skip this story** when it fires inside `/ship-all`.

**Step 2 — Ship chain** *(automatic)*

Full `/ship` chain: build (`ae-impl`) → review → frontend → review → docs → git commits. Blockers go through `shared/fix-loop.md`; the chain pauses only on what survives it.

**Step 3 — Story complete**

```
✅ STORY-XXX shipped ([X] of [Y] done) — built by ae-impl ([tier]) · [K] fix rounds
[1 line of what was built]
```

Close the story's PLAN line, update `note:` to the next story, start its Step 1. No compact gate: the story's work happened in subagents.

---

### Session complete

```
━━━ SHIP-ALL COMPLETE ━━━

Shipped:  X stories
Skipped:  Y stories
Stopped:  [early / no — ran to completion]

DONE ✅
- STORY-XXX: [title]
- STORY-XXX: [title]

SKIPPED ⏭
- STORY-XXX: [title] — [reason if given]

REMAINING 🔜
- STORY-XXX: [title] — [if stopped early]

Git: [X] commits on [branch]
PR desc: ✅ updated to cover all shipped stories

Next: [stories remain → /ship-all again · every story shipped → /converge [feature] before you archive · otherwise push and open the PR]
```

**GIT** generates single PR desc covering all shipped stories — not one per story.

### Step N — Release focus

After the final story only: run `shared/focus-release.md` (`auto` under `--auto`). Mid-chain stories never release.

### Step N — Finish the worktree

First story's branch guard put the chain in a task worktree (`worktree.sh where` prints `kind=task`) → **§W5** of `shared/worktree.md`, once, after the last story. Anything else → skip.

---

### Step N — Auto-mode summary

Run **§C** of `shared/preamble.md`, counting across every story in the chain: `…hard-pauses across <Y> stories. See .agentic/auto-log.md`.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Chain start (ship everything / P1 only / cancel) + parallel group, one widget | `[AUTO: skip]` — ships everything, sequentially; skipped when entered from a Build gate |
| Per-story plan approval | **none** — escalations only (`shared/story-flow.md` §1, `[AUTO: always-ask]`) |
| Blockers that survive the fix loop or need a decision | `[AUTO: always-ask]` (hard-override #1) — `shared/fix-loop.md` §4 |
| Constitution conflict surfaced by a story | `[AUTO: always-ask]` (hard-override #3) |
| Recurring blocker class across multiple stories | `[AUTO: always-ask]` — stop + ask whether to update constitution |
| Worktree baseline red | `[AUTO: always-ask]` (`shared/worktree.md` §W1) |
| Finish a shipped worktree — merge / PR / keep / discard | `[AUTO: always-ask]` — removal and branch deletion are destructive |
| Discard confirmation | `[AUTO: always-ask]` |
| Finish the chain's task worktree (§W5) | `[AUTO: skip]` → keep; merge, PR, discard only on a human answer |

### Guardrails

- **No stop between stories.** The human approved the stories in planning; the chain runs. Escalations, surviving blockers, hard overrides and a stuck implementer are the only pauses — each offers **End session**, which ends cleanly.
- **No story code in the main session.** Every story's plan, build and fixes run in subagents — that is what keeps the context small enough to need no compact gate.
- **Blocker pauses propagate.** A blocker that survives the fix loop pauses exactly as in `/ship`. After the fix, the chain resumes.
- **Skipped stories stay unchecked** in `STORIES.md` so `/status` reflects reality.

### Gotchas

- **Never ask for `/compact`.** The story work runs in fresh subagent contexts, so the main session carries only plans, statuses and review summaries. Auto-compaction, if it happens, is recovered from PLAN by the SessionStart hook — re-read this file and resume at the first open line.
- **One story = its own commit(s).** No batching. User must revert story without touching others.
- **`[P]` markers are user-facing suggestions, not self-instructions.** Ship-all runs sequential in this session — no interleaving. Parallelism happens only through the opt-in worktree path, in other sessions, one story each.
- **Worktree cleanup is never automatic.** Merge, PR, keep, discard: the human picks, `--auto` or not. Removing a worktree or deleting its branch without that answer destroys work that exists nowhere else.
- **Priority order is not a suggestion.** A P2 shipped before an open P1 wastes the MVP slice — what the field protects. `[P]` reorders within a level, never across one.
- **Don't re-prioritise mid-chain.** A story that turns out harder than priced stays at its level. Re-cutting priorities is `/feature`'s job, and doing it here silently rewrites the plan the user approved.
- **Recurring blockers → stop + fix pattern.** Same blocker class 3 stories in row → update constitution/conventions, not more fixes.
- **PR description = commits, not PRD.** Show log. Users can read.
- **Test runners non-watch mode.** Ship-all multiplies ship's test invocations by every story. Leaked worker from STORY-001 still chews CPU at STORY-008. `vitest run`, `go test ./...`. See SKILL.md "Test Execution Rules."

---
