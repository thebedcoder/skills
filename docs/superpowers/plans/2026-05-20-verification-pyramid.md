# Verification Pyramid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Level` column to the AC Coverage matrix (`unit` / `integration` / `e2e`), with `ae-test` Step 6 enforcing per-row Level presence + computing pyramid ratios + raising soft "inverted pyramid" warnings.

**Architecture:** 4th column on the existing AC Coverage matrix written by `/implement` to PROGRESS.md. `ae-test` Step 6 gains three substeps (shape detection, Level validation, pyramid math) and the Step 5 report gains a `Pyramid:` line. `/status` rollup gets a sibling `Pyramid:` line aggregating across shipped 4-column stories. Backward-compatible: 3-column matrices stay valid and skip Level validation entirely.

**Tech Stack:** Markdown agent prompts, markdown command bodies, no code or tests in this repo — verification is installer round-trip + adapter round-trip + scratch-project exercise after restart.

**Spec:** `docs/superpowers/specs/2026-05-20-verification-pyramid-design.md`

---

## File structure

**Modify (6 files):**

| File | Change |
|---|---|
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | PROGRESS.md matrix template adds `Level` column; instruction explains the 3 levels + multi-level row split |
| `agentic-engineering/agents/ae-test/AGENT.md` | Step 6 appends 3 new substeps (shape detection, Level validation, pyramid math + warnings); Step 5 report adds `Pyramid:` line to the `Matrix:` block |
| `agentic-engineering/agents/ae-test/references/coverage-principles.md` | Append `## Pyramid health` section with the three levels + example tests + warning rules |
| `agentic-engineering/skills/agentic-engineering/commands/status.md` | Render template adds `Pyramid:` line below `Tests:`; instruction explains rollup math + feature-level inversion |
| `agentic-engineering/adapters/AGENTS.md.template` | Append one sentence to the existing AC Coverage matrix paragraph inside the marker block |
| `agentic-engineering/README.md` | Append one sentence to the existing AC matrix sentence in the `/ship` row |

**Create:** none.

**Do NOT modify:** `commands/ship.md`, `commands/ship-all.md`, `commands/review.md`, `commands/feature.md`, `commands/fix.md`, `commands/focus.md`, `commands/next.md`, `commands/design.md`, `commands/init.md`, `commands/bootstrap.md`, `commands/note.md`, `install.sh`, `USER_COMMANDS`, `.claude-plugin/plugin.json`, any agent file other than `ae-test`. No new files, no new agents.

---

## Branch setup

- [ ] **Step 0: Create feature branch**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git checkout -b feat/agentic-engineering-verification-pyramid
git branch --show-current
```

Expected: `feat/agentic-engineering-verification-pyramid`.

---

## Task 1: Add `Level` column to PROGRESS.md matrix template in `/implement`

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/implement.md`

- [ ] **Step 1: Locate the current 3-column AC Coverage template**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "### AC Coverage\|### Edge probes" agentic-engineering/skills/agentic-engineering/commands/implement.md
```

The current template (inside a fenced ```markdown block) has:

```
### AC Coverage
| AC | Description | Tests |
|----|-------------|-------|
| AC-1 | [from STORIES.md] | [file:test_name<br>file:test_name] |
| AC-2 | [from STORIES.md] | [file:test_name] |
| AC-N | [from STORIES.md] | [file:test_name] |
```

- [ ] **Step 2: Replace the AC Coverage section header + table with the 4-column version**

Find that exact 6-line block and replace it with:

```
### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | [from STORIES.md] | [file:test_name<br>file:test_name] | [unit|integration|e2e] |
| AC-2 | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |
| AC-N | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |
```

(`Edge probes` table below this stays unchanged — Level only applies to AC Coverage.)

- [ ] **Step 3: Add the Level instruction block AFTER the existing "Filling the matrix:" instructions**

