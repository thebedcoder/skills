## `/ae-ship` — Full Story Chain

**Chains: implement → review → frontend → review**

Use after `/ae-design` approved. Builds story end-to-end without manual triggering.

### Finding what to ship

Read `./docs/INDEX.md` and feature `STORIES.md` files. Also read `./docs/BACKLOG.md`.

**PROD** picks the next item to ship in this order:
1. Next unchecked story in an active feature's `STORIES.md`
2. If no unchecked stories exist → check `BACKLOG.md` for backlog items

If a backlog item is selected, **promote it first** before shipping:

```
PROD — Promoting backlog item:
NOTE-XXX: [title]

Shaping into story for feature: [feature name]
```

PROD converts it to a story and appends to `./docs/features/[feature-name]/STORIES.md`:
```markdown
- [ ] STORY-XXX: [title]
  **As a** [user], **I want** [action] **so that** [benefit]
  **Acceptance Criteria:**
  - [ ] [from NOTE-XXX draft criteria]
  **Notes:** [technical context from investigation]
  **Backlog ref:** NOTE-XXX
```

Then marks it promoted in `BACKLOG.md`:
```markdown
**Status:** ~~backlog~~ → promoted to STORY-XXX in [feature-name]
```

⚠️ **Human checkpoint:** Show the promoted story. Ask: *"Does this look right? Reply 'go' to ship."*

### Flow

**Phase 1 — Backend** (`/ae-implement` flow)
- ARCH generates implementation plan
- PROD validates against acceptance criteria
- ⚠️ **Single human checkpoint:** Show both plans. Ask: *"Reply 'go' to start the full ship chain."*
- On 'go': implement with tests, update PROGRESS.md and STORIES.md
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — [story title]
test([feature-name]): STORY-XXX — add tests
```

**Phase 2 — Backend Review** *(automatic, no pause)*
Run the full `/ae-review` flow immediately after implementation.
- RED, REQ, TEST, DOC, SEC run in parallel
- Produce consolidated fix list

If **blockers** are found → **pause and surface them:**
```
⚠️ SHIP PAUSED — blockers found by [agent]

[consolidated blocker list]

Fix these now? Reply 'fixed' to continue the chain, or 'abort' to stop.
```
If blockers were fixed → **GIT** amends or commits the fixes:
```
fix([feature-name]): STORY-XXX — address review blockers
```
If no blockers → continue automatically.

**Phase 3 — Frontend** *(automatic after clean review or 'fixed')* (`/ae-frontend` flow)
- UX reads design handoff spec
- ARCH plans components
- PROD validates flow
- Implement pixel-faithful to designs
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — frontend implementation
```

**Phase 4 — Frontend Review** *(automatic, no pause)* (`/ae-review` + ae-ux fidelity check)
- 5-agent parallel review pass
- ae-ux checks fidelity against design handoff
- If blockers found → pause and surface, same pattern as Phase 2
- If blockers were fixed → **GIT** commits:
```
fix([feature-name]): STORY-XXX — address frontend review blockers
```

**Phase 5 — Documentation + Changelogs** *(automatic after clean frontend review or 'fixed')*
Spawn **ae-scribe** subagent to update `./app-docs/` — runs in its own context, returns when done.

After SCRIBE returns, prepend to both changelogs (newest first):

`./docs/CHANGELOG.md` (insert after header line, terse):
```markdown
## [date]
- [STORY-XXX] feat([feature]): [what was implemented] — [key files]
- [STORY-XXX] review: [clean / N blockers fixed] — RED/REQ/TEST/DOC
- [STORY-XXX] docs: [feature].mdx updated
```

`./app-docs/CHANGELOG.mdx` (insert after frontmatter + title, human-readable):
```mdx
## [Month YYYY]

### Added
- **[Feature name]** — [plain-English description of what users can now do]
```

- **GIT** commits:
```
docs([feature-name]): STORY-XXX — update app docs and changelogs
```

**Phase 6 — PR Description** *(automatic, generated but not pushed)*

**GIT** generates PR description from `git log` (not from the plan): story title, What changed (plain English), Why (user story), Changes (`feat:`/`fix:`/`docs:` commits), How to test (from acceptance criteria), Checklist (tests · docs · no blockers).

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

After every successful ship, SCRIBE:

1. Checks `./app-docs/features/` — update existing `[feature-name].mdx` or create it.
2. MDX structure: frontmatter (title, description, status, last_updated) → 2-3 sentence overview (new-team-member readable) → "What it does" (user-facing, no code) → "How it works" (key files, data flow) → "Key files" table → "Edge cases" → "Related features".
3. Updates `./app-docs/index.mdx` if new feature added.
4. Self-check: path created/updated · readable by new team member · useful as AI context · index.mdx updated.

### What still requires your input
- Initial "go" (approves full plan upfront)
- Blocker pauses mid-chain
- Nothing else — warnings/non-blockers logged to review file, not surfaced

### Gotchas

- **One story, one commit chain.** Related bug found → BACKLOG.md, never fix "while there."
- **No skipping Phase 2.** RED + SEC find what authors miss. Always review, even if redundant-feeling.
- **"Fixed" ≠ self-attested.** User replies "fixed" → re-run review. Fix may miss root cause or introduce new issue.
- **No early commit.** Implementation commits at end of Phase 1. Phase 2 blockers → separate commits. Commit before review = muddled history.
- **PR description from `git log`, not imagination.** Read actual commits on branch. Never generate from plan.
- **No UI story → skip Phase 3.** Check story before running frontend. Backend-only → Phase 2 → Phase 5.

---
