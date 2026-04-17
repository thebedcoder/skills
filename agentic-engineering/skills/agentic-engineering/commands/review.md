## `/ae-review` — Multi-Agent Code Review

**Goal:** Produce a consolidated fix list for the current story by running five specialist reviewers on the changed code in parallel.

**Inputs (read first):**
- `./CLAUDE.md`, `./docs/INDEX.md`, `./docs/CONSTITUTION.md` — orient on the current feature
- `./docs/features/[feature-name]/PROGRESS.md` — identify files changed in the last story
- `./docs/features/[feature-name]/STORIES.md` — locate the story's acceptance criteria

**Constraints:**
- All five subagents dispatched **in a single tool-call batch** (not sequentially)
- Each subagent gets only the files it needs — pass paths, not full content
- Consolidate results into one fix list before reporting to the user

### The five reviewers

| Agent | Receives | Looks for |
|---|---|---|
| **ae-red** | changed implementation files + git diff | runtime errors, null safety, async bugs, logic errors, resource leaks |
| **ae-req** | STORIES.md + CONSTITUTION.md + changed files | acceptance criteria met, constitution violations |
| **ae-test** | changed files + their test files | coverage gaps, tests that wouldn't catch regressions |
| **ae-doc** | CLAUDE.md + changed files + related app-docs | convention drift, docs that need updating |
| **ae-sec** | changed implementation files + git diff | high-confidence exploitable vulnerabilities |

Each reviewer loads its own reference files on demand. Don't instruct them how to review — they know.

### Output

```
━━━ REVIEW: STORY-XXX ━━━

Blockers (fix before next story):
1. [issue] — [source agent] — [fix plan]

Should-fix (fix soon):
1. [issue] — [source agent]

Won't-fix (logged to improvements.md):
1. [issue] — [reason]

Clean areas:
- RED: [scope checked and clear]
- REQ: X/Y criteria met. Constitution: N compliant, M violations.
- TEST: [verdict]
- DOC: [aligned / drifts noted]
- SEC: [Clean / X findings — Critical: N, High: N, Medium: N]
```

Save full review to `./docs/features/[feature-name]/reviews/STORY-XXX-review.md`.
Ask: *"Should I fix the blockers now, or do you want to review them first?"*

### Gotchas

- **Sequential dispatch is the #1 failure.** Spawning one agent, waiting for its result, spawning the next — this defeats the purpose. The five subagents must be spawned in a single batched tool call so they actually run in parallel. If you find yourself with 5 separate tool calls each containing one Task, stop and re-batch.
- **Don't summarize the story before dispatching.** The reviewers read the files themselves. Paraphrasing the story's intent into the subagent prompt wastes tokens and drifts meaning.
- **Resist merging findings prematurely.** If ae-red and ae-sec both flag the same line, keep both voices in the raw output before deduping. Their reasoning differs and sometimes one has context the other missed.
- **Don't add a 6th reviewer ad-hoc.** If a story reveals a new review dimension that's missing, that's a skill change — flag it to the user, don't improvise.
- **Constitution violations are always blockers.** Never downgrade them to "should-fix" because the fix looks expensive. That's the point of the constitution.
