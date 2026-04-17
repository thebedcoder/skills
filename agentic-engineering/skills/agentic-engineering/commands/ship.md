## `/ae-ship` — Full Story Chain

**Chains: implement → review → frontend → review**

Use this after `/ae-design` is approved and you're ready to build a story end-to-end
without manually triggering each step.

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

**Phase 1 — Backend**
Run the full `/ae-implement` flow for the next unchecked story.
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

**Phase 3 — Frontend** *(automatic after clean review or 'fixed')*
Run the full `/ae-frontend` flow.
- UX reads design handoff spec
- ARCH plans components
- PROD validates flow
- Implement pixel-faithful to designs
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — frontend implementation
```

**Phase 4 — Frontend Review** *(automatic, no pause)*
Run the full `/ae-review` flow on the frontend code, then spawn ae-ux for the fidelity check.
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

**GIT** generates a PR description ready to copy into GitHub/GitLab:

```markdown
## STORY-XXX: [Story title]

### What changed
[Plain-English summary of what was built]

### Why
[The user story — as a X, I want Y so that Z]

### Changes
- `feat:` [backend summary]
- `feat:` [frontend summary]
- `docs:` [what was documented]

### How to test
[Steps to verify the feature works, derived from acceptance criteria]

### Checklist
- [ ] Tests pass
- [ ] Docs updated
- [ ] No review blockers outstanding
```

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

1. Checks `./app-docs/features/` for an existing MDX file for this feature.
   - If it exists → update it
   - If not → create `./app-docs/features/[feature-name].mdx`

2. Each feature MDX follows this structure:

```mdx
---
title: [Feature Name]
description: [One sentence — what this feature does for the user]
status: stable | beta | deprecated
last_updated: [date]
---

# [Feature Name]

[2-3 sentence plain-English overview. Written for a new team member on day one.]

## What it does

[User-facing description. No code. What does the user experience?]

## How it works

[Technical overview. Key files, key functions, data flow. Enough for a developer
to orient without reading the code first.]

## Key files

| File | Purpose |
|------|---------|
| `[path]` | [what it does] |

## Edge cases & known behaviour

[Anything non-obvious. Error states, limits, gotchas.]

## Related features

[Links to other feature MDX files this connects to, if any]
```

3. Updates `./app-docs/index.mdx` if a new feature was added (append to the features list).

4. SCRIBE's self-check before finishing:
```
SCRIBE — Docs Update:
✅ Created / updated: [file path]
✅ Readable by a new team member: yes/no — [note if no]
✅ Useful as AI context: yes/no — [note if no]
✅ index.mdx updated: yes / not needed
```

### What still requires your input
- The single "go" at the start (you're approving the full plan upfront)
- Any blocker pause mid-chain
- Nothing else — warnings and non-blockers are logged to the review file, not surfaced during the chain

### Gotchas

- **Don't silently expand scope.** The chain implements exactly one story. If during implementation a related bug surfaces in adjacent code, note it to BACKLOG.md — never fix it "while you're there". One story, one commit chain.
- **Don't skip Phase 2 on the assumption "I wrote the tests, it'll pass review."** RED and SEC routinely find things the author missed. Always run the review, even if it feels redundant.
- **Don't treat "fixed" as self-attested.** When the user replies "fixed" after a blocker pause, re-run the review to confirm. The fix may have introduced a new issue or not addressed the root cause.
- **Don't commit before the review completes.** If you commit the implementation before Phase 2 finishes and it finds blockers, the fix commit history gets muddled. Implementation commits happen at end of Phase 1 — fixes from Phase 2 are separate commits.
- **Don't generate the PR description from imagination.** Generate it from the actual commits made during this chain — read `git log` for the branch, not the plan. Users push PRs with wrong descriptions when this step hallucinates.
- **Frontend phase skipped cleanly when the story has no UI.** Check the story for UI components before running Phase 3. A backend-only story should go directly from Phase 2 to Phase 5.

---
