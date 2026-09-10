## `/review` — Multi-Agent Code Review

**Goal:** Consolidated fix list for current story. Seven specialist reviewers run parallel on changed code.

**`--frontend-pass`** drops `ae-lean` and runs the other six. `/ship` Phase 4 passes it — `ae-lean` already reviewed this branch in Phase 2, and component-level duplication is `ae-ux`'s beat. Everything else about the two passes is identical. A standalone `/review` runs all seven.

**Inputs (read first):**
- `./CLAUDE.md`, `./docs/INDEX.md`, `./docs/CONSTITUTION.md` — orient on current feature
- `./docs/features/[feature-name]/PROGRESS.md` — files changed in last story
- `./docs/features/[feature-name]/STORIES.md` — story's acceptance criteria

### Step 0 — Auto-write focus

Before reviewing, update `.agentic/focus.md`:

1. Run **§B step 1** of `shared/preamble.md` — creates `.agentic/` and gitignores it, idempotent.

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references the same STORY-ID / branch → update `note:` to `phase: reviewing` and `set_by:` to `/review`. Leave `title:` + `since:` alone. **Common case when `/review` is invoked inside `/ship`.**
   - Otherwise → overwrite CURRENT: `title: reviewing <STORY-ID or branch>`, `since: [now]`, `set_by: /review`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with review below.

### Step 0c — Capture the diff once

Reviewers have no Bash. Parent runs git, writes result to a file, passes the path.

```bash
mkdir -p .agentic/review

BASE=""
for cand in \
  "$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')" \
  main master; do
  [ -n "$cand" ] || continue
  git rev-parse --verify --quiet "refs/heads/$cand" >/dev/null 2>&1 \
    || git rev-parse --verify --quiet "refs/remotes/origin/$cand" >/dev/null 2>&1 \
    || continue
  BASE="$(git merge-base HEAD "$cand" 2>/dev/null)" && [ -n "$BASE" ] && break
  BASE=""
done
[ -n "$BASE" ] || BASE="$(git rev-parse --verify --quiet HEAD~1 2>/dev/null)"

if [ -z "$BASE" ] || [ "$BASE" = "$(git rev-parse HEAD)" ]; then
  echo "REVIEW ABORTED — cannot determine a base commit to diff against." >&2
else
  git diff "$BASE"...HEAD > ".agentic/review/<STORY-ID>.diff"
  git diff "$BASE"...HEAD --name-only > ".agentic/review/<STORY-ID>.files"
fi
```

`<STORY-ID>` → current story id, else branch name.

**`BASE` resolving to HEAD is a failure, not a clean review.** Say so and stop; do not report "clean". A base that equals HEAD produces an empty diff, six reviewers that find nothing, and a green report on unreviewed code — which is worse than an error, because nobody looks twice at a pass. Same for a genuinely empty diff on a branch that has commits.

An empty diff on a branch with *no* commits of its own is the only legitimate clean-and-skip case.

**Use `git symbolic-ref`, never `git rev-parse --abbrev-ref origin/HEAD`.** `rev-parse --abbrev-ref` echoes the string `origin/HEAD` back on failure with exit 128, which a `sed 's|origin/||'` then turns into the literal `HEAD` — and `git merge-base HEAD HEAD` is HEAD. That is the empty-diff green report above, arrived at silently. `symbolic-ref --quiet` fails cleanly instead.

**Never let a reviewer compute its own base.** Each one guessed differently; one fell back to `HEAD~1` and reviewed a single commit of a multi-commit branch while its peers reviewed the whole branch.

**Constraints:**
- All subagents dispatched **in single tool-call batch** — not sequentially. Seven normally, six under `--frontend-pass`
- Dispatch by full plugin-namespaced name: `agentic-engineering:ae-red`, `:ae-req`, `:ae-test`, `:ae-doc`, `:ae-sec`, `:ae-edge`, `:ae-lean`. Bare `ae-red` does not resolve under a plugin install — the dispatch fails silently and the main model role-plays the reviewers inline with no error
- Every dispatch prompt states: **do NOT write, edit, or create any file in the repository** — no debug statements, no scratch or repro test files, no temporary edits, not even ones the agent intends to delete
- Every dispatch prompt passes the diff path `.agentic/review/<STORY-ID>.diff` and the plugin root `${CLAUDE_PLUGIN_ROOT}`, so the agent can reach its own reference files
- Each subagent gets only files it needs — pass paths, not full content
- Consolidate into one fix list before reporting
- Before consolidating, read `./docs/improvements.md` (missing → skip). Finding matches prior won't-fix entry → report under Won't-fix as "previously logged [date]", never re-litigate

### The reviewers

| `subagent_type` | Receives | Looks for |
|---|---|---|
| `agentic-engineering:ae-red` | diff path + changed impl files | runtime errors, null safety, async bugs, logic, resource leaks |
| `agentic-engineering:ae-req` | STORIES.md + CONSTITUTION.md + changed files | acceptance criteria met, constitution violations |
| `agentic-engineering:ae-test` | diff path + changed files + test files + STORIES.md + PROGRESS.md + feature name | coverage gaps, AC Coverage matrix validity, tests that wouldn't catch regressions |
| `agentic-engineering:ae-doc` | CLAUDE.md + changed files + related app-docs | convention drift, docs needing update |
| `agentic-engineering:ae-sec` | diff path + changed impl files | high-confidence exploitable vulnerabilities |
| `agentic-engineering:ae-edge` | diff path + changed impl files + tests + AC + CONSTITUTION | adversarial backend edge cases the diff doesn't handle (boundary, null, race, malformed, resource, error-path) |
| `agentic-engineering:ae-lean` | diff path + changed impl files + `CLAUDE.md` + the project's dependency manifest | code that works but shouldn't exist — duplicates of what the repo already has, indirection earning nothing, needless work in hot paths. **Skipped under `--frontend-pass`** |