Find the "Filling the matrix:" bullet list (added during the QA Traceability work). After its last bullet, insert this paragraph:

```
**Level column:** Each matrix row declares one Level: `unit`, `integration`, or `e2e`.
- `unit` — single function/class, no I/O, no network, no DB, no FS, no real time. Mocks for collaborators OK.
- `integration` — multiple components in-process, mocked or local-only external boundaries.
- `e2e` — full system, real network/DB/UI driver, end-to-end user flow.

If a row's tests span multiple levels → split into multiple matrix rows (same AC, same Description, different Tests + Level cells). Multiple rows per AC is allowed — the AC contract is "≥ 1 row per AC."

Projects that need other levels (`contract`, `smoke`, `perf`) can use them — `ae-test` accepts the value but excludes the row from pyramid math.
```

- [ ] **Step 4: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "| AC | Description | Tests | Level |" agentic-engineering/skills/agentic-engineering/commands/implement.md
grep -c "Level column:" agentic-engineering/skills/agentic-engineering/commands/implement.md
grep -c "| AC | Description | Tests |$" agentic-engineering/skills/agentic-engineering/commands/implement.md
```

Expected:
- First count = 1 (new 4-column header)
- Second count = 1 (instruction added)
- Third count = 0 (old 3-column header removed; the `$` anchors end-of-line so we catch the bare 3-col header, not the new 4-col one)

- [ ] **Step 5: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/implement.md
git commit -m "feat(agentic-engineering): /implement matrix gains Level column for pyramid classification"
```

---

## Task 2: Extend `ae-test` Step 6 with shape detection, Level validation, and pyramid math

**Files:**
- Modify: `agentic-engineering/agents/ae-test/AGENT.md`

- [ ] **Step 1: Locate Step 6 + the existing substeps**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "^## Step 6\|^## Reference files\|Boilerplate\|_helper\|_smoke\|conftest" agentic-engineering/agents/ae-test/AGENT.md
```

Step 6 currently has 5 numbered substeps (1: read STORIES.md, 2: read PROGRESS.md, 3: pre-matrix fallback, 4: three checks, 5: boilerplate skip-list) followed by a report block + pre-matrix report block.

We're appending substeps 6, 7, 8 inside Step 6, just AFTER substep 5 (the boilerplate skip-list bullet) and BEFORE the report block.

- [ ] **Step 2: Append 3 new substeps (6, 7, 8) inside Step 6**

Find the end of substep 5 (the boilerplate skip-list line). It ends with something like:

```
5. Skip orphan detection for tests whose names contain `_helper`, `_smoke`, `conftest`, `fixtures`, `setup_`, `teardown_` — these are framework boilerplate.
```

After that line, BEFORE the empty line that precedes the "Report under..." block, insert:

````
6. **Detect matrix shape:** count columns in the AC Coverage table's header row.
   - 3 columns (`AC | Description | Tests`) → **pre-pyramid story**. Skip Level validation (substep 7). Skip pyramid math (substep 8). Report `Pyramid: (3-column matrix — pre-pyramid story; skip)`.
   - 4 columns (`AC | Description | Tests | Level`) → run substeps 7 + 8 below.
   - Match header column names case-insensitively. Extra columns beyond the 4 canonical ones are tolerated and ignored. Unknown column names are ignored. The shape is determined by whether a `Level` column (case-insensitive) is present.

7. **Level-field validation** (4-column matrix only):
   - Every matrix row must have a non-empty Level cell → empty Level = **blocker** (same severity as missing-AC). Tag with the AC number.
   - Recognized values: `unit`, `integration`, `e2e`. Match case-insensitively.
   - Other values (e.g., `contract`, `smoke`, `perf`) accepted without blocker, but excluded from pyramid math in substep 8.

8. **Pyramid math + soft inversion warnings** (4-column matrix only):
   - Compute per-story counts: `unit_count`, `integration_count`, `e2e_count` (canonical levels only; non-canonical rows excluded).
   - `total = unit_count + integration_count + e2e_count`
   - If `total == 0` (all rows non-canonical) → report `Pyramid: (all rows non-canonical levels — pyramid math skipped)`. No warnings.
   - If `total == 1` → report `Pyramid: unit U · integration I · e2e E (single-test story — pyramid not evaluated)`. No warnings.
   - If `total > 1`:
     - If `e2e_count / total > 0.5` → emit `should-fix` (informational, NOT blocker): `Inverted pyramid — over half the story's tests are e2e. Slow + brittle. Consider extracting unit-level coverage.`
     - If `unit_count == 0` → emit `should-fix`: `No unit-level tests. Consider whether any of these could be extracted as unit tests for speed + isolation.`
     - Both warnings can fire on the same story (emit both).
   - Report shape: `Pyramid: unit U · integration I · e2e E (balanced)` when no warnings fire. With warnings: `Pyramid: unit U · integration I · e2e E (inverted — X% e2e, consider extracting unit tests)` where X = `round(e2e_count / total * 100)`.
