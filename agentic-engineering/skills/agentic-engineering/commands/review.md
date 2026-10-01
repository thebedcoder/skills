## `/review` — Multi-Agent Code Review

**Goal:** Consolidated fix list for current story. Seven specialist reviewers run parallel on changed code.

**`--frontend-pass`** drops `ae-lean` and runs the other six. `/ship` Phase 4 passes it — `ae-lean` already reviewed this branch in Phase 2, and component-level duplication is `ae-ux`'s beat. Everything else about the two passes is identical. A standalone `/review` runs all seven.

**Roster — full or lite.** Full (seven; six under `--frontend-pass`) is the default and always the answer for a standalone `/review`. Inside a chain, **lite** — `ae-red`, `ae-req`, `ae-test`, still one message — when either holds:

- the story's brief says `implementer tier: haiku` — a copy of a cited precedent, ≤3 files, no Contract claims, no Failure states;
- every changed path is documentation: under `docs/` or `app-docs/`, or a `.md` file.

Lite adds `ae-sec` when the diff touches auth, input parsing, crypto, or file or network I/O. Never lite when `CONSTITUTION.md` asks for full review. Print the roster on the first line of the report: `Roster: lite (haiku-tier story) — RED, REQ, TEST`. REQ and TEST are in every roster: evidence, acceptance criteria and coverage are never skipped.

**Inputs (read first):**
- `./CLAUDE.md`, `./docs/INDEX.md`, `./docs/CONSTITUTION.md` — orient on current feature
- `./docs/features/[feature-name]/PROGRESS.md` — files changed in last story
- `./docs/features/[feature-name]/STORIES.md` — story's acceptance criteria

### Step 0 — Auto-write focus

Before reviewing, run **§B** of `shared/preamble.md` — `title: reviewing <STORY-ID or branch>`, `set_by: /review`. CURRENT already names this story or branch (the common case inside `/ship`) → only `note: phase: reviewing` + `set_by:` change.

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

Caller passed `range: <A>..<B>` (a story built in a parallel group: its merge commit, `M^1..M`) → `git diff <A> <B>` and `--name-only` into the same two files instead of `BASE...HEAD`, and skip the base search.

Story under review → also capture the evidence verdict for REQ (no Bash on its side):

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh check docs/features/<feature>/PROGRESS.md <STORY-ID> \
  --diff .agentic/review/<STORY-ID>.diff > .agentic/review/<STORY-ID>.evidence