**`ae-lean` is the only reviewer looking at correct code.** The other six find defects; it finds redundancy. Its dispatch prompt must say **search the repo before flagging reuse** — its defining finding ("this already exists at `utils/x.ts:40`") is unreachable from a diff, and a reviewer that reads only the diff returns style opinions. Pass the dependency manifest (`package.json`, `pyproject.toml`, `go.mod`, …) so it doesn't recommend a library the project deliberately does without.

`ae-test` needs the feature name, `STORIES.md` and `PROGRESS.md` — without them it cannot validate the AC Coverage matrix and silently drops half its job.

Each reviewer loads own reference files on demand from `${CLAUDE_PLUGIN_ROOT}/references/<agent>/`. Don't instruct how to review — they know.

### Output

```
━━━ REVIEW: STORY-XXX ━━━

Blockers (fix before next story):
1. [issue] — [source agent] — [fix plan]

Should-fix (fix soon):
1. [issue] — [source agent]

Won't-fix (logged to improvements.md):
1. [issue] — [reason / previously logged YYYY-MM-DD]

Clean areas:
- RED: [scope checked and clear]
- REQ: X/Y criteria met. Constitution: N compliant, M violations.
- TEST: [verdict]
- DOC: [aligned / drifts noted]
- SEC: [Clean / X findings — Critical: N, High: N, Medium: N]
- EDGE: [Clean / X cases — Blockers: N, Should-cover: M, Won't-cover: K]
- LEAN: [Clean / X findings — Blockers: N, Should-fix: M] · Reuse: [what was searched] — (omit line entirely under `--frontend-pass`)
```

Save full review to `./docs/features/[feature-name]/reviews/STORY-XXX-review.md`.

**Severity mapping.** Reviewers speak their own dialect; the consolidator translates into exactly three buckets.

| Reviewer says | Bucket |
|---|---|
| RED `CRITICAL`, SEC `Critical` / `High`, EDGE `Blocker`, REQ constitution violation, LEAN verbatim-duplication `Blocker` | Blocker |
| RED `WARNING`, SEC `Medium`, EDGE / TEST `should-cover`, DOC drift, **all LEAN `should-fix`** | Should-fix |
| anything the agent itself marked won't-fix, or matching a prior `improvements.md` entry | Won't-fix |

`should-cover` and `should-fix` are the same bucket. Never invent a fourth.

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"How do you want to handle the blockers?"* → **Fix now (Recommended)** · **Show me the full report first** · **Log and move on**. No blockers → skip the gate entirely and print the clean summary.

**Nested under `/ship` or `/improve`:** the parent's blocker gate wins. `/review` reports, does not gate — the parent fires its own `[ASK: single]` with its own options. Two gates for one decision is a bug.

`Next:` — blockers fixed → return to the parent chain. Standalone `/review` with blockers logged → `/fix` for the blocker, or `/status` to see what's next.

### Gotchas

- **Sequential dispatch = failure.** Six subagents in one batched tool call. Never spawn-wait-spawn. 6 separate calls → re-batch.
- **No story summary before dispatch.** Reviewers read files themselves. Paraphrase → token waste + meaning drift.
- **Reviewers must not write to the repo.** A reviewer with Bash will reach for `console.log` or a scratch repro to confirm a finding, and two agents doing that concurrently corrupt the thing under review. Observed: one agent's edit clobbered a test another had just written, and a second left debug lines in a COMMITTED file. State the ban in every dispatch prompt; a finding an agent cannot reach without editing is reported as reasoning with stated confidence, not proven by mutation.
- **A reviewer's reproduction can be wrong.** One agent reported a delimiter collision and "reproduced" it with a debug line that joined differently than the code did — it measured its own string. Confirm a claimed repro against the actual source before acting; agreeing and refusing are both wrong when the evidence is the agent's own artifact.
- **LEAN and RED do not co-report.** If code is both redundant and broken, RED owns it — a bug in duplicated code is still a bug. LEAN's entry survives only if the redundancy stands independently of the defect.
- **Don't merge findings early — but the overlap is carved.** ae-red + ae-sec on one line → keep both voices; correctness and exploitability are different lenses. ae-red + ae-edge on one line are NOT both kept: **ae-red owns "crashes on the current path", ae-edge owns "no test proves the guard"**. Same null deref reported by both → one Blocker from ae-red, and ae-edge's entry only survives if it names a missing test.
- **No 8th reviewer ad-hoc.** Roster is exactly the seven above. New dimension missing → skill change, not improvisation. Flag it.
- **LEAN findings never block a ship except on verbatim duplication.** Working code that could be simpler is `should-fix`, always. An operator who has to argue about a ternary at a blocker gate stops reading review reports — and then misses the RED finding underneath.
- **A LEAN report with no `Reuse:` line means it skipped the repo search.** That is the half of its job the diff cannot supply. Treat the report as incomplete and say so rather than consolidating it.
- **Constitution violations = always blockers.** Never downgrade to "should-fix." Fix cost irrelevant.
- **ae-edge is read-only.** Despite emitting failing test code, ae-edge does NOT write files. Test code lives in the report as inert text; blocker-fix flow downstream copies it into project test files. If ae-edge writes a file, that's a bug.
- **ae-edge defers frontend.** If diff is frontend-only, ae-edge emits "out of scope" and exits. Don't expect findings on `.tsx`/`.vue`/`.jsx` changes or `.swift` under `Views/` — that's `ae-ux`'s beat.