````

- [ ] **Step 3: Update the existing `Matrix:` block in Step 6's report (located further down in the same Step 6)**

Find the existing report template:

```
Matrix:
  ✅ M/N AC mapped to tests (STORY-XXX)
  ⚠️ Orphan: tests/auth_test.py::test_helper_setup — not referenced by any matrix
```

Replace with:

```
Matrix:
  ✅ M/N AC mapped to tests (STORY-XXX)
  Pyramid: unit U · integration I · e2e E (balanced | inverted — X% e2e, [...]) [⚠️ if warnings]
  ⚠️ Orphan: tests/auth_test.py::test_helper_setup — not referenced by any matrix
```

- [ ] **Step 4: Update the Step 5 report template's Matrix block to mirror the new Pyramid line**

Find the Step 5 report template (added during QA Traceability work). It has a `Matrix:` block like:

```
Matrix:
  [✅ M/N AC mapped / ⚠️ orphans / blocker list]
```

Replace with:

```
Matrix:
  [✅ M/N AC mapped / ⚠️ orphans / blocker list]
  [Pyramid: unit U · integration I · e2e E (balanced | inverted | pre-pyramid skip)]
```

- [ ] **Step 5: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "^6\. \*\*Detect matrix shape" agentic-engineering/agents/ae-test/AGENT.md
grep -c "^7\. \*\*Level-field validation" agentic-engineering/agents/ae-test/AGENT.md
grep -c "^8\. \*\*Pyramid math" agentic-engineering/agents/ae-test/AGENT.md
grep -c "Pyramid: unit" agentic-engineering/agents/ae-test/AGENT.md
grep -c "Inverted pyramid\|No unit-level tests" agentic-engineering/agents/ae-test/AGENT.md
```

Expected: each count ≥ 1.

- [ ] **Step 6: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-test/AGENT.md
git commit -m "feat(agentic-engineering): ae-test Step 6 validates Level column + computes pyramid"
```

---

## Task 3: Append "Pyramid health" section to `coverage-principles.md`

**Files:**
- Modify: `agentic-engineering/agents/ae-test/references/coverage-principles.md`