```

Non-zero exit is the verdict, not an error — write the file either way. Branch-only review, no story → skip.

**`BASE` resolving to HEAD is a failure, not a clean review** — say so and stop. Empty diff → reviewers find nothing → green report on unreviewed code, and nobody looks twice at a pass. Same for an empty diff on a branch with commits; only a branch with *no* commits of its own may clean-skip.

**Use `git symbolic-ref`, never `git rev-parse --abbrev-ref origin/HEAD`** — on failure the latter echoes `origin/HEAD`, `sed` turns it into `HEAD`, and `merge-base HEAD HEAD` is HEAD: the empty-diff green report, silently.

**Never let a reviewer compute its own base** — they guess differently; one reviewed `HEAD~1` while its peers reviewed the branch.

**Constraints:**
- All subagents dispatched **in single tool-call batch** — not sequentially. Seven normally, six under `--frontend-pass`, three or four under the lite roster
- Dispatch by full plugin-namespaced name: `agentic-engineering:ae-red`, `:ae-req`, `:ae-test`, `:ae-doc`, `:ae-sec`, `:ae-edge`, `:ae-lean`. Bare `ae-red` does not resolve under a plugin install — the dispatch fails silently and the main model role-plays the reviewers inline with no error
- Every dispatch prompt states: **do NOT write, edit, or create any file in the repository** — no debug statements, no scratch or repro test files, no temporary edits, not even ones the agent intends to delete
- Every dispatch prompt passes the diff path `.agentic/review/<STORY-ID>.diff` and the plugin root `${CLAUDE_PLUGIN_ROOT}`, so the agent can reach its own reference files
- Each subagent gets only files it needs — pass paths, not full content
- Consolidate into one fix list before reporting
- Before consolidating, read `./docs/improvements.md` (missing → skip). Finding matches prior won't-fix entry → report under Won't-fix as "previously logged [date]", never re-litigate

### The reviewers

| `subagent_type` | Receives | Looks for |
|---|---|---|
| `agentic-engineering:ae-red` | diff path + changed impl files + `docs/review-memory.md` | runtime errors, null safety, async bugs, logic, resource leaks |
| `agentic-engineering:ae-req` | STORIES.md + CONSTITUTION.md + changed files + PROGRESS.md + `.agentic/review/<STORY-ID>.evidence` | acceptance criteria met, constitution violations, story ticked without fresh evidence |
| `agentic-engineering:ae-test` | diff path + changed files + test files + STORIES.md + PROGRESS.md + feature name | coverage gaps, AC Coverage matrix validity, tests that wouldn't catch regressions |
| `agentic-engineering:ae-doc` | CLAUDE.md + changed files + related app-docs + the story's brief `.agentic/briefs/<STORY-ID>.md` when it exists (the plan — for its persisted-artifacts check) | convention drift, docs needing update |
| `agentic-engineering:ae-sec` | diff path + changed impl files + `docs/review-memory.md` | high-confidence exploitable vulnerabilities |
| `agentic-engineering:ae-edge` | diff path + changed impl files + tests + AC + CONSTITUTION | adversarial backend edge cases the diff doesn't handle (boundary, null, race, malformed, resource, error-path) |
| `agentic-engineering:ae-lean` | diff path + changed impl files + `CLAUDE.md` + the project's dependency manifest + `docs/review-memory.md` | code that works but shouldn't exist — duplicates of what the repo already has, indirection earning nothing, needless work in hot paths. **Skipped under `--frontend-pass`** |

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
- REQ: X/Y criteria met. Constitution: N compliant, M violations. Evidence: [fresh / stale / failing / unverified / missing / n/a] · fail-first: [present / missing / n/a]
- TEST: [verdict]
- DOC: [aligned / drifts noted]
- SEC: [Clean / X findings — Critical: N, High: N, Medium: N]
- EDGE: [Clean / X cases — Blockers: N, Should-cover: M, Won't-cover: K]
- LEAN: [Clean / X findings — Blockers: N, Should-fix: M] · Reuse: [what was searched] — (omit line entirely under `--frontend-pass`)
```

Save full review to `./docs/features/[feature-name]/reviews/STORY-XXX-review.md`.

