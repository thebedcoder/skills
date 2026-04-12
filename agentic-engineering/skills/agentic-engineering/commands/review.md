## `/ae-review` — Multi-Agent Code Review

Read `./CLAUDE.md`, `./docs/INDEX.md`, and `./docs/CONSTITUTION.md` to identify the current feature and last completed story.
Identify the files changed in the last story from PROGRESS.md.

Spawn all 5 review subagents **in parallel** — each runs in its own context window,
keeping the main conversation clean and results coming back faster.

### Spawn instructions

Dispatch these 5 subagents simultaneously, passing them the relevant file paths:

**ae-red** — bug hunt
- Pass: all changed implementation files for this story + git diff
- Task: find runtime errors, null safety issues, async bugs, logic errors, resource leaks. Loads relevant reference files automatically based on file types and language.

**ae-req** — requirements + constitution audit
- Pass: `./docs/features/[feature-name]/STORIES.md` + `./docs/CONSTITUTION.md` + all changed files
- Task: verify every acceptance criterion is met AND check for constitution violations

**ae-test** — coverage review
- Pass: all changed implementation files + their corresponding test files
- Task: assess test quality and find missing coverage. Loads framework-specific guide (pytest/jest/go test/XCTest etc.) automatically.

**ae-doc** — consistency check
- Pass: `./CLAUDE.md` + all changed files + any related app-docs
- Task: check code against conventions and flag docs that need updating

**ae-sec** — security review
- Pass: all changed implementation files + git diff
- Task: find HIGH CONFIDENCE exploitable vulnerabilities — injection, XSS, auth, IDOR, crypto, secrets. Loads relevant reference files automatically based on file types.

### After all 4 return

Consolidate into a single fix list:

```
━━━ REVIEW: STORY-XXX ━━━

Blockers (fix before next story):
1. [issue] — [source agent] — [fix plan]

Should-fix (fix soon):
1. [issue] — [source agent]

Won't-fix (logged):
1. [issue] — [reason]

Clean areas:
- RED: [what was checked and clear]
- REQ: X/Y criteria met. Constitution: N compliant, M violations.
- TEST: [verdict]
- DOC: [aligned / drifts noted]
- SEC: [Clean / X findings — Critical: N, High: N, Medium: N]
```

Save full review to `./docs/features/[feature-name]/reviews/STORY-XXX-review.md`.

Ask: *"Should I fix the blockers now, or do you want to review them first?"*
