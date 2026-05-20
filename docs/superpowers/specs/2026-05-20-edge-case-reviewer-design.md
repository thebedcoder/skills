# Edge-Case Reviewer (`ae-edge`) — Design

**Date:** 2026-05-20
**Status:** Approved (pending implementation plan)
**Scope:** `agentic-engineering/` plugin
**Companion artifacts:**
- Builds on the `/review` 5-agent parallel batch documented in `agentic-engineering/skills/agentic-engineering/commands/review.md`
- Reuses subset of `agents/ae-test/references/` via cross-agent path reads

---

## Goal

Surface missing edge cases (boundary, null/empty, race/concurrency, malformed input, resource limits, error paths) as part of code review — so the user sees them in the same consolidated blocker list as other review findings and the existing blocker-fix flow handles implementation.

Today, `/review` runs five parallel reviewers (`ae-red`, `ae-req`, `ae-test`, `ae-doc`, `ae-sec`). `ae-test` flags coverage *gaps* declaratively but cannot generate failing test code. `ae-red` finds bugs in the diff but does not adversarially probe for cases the diff doesn't cover. Nothing in the workflow probes "what's missing" — only "what's wrong with what's there."

This adds a sixth reviewer, `ae-edge`, that runs in the same parallel batch as the existing five, focused exclusively on adversarial backend edge cases.

---

## Non-goals

- **No mutation.** `ae-edge` does not write files, run tests, or modify implementation code. It emits failing test code and fix suggestions as inert specs. Fixes happen via the existing `/review` blocker-fix flow.
- **No new user-facing command.** No `/edges` slash command, no wrapper, no `USER_COMMANDS` entry. `ae-edge` is internal-only — accessible only via `/review` (and therefore via `/ship` Phase 2).
- **No frontend adversarial mining in v1.** `ae-ux` already covers the adjacent ground (empty/loading/error states, form boundaries, responsive, accessibility). A hypothetical `ae-edge-frontend` would 70% duplicate `ae-ux`'s references for marginal gain. Out of scope.
- **No new phases in `/ship`.** Chain stays: implement → review → frontend → review → docs → PR. Only the review batch headcount changes.
- **No security findings.** `ae-sec` owns exploit-class issues. `ae-edge` defers to `ae-sec` on anything that smells like injection, auth bypass, SSRF, or deserialization.
- **No property-based test scaffolding.** Hypothesis, fast-check, etc. — v2 concern. v1 generates concrete example-based failing tests.
- **No mutation testing.** Different problem class (mutmut, Stryker territory).
- **No cross-story regression sweeps.** Story-scoped only. Cross-story matrix work belongs to a future QA-traceability spec.

---

## Architecture

### `/review` becomes 6-agent

The parallel batch in `skills/agentic-engineering/commands/review.md` grows from five reviewers to six. All six dispatched in a **single batched tool call** — sequential dispatch is a failure mode (documented gotcha in the existing review.md).

| Agent | Receives | Looks for |
|---|---|---|
| `ae-red` | changed impl files + git diff | runtime errors, null safety, async bugs, logic, resource leaks (in code that exists) |
| `ae-req` | STORIES.md + CONSTITUTION.md + changed files | acceptance criteria met, constitution violations |
| `ae-test` | changed files + test files | coverage gaps, tests that wouldn't catch regressions |
| `ae-doc` | CLAUDE.md + changed files + related app-docs | convention drift, docs needing update |
| `ae-sec` | changed impl files + git diff | high-confidence exploitable vulnerabilities |
| **`ae-edge`** | **changed impl files + tests + AC + CONSTITUTION** | **adversarial backend edge cases the diff doesn't handle** |

The conceptual contract that ties them together: **all six are read-only reviewers.** None of them mutate files. They produce reports that flow into `/review`'s consolidation step. This is the invariant that makes the parallel batch safe — adding a mutating agent to this batch is explicitly out of scope (see Non-goals).

### Self-scoping behavior

`ae-edge` auto-detects whether the diff is in scope:

