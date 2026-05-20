# QA Traceability Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "AC Coverage" matrix table to `PROGRESS.md` per shipped story (written by `/implement`, validated by `ae-test`), so every Acceptance Criterion has explicit traceability to the test(s) that prove it.

**Architecture:** Two artifacts change. `STORIES.md` AC are emitted with explicit `AC-N:` labels by `/feature`. `PROGRESS.md` gains two structured tables (AC Coverage + Edge probes) written by `/implement` at Phase 1 end. `ae-test` gets a Step 6 matrix-vs-reality validator that surfaces missing AC + stale test references as review blockers. No new commands, no new agents, no test-file tagging.

**Tech Stack:** Markdown agent prompts, markdown command bodies, no code or tests in this repo — verification is installer round-trip + adapter round-trip + scratch-project exercise after restart.

**Spec:** `docs/superpowers/specs/2026-05-20-qa-traceability-matrix-design.md`

---

## File structure

**Modify (7 files):**

| File | Change |
|---|---|
| `agentic-engineering/skills/agentic-engineering/commands/feature.md` | STORIES.md template emits AC with `AC-N:` labels |
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | PROGRESS.md template replaced with AC Coverage + Edge probes tables |
| `agentic-engineering/agents/ae-test/AGENT.md` | Add Step 6 "Matrix-vs-reality check" + adjust Step 5 reference list |
| `agentic-engineering/agents/ae-test/references/coverage-principles.md` | Append "AC Traceability" section |
| `agentic-engineering/adapters/AGENTS.md.template` | One paragraph inside marker block describing the matrix convention |
| `agentic-engineering/README.md` | One sentence about the matrix |
| `agentic-engineering/skills/agentic-engineering/commands/status.md` | Optional rollup line per feature (see Task 7 — defer if complex) |

**Create:** none.

**Do NOT modify:** `commands/ship.md`, `commands/ship-all.md`, `commands/review.md`, `commands/fix.md`, `commands/focus.md`, `commands/next.md`, `commands/design.md`, `commands/init.md`, `commands/bootstrap.md`, `install.sh`, `USER_COMMANDS`, `.claude-plugin/plugin.json`. No new files, no new agents.

---

## Branch setup

- [ ] **Step 0: Create feature branch**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git checkout -b feat/agentic-engineering-qa-traceability-matrix
git branch --show-current
```

Expected: `feat/agentic-engineering-qa-traceability-matrix`.

---

## Task 1: Emit `AC-N:` labels in STORIES.md template

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/feature.md`

- [ ] **Step 1: Locate STORIES.md template block**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "Acceptance Criteria\|STORY-XXX" agentic-engineering/skills/agentic-engineering/commands/feature.md
```

The current template appears twice (one for `[P]` parallel stories, one for sequential stories). Both use this AC format:

```markdown
  **Acceptance Criteria:**
  - [ ] [criterion]
```

- [ ] **Step 2: Update both occurrences to use `AC-N:` labels**

Use `Edit` with `replace_all: true` since both occurrences have identical AC format text:

Find:
```
  **Acceptance Criteria:**
  - [ ] [criterion]
```

Replace with:
```
  **Acceptance Criteria:**
  - [ ] AC-1: [criterion]
  - [ ] AC-2: [criterion]
```

(Adds explicit AC-N labels and shows two example rows so PROD knows the pattern when generating multi-AC stories.)

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "AC-1:\|AC-2:" agentic-engineering/skills/agentic-engineering/commands/feature.md
grep "^  - \[ \] \[criterion\]" agentic-engineering/skills/agentic-engineering/commands/feature.md
```

Expected: first count = 4 (AC-1 + AC-2 in each of the 2 templates); second grep prints nothing (no unlabeled bullets remain).

- [ ] **Step 4: Add an instruction line for PROD**

Find the section in `feature.md` that tells PROD how to populate stories (look for narrative like "PROD generates STORIES.md" or the section that introduces the story templates). After the templates, insert this instruction (caveman style):

```markdown
**AC labeling:** Number AC explicitly `AC-1:`, `AC-2:`, ... per story. 1-based. Sequential per-story (not per-feature, not global). Stories with 1 AC still use `AC-1:`. Updating an existing STORIES.md? Don't retro-label old AC — new stories get labels, old stories stay as-is for backward compat.
```

If a similar paragraph already exists near the templates, append to it instead of duplicating.