- [ ] **Step 1: Confirm current file ending**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
tail -5 agentic-engineering/agents/ae-test/references/coverage-principles.md
```

Expected ending: the test-identifier format list closing with `flutter test: tests/auth_test.dart::test_login_redirects` and a closing prose paragraph from the AC Traceability section added by the QA matrix work.

- [ ] **Step 2: Append the Pyramid health section at end of file**

Append exactly the following block to the very end of the file (preserve all existing content; only ADD):

````markdown

---

## Pyramid health

The verification pyramid (unit → integration → e2e) is a heuristic for healthy test mix. The matrix's `Level` column makes the mix visible per story.

**Three canonical levels:**

- **unit** — Single function or class, no I/O. Mocks for collaborators OK. Fast (milliseconds), isolated, easy to debug. Example:

  ```python
  def test_validate_email_rejects_no_at_sign():
      assert validate_email("foo") is False
  ```

- **integration** — Multiple components in-process, mocked or local boundaries (in-mem DB, fake HTTP). Slower (10s–100s of ms) but exercises real wiring. Example:

  ```python
  def test_signup_creates_user_and_session():
      db = InMemoryDB()
      session = SignupService(db).signup("a@b", "pw")
      assert db.get_user("a@b").email == "a@b"
      assert session.user_id == db.get_user("a@b").id
  ```

- **e2e** — Full system, real network/DB/UI. Slowest (seconds). Proves the system shipped. Example:

  ```typescript
  test('user signs up via UI', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('#email', 'a@b')
    await page.fill('#password', 'pw')
    await page.click('button[type=submit]')
    await expect(page).toHaveURL('/dashboard')
  })
  ```

**Soft warning rules (informational, not blockers):**

- `e2e_count / total > 50%` → inverted pyramid; favor extracting unit-level coverage
- `unit_count == 0` (with total > 1) → missing unit-level coverage; extract logic out of integration/e2e

**Why these warnings are soft:** Pyramid shape is project-specific. A flow-validation story can legitimately be e2e-heavy. The warning surfaces the shape; the operator decides.

**Custom levels accepted:** Projects using `contract`, `smoke`, `perf`, or other taxonomy can put those values in the Level cell. `ae-test` doesn't block, but excludes those rows from canonical pyramid math.
````

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "^## Pyramid health" agentic-engineering/agents/ae-test/references/coverage-principles.md
grep -c "Three canonical levels\|Soft warning rules\|Custom levels accepted" agentic-engineering/agents/ae-test/references/coverage-principles.md
tail -3 agentic-engineering/agents/ae-test/references/coverage-principles.md
```

Expected: first count = 1; second count ≥ 3 (one match per sub-heading); tail shows the "Custom levels accepted" paragraph.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-test/references/coverage-principles.md
git commit -m "docs(agentic-engineering): coverage-principles documents pyramid health"
```

---

## Task 4: Add `Pyramid:` rollup line to `/status` render template

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/status.md`

- [ ] **Step 1: Locate the Tests rollup line in the render template**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "Tests: M/N AC mapped\|Tests rollup" agentic-engineering/skills/agentic-engineering/commands/status.md
```

Locate the rendering template line `  Tests: M/N AC mapped across K shipped stories (P% · G gaps)` (2-space indented inside the `[Feature Name] — in-progress` block).

- [ ] **Step 2: Insert a Pyramid line immediately AFTER the Tests line**

In the template, find:

```
  Tests: M/N AC mapped across K shipped stories (P% · G gaps)
```

Insert immediately AFTER it (same 2-space indentation):

```
  Pyramid: unit U · integration I · e2e E (balanced) [⚠️ if inverted at feature scope]
```

So the in-progress feature block now reads:

```
[Feature Name] — in-progress
  Completed: X / Y stories
  Tests: M/N AC mapped across K shipped stories (P% · G gaps)
  Pyramid: unit U · integration I · e2e E (balanced) [⚠️ if inverted at feature scope]
  DONE ✅   STORY-001: [title]
  ...
```

- [ ] **Step 3: Add a Pyramid rollup instruction bullet to the rendering rules**

Find the existing "**Tests rollup:**" bullet (added during QA Traceability work). Immediately after it, add:

```
- **Pyramid rollup:** Aggregate `unit_count`, `integration_count`, `e2e_count` across all shipped stories with a 4-column `### AC Coverage` matrix. Skip pre-pyramid (3-column) stories and non-canonical-level rows. Compute `total = unit + integration + e2e`. If `total == 0` (no 4-column stories yet, or all rows non-canonical) → omit the entire `Pyramid:` line. Otherwise render `Pyramid: unit U · integration I · e2e E (balanced)`. If `e2e_count / total > 0.5` OR `unit_count == 0` → append `(inverted — X% e2e, consider extracting unit tests) ⚠️` instead of `(balanced)`.
```

- [ ] **Step 4: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Pyramid: unit U" agentic-engineering/skills/agentic-engineering/commands/status.md
grep -c "Pyramid rollup:" agentic-engineering/skills/agentic-engineering/commands/status.md
```

