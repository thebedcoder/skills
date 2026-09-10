## `/ship` — Full Story Chain

**Chain:** implement → review → frontend → review → docs

Use after `/design` approved. Ships story end-to-end without manual triggers.

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- `./docs/INDEX.md` — current feature
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`. `/cleanup` writes these after every chain; a chain that never reads them is a write-only log

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/ship <STORY-ID> --auto`. **Propagate `AUTO=true` to internal phases** — every nested `/implement`, `/review`, `/frontend` inherits it.

### Step 0b — Write the phase PLAN

**Nested inside `/ship-all`? Skip this step.** The parent owns the plan; this run advances the parent's story line instead of opening a second plan.

Otherwise write these seven lines to the `# PLAN` section of `.agentic/focus.md` (see `commands/focus.md`) before any work starts:

1. `Implement STORY-XXX backend + tests`
2. `Backend review — 7-agent batch`
3. `Frontend from design handoff`
4. `Frontend review — 6-agent + ae-ux fidelity`
5. `End-user docs + changelogs`
6. `PR description from git log`
7. `Cleanup — decisions + memory`

Mark #1 in progress at Phase 1. Advance one at a time. Backend-only story → close #3 and #4 with `skipped (no UI)`. Blocker pause → leave the current line open until the fix lands and review re-runs clean.

Mirror into a harness task list **if this session exposes one**. It is a convenience view, not the record — PLAN survives compaction and session end.

### Step 0c — Branch guard

```bash
git rev-parse --abbrev-ref HEAD
```

On `main` / `master` → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"You're on `<branch>`. Ship this story where?"* → **New branch `feat/<story-slug>` (Recommended)** · **Stay on `<branch>`** · **Abort**

Full mode reaches `/ship` from `/feature`, which already created `feat/<name>` — the guard is a no-op there. **Lite mode's path is `/note` → `/ship`, which has no branch step at all**, so without this guard every lite story lands directly on `main`. Matches the guards in `/fix` and `/improve`.

### Step 0 — Auto-write focus

Before picking a story, update `.agentic/focus.md`:

1. Run **§B step 1** of `shared/preamble.md` — creates `.agentic/` and gitignores it, idempotent.

2. Once PROD has picked the next story (see "Finding what to ship" below), set CURRENT (story-id-match heuristic):
   - Existing CURRENT.title already references this STORY-ID (e.g. set by parent `/ship-all`) → update `note:` to `phase: ship chain` and `set_by:` to `/ship`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: <STORY-ID> — <story title>`, `feature: <feature-name>`, `since: [now]`, `set_by: /ship`, `note: ship chain`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value, and propagate `--auto` to internal `/implement`, `/review`, `/frontend` phases.

3. Continue with finding-what-to-ship below.

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

**Phase 1 — Backend** (`/implement` flow)
- ARCH generates plan
- PROD validates vs acceptance criteria
- ⚠️ **Single human checkpoint** `[AUTO: skip]` `[ASK: confirm]`: Show both plans, then ask *"Start the full ship chain?"* → Go / Stop. **This gate replaces `/implement`'s own start gate** — the parent's gate wins, and `/implement` running nested does not fire a second one. Under `--auto`: SKIP — emit `SKIPPED: ship-chain approval [auto]` and proceed. Hard-override #4 still applies (missing test framework, missing design tool → HARD-PAUSE).
- On 'go': implement + tests. Update PROGRESS.md + STORIES.md
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

**Blockers** → pause + surface (`[AUTO: always-ask]` `[ASK: single]` — also hard-override #1):
```
⚠️ SHIP PAUSED — blockers found by [agent]

[consolidated blocker list — top 5, then "+N more"]
```
Then ask *"How do you want to handle these?"* → **Fix now (Recommended)** (agent fixes, chain resumes) · **I'll fix them** (pause for manual fix, then re-review) · **Abort chain**.

These are the options while nested in `/ship`. `/review`'s own three-option gate (Fix now / Show full report / Log and move on) applies only to a standalone `/review` — nested, `/review` reports and this gate decides.
Blockers fixed → **GIT** amends or commits:
```
fix([feature-name]): STORY-XXX — address review blockers
```
No blockers → continue.

**Phase 3 — Frontend** *(automatic after clean review or 'fixed')* (`/frontend` flow)
- UX reads design handoff spec
- ARCH plans components
- PROD validates flow
- Implement pixel-faithful to designs
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — frontend implementation
```
- **Visual capture dispatch** *(automatic if `.claude/visual-capture.md` exists)*

  1. Read `./.claude/visual-capture.md`. If absent → emit reminder (manual-capture fallback) and proceed to Phase 4 review.
  2. Parse `mechanism:` field. Dispatch:
     - `test-runner` / `script` → run the declared `## Capture command` via Bash, capture exit code
     - `mcp` → use the declared MCP tools per AC, capture per-AC, write to artifacts dir directly
     - `manual` → emit reminder, proceed
     - `external-link` → emit reminder to record + paste URLs, proceed
  3. On dispatch success (`test-runner` / `script`):
     - Scan declared `output_dir:` for new files
     - For each file, match against AC Coverage matrix Tests cells when possible
     - Move/copy into `docs/features/<feature-name>/artifacts/STORY-XXX/<file>`
     - Append rows to PROGRESS.md Visual Artifacts table; tag Notes cell with `(auto, backfill scenario)` or `(auto, no test-match, backfill AC)`
  4. On dispatch failure (non-zero exit, missing files): emit warning, do NOT block ship chain. Operator captures manually for this story.
  5. Proceed to Phase 4 review (the 6-agent batch).

  **Capture runs in Phase 3, not Phase 4.** It is the tail of the frontend pass; Phase 4 is the review that consumes what it produced. Docs elsewhere that say "Phase 4 dispatches capture" mean this step.