- [ ] **Step 5: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/feature.md
git commit -m "feat(agentic-engineering): /feature emits AC-N labels in STORIES.md template"
```

---

## Task 2: Replace PROGRESS.md template in `/implement` with AC Coverage matrix

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/implement.md`

- [ ] **Step 1: Locate PROGRESS.md template**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "PROGRESS.md\|Tests added\|Files changed" agentic-engineering/skills/agentic-engineering/commands/implement.md | head -10
```

The current template is:

```markdown
## STORY-XXX: [Title] — [date]
- Files changed: [list]
- Tests added: [what's covered]
- Notes: [anything notable]
```

- [ ] **Step 2: Replace the template with the structured matrix version**

Find the exact block:

```
```markdown
## STORY-XXX: [Title] — [date]
- Files changed: [list]
- Tests added: [what's covered]
- Notes: [anything notable]
```
```

Replace with:

````
```markdown
## STORY-XXX: [Title] — [date]

### AC Coverage
| AC | Description | Tests |
|----|-------------|-------|
| AC-1 | [from STORIES.md] | [file:test_name<br>file:test_name] |
| AC-2 | [from STORIES.md] | [file:test_name] |
| AC-N | [from STORIES.md] | [file:test_name] |

### Edge probes (from ae-edge)
| Category | Test |
|----------|------|
| [category] | [file:test_name] |

### Files changed
- [list]

### Notes
[anything notable — narrative continues here]
```

**Filling the matrix:**
- One row per AC in `STORIES.md`. Match AC text exactly.
- Tests column lists the specific tests that prove this AC, formatted as `file:test_name` (the format the project's test runner emits — `pytest tests/foo.py::test_bar`, `jest tests/foo.test.ts::test_bar`, `go test ./foo -run TestBar`, etc.). Multiple tests per AC → join with `<br>`.
- If you wrote a test that doesn't map to any specific AC (helper, smoke, framework boilerplate), don't include it. Orphan tests are surfaced by `ae-test` as informational findings, not blockers.
- `### Edge probes` section starts EMPTY and is populated during Phase 2 blocker-fix when `ae-edge` raises findings. If `ae-edge` returned no findings for this story, omit the `### Edge probes` section entirely.
- Existing `Files changed` + `Notes` are unchanged from the prior format.
````

- [ ] **Step 3: Verify the new template landed**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "### AC Coverage" agentic-engineering/skills/agentic-engineering/commands/implement.md
grep -c "### Edge probes" agentic-engineering/skills/agentic-engineering/commands/implement.md
grep "Tests added:" agentic-engineering/skills/agentic-engineering/commands/implement.md
```

Expected: first count ≥ 1, second count ≥ 1, third grep prints nothing (old "Tests added:" line is gone).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/implement.md
git commit -m "feat(agentic-engineering): /implement writes AC Coverage matrix to PROGRESS.md"
```

---

## Task 3: Add Step 6 "Matrix-vs-reality check" to `ae-test/AGENT.md`

**Files:**
- Modify: `agentic-engineering/agents/ae-test/AGENT.md`

- [ ] **Step 1: Inspect current ae-test step structure**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "^## Step\|^## Reference" agentic-engineering/agents/ae-test/AGENT.md
```

Current structure:
- Step 1 — Read code + tests
- Step 2 — Load references
- Step 3 — Evaluate coverage
- Step 4 — Evaluate test quality
- Step 5 — Report
- ## Reference files

We're inserting Step 6 between Step 5 and the Reference files section.

- [ ] **Step 2: Insert the new Step 6 block**

Find the section heading:

```markdown
## Reference files
```

Insert IMMEDIATELY BEFORE it (so Step 6 ends up between Step 5's content and the Reference files heading):

````markdown
## Step 6 — Matrix-vs-reality check

For each story in scope:

1. Read `./docs/features/[feature-name]/STORIES.md` → extract AC list for this story. Use explicit `AC-N:` labels if present, otherwise infer 1-based numbering by position.
2. Read `./docs/features/[feature-name]/PROGRESS.md` → find this story's entry; locate `### AC Coverage` table.
3. If the story's PROGRESS entry has NO `### AC Coverage` heading → story is pre-matrix. Skip this step. Existing scenario-coverage checks (Step 3) still apply.
4. If `### AC Coverage` is present:
   - **Missing-AC check:** every `AC-N` from STORIES.md must appear as a row → missing rows = **blocker**
   - **Stale-test check:** every test referenced in the matrix must exist. Parse each Tests cell, split on `<br>`, grep each `file:test_name` reference. Function not found → **blocker**. File not found → **blocker**.
   - **Orphan check:** grep the test files in the diff for test functions; tests not referenced by ANY matrix row in this feature → `should-cover` (informational, not a blocker)
5. Skip orphan detection for tests whose names contain `_helper`, `_smoke`, `conftest`, `fixtures`, `setup_`, `teardown_` — these are framework boilerplate.

Report under a new sub-heading inside the existing Step 5 report:

```
Matrix:
  ✅ M/N AC mapped to tests (STORY-XXX)
  ⚠️ Orphan: tests/auth_test.py::test_helper_setup — not referenced by any matrix
```

Missing-AC and stale-test findings go into the existing `Missing coverage:` section of the report, tagged with the AC number or test path. Treat them as blockers (same severity as scenario-coverage blockers).

Pre-matrix stories report:

```
Matrix:
  (pre-convention story — no AC Coverage table; matrix check skipped)
```
````

- [ ] **Step 3: Update Step 5 (Report template) to mention the matrix section**

In the existing Step 5 report template, find:

```
Verdict: [would this suite catch real regressions? yes / partial / no]
```

Add the matrix sub-section above the Verdict line:

```
Matrix:
  [✅ M/N AC mapped / ⚠️ orphans / blocker list]

Verdict: [would this suite catch real regressions? yes / partial / no]
```

- [ ] **Step 4: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "^## Step" agentic-engineering/agents/ae-test/AGENT.md
grep -c "Matrix-vs-reality\|### AC Coverage" agentic-engineering/agents/ae-test/AGENT.md
```

Expected: six `## Step` lines (Step 1–6); matrix-vs-reality count ≥ 1.

- [ ] **Step 5: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-test/AGENT.md
git commit -m "feat(agentic-engineering): ae-test adds Step 6 matrix-vs-reality check"
```

---

## Task 4: Add "AC Traceability" section to coverage-principles.md

**Files:**
- Modify: `agentic-engineering/agents/ae-test/references/coverage-principles.md`

- [ ] **Step 1: Inspect current structure**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
tail -20 agentic-engineering/agents/ae-test/references/coverage-principles.md
```

The file ends with a "What to name tests" section. We're appending a new section at the very end.

- [ ] **Step 2: Append the new section**

Add to the END of `agentic-engineering/agents/ae-test/references/coverage-principles.md`:

```markdown

---

## AC Traceability

A story's `STORIES.md` AC list and its `PROGRESS.md` AC Coverage matrix should align 1:1.

**Contract:**
- Every `AC-N` in STORIES.md → at least one row in the matrix
- Every test in the matrix → exists in the repo (grep the `file:test_name` reference)
- Tests not in any matrix → informational, not a blocker (helpers, smoke, boilerplate, cross-cutting tests)
- Stories without `### AC Coverage` heading in PROGRESS.md → pre-convention story; skip the matrix check

**What this catches:**
- Implementer forgot to write a test for AC-3
- Test was renamed but matrix wasn't updated → stale reference
- Implementer claims `test_login_redirects` covers AC-2 but the function doesn't exist

**What this does NOT catch (covered by existing Step 3 scenario coverage):**
- Test exists and is mapped to AC, but it's a trivial assertion that doesn't actually exercise the behavior
- Edge cases the AC implies but the test doesn't cover (e.g., AC says "redirects on success" — test only checks happy path, doesn't check redirect URL or session cookie)