- Diff contains backend / business-logic / async / data-handling code → probe normally
- Diff contains only frontend/UI code (JSX/Vue/Swift UI/Compose without surrounding business logic) → emit `EDGE — Out of scope for this diff (frontend-only changes). ae-ux covers frontend states.` and exit clean
- Diff is empty or docs-only → emit `EDGE — No code to probe. Clean.` and exit clean

This makes Phase 4 (frontend review) calls safe — if the user runs `/review` directly against a pure frontend diff, `ae-edge` self-skips. In normal `/ship` flow, Phase 4 reviews frontend changes; the diff usually contains both backend and frontend, and `ae-edge` probes the backend portion only.

---

## Components

### New agent: `agents/ae-edge/`

Directory shape (matches `ae-red`, `ae-test`, `ae-sec`, `ae-ux`):

```
agents/ae-edge/
  AGENT.md
  references/
    boundary-null.md
    malformed-input.md
    resource-limits.md
    error-paths.md
```

#### `AGENT.md` contract

**Description (frontmatter):** *"Adversarial edge-case prober for agentic engineering reviews. Probes backend code for missing edge cases — boundary values, null/empty inputs, race conditions, malformed input, resource limits, error paths — and emits failing test code + suggested fixes. Runs as the sixth parallel subagent during `/review`. Reports only cases the diff doesn't already handle."*

**Model:** `claude-haiku-4-5` (same as other reviewers — keeps parallel batch cost predictable).

**Tools:** `Read, Glob, Grep, Bash(git diff:*)` (read-only; matches `ae-red`).

**Golden rule (caveman style):** *Generate failing tests that fail today against current code. Can't show concrete failure path → don't generate.*

**Peers section:** Mirrors `ae-red`'s peers line — *Parallel with `ae-red` (bugs), `ae-req` (acceptance + constitution), `ae-test` (coverage), `ae-doc` (convention drift), `ae-sec` (security). Security findings → defer to `ae-sec`. Frontend states → defer to `ae-ux`. Output consolidated by `/review` into the unified blocker list.*

**Step 1 — Get diff:**

```bash
git diff main...HEAD
```

Read changed files in full where diff lacks context.

**Step 2 — Scope check:** If diff is frontend-only or docs-only or empty, emit the appropriate "out of scope / clean" line and exit. (See Self-scoping behavior above.)