**Phase 4 — Frontend Review** *(automatic)* (`/review --frontend-pass` + ae-ux fidelity)
- 6-agent parallel pass — the Phase 2 seven minus LEAN, which already reviewed this branch
- ae-ux checks fidelity vs design handoff
- Blockers → pause + surface, same pattern as Phase 2
- Blockers fixed → **GIT** commits:
```
fix([feature-name]): STORY-XXX — address frontend review blockers
```

**Phase 5 — End-user docs + Changelogs** *(automatic — final step before commit)*

Keeps `./app-docs/` in sync with what user can do.

Dispatch `agentic-engineering:ae-scribe` → updates `./app-docs/` pages only. Writes product-style docs (overview, how-to, tutorial) for end users. See `agents/ae-scribe.md` for template. **SCRIBE never touches either changelog** — the parent writes both, below, so the entry can name the shipped commit.

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
Backend:  ✅ implemented + reviewed
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

If this `/ship` is **not** nested under `/ship-all` (detect by `set_by:` on CURRENT — if it contains `/ship-all`, the chain owns release):

- If invoked with `--auto` → run `/focus done auto` (auto-promotes NEXT silently per `commands/focus.md` Phase 3).
- Else → run `/focus done` (interactive prompt y/n/b).

If nested under `/ship-all` → skip; the chain releases focus only at the end of the final story.

### Step N+1 — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Promoted backlog item review | `[AUTO: ask-if-ambiguous]` — skip when AC clear and shaping mechanical |
| Single ship-chain approval ('go' to start) | `[AUTO: skip]` — proceed silently |
| SHIP PAUSED — review blockers (Phase 2) | `[AUTO: always-ask]` (hard-override #1) |
| SHIP PAUSED — frontend review blockers (Phase 4) | `[AUTO: always-ask]` (hard-override #1) |
| Internal `/implement` plan-approval | inherited tag from implement.md (`[AUTO: skip]`) |
| Internal `/frontend` plan-approval (Phase 3) | inherited tag from frontend.md (`[AUTO: skip]`) |
| Internal `/review` blocker surface | inherited tag from review.md / hard-override #1 |


### Documentation rules (SCRIBE)

`./app-docs/` = **end-user product documentation**. Not internal reference (→ `./docs/`).

After successful ship, SCRIBE:

1. User-reachable change? No → return "no user-facing change" + exit.
2. Update existing `./app-docs/features/[feature-name].md` or create. `app-docs/` absent (lite mode, first user-facing feature) → create the tree first: `index.md`, `CHANGELOG.md`, `features/`, `guides/`.
3. Structure: frontmatter → intro → **What you can do** → **How to use it** (numbered, real UI labels) → **Tips** → **FAQ** (only if real recurring) → **Related**.
4. No file paths / function names / code blocks in app-docs.
5. Update `./app-docs/index.md` if new user-facing feature added.
6. Self-check per `agents/ae-scribe.md`.

### What still requires your input
- Initial "go" (approves full plan)
- Blocker pauses mid-chain
- Nothing else — warnings/non-blockers logged to review file

### Gotchas

- **One story, one commit chain.** Related bug found → BACKLOG.md, never fix "while there."
- **No skipping Phase 2.** RED + SEC find what authors miss.
- **"Fixed" ≠ self-attested.** User replies "fixed" → re-run review.
- **No early commit.** Implementation commits at end of Phase 1. Phase 2 blockers → separate commits.
- **PR description from `git log`, not imagination.** Read actual commits. Never generate from plan.
- **No UI story → skip Phase 3.** Backend-only → Phase 2 → Phase 5.
- **Test runners non-watch only.** Ship chains multiple test invocations back-to-back. Watch-mode leak compounds → freeze. `vitest run`, `go test ./...`, etc. See SKILL.md "Test Execution Rules."

---