**Test-identifier format per framework:**
- pytest: `tests/auth_test.py::test_login_redirects`
- jest/vitest: `tests/auth.test.ts > login > redirects on success` or `tests/auth.test.ts::test_login_redirects` (project-specific — match what the runner outputs)
- go test: `auth/auth_test.go::TestLoginRedirects`
- xctest: `AuthTests/testLoginRedirects`
- junit: `AuthTest#testLoginRedirects`
- flutter test: `test/auth_test.dart::test_login_redirects`

Use the format the project's test runner emits when reporting a failure — it's the most useful for someone copying the reference into their terminal to re-run.
```

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "^## AC Traceability" agentic-engineering/agents/ae-test/references/coverage-principles.md
tail -3 agentic-engineering/agents/ae-test/references/coverage-principles.md
```

Expected: count = 1; tail shows the framework list ending with the `flutter test` example.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-test/references/coverage-principles.md
git commit -m "docs(agentic-engineering): coverage-principles documents AC traceability rule"
```

---

## Task 5: Add matrix paragraph to `adapters/AGENTS.md.template`

**Files:**
- Modify: `agentic-engineering/adapters/AGENTS.md.template`

- [ ] **Step 1: Locate the marker block**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "agentic-engineering:start\|agentic-engineering:end" agentic-engineering/adapters/AGENTS.md.template
```

