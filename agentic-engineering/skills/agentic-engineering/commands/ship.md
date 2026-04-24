## `/ae-ship` — Full Story Chain

**Chain:** implement → review → frontend → review → docs

Use after `/ae-design` approved. Ships story end-to-end without manual triggers.

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

⚠️ **Human checkpoint:** Show promoted story. Ask: *"Does this look right? Reply 'go' to ship."*

### Flow

**Phase 1 — Backend** (`/ae-implement` flow)
- ARCH generates plan
- PROD validates vs acceptance criteria
- ⚠️ **Single human checkpoint:** Show both plans. Ask: *"Reply 'go' to start the full ship chain."*
- On 'go': implement + tests. Update PROGRESS.md + STORIES.md
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — [story title]
test([feature-name]): STORY-XXX — add tests
```

**Phase 2 — Backend Review** *(automatic)*
Run full `/ae-review` flow immediately.
- RED, REQ, TEST, DOC, SEC run parallel
- Consolidated fix list

**Blockers** → pause + surface:
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

**Phase 3 — Frontend** *(automatic after clean review or 'fixed')* (`/ae-frontend` flow)
- UX reads design handoff spec
- ARCH plans components
- PROD validates flow
- Implement pixel-faithful to designs
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — frontend implementation
```

**Phase 4 — Frontend Review** *(automatic)* (`/ae-review` + ae-ux fidelity)
- 5-agent parallel pass
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

Next: run `/ae-ship` again for STORY-XXX+1, or `/ae-status` to review the board.
```

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
