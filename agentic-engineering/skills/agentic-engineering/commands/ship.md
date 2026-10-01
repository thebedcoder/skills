## `/ship` — Full Story Chain

**Chain:** plan → build → review → frontend → review → docs

Use after stories (and `/design`, for UI) are approved. Ships story end-to-end without a stop — planning is done, so execution runs (SKILL.md "Planning asks, execution runs").

**Main session orchestrates.** ARCH plans in `ae-arch` (session model), IMPL builds in `ae-impl` (Sonnet by default), seven reviewers review — each in a fresh context. The main session holds the plan, the statuses and the consolidated reviews; it writes no source code in this chain.

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- `./docs/INDEX.md` — current feature
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header: `/ship <STORY-ID> --auto`. Nested story flow, `/review`, `/frontend` inherit `AUTO=true`.

### Step 0b — Write the phase PLAN

**Nested inside `/ship-all`? Skip this step.** The parent owns the plan; this run advances the parent's story line instead of opening a second plan.

Otherwise write these seven lines to the `# PLAN` section of `.agentic/focus.md` before any work starts:

1. `Plan (ae-arch) + build (ae-impl) STORY-XXX backend + tests`
2. `Backend review — 7-agent batch`
3. `Frontend from design handoff`
4. `Frontend review — 6-agent + ae-ux fidelity`
5. `End-user docs + changelogs`
6. `PR description from git log`
7. `Cleanup — decisions + memory`

Mark #1 in progress at Phase 1. Advance one at a time. Backend-only story → close #3 and #4 with `skipped (no UI)`. Blocker pause → leave the current line open until the fix lands and review re-runs clean.

### Step 0c — Branch guard

```bash
git rev-parse --abbrev-ref HEAD
```

On `main` / `master` → `bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh pref`:

- `PREF never` → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"You're on `<branch>`. Ship this story where?"* → **New branch `feat/<story-slug>` (Recommended)** · **Stay on `<branch>`** · **Abort**
- `PREF ask`, with or without `(default…)` → same gate, plus **New worktree** — "own folder under `.claude/worktrees/`; this session moves in, `main` stays untouched".
- `PREF always` → no gate.

Worktree (picked, or `always`) → **§W4** of `shared/worktree.md`. Otherwise never open that file here.

No-op after full-mode `/feature` (it branched already); **lite's `/note` → `/ship` path has no branch step**, so without this guard every lite story lands on `main`. Nested in `/ship-all` → the guard fires once, on the first story; the branch or worktree is named for the feature, not the story.

### Step 0d — Worktree mode

CURRENT carries `worktree_of:` (seeded by `/ship-all`'s parallel path) → read **§W3** of `shared/worktree.md`: Phases 5 and 7 defer to the merge. No such line → skip, never read the file.

### Step 0 — Auto-write focus

Once PROD has picked the story (below), run **§B** of `shared/preamble.md` with `title: <STORY-ID> — <story title>`, `feature: <feature-name>`, `note: ship chain`. CURRENT already names this story (parent `/ship-all`) → only `note:` + `set_by:` change.

### Finding what to ship

Read `./docs/INDEX.md` + feature `STORIES.md` + `./docs/BACKLOG.md`.

PROD picks next item in order:
1. Next unchecked story in active feature's `STORIES.md`
2. If none → `BACKLOG.md` item

Backlog item → **promote first** before shipping:

```
PROD — Promoting backlog item:
NOTE-XXX: [title]

Shaping into story for feature: [feature name]
```

**Target feature dir.** Active feature from `INDEX.md` → use it. No feature exists yet (normal in lite mode, where `/note` → `/ship` is the main path) → default to `./docs/features/main/`, creating `STORIES.md`, `PROGRESS.md`, `reviews/` on first use and adding the `main` row to INDEX.md's feature table. Never fail with "no feature directory".

PROD converts → appends to `./docs/features/[feature-name]/STORIES.md`:
```markdown
- [ ] STORY-XXX: [title]
  **As a** [user], **I want** [action] **so that** [benefit]
  **Acceptance Criteria:**
  - [ ] [from NOTE-XXX draft criteria]
  **Notes:** [technical context from investigation]
  **Backlog ref:** NOTE-XXX
```

Mark promoted in `BACKLOG.md`:
```markdown
**Status:** ~~backlog~~ → promoted to STORY-XXX in [feature-name]
```

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]` `[ASK: confirm]`: Show promoted story, then ask *"Ship this story?"* → Ship it / Reshape first. Under `--auto`: SKIP if the BACKLOG item already has clear acceptance criteria and PROD's shaping is mechanical; otherwise ASK.

### Flow

**Phase 1 — Plan + build** (`shared/story-flow.md` §1–§4)
- `ae-arch` plans backend **and** frontend in one pass (its `Frontend:` block feeds Phase 3); PROD validates; `ae-red` + `ae-sec` pre-review; brief written to `.agentic/briefs/<STORY-ID>.md`
- **No start gate.** The plan prints and the chain proceeds. Only the story flow's escalation gate can stop it — new dependency, public interface change, disputed Contract claim, a hard-override operation, missing project state
- `ae-impl` builds on its tier; the orchestrator verifies evidence + files + each AC; `PROGRESS.md` entry by the implementer, `STORIES.md` box ticked last by the orchestrator
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — [story title]
test([feature-name]): STORY-XXX — add tests
```

