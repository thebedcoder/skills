## `/ship` — Full Story Chain

**Chain:** implement → review → frontend → review → docs

Use after `/design` approved. Ships story end-to-end without manual triggers.

### Step 0a — Parse `--auto` flag

Detect whether `$ARGUMENTS` contains the `--auto` token.

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- If `AUTO`: Step 0 (below) appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- If `AUTO`: ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /ship <STORY-ID> --auto
  ```
- **Propagate `AUTO=true` to internal phases** — every nested `/implement`, `/review`, `/frontend` step inside this `/ship` run respects the same auto mode.

See "Auto Mode" in SKILL.md for the tag taxonomy, hard-override list, and ambiguity heuristic. Apply checkpoint tags from the table at the bottom of this file.

### Step 0 — Auto-write focus

Before picking a story, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

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

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]`: Show promoted story. Ask: *"Does this look right? Reply 'go' to ship."* Under `--auto`: SKIP if the BACKLOG item already has clear acceptance criteria and PROD's shaping is mechanical; otherwise ASK.

### Flow

**Phase 1 — Backend** (`/implement` flow)
- ARCH generates plan
- PROD validates vs acceptance criteria
- ⚠️ **Single human checkpoint** `[AUTO: skip]`: Show both plans. Ask: *"Reply 'go' to start the full ship chain."* Under `--auto`: SKIP — emit `SKIPPED: ship-chain approval [auto]` and proceed. Hard-override #4 still applies (missing test framework, missing design tool → HARD-PAUSE).
- On 'go': implement + tests. Update PROGRESS.md + STORIES.md
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — [story title]
test([feature-name]): STORY-XXX — add tests
```

**Phase 2 — Backend Review** *(automatic)*
Run full `/review` flow immediately.
- RED, REQ, TEST, DOC, SEC run parallel
- Consolidated fix list

**Blockers** → pause + surface (`[AUTO: always-ask]` — also hard-override #1):
```
⚠️ SHIP PAUSED — blockers found by [agent]

[consolidated blocker list]

Fix these now? Reply 'fixed' to continue the chain, or 'abort' to stop.
```
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
- **Reminder before review** *(prose only — not a checkpoint)*: capture screenshots or recordings of each UI AC and drop them into `docs/features/<feature-name>/artifacts/STORY-XXX/`. Reference them in PROGRESS.md's Visual Artifacts table. `ae-ux` validates the references during Phase 4 — missing or stale refs become should-fix warnings (informational, not blockers).

**Phase 4 — Frontend Review** *(automatic)* (`/review` + ae-ux fidelity)
- 6-agent parallel pass
- ae-ux checks fidelity vs design handoff
- Blockers → pause + surface, same pattern as Phase 2
- Blockers fixed → **GIT** commits:
```
fix([feature-name]): STORY-XXX — address frontend review blockers
```

**Phase 5 — End-user docs + Changelogs** *(automatic — final step before commit)*

Keeps `./app-docs/` in sync with what user can do.

Spawn **ae-scribe** subagent → updates `./app-docs/`. Writes product-style docs (overview, how-to, tutorial) for end users. See `ae-scribe.md` for template.

No user-facing surface → SCRIBE returns `no user-facing change, app-docs unchanged.` Valid — don't force-generate.

After SCRIBE returns, prepend to both changelogs (newest first):

`./docs/CHANGELOG.md` (after header, terse):
```markdown
## [date]
- [STORY-XXX] feat([feature]): [what was implemented] — [key files]
- [STORY-XXX] review: [clean / N blockers fixed] — RED/REQ/TEST/DOC
- [STORY-XXX] docs: [feature].mdx updated
```

`./app-docs/CHANGELOG.mdx` (after frontmatter + title, **product release note to end users**):
```mdx
## [Month YYYY]

### Added
- **[Feature name in user language]** — [plain-English — what users can now do, no internals]
```

SCRIBE returned "no user-facing change" → skip `### Added` entry + skip `app-docs/CHANGELOG.mdx` commit. Still prepend terse entry to `docs/CHANGELOG.md`.

- **GIT** commits:
```
docs([feature-name]): STORY-XXX — update app docs and changelogs
```

**Phase 6 — PR Description** *(automatic, not pushed)*

**GIT** generates PR desc from `git log` (not plan): story title, What changed (plain English), Why (user story), Changes (`feat:`/`fix:`/`docs:` commits), How to test (from acceptance criteria), Checklist (tests · docs · no blockers).

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

Next: run `/ship` again for STORY-XXX+1, or `/status` to review the board.
```

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
| Internal `/review` blocker surface | inherited tag from review.md / hard-override #1 |


### Documentation rules (SCRIBE)

`./app-docs/` = **end-user product documentation**. Not internal reference (→ `./docs/`).

After successful ship, SCRIBE:

1. User-reachable change? No → return "no user-facing change" + exit.
2. Update existing `./app-docs/features/[feature-name].mdx` or create.
3. MDX: frontmatter → intro → **What you can do** → **How to use it** (numbered, real UI labels) → **Tips** → **FAQ** (only if real recurring) → **Related**.
4. No file paths / function names / code blocks in app-docs.
5. Update `./app-docs/index.mdx` if new user-facing feature added.
6. Self-check per `ae-scribe.md`.

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