Expected: two lines (start at line 1, end near line 140 — exact line may shift due to recent ae-edge addition).

- [ ] **Step 2: Insert the matrix paragraph**

The template has a section "When the user asks you to implement / ship a story" containing the review-across-6-areas block. The new paragraph belongs after that section's bulleted list, before the next `---` separator. Find the closing line of the implementation section:

```
7. **Conventional commit** with a descriptive subject and a body explaining the why.
```

Insert AFTER that line (still inside the marker block):

```

**AC Coverage matrix.** Every shipped story records an AC Coverage matrix in `./docs/features/<name>/PROGRESS.md`. The matrix is a markdown table listing every Acceptance Criterion (AC-1, AC-2, ...) from `STORIES.md` and the specific tests that prove it, formatted `file:test_name`. When `ae-edge` probes find edge-case blockers, the implementer also appends an `Edge probes` table. During `/review`, the test-coverage reviewer (`ae-test`) validates that every AC has at least one test entry and every claimed test exists — missing AC or stale entries become review blockers. Matrix is read-only at review time; only `/implement` and Phase 2 blocker-fix mutate it.
```

- [ ] **Step 3: Verify markers intact + new paragraph landed**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "agentic-engineering:start v1" agentic-engineering/adapters/AGENTS.md.template
grep -c "agentic-engineering:end v1" agentic-engineering/adapters/AGENTS.md.template
grep -c "AC Coverage matrix" agentic-engineering/adapters/AGENTS.md.template
```

Expected: first two counts = 1 (markers not duplicated or removed); third count = 1 (new paragraph added).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/adapters/AGENTS.md.template
git commit -m "docs(agentic-engineering): AGENTS.md template documents AC Coverage matrix"
```

---

## Task 6: Add matrix sentence to `README.md`

**Files:**
- Modify: `agentic-engineering/README.md`

- [ ] **Step 1: Locate a suitable insertion point**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -in "/ship\|PROGRESS.md\|STORIES.md\|review\|/implement" agentic-engineering/README.md | head -20
```

Look for a section that describes the `/ship` workflow or where the existing description mentions `PROGRESS.md`. The natural spot is in the `/ship` description, after the existing prose about implement → review → docs.

- [ ] **Step 2: Insert one sentence**

After the existing `/ship` description (find the paragraph or list item that describes what `/ship` does), append a single sentence:

```
Every shipped story writes an **AC Coverage matrix** to `PROGRESS.md`, mapping each Acceptance Criterion to the tests that prove it. `ae-test` validates the matrix during `/review` — missing AC or stale test references become blockers.
```

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "AC Coverage matrix" agentic-engineering/README.md
```

Expected: count ≥ 1.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/README.md
git commit -m "docs(agentic-engineering): README documents AC Coverage matrix in /ship"
```

---

## Task 7: (Optional) `/status` rollup line per feature

**This task is OPTIONAL.** The spec marked it as nice-to-have. Skip if implementation feels complex; defer to a follow-on. The matrix is fully functional without this.

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/status.md`

- [ ] **Step 1: Decide whether to do it**

Read the spec's "Updated `commands/status.md`" section. If the rollup logic feels straightforward (parse PROGRESS.md per shipped story, count rows per matrix, compare to AC count in STORIES.md), proceed. If it requires substantial subagent dispatching or non-trivial parsing, **skip this task** and note it as a follow-on.

- [ ] **Step 2: Update the rendering section in `status.md`**

In the feature-row rendering block, the current format is approximately:

```
[Feature Name] — in-progress
  Completed: X / Y stories
  DONE ✅   STORY-001: [title]
  UP NEXT 🔜 STORY-002: [title] ← recommended next
```

Add a new line after `Completed: X / Y stories`:

```
  Tests: [matrix_covered_AC]/[total_AC] AC mapped across [shipped_story_count] shipped stories ([pct]% · [gap_count] gaps)
```