**Step 3 — Identify categories + load references.** Pattern-based loading (matches `ae-red`'s "what you see → load" table):

| What you see in the diff | Load |
|---|---|
| numeric ranges, collection indexing, slice/array bounds, off-by-one risk | `references/boundary-null.md` |
| optional fields, null/None/nil access, empty collection handling | `references/boundary-null.md` |
| user input, JSON parsing, encoding, type coercion | `references/malformed-input.md` |
| loops over N records, file handles, connection pools, batch processing | `references/resource-limits.md` |
| try/catch, error returns, Result types, dep calls that can fail | `references/error-paths.md` |
| async/await, promises, goroutines, channels, threads, shared state | `~/.claude/agents/ae-test/references/async-testing.md` (cross-ref) |

Plus shared concepts from `ae-test`:

| Concept | Source |
|---|---|
| Coverage scenario types and what counts as a test | `~/.claude/agents/ae-test/references/coverage-principles.md` |
| Anti-patterns to avoid in generated tests (don't write trivial tests) | `~/.claude/agents/ae-test/references/test-quality.md` |
| Language-specific test framework idioms | `~/.claude/agents/ae-test/languages/<lang>.md` |

Cross-references are read at runtime via absolute paths under `~/.claude/agents/`. The installer puts `ae-test` and `ae-edge` there in the same install run, so the paths are stable post-install. The contract: `ae-edge` *reads* `ae-test`'s files; it never modifies them.

**Step 4 — Investigate before reporting.** Per candidate edge case:

1. **Trace execution path** — what input / state / timing triggers the failure?
2. **Check if the diff already handles it** — explicit null guard, validation, try/catch with right scope? If yes → not a finding.
3. **Check if a test already covers it** — grep the test files for similar assertions. If yes → not a finding.
4. **Confirm the failing test would actually fail** — mentally execute the test against the current implementation. Can you point at the line that throws / returns wrong / hangs? If no → don't report.
5. **Check AC scope** — is the behavior being probed implied by the story's acceptance criteria or the constitution? Probing behavior the story explicitly punts on is out of scope → don't report.

**Step 5 — Report.** Output schema aligns with the existing blocker/should-fix/won't-fix structure so `/review`'s consolidation step handles it identically to the other reviewers:

```
EDGE — Edge Case Coverage: [story]

Blockers (will fail under realistic conditions):
1. [one-line description] — [file:line]
   Category: [boundary | null/empty | race | malformed | resource | error-path]
   Trigger: [exact input or state that exposes it]
   Failing test (proof):
     [concrete test code in the project's test framework]
   Impact: [crash | wrong result | silent corruption | hang | leak]
   Suggested fix: [specific code change — not "handle the error"]

Should-cover (real but lower priority):
1. [...]

Won't-cover (logged here, not actioned):
1. [edge case considered but out of AC scope] — [reason]

Clean: [scope checked + no adversarial cases found in <categories>]
```

The Failing test block contains real test code in the project's test framework (detected from existing test files). It is **inert text in the report** — `ae-edge` does not write it to disk. The blocker-fix flow downstream (operator, or `/ship`'s "fixed" handler) copies it into the appropriate test file when implementing the fix.

**What `ae-edge` does NOT report:**
- Cases already handled by the diff
- Cases already covered by existing tests
- Security vulnerabilities (defer to `ae-sec`)
- Frontend states (defer to `ae-ux`)
- Performance issues unless they cause functional failure
- Stretch goals or behavior outside the story's AC
- Theoretical risks requiring input combinations with no realistic trigger
- Code style, naming, formatting

**Empty report rule:** If no findings, say so explicitly: `Clean: probed for boundary, null, malformed, resource, error-path — no adversarial cases found.` Clean signal is meaningful.

#### Reference file contents (sketch — final content written during implementation)

**`references/boundary-null.md`** — concrete patterns to probe:

- Empty collections (`[]`, `{}`, `""`, `None`/`null` collection)
- Single-element collections (off-by-one in pagination, slicing, fold operations)
- Exactly-at-limit values (max int, max string length, exact page size, exact timeout)
- One-past-limit values (max + 1)
- Zero where positive expected (counts, IDs, sizes)
- Negative where non-negative expected
- Missing optional fields in input structures
- Null/None/nil in fields the diff assumes are populated
- Default-value collisions (default empty string treated as "no value" when "" is valid)
- Whitespace-only strings (`" "`, `"\n"`, `"\t"`)

**`references/malformed-input.md`** — adversarial input correctness patterns (not security):

- Type mismatch (string where int expected, number where string expected)
- Oversized payload at the correctness layer (request body > N MB causes parser to OOM, not exploit)
- Encoding (UTF-8 with surrogate pairs, mixed BOM, invalid UTF-8 continuation)
- Malformed JSON (truncated, duplicate keys, deeply nested)
- Malformed dates / numbers / regexes
- Mixed-case headers and content-type variants
- Trailing whitespace, leading whitespace
- Unicode normalization (NFC vs NFD same-looking strings comparing unequal)

**`references/resource-limits.md`** — correctness under load (not perf benchmarking):

- N records where N >> happy-path (1, 10, 100, 10_000, 1_000_000) — find the threshold where logic breaks (timeout, partial result, OOM)
- File handle / DB connection / HTTP client exhaustion under loop
- Large single payload (10 MB JSON, 100 MB file upload)
- Long-running operation hitting client/server timeout
- Cursor/page-token pagination edge: empty last page, page exactly equal to total

**`references/error-paths.md`** — what happens when a dependency misbehaves:

- Dep throws (sync exception, rejected promise, error return)
- Dep returns wrong shape (missing field, extra field, wrong type)
- Dep returns empty when caller expects populated
- Dep returns partial result (3 of 5 items)
- Dep times out
- Dep returns success but with semantically invalid content
- Network call: 4xx, 5xx, connection reset, DNS failure, slow response
- DB call: deadlock, unique-constraint violation, FK constraint, timeout

Cross-references for race/concurrency (`async-testing.md`) and language-specific test idioms (`languages/<lang>.md`) live under `ae-test/` and are read via cross-agent paths — not duplicated here.

### Updated `commands/review.md`

Three edits:

1. **Header sentence:** *"Five specialist reviewers run parallel on changed code"* → *"Six specialist reviewers run parallel on changed code"*
2. **Reviewer table:** add the `ae-edge` row at the bottom
3. **Output schema:** add `EDGE` to the per-reviewer summary lines:

   ```
   - EDGE: [Clean / X cases found — Blockers: N, Should-cover: M]
   ```

No change to dispatch logic — `ae-edge` is added to the existing batched tool call as one more `Agent` invocation. No change to the consolidation step — `ae-edge`'s output schema mirrors the others.

### Updated `commands/ship.md`

Phase 2's review output ("Blockers" list) now includes `[ae-edge]` entries inline. No phase added, no phase removed. The "fixed to continue" handler treats `[ae-edge]` blockers identically to `[ae-red]` / `[ae-sec]` blockers — the user (or follow-on implementation) writes the failing test from the spec into the test file, implements the suggested fix, and replies `fixed`.

The existing Phase 2 commit pattern handles this without modification:

```
fix([feature]): STORY-XXX — address review blockers
```

If the test additions and impl fixes feel like they should be separate commits, that's a follow-on decision for the operator — the spec doesn't mandate either way. Default is one combined `fix(...)` commit (matches today's behavior).

### Updated `SKILL.md`

- **Agent roster section:** add EDGE entry
- **`/review` section:** bump "five reviewers" → "six reviewers"; mention `ae-edge` as backend-only adversarial probe
- No new section header; `ae-edge`'s role fits inside the existing `/review` description

### Updated `install.sh`

Add one line to the agent-install block:

```bash
cp -r "$SCRIPT_DIR/agents/ae-edge" ~/.claude/agents/
```

No `USER_COMMANDS` change (no new user-facing command).

### Updated `adapters/AGENTS.md.template`

One paragraph inside the `<!-- agentic-engineering:start v1 -->` … `<!-- agentic-engineering:end -->` marker block:

> *"Code review (`/review`) dispatches six parallel specialist reviewers including `ae-edge`, which probes the backend diff for adversarial edge cases (boundary values, null/empty inputs, race/concurrency, malformed input, resource limits, error paths) and emits failing test code + suggested fixes as part of the consolidated blocker list. `ae-edge` is read-only — it reports findings; downstream blocker-fix flow implements them. Frontend states are covered by `ae-ux`, not `ae-edge`."*

Preserve the marker comments verbatim — they gate the multi-tool installer's idempotent replace.

### Updated `README.md`

Single sentence in the `/review` description: *"Now dispatches six parallel reviewers — five on the existing diff plus `ae-edge`, which adversarially probes backend code for missing edge cases."*

---

## Data flow

```
/review (or /ship Phase 2)
  ↓ read CLAUDE.md, INDEX.md, CONSTITUTION.md, STORIES.md, PROGRESS.md
  ↓ batch-dispatch six subagents in ONE tool call:
      [ae-red, ae-req, ae-test, ae-doc, ae-sec, ae-edge]
  ↓ each reads its own diff + relevant files
  ↓ each loads only the references it needs
  ↓ ae-edge cross-reads ae-test/references/* for async-testing,
                                              coverage-principles,
                                              test-quality
  ↓ each emits its report (six reports total)
  ↓ /review consolidates into one fix list:
      Blockers (tagged with source agent)
      Should-fix (tagged)
      Won't-fix (tagged + reasons)
      Clean areas per agent
  ↓ save full review to docs/features/[name]/reviews/STORY-XXX-review.md
  ↓ ask "fix the blockers now, or review first?"
```

For `/ship`'s Phase 2, the consolidated fix list flows into the existing blocker-handling step — the chain pauses on blockers, operator replies `fixed`, chain continues. No change to that machinery.

---

## Composition with existing features

### With `/focus` (per-worktree task pointer)

No new write to `.agentic/focus.md` from `ae-edge` — agents don't write focus state. The parent command (`/review` or `/ship`) handles focus updates via its existing Step 0 auto-write preamble. `ae-edge` runs invisibly within the review batch and doesn't surface its own focus state.

### With `--auto` mode

`ae-edge` runs unconditionally inside the review batch regardless of `--auto`. Its output flows into the consolidated blocker list. `--auto`'s behavior at the blocker-surface checkpoint is the existing rule from `commands/review.md` and `commands/ship.md`:

- Phase 2 blocker pause is `[AUTO: always-ask]` (hard-override #1, review-blocker class)
- `[ae-edge]` blockers are blockers — they pause the chain like any other blocker under `--auto`
- No new auto-mode tag introduced by this design

### With `/ship-all`

No change. Each story's `/ship` runs `/review` with the 6-agent batch as part of Phase 2. Mid-chain story completions handle their own `[ae-edge]` blockers via the existing blocker flow. Auto-log entries inherit the existing format.

### With `ae-test` (file co-location)

`ae-edge` reads three files from `ae-test`'s reference set via absolute path (`~/.claude/agents/ae-test/references/{async-testing,coverage-principles,test-quality}.md`) plus language guides from `ae-test/languages/`. This is a one-way dependency — `ae-edge` consumes, `ae-test` is unaware. If `ae-test`'s references are renamed or moved, `ae-edge`'s lookup paths break and must be updated. Acceptable coupling; alternative (duplicating references) is worse.

### With `ae-ux` (responsibility boundary)

`ae-edge` defers all frontend state concerns (empty/loading/error UI, form input boundaries on the UI surface, responsive breakpoints, accessibility) to `ae-ux`. The agent contract explicitly self-skips on frontend-only diffs. If a story touches both backend and frontend, `ae-edge` probes the backend portion and ignores `.tsx` / `.vue` / `.swiftui` / `.kt` Compose files.

---

## Error handling

| Condition | `ae-edge` behavior |
|---|---|
| Diff is empty | Emit `Clean: no code to probe.` and exit |
| Diff is docs-only | Emit `Clean: docs-only diff, out of scope.` and exit |
| Diff is frontend-only | Emit `Out of scope for this diff (frontend-only). ae-ux covers frontend states.` and exit |
| Probe completes without finding cases | Emit `Clean: probed for <categories> — no adversarial cases found.` |
| Project has no detectable test framework | Emit `Clean: cannot generate concrete failing tests — test framework not detected.` + log a one-line note recommending the user document the test runner in CLAUDE.md |
| `ae-test`'s reference files missing from `~/.claude/agents/ae-test/` (broken install) | Skip the cross-references for that category, continue with own references, log a one-line note in the report |
| Story has no AC documented | Probe anyway, but only emit findings that are universal (null deref on documented public function signatures); skip ambiguous ones |

No error condition should crash the parallel batch — `ae-edge`'s failure modes are all "report less" or "report nothing," never "block the other five reviewers."

---

## Discoverability touchpoints

| File | Change |
|---|---|
| `agents/ae-edge/AGENT.md` | new file (full agent contract) |
| `agents/ae-edge/references/*.md` | 4 new files |
| `skills/agentic-engineering/SKILL.md` | agent roster entry; bump "five" → "six" in `/review` description |
| `skills/agentic-engineering/commands/review.md` | header sentence, reviewer table, per-reviewer summary line |
| `agentic-engineering/install.sh` | one `cp -r` line |
| `agentic-engineering/adapters/AGENTS.md.template` | one paragraph inside the marker block |
| `agentic-engineering/README.md` | single sentence in `/review` description |

No changes to: `USER_COMMANDS`, `commands/` wrapper files, `commands/ship.md` body (blocker handling already covers this), `commands/ship-all.md`, `commands/feature.md`, `commands/fix.md`, `commands/design.md`, `commands/implement.md`, `commands/focus.md`, `commands/next.md`, `commands/status.md`.

---

## Verification

No automated test suite exists in this plugin (per `CLAUDE.md`). Verification is the installer round-trip plus a manual exercise.

1. **Installer round-trip:** `bash install.sh` writes `~/.claude/agents/ae-edge/AGENT.md` and `~/.claude/agents/ae-edge/references/*.md`. Inspect to confirm structure matches the spec.
2. **`/review` dispatch sanity check:** In a scratch project with a story that has obvious edge gaps (e.g., an integer-divide function with no zero-denominator guard), run `/review`. Verify the consolidated output contains an `[ae-edge]` entry with concrete failing test code and a suggested fix.
3. **Self-skip check:** In a scratch project with a frontend-only diff (e.g., a JSX-only change), run `/review`. Verify `ae-edge` emits the "out of scope" line and the other five reviewers still report normally.
4. **Cross-reference loading check:** Inspect `ae-edge`'s output during a probe run for evidence the agent loaded `ae-test/references/async-testing.md` when the diff contained async code (e.g., a finding categorized as `race` referencing the timing-test patterns from that file).
5. **Adapter round-trip:** `bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering` into a scratch dir, confirm the `<!-- agentic-engineering:start v1 -->` block contains the new paragraph and the markers are intact.

Items 2–4 are deferred live-verification tasks in the implementation plan, same pattern as the focus + auto-mode rollouts.

---

## Risks and open questions

**Risk: `ae-edge` reports too many low-value cases.** A maximalist probe could surface dozens of theoretical edges that aren't real risks. Mitigation: the agent's golden rule (*"Can't show concrete failure path → don't generate"*) plus the AC-scope check in Step 4 are the gates. We accept some risk of noise on first uses and tighten the references based on observed false-positive patterns.

**Risk: cross-agent reference path breaks on `ae-test` reorganization.** If `ae-test`'s references are renamed or moved, `ae-edge`'s lookup paths break silently — the agent would simply skip those categories. Mitigation: document the cross-agent dependency at the top of `ae-test/AGENT.md` ("`ae-edge` reads `references/{async-testing,coverage-principles,test-quality}.md` and `languages/*.md` from this directory — do not rename without coordinating with `ae-edge`").

**Risk: parallel batch latency.** Six Haiku calls in parallel instead of five — slowest reviewer determines wall-clock time. `ae-edge`'s read scope (diff + tests + AC + constitution + on-demand references) is similar to `ae-red`'s, so expected latency is comparable. No special mitigation.

**Open question deferred to implementation:** does `ae-edge`'s "Failing test" code block need to match the project's exact test file naming and import style? For v1, the agent infers from existing test files in the project (same pattern `ae-test` uses for assertion style). If projects use multiple test frameworks side-by-side (`pytest` + `unittest`, or `jest` + `vitest`), the agent picks whichever the changed file's nearest sibling tests use. Document as a known limitation; revisit if it produces consistently wrong output in practice.

**Open question deferred to implementation:** should the test code in the report carry a structured tag (e.g., `# [ae-edge:boundary] STORY-XXX`) so a future QA-traceability matrix (idea #4) can parse origin from comments? Recommendation: yes, add the tag in the report's "Failing test" block, but don't make the tag load-bearing — the matrix work can add a parser later.

---

## Out of scope (explicit, for clarity)

- Adversarial mining for frontend code (separate v2 work; would need new agent or `ae-ux` extension with adversarial references)
- Property-based test generation (Hypothesis, fast-check)
- Mutation testing
- Cross-story regression coverage
- Standalone `/edges` command
- Automatic test file mutation (writing failing tests to disk)
- Implementation fix mutation (changing impl code in response to findings)
- Auto-promotion of `[ae-edge]` findings to BACKLOG (operator decides during blocker-fix step)
- Phase 2.5 / Phase 2.6 — explicitly rejected during brainstorming as over-engineered
- `--edges` flag on `/ship` — explicitly rejected (always-on via `/review`)