Expected: each count ≥ 1.

- [ ] **Step 5: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/status.md
git commit -m "feat(agentic-engineering): /status rollup includes per-feature pyramid line"
```

---

## Task 5: Append Pyramid sentence to AGENTS.md adapter

**Files:**
- Modify: `agentic-engineering/adapters/AGENTS.md.template`

- [ ] **Step 1: Locate the existing AC Coverage matrix paragraph**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "AC Coverage matrix\|agentic-engineering:start\|agentic-engineering:end" agentic-engineering/adapters/AGENTS.md.template
```

Find the paragraph starting `**AC Coverage matrix.** Every shipped story records...` (added during QA Traceability).

- [ ] **Step 2: Append one sentence to that paragraph**

In the existing AC Coverage matrix paragraph, find the closing sentence `...only /implement and Phase 2 blocker-fix mutate it.` Add one more sentence to the END of that same paragraph (no new paragraph break — append in place):

```
 The matrix's `Level` column declares one of `unit`, `integration`, or `e2e` per row; `ae-test` computes a pyramid ratio per story and surfaces a soft "inverted pyramid" warning when over half the tests are e2e or zero unit tests exist (informational, never blockers).
```

(Note the leading space — the new sentence appends to the existing paragraph with one space separator, not a newline.)

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "agentic-engineering:start v1\|agentic-engineering:end v1" agentic-engineering/adapters/AGENTS.md.template
grep -c "Level\` column declares\|pyramid ratio\|inverted pyramid" agentic-engineering/adapters/AGENTS.md.template
```

Expected: first count = 2 (markers intact); second count ≥ 1 (new sentence landed).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/adapters/AGENTS.md.template
git commit -m "docs(agentic-engineering): AGENTS.md template documents Level column + pyramid warnings"
```

---

## Task 6: Append Pyramid sentence to README.md

**Files:**
- Modify: `agentic-engineering/README.md`

- [ ] **Step 1: Locate the existing AC Coverage matrix sentence**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "AC Coverage matrix\|missing AC or stale" agentic-engineering/README.md
```

Find the existing AC Coverage matrix sentence (in the `/ship` table row's description column). It ends with `...become blockers.`

- [ ] **Step 2: Append one sentence in-place**

After `...become blockers.`, add a single space + this sentence (still inside the same table cell — do NOT add a paragraph break or line break since that would break the table structure):

```
 The matrix's `Level` column (`unit`/`integration`/`e2e`) lets `/status` and `ae-test` report the pyramid mix per story and per feature, with a soft warning when over half the tests are e2e or zero unit tests exist.
```

- [ ] **Step 3: Verify the README table still renders correctly**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
sed -n '118,121p' agentic-engineering/README.md
```

Confirm: the `/ship` row is still a single table row (begins with `| ` and ends with ` |` on its own line — no embedded newlines). The new sentence should be after the existing AC matrix sentence within the same cell.

```bash
grep -c "Level. column.*unit.*integration.*e2e\|pyramid mix per story" agentic-engineering/README.md
```

Expected: count ≥ 1.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/README.md
git commit -m "docs(agentic-engineering): README documents Level column + pyramid rollup"
```

---

## Task 7: Installer round-trip verification

**Goal:** Confirm the per-plugin installer copies the updated files to `~/.claude/` and the cross-references still resolve.

- [ ] **Step 1: Run installer**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
bash install.sh
```