If a shipped story is pre-matrix (no `### AC Coverage`), its AC are excluded from both numerator and denominator (so the rollup reflects only post-convention stories).

Add an instruction line to PROD in `status.md`:

```
**Rollup calculation:** Iterate each feature's shipped stories. For each story with `### AC Coverage` in PROGRESS.md, parse the table. Numerator = count of rows where Tests cell is non-empty. Denominator = count of AC rows. If story has no `### AC Coverage` heading (pre-matrix), exclude entirely. Render as `Tests: N/M AC mapped across K shipped stories (P% · G gaps)`. Omit the line entirely if no shipped stories have a matrix yet (avoids 0/0).
```

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Tests:.*AC mapped\|Rollup calculation" agentic-engineering/skills/agentic-engineering/commands/status.md
```

Expected: count ≥ 1 (instruction + rendering example present).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/status.md
git commit -m "feat(agentic-engineering): /status shows AC coverage rollup per feature"
```

**OR if skipped:** create a note for the follow-on:

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
echo "- /status AC-coverage rollup deferred — pursue in follow-on if pattern proves useful in practice" >> docs/superpowers/plans/2026-05-20-qa-traceability-matrix.md
git add docs/superpowers/plans/2026-05-20-qa-traceability-matrix.md
git commit -m "docs(agentic-engineering): defer /status AC-coverage rollup to follow-on"
```

---

## Task 8: Installer round-trip verification

**Goal:** Confirm the per-plugin installer copies the updated files to `~/.claude/` and the post-install patch still works.

- [ ] **Step 1: Run installer**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
bash install.sh
```

Expected: "✅ Done. Restart Claude Code to pick up the changes." with no errors.

- [ ] **Step 2: Verify updated content reached `~/.claude/`**

```bash
grep -c "AC-1:\|AC-2:" ~/.claude/skills/agentic-engineering/commands/feature.md
grep -c "### AC Coverage\|### Edge probes" ~/.claude/skills/agentic-engineering/commands/implement.md
grep -c "Matrix-vs-reality\|AC Coverage" ~/.claude/agents/ae-test/AGENT.md
grep -c "AC Traceability" ~/.claude/agents/ae-test/references/coverage-principles.md
```

Expected: each count ≥ 1. (`feature.md` should show ≥ 4 because the AC-1/AC-2 pattern appears in two story templates.)

- [ ] **Step 3: Verify ae-edge install is unchanged (regression check)**

```bash
ls ~/.claude/agents/ae-edge/ && \
test -f ~/.claude/agents/ae-edge/AGENT.md && \
test -f ~/.claude/agents/ae-edge/references/boundary-null.md
echo "ae-edge: still installed"
```

Expected: `ae-edge: still installed`.

(No commit — verification only.)

---

## Task 9: Adapter round-trip verification

**Goal:** Confirm the multi-tool installer writes the matrix paragraph into a non-Claude tool's AGENTS.md and marker block stays idempotent on re-run.

- [ ] **Step 1: Set up scratch**

```bash
rm -rf /tmp/qa-matrix-adapter-test
mkdir -p /tmp/qa-matrix-adapter-test
cd /tmp/qa-matrix-adapter-test
```

- [ ] **Step 2: Run multi-tool installer for cursor**

```bash
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
```

Expected: installer reports writing AGENTS.md and `.cursor/rules/`.

- [ ] **Step 3: Verify the matrix paragraph landed inside the marker block**

```bash
grep -c "agentic-engineering:start v1" /tmp/qa-matrix-adapter-test/AGENTS.md
grep -c "agentic-engineering:end v1" /tmp/qa-matrix-adapter-test/AGENTS.md
grep -c "AC Coverage matrix" /tmp/qa-matrix-adapter-test/AGENTS.md
```

Expected: first two counts = 1 each; third count = 1.

- [ ] **Step 4: Re-run for idempotency**

```bash
cd /tmp/qa-matrix-adapter-test
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
grep -c "agentic-engineering:start v1" /tmp/qa-matrix-adapter-test/AGENTS.md
grep -c "AC Coverage matrix" /tmp/qa-matrix-adapter-test/AGENTS.md
```

Expected: counts remain 1 after re-install (no duplication, marker block replaced cleanly).

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/qa-matrix-adapter-test
```

(No commit — verification only.)