**Phase 2 — Backend Review** *(automatic)*
Run full `/review` flow immediately.
- RED, REQ, TEST, DOC, SEC, EDGE, LEAN run parallel — seven agents
- **LEAN runs here and only here.** Phase 4 re-reviews the same branch and passes `--frontend-pass` to drop it
- Consolidated fix list

**Blockers** → `shared/fix-loop.md` (read it only now): triage fix vs decision, up to three implementer rounds each re-reviewed by the reviewers that raised them, then — only if blockers survive or need a decision — the one gate (`[AUTO: always-ask]`, hard-override #1). Each round records `evidence.sh run --phase review-fix`; Phase 1's row is stale the moment a fix touches code. Loop clean → **GIT** commits:
```
fix([feature-name]): STORY-XXX — address review blockers
```
No blockers → continue, never open `fix-loop.md`.

**Phase 3 — Frontend** *(automatic after clean review)* (`/frontend` flow, nested)
- Plan = the brief's `Frontend:` block from Phase 1 — no second planning pass; PROD validates the flow against the handoff
- `ae-impl` `mode: frontend` builds pixel-faithful to the handoff, records `red` + `--phase frontend` rows in the story's table
- Orchestrator verifies (`evidence.sh check` fresh, files in plan) before the commit
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — frontend implementation
```
- **Visual capture** — `./.claude/visual-capture.md` exists → run `shared/visual-capture.md` (dispatch per `mechanism:`, auto-append Visual Artifacts rows; a failed capture warns, never blocks). Absent → remind the operator to capture manually, continue.

**Phase 4 — Frontend Review** *(automatic)* (`/review --frontend-pass` + ae-ux fidelity)
- 6-agent parallel pass — the Phase 2 seven minus LEAN, which already reviewed this branch
- ae-ux checks fidelity vs design handoff
- Blockers (six-agent pass or ae-ux) → `shared/fix-loop.md`, same as Phase 2; rounds record `--phase frontend-fix`
- Loop clean → **GIT** commits:
```
fix([feature-name]): STORY-XXX — address frontend review blockers
```

**Phase 5 — End-user docs + Changelogs** *(automatic — final step before commit)*

Keeps `./app-docs/` in sync with what user can do.

`./app-docs/` absent (lite, first user-facing story) → **the parent creates the tree first**: `index.md`, `CHANGELOG.md`, `features/`, `guides/`, templates in `commands/init.md`. Then dispatch `agentic-engineering:ae-scribe` → updates `./app-docs/` pages only; its own file carries the page template, the user-reachable test and the self-check. **SCRIBE never touches either changelog** — the parent writes both, below, so the entry can name the shipped commit.

No user-facing surface → SCRIBE returns `no user-facing change, app-docs unchanged.` Valid — don't force-generate.

After SCRIBE returns, prepend to both changelogs (newest first):

`./docs/CHANGELOG.md` (after header, terse):
```markdown
## [date]
- [STORY-XXX] feat([feature]): [what was implemented] — [key files]
- [STORY-XXX] review: [clean / N blockers fixed] — RED/REQ/TEST/DOC/SEC/EDGE
- [STORY-XXX] docs: [feature].md updated
```

`./app-docs/CHANGELOG.md` (after frontmatter + title, **product release note to end users**):
```md
## [Month YYYY]

### Added
- **[Feature name in user language]** — [plain-English — what users can now do, no internals]
```

SCRIBE returned "no user-facing change" → skip `### Added` entry + skip `app-docs/CHANGELOG.md` commit. Still prepend terse entry to `docs/CHANGELOG.md`.

- **GIT** commits:
```
docs([feature-name]): STORY-XXX — update app docs and changelogs
```

**Phase 6 — PR Description** *(automatic, not pushed)*

**GIT** generates PR desc from `git log` (not plan): story title, What changed (plain English), Why (user story), Changes (`feat:`/`fix:`/`docs:` commits), How to test (from acceptance criteria), Checklist (tests · docs · no blockers).

**Phase 7 — Cleanup** *(automatic — last phase)*

Run the `/cleanup` flow inline for this story (`commands/cleanup.md`). Extracts binding decisions → `./docs/DECISIONS.md`, rewrites `./docs/MEMORY.md`. Step 2 of that flow (CHANGELOG entry) is already done by Phase 5 — cleanup detects the existing entry and skips it rather than writing a second one.

Chain ended in an unresolved blocker pause → **skip Phase 7 entirely**. Unfinished work has nothing durable to record.

**Chain complete:**
```
━━━ STORY-XXX SHIPPED ━━━
Plan:     ✅ ae-arch · [N] pre-review findings resolved
Backend:  ✅ built by ae-impl ([tier]) + reviewed · [K] fix rounds
Evidence: ✅ [latest row's result] — tree [id], fresh
Frontend: ✅ implemented + reviewed
Docs:     ✅ updated
Git:      ✅ committed (see log above)
PR desc:  ✅ ready to copy
Stories:  [x] marked complete
Progress: updated
Cleanup:  ✅ DEC-XXX recorded · MEMORY.md refreshed

Next: run `/ship` again for STORY-XXX+1, or `/status` to review the board.
```

This story was the feature's last unchecked one → append: `Feature complete — run /archive [feature-name] to compact its docs into SUMMARY.md.`

### Step N — Release focus

Run `shared/focus-release.md` (`auto` under `--auto`). `set_by:` contains `/ship-all` → skip; the chain releases after its last story.

### Step N+1 — Finish the worktree

Not nested in `/ship-all` and `worktree.sh where` prints `kind=task` → **§W5** of `shared/worktree.md`. Anything else → skip.

### Step N+2 — Auto-mode summary

Run **§C** of `shared/preamble.md`.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Branch guard on `main` — branch / worktree / stay / abort | `[AUTO: always-ask]`; `agentic.worktree=always` → worktree, no gate |
| Finish task worktree (§W5) — merge / PR / keep / discard | `[AUTO: skip]` → keep; merge, PR, discard only on a human answer |
| Promoted backlog item review | `[AUTO: ask-if-ambiguous]` — skip when AC clear and shaping mechanical |
| Ship-chain start / plan approval | **none** — execution runs; the plan prints and the chain proceeds |
| Story-flow escalation (new dependency, public interface, disputed claim, hard-override op, missing state, second replan) | `[AUTO: always-ask]` |
| Implementer stuck after a session-model retry | `[AUTO: always-ask]` |
| PAUSED — blockers that survived the fix loop or need a decision (Phases 2, 4) | `[AUTO: always-ask]` (hard-override #1) — `shared/fix-loop.md` §4 |
| Internal `/review` blocker surface | nested: reports only; the fix loop owns blockers |


### Gotchas

- **The main session writes no source code here.** Plan → `ae-arch`, code → `ae-impl`, fixes → `ae-impl` fix rounds. Editing a source file in the main thread is the role-play failure; `/diagnose` flags it. Only exception: the human picks "Work through them together" at a stop.
- **One story, one commit chain.** Related bug found → BACKLOG.md, never fix "while there."
- **No skipping Phase 2.** RED + SEC find what authors miss.
- **"Fixed" ≠ self-attested.** Implementer's `fixed` or the user's "fixed" → fresh evidence row, then the raising reviewers re-review.
- **Claimed green without running.** Every phase that changes code ends with its own `evidence.sh` row. Output from Phase 1 does not vouch for code Phase 2 fixed. REQ reads the verdict in `/review` and blocks a checked story whose newest row is stale, red or missing.
- **No early commit.** Implementation commits at end of Phase 1, after the orchestrator verified it. Phase 2 blockers → separate commits. The implementer never commits.
- **PR description from `git log`, not imagination.** Read actual commits. Never generate from plan.
- **No UI story → skip Phase 3.** Backend-only → Phase 2 → Phase 5.
- **Test runners non-watch only.** Ship chains multiple test invocations back-to-back. Watch-mode leak compounds → freeze. `vitest run`, `go test ./...`, etc. See SKILL.md "Test Execution Rules."

---