Expected: "✅ Done. Restart Claude Code to pick up the changes." with no errors.

- [ ] **Step 2: Verify updates landed at `~/.claude/`**

```bash
grep -c "| AC | Description | Tests | Level |" ~/.claude/skills/agentic-engineering/commands/implement.md
grep -c "Level-field validation\|Pyramid math" ~/.claude/agents/ae-test/AGENT.md
grep -c "^## Pyramid health" ~/.claude/agents/ae-test/references/coverage-principles.md
grep -c "Pyramid: unit U\|Pyramid rollup:" ~/.claude/skills/agentic-engineering/commands/status.md
```

Expected: each count ≥ 1.

- [ ] **Step 3: Regression — confirm prior features still installed correctly**

```bash
test -f ~/.claude/agents/ae-edge/AGENT.md && echo "ae-edge: still installed"
test -f ~/.claude/skills/agentic-engineering/commands/focus.md && echo "focus: still installed"
grep -c "### AC Coverage" ~/.claude/skills/agentic-engineering/commands/implement.md
```

Expected: both echoes succeed; AC Coverage count ≥ 1 (matrix template preserved).

(No commit — verification only.)

---

## Task 8: Adapter round-trip verification

**Goal:** Confirm the multi-tool installer writes the extended matrix paragraph and stays idempotent.

- [ ] **Step 1: Set up scratch**

```bash
rm -rf /tmp/pyramid-adapter-test
mkdir -p /tmp/pyramid-adapter-test
cd /tmp/pyramid-adapter-test
```

- [ ] **Step 2: Run multi-tool installer for cursor**

```bash
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
```

Expected: writes AGENTS.md + populates `.cursor/rules/`.

- [ ] **Step 3: Verify the pyramid sentence landed inside the marker block**

```bash
grep -c "agentic-engineering:start v1\|agentic-engineering:end v1" /tmp/pyramid-adapter-test/AGENTS.md
grep -c "AC Coverage matrix\|Level. column declares\|pyramid ratio" /tmp/pyramid-adapter-test/AGENTS.md
```

Expected: first count = 2 (markers intact); second count ≥ 1 (matrix paragraph including the new pyramid sentence).

- [ ] **Step 4: Re-run for idempotency**

```bash
cd /tmp/pyramid-adapter-test
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
grep -c "agentic-engineering:start v1" /tmp/pyramid-adapter-test/AGENTS.md
grep -c "pyramid ratio" /tmp/pyramid-adapter-test/AGENTS.md
```

Expected: each count = 1 (no duplication on re-install).

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/pyramid-adapter-test
```

(No commit — verification only.)

---

## Task 9: Refresh graphify snapshot

- [ ] **Step 1: Run graphify update**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
graphify update . 2>&1 | tail -5
```

If output is "no code files found — nothing to rebuild" → markdown-only changes, no graph update needed. No commit.

If `git status agentic-engineering/graphify-out/` shows changes:

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/graphify-out/
git commit -m "chore(agentic-engineering): refresh graphify snapshot for verification pyramid"
```

(Skip this task entirely if `graphify` binary unavailable.)

---

## Task 10: Deferred live verification (needs Claude Code restart)

**Goal:** Confirm the Level column works end-to-end through `/feature` → `/ship` → `/review` → `/status`.

**Cannot be automated from this session.** Hand off to the user.

Steps for the user to run after restart:

- [ ] **Step 1: Restart Claude Code**

Exit + re-launch so it re-reads `~/.claude/skills/` and `~/.claude/agents/`.

- [ ] **Step 2: Scratch project setup**

```bash
mkdir -p /tmp/pyramid-e2e
cd /tmp/pyramid-e2e
git init -q
```

Run `/init` in Claude Code; approve generated files.

- [ ] **Step 3: Generate a multi-AC feature**

Run `/feature pyramid-fixture`. Approve PRD. Approve stories with 3+ AC.

Verify: STORIES.md has AC labeled `AC-1:`, `AC-2:`, etc. (carryover from QA Traceability work; not new in this spec but must still function).

- [ ] **Step 4: Ship a story**

Run `/ship STORY-001`. Approve plan. Let the chain run.

Verify after Phase 2:
- `PROGRESS.md` contains a `### AC Coverage` table with **4 columns** (AC, Description, Tests, Level)
- Every AC row has a non-empty Level cell with one of `unit`, `integration`, `e2e`