---

## Task 10: Refresh graphify snapshot

**Goal:** Keep the local knowledge graph current after markdown changes.

- [ ] **Step 1: Run graphify update**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
graphify update . 2>&1 | tail -10
```

Expected: graph rebuilds; no API cost. May report "no code files found" if changes are markdown-only — that's fine.

- [ ] **Step 2: Commit graphify-out diff (if any)**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git status agentic-engineering/graphify-out/
```

If `git status` shows changes in `graphify-out/`:

```bash
git add agentic-engineering/graphify-out/
git commit -m "chore(agentic-engineering): refresh graphify snapshot for QA matrix"
```

If no changes — skip the commit. Move on.

(Skip this task entirely if `graphify` binary not available.)

---

## Task 11: Deferred live verification (needs Claude Code restart)

**Goal:** Confirm `/feature`, `/implement`, and `/review` actually use the new artifact format end-to-end.

**Cannot be automated from this session.** Hand off to the user. Steps for the user to run after restart:

- [ ] **Step 1: Restart Claude Code**

Exit + relaunch so it re-reads `~/.claude/skills/` and `~/.claude/agents/`.

- [ ] **Step 2: Scratch project**

```bash
mkdir -p /tmp/qa-matrix-e2e
cd /tmp/qa-matrix-e2e
git init -q
```

Run `/init` in Claude Code. Approve generated files.

- [ ] **Step 3: Generate a feature with multi-AC story**

Run `/feature login`. Approve PRD. Approve stories.

Verify: open `docs/features/login/STORIES.md` and confirm AC are labeled `AC-1:`, `AC-2:`, etc.

- [ ] **Step 4: Ship a story**

Pick a small story or write a minimal one with 2–3 AC. Run `/ship STORY-001`.

Approve plan. Let the chain run.

Verify after Phase 2:
- `docs/features/login/PROGRESS.md` contains a `### AC Coverage` table
- Every AC from STORIES.md has a corresponding row in the table
- Tests column references actual test files

- [ ] **Step 5: Corruption test — delete an AC row**

Manually edit `PROGRESS.md` and delete one AC row from the matrix.

Run `/review`. Expected: `ae-test` reports a blocker (missing AC).

Restore the row. Re-run `/review` — should now pass.

- [ ] **Step 6: Stale-test test**

Manually edit `PROGRESS.md` and change one test reference to `tests/nonexistent.py::test_fake`.

Run `/review`. Expected: `ae-test` reports a blocker (stale test reference).

Restore.

- [ ] **Step 7: Pre-matrix backward compat test**

Manually create a story in `STORIES.md` and manually write a `PROGRESS.md` entry WITHOUT a `### AC Coverage` table.

Run `/review`. Expected: `ae-test` reports `(pre-convention story — no AC Coverage table; matrix check skipped)`. No blockers from the matrix check.

---

## Final step: finish the branch

After Tasks 1–10 complete and Task 11 documented:

- [ ] **Announce:** "I'm using the finishing-a-development-branch skill to complete this work."
- [ ] **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`. There are no automated tests in this plugin — verification is the installer round-trip (Task 8) and adapter round-trip (Task 9). Live tasks (Task 11) stay deferred.

---

## Self-review notes

- **Spec coverage:** every spec section maps to tasks. Architecture (table contract) → Tasks 2 + 3. AC-N labels → Task 1. ae-test matrix check → Task 3. coverage-principles update → Task 4. Adapter paragraph → Task 5. README sentence → Task 6. Optional status rollup → Task 7. Verification → Tasks 8 + 9 + 11. Graphify upkeep → Task 10.
- **Placeholder scan:** no "TBD" / "appropriate" / "handle edge cases" prose. Every step has the exact string to find or write. Optional task (7) is explicitly marked optional with skip-instructions.
- **Type consistency:** the table column headers are identical across spec, plan Task 2, and plan Task 3 (`| AC | Description | Tests |` for coverage; `| Category | Test |` for edge probes). Sub-heading `### AC Coverage` and `### Edge probes` (with the trailing space-and-parenthetical "(from ae-edge)") are identical everywhere they appear. The test-identifier format guidance in Task 4 matches the spec's "Open questions deferred to implementation" decision.
- **Anti-pattern check:** every task touches at most 1 file (Task 7 conditionally touches 1 file or 0). No task does cross-file fan-out. Commits are scoped to a single task.
