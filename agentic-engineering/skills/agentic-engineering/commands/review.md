## `/review` — Multi-Agent Code Review

**Goal:** Consolidated fix list for current story. Five specialist reviewers run parallel on changed code.

**Inputs (read first):**
- `./CLAUDE.md`, `./docs/INDEX.md`, `./docs/CONSTITUTION.md` — orient on current feature
- `./docs/features/[feature-name]/PROGRESS.md` — files changed in last story
- `./docs/features/[feature-name]/STORIES.md` — story's acceptance criteria

### Step 0 — Auto-write focus

Before reviewing, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references the same STORY-ID / branch → update `note:` to `phase: reviewing` and `set_by:` to `/review`. Leave `title:` + `since:` alone. **Common case when `/review` is invoked inside `/ship`.**
   - Otherwise → overwrite CURRENT: `title: reviewing <STORY-ID or branch>`, `since: [now]`, `set_by: /review`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with review below.

**Constraints:**
- All five subagents dispatched **in single tool-call batch** — not sequentially
- Each subagent gets only files it needs — pass paths, not full content
- Consolidate into one fix list before reporting

### The five reviewers

| Agent | Receives | Looks for |
|---|---|---|
| **ae-red** | changed impl files + git diff | runtime errors, null safety, async bugs, logic, resource leaks |
| **ae-req** | STORIES.md + CONSTITUTION.md + changed files | acceptance criteria met, constitution violations |
| **ae-test** | changed files + test files | coverage gaps, tests that wouldn't catch regressions |
| **ae-doc** | CLAUDE.md + changed files + related app-docs | convention drift, docs needing update |
| **ae-sec** | changed impl files + git diff | high-confidence exploitable vulnerabilities |

Each reviewer loads own reference files on demand. Don't instruct how to review — they know.

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

- **Sequential dispatch = failure.** Five subagents in one batched tool call. Never spawn-wait-spawn. 5 separate calls → re-batch.
- **No story summary before dispatch.** Reviewers read files themselves. Paraphrase → token waste + meaning drift.
- **Don't merge findings early.** ae-red + ae-sec flag same line → keep both voices. Reasoning differs, context varies.
- **No 6th reviewer ad-hoc.** New dimension missing → skill change, not improvisation. Flag it.
- **Constitution violations = always blockers.** Never downgrade to "should-fix." Fix cost irrelevant.