- [ ] **Step 5: Inversion-warning test**

Manually edit PROGRESS.md so the story has 3 e2e rows + 1 integration row (inverted). Run `/review`. Expect `ae-test` to emit a should-fix "inverted pyramid" warning. Expect this to be informational, NOT a blocker.

- [ ] **Step 6: Zero-unit warning test**

Manually edit PROGRESS.md so the story has 2 integration + 2 e2e + 0 unit. Run `/review`. Expect a should-fix "no unit-level tests" warning. Again, informational only.

- [ ] **Step 7: Both warnings simultaneously**

Manually edit PROGRESS.md so the story has 0 unit + 1 integration + 4 e2e. Run `/review`. Expect BOTH warnings to fire (inverted AND no-unit).

- [ ] **Step 8: Backward compat — 3-column matrix**

Manually create a story with a 3-column matrix (no Level column) in PROGRESS.md. Run `/review`. Expect `ae-test` to report `Pyramid: (3-column matrix — pre-pyramid story; skip)`. No blocker, no Level validation.

- [ ] **Step 9: Empty Level cell — blocker check**

In a 4-column matrix, leave one Level cell empty. Run `/review`. Expect a blocker.

- [ ] **Step 10: Non-canonical Level value**

Set one row's Level to `contract`. Run `/review`. Expect no blocker. Pyramid math excludes that row. Other canonical rows still count.

- [ ] **Step 11: Single-test story**

Create a story with exactly one matrix row at level `e2e`. Run `/review`. Expect Pyramid line to print counts but NO inversion warning (single-test exemption).

- [ ] **Step 12: /status feature-level rollup**

Ship 2-3 stories with varying pyramid mixes. Run `/status`. Expect the feature row to include both `Tests:` and `Pyramid:` aggregate lines.

---

## Final step: finish the branch

After Tasks 1–9 complete and Task 10 documented:

- [ ] **Announce:** "I'm using the finishing-a-development-branch skill to complete this work."
- [ ] **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`. There are no automated tests in this plugin — verification is the installer round-trip in Task 7 + adapter round-trip in Task 8. Task 10 stays deferred for the user to exercise after restart.

---

## Self-review notes

- **Spec coverage:** every spec section maps to tasks.
  - Architecture (4th Level column on matrix) → Task 1
  - ae-test Step 6 extensions (shape detection, Level validation, pyramid math) → Task 2
  - Step 5 report update → Task 2 (same file)
  - coverage-principles "Pyramid health" → Task 3
  - /status rollup extension → Task 4
  - AGENTS.md adapter sentence → Task 5
  - README sentence → Task 6
  - Verification → Tasks 7 + 8 + 10
  - Graphify upkeep → Task 9
- **Placeholder scan:** no TBD / vague prose. Each step has exact strings to find/replace. Verification step contents are concrete.
- **Type consistency:** the three canonical levels (`unit`, `integration`, `e2e`) are spelled identically across all 6 modified files. Pyramid line format (`Pyramid: unit U · integration I · e2e E (balanced | inverted — X% e2e, [...])`) is identical in `ae-test`'s Step 5 + Step 6 reports and `/status`'s render template. Soft-warning thresholds (50% e2e, zero unit) are stated identically in Task 2, Task 3, and Task 4.
- **Anti-pattern check:** each task touches at most 1 file. No cross-file fan-out. Each task has its own commit.