**Review memory** — `./docs/review-memory.md`, committed, kept by this step, never by a reviewer (they have no write tool; Claude Code's own agent `memory:` is not available to plugin agents and would hand them Write and Edit). `ae-red`, `ae-sec` and `ae-lean` read it on every review. After consolidating, add an entry only when:

- a finding's pattern recurs — the same reviewer, the same root cause, in a second story → `## RED` / `## SEC` / `## LEAN`: `- [pattern] — [file:line example] — STORY-XXX, STORY-YYY`;
- a finding was disproven — withdrawn in a fix-loop re-review, or logged "not a bug" with a reason → `## Not bugs here`: `- [claim] — [why it does not hold here, file:line]`.

Missing file → create it with those four headings under `# Review memory` and one line saying what it is. Keep it ≤ 60 lines: past that, merge similar entries and drop the ones whose code is gone. It commits with the review.

**Severity mapping.** Reviewers speak their own dialect; the consolidator translates into exactly three buckets.

| Reviewer says | Bucket |
|---|---|
| RED `CRITICAL`, SEC `Critical` / `High`, EDGE `Blocker`, REQ criterion `NOT MET`, REQ constitution violation, REQ `EVIDENCE: ❌`, TEST `Missing coverage:` entries — an AC with no test, a matrix row naming a test that does not exist, a test that cannot fail for its AC — LEAN verbatim-duplication `Blocker` | Blocker |
| RED `WARNING`, SEC `Medium`, EDGE / TEST `should-cover` / `should-fix`, TEST test-quality notes, DOC drift, REQ `FAIL-FIRST: ⚠️ missing`, **all LEAN `should-fix`** | Should-fix |
| anything the agent itself marked won't-fix, or matching a prior `improvements.md` entry | Won't-fix |

`should-cover` and `should-fix` are the same bucket. Never invent a fourth — and never drop a finding because its label is missing from this table: a reviewer's own `blocker` wording goes to Blocker, anything softer to Should-fix.

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"How do you want to handle the blockers?"* → **Fix now (Recommended)** · **Show me the full report first** · **Log and move on**. No blockers → skip the gate entirely and print the clean summary.

**Nested under `/ship` or `/improve`:** `/review` reports, does not gate — the parent runs `shared/fix-loop.md` on the blockers, and only what survives it reaches a gate. Two gates for one decision is a bug.

`Next:` — blockers fixed → return to the parent chain. Standalone `/review` with blockers logged → `/fix` for the blocker, or `/status` to see what's next.

### Gotchas

- **Sequential dispatch = failure.** Never spawn-wait-spawn; separate calls → re-batch.
- **No story summary before dispatch.** Reviewers read files themselves. Paraphrase → token waste + meaning drift.
- **Reviewers must not write to the repo** (Constraints). Concurrent agents editing corrupt the thing under review. A finding an agent cannot reach without editing is reported as reasoning with stated confidence, not proven by mutation.
- **A reviewer's reproduction can be wrong.** One agent reported a delimiter collision and "reproduced" it with a debug line that joined differently than the code did — it measured its own string. Confirm a claimed repro against the actual source before acting; agreeing and refusing are both wrong when the evidence is the agent's own artifact.
- **LEAN and RED do not co-report.** If code is both redundant and broken, RED owns it — a bug in duplicated code is still a bug. LEAN's entry survives only if the redundancy stands independently of the defect.
- **Don't merge findings early — but the overlap is carved.** ae-red + ae-sec on one line → keep both voices; correctness and exploitability are different lenses. ae-red + ae-edge on one line are NOT both kept: **ae-red owns "crashes on the current path", ae-edge owns "no test proves the guard"**. Same null deref reported by both → one Blocker from ae-red, and ae-edge's entry only survives if it names a missing test.
- **No 8th reviewer ad-hoc, no subset of your own.** Roster is the seven above, or the lite set by its rule — nothing in between. New dimension missing → skill change, not improvisation. Flag it.
- **Review memory is a short list, not a log.** One entry per recurring pattern or disproven claim. A finding seen once belongs in the review file, not there.
- **LEAN findings never block a ship except on verbatim duplication.** Working code that could be simpler is `should-fix`, always. An operator who has to argue about a ternary at a blocker gate stops reading review reports — and then misses the RED finding underneath.
- **A LEAN report with no `Reuse:` line means it skipped the repo search.** That is the half of its job the diff cannot supply. Treat the report as incomplete and say so rather than consolidating it.
- **Unverified completion = blocker.** Story ticked in this diff with evidence `stale`, `failing`, `unverified` or `missing` → REQ blocks. Fix is a fresh `evidence.sh run`, never an edited row — a row's tree id is only reproducible by running the tests on that code, and `check` looks every row up in the run ledger, so a typed one reads `unverified`.
- **Constitution violations = always blockers.** Never downgrade to "should-fix." Fix cost irrelevant.
- **ae-edge is read-only.** Despite emitting failing test code, ae-edge does NOT write files. Test code lives in the report as inert text; blocker-fix flow downstream copies it into project test files. If ae-edge writes a file, that's a bug.
- **ae-edge defers frontend.** If diff is frontend-only, ae-edge emits "out of scope" and exits. Don't expect findings on `.tsx`/`.vue`/`.jsx` changes or `.swift` under `Views/` — that's `ae-ux`'s beat.
