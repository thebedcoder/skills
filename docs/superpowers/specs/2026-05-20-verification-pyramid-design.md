# Verification Pyramid — Design

**Date:** 2026-05-20
**Status:** Approved (pending implementation plan)
**Scope:** `agentic-engineering/` plugin
**Builds on:** `2026-05-20-qa-traceability-matrix-design.md` — the AC Coverage matrix this extends with a fourth `Level` column.

---

## Goal

Make **test-level distribution visible per story and per feature** by extending the just-shipped AC Coverage matrix with a `Level` column (`unit` / `integration` / `e2e`). Today, every test in the matrix is treated as flat — a happy-path e2e and a tightly-scoped unit test look identical in the artifact. This adds enough structure for `ae-test` to compute pyramid ratios + raise a soft warning on inverted pyramids (>50% e2e or zero unit tests) without enforcing strict thresholds.

The goal is *visibility*, not *enforcement*. The intent is to let operators see "STORY-005 is 80% e2e" and decide whether that's deliberate (e.g., a flow-validation story) or accidental (e.g., the implementer leaned on e2e because writing units was harder).

---

## Non-goals

- **No strict pyramid threshold enforcement.** Soft "should-fix" warnings only — never blockers. Pyramid shape is a project judgment call, not a universal rule.
- **No auto-classification by file path / test naming.** Heuristics break in projects with flat `tests/` directories or non-standard layouts. Operator declares the level. Always.
- **No per-AC level requirements in STORIES.md.** Level lives in the matrix, not in the spec. Forcing operators to commit to a level at AC-authoring time is premature.
- **No new commands, no new agents, no new files.** This is a column addition + an `ae-test` Step 6 extension + a `/status` rollup line + a few doc updates.
- **No cross-story pyramid trend tracking.** Just current snapshot per story / per feature. Historical trend analysis is out of scope.
- **No mutation testing, property-based testing, contract testing.** Different concerns entirely.
- **No retroactive Level fill for pre-pyramid stories.** Stories shipped before this change skip the Level validation entirely.

---

## Architecture

### Test-level taxonomy

Three canonical levels:

| Level | What |
|---|---|
| `unit` | Single function/class, no I/O, no network, no DB, no FS, no real time. Mocks/fakes for collaborators are fine. |
| `integration` | Multiple components wired in-process. Mocked or local-only external boundaries (in-mem DB, fake HTTP server). Runs fast but exercises multiple units together. |
| `e2e` | Full system, real network, real DB, real UI driver where applicable. End-to-end user flow. Slow + brittle but proves the system shipped. |

`ae-test` recognizes exactly these three values for pyramid math. Projects that need other levels (`contract`, `smoke`, `perf`) can use them in the Level column — `ae-test` accepts the value (no blocker), but excludes the row from the pyramid ratio computation. This keeps the canonical pyramid clean while not blocking project-specific extensions.

### Matrix becomes 4 columns

Today (after the QA Traceability spec landed):

```markdown
### AC Coverage
| AC | Description | Tests |
|----|-------------|-------|
| AC-1 | Submit email + password | tests/auth_test.py::test_login_form_renders |
| AC-2 | Redirect on success | tests/auth_test.py::test_login_redirects |
```

After this spec:

```markdown
### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | Submit email + password | tests/auth_test.py::test_login_form_renders | unit |
| AC-2 | Redirect on success | tests/auth_test.py::test_login_redirects_dashboard | integration |
| AC-3 | Multi-step signup flow | tests/e2e/signup.spec.ts::full_signup_flow | e2e |
```

### Multi-test rows with mixed levels

A single matrix row's Tests cell can list multiple tests joined by `<br>` (existing convention). The Level column declares ONE level for all tests in that row. If a row's tests genuinely span levels (e.g., one unit test + one e2e test both proving AC-3), the operator **splits the row** into two matrix rows:

```markdown
| AC-3 | Multi-step signup flow | tests/signup_unit.py::test_validate_form | unit |
| AC-3 | Multi-step signup flow | tests/e2e/signup.spec.ts::full_signup_flow | e2e |
```

Same AC, same Description (repeats), different Tests + Level. `ae-test`'s AC contract (every `AC-N` has ≥ 1 row) is satisfied. AC-3 appearing twice doesn't break the missing-AC check — multiple rows for the same AC is allowed.

### `ae-test` Step 6 extensions

Step 6 currently validates AC ↔ matrix ↔ reality. Two additions:

1. **Level-field validation.**
   - Detect matrix shape by counting columns in the header row. 3-column header (`AC | Description | Tests`) → pre-pyramid story → skip Level validation entirely. 4-column header (`AC | Description | Tests | Level`) → run Level validation.
   - For 4-column matrix: every row must have a non-empty Level cell. Empty Level cell → **blocker** (same severity as missing-AC).
   - Recognized values: `unit`, `integration`, `e2e`. Other values are accepted but excluded from pyramid math.

2. **Pyramid ratio reporting + soft inversion warning.**
   - Compute per-story: `unit_count`, `integration_count`, `e2e_count`. Total = sum of the three. Other-level rows excluded from total.
   - **Inversion warning #1:** If `e2e_count / total > 0.5` AND total > 1 → emit `should-fix` (informational, not blocker): *"Inverted pyramid — over half the story's tests are e2e. Slow + brittle. Consider extracting unit-level coverage for the same logic."*
   - **Inversion warning #2:** If `unit_count == 0` AND total > 1 → emit `should-fix`: *"No unit-level tests. Consider whether any of these could be extracted as unit tests for speed + isolation."*
   - Single-test stories (total = 1) get neither warning regardless of level — too small to evaluate pyramid shape.

Step 6's existing report block gains a `Pyramid:` line:

```
Matrix:
  ✅ 3/3 AC mapped to tests (STORY-005)
  Pyramid: unit 1 · integration 1 · e2e 1 (balanced)
  ⚠️ Orphan: tests/auth_test.py::test_helper_setup
```

When inversion warning fires:

```
  Pyramid: unit 0 · integration 1 · e2e 4 (inverted — 80% e2e, consider extracting unit tests)
```

When pre-pyramid:

```
  Pyramid: (3-column matrix — pre-pyramid story; skip)
```

### `/status` rollup extension

The existing `Tests: M/N AC mapped across K shipped stories (P% · G gaps)` line gets a sibling `Pyramid:` line:

```
[Feature Name] — in-progress
  Completed: 5 / 8 stories
  Tests: 18/20 AC mapped across 5 shipped stories (90% · 2 gaps)
  Pyramid: unit 12 · integration 6 · e2e 4 (balanced)
```

**Computation:** Aggregate `unit_count`, `integration_count`, `e2e_count` across all shipped stories with a 4-column matrix. Skip pre-pyramid (3-column) stories from the aggregation. Same omission rule as the Tests rollup — if no shipped stories have a 4-column matrix yet, omit the Pyramid line entirely.

**Inversion warning at feature scope:** Same logic as per-story but applied to the aggregate. If feature-level e2e ratio > 50% or feature-level unit_count == 0, append a `⚠️` annotation to the Pyramid line.

```
  Pyramid: unit 0 · integration 6 · e2e 14 (inverted — 70% e2e, consider extracting unit tests) ⚠️
```

`/status` rollup is read-only — it surfaces the metric, doesn't change anything in PROGRESS.md.

---

## Components

### Updated `commands/implement.md`

PROGRESS.md template gets a `Level` column in the AC Coverage table. The template emitted to implementers becomes:

```markdown
### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | [from STORIES.md] | [file:test_name<br>file:test_name] | [unit|integration|e2e] |
| AC-2 | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |
| AC-N | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |
```

Edge probes table is unchanged — Level applies only to AC Coverage.

The instruction below the template gains:

```
**Level column:** Each matrix row declares one Level: `unit`, `integration`, or `e2e`.
- `unit` — single function/class, no I/O, no network, no DB, no FS, no real time. Mocks for collaborators OK.
- `integration` — multiple components in-process, mocked or local-only external boundaries.
- `e2e` — full system, real network/DB/UI driver, end-to-end user flow.

If a row's tests span multiple levels → split into multiple rows (same AC, same Description, different Tests + Level cells). The matrix can have multiple rows per AC; the AC contract is "≥ 1 row per AC."

Projects that need other levels (`contract`, `smoke`, `perf`) can use them — `ae-test` accepts the value but excludes the row from pyramid math.
```

### Updated `agents/ae-test/AGENT.md` — Step 6

Step 6 already exists from the QA Traceability spec. Add two sub-steps inside the existing structure:

After substep 4 (the three checks: missing-AC, stale-test, orphan), insert:

```markdown
6. **Detect matrix shape:** count columns in the AC Coverage table's header row.
   - 3 columns (`AC | Description | Tests`) → **pre-pyramid story**. Skip Level validation. Skip pyramid math. Report `Pyramid: (3-column matrix — pre-pyramid story; skip)`.
   - 4 columns (`AC | Description | Tests | Level`) → run Level validation below.

7. **Level-field validation** (for 4-column matrix only):
   - Every row must have a non-empty Level cell → empty Level = **blocker** (same severity as missing-AC)
   - Recognized values: `unit`, `integration`, `e2e`. Other values accepted but excluded from pyramid math.

8. **Pyramid ratio + soft inversion warning** (for 4-column matrix only):
   - Compute `unit_count`, `integration_count`, `e2e_count`. Total = sum.
   - If `e2e_count / total > 0.5` AND total > 1 → emit `should-fix`: *"Inverted pyramid — over half the story's tests are e2e. Slow + brittle. Consider extracting unit-level coverage."*
   - If `unit_count == 0` AND total > 1 → emit `should-fix`: *"No unit-level tests. Consider whether any of these could be extracted as unit tests for speed + isolation."*
   - Single-test stories (total = 1) emit neither warning.
```

Update the Step 5 report template's `Matrix:` block to include the Pyramid line:

```
Matrix:
  ✅ M/N AC mapped to tests (STORY-XXX)
  Pyramid: unit U · integration I · e2e E (balanced | inverted — X% e2e, [...])
  ⚠️ Orphan: ...
```

### Updated `agents/ae-test/references/coverage-principles.md`

Append a new section after the existing "AC Traceability" section:

```markdown

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
```

### Updated `commands/status.md`

The render template gains a Pyramid line under the existing Tests rollup. The instruction block gains:

```
- **Pyramid rollup:** Aggregate `unit_count`, `integration_count`, `e2e_count` across all shipped stories with a 4-column AC Coverage matrix. Skip pre-pyramid (3-column) stories. Render as `Pyramid: unit U · integration I · e2e E (balanced | inverted — X% e2e, [...]) [⚠️ if inverted]`. Omit the line if no shipped story has a 4-column matrix yet.
```

### Updated `adapters/AGENTS.md.template`

Extend the existing AC Coverage matrix paragraph with a sentence about the Level column:

```
The matrix's `Level` column declares one of `unit`, `integration`, or `e2e` per row. `ae-test` computes a pyramid ratio per story and surfaces an inverted-pyramid soft warning when over half the tests are e2e or zero unit tests exist. Inversion warnings are informational — they never block ship.
```

### Updated `README.md`

The existing AC Coverage matrix sentence gets one trailing sentence:

```
The matrix's `Level` column (`unit`/`integration`/`e2e`) lets `/status` and `ae-test` report the pyramid mix per story and per feature, with a soft warning when over half the tests are e2e or zero unit tests exist.
```

---

## Data flow

```
/feature
  ↓ STORIES.md AC unchanged (Level lives in the matrix, not in AC)

/implement (or /ship Phase 1)
  ↓ Implementer writes tests covering each AC
  ↓ At PROGRESS.md write step, the matrix template now has 4 columns
  ↓ Implementer fills Level per row based on what they actually wrote
  ↓ Multi-level coverage → split into multiple rows (same AC repeats)

/review (= /ship Phase 2)
  ↓ ae-test Step 6 runs:
      - Detect matrix shape (3-col → skip Level validation; 4-col → enforce)
      - Validate every row has Level (4-col only)
      - Compute pyramid ratios (4-col only)
      - Emit should-fix warnings on inversion
  ↓ Step 5 report includes Pyramid line in Matrix block

/status
  ↓ Aggregate pyramid across shipped 4-col stories per feature
  ↓ Render Pyramid line below Tests rollup
  ↓ Inversion warning at feature scope same logic as story scope
```

---

## Composition with existing features

### With QA Traceability matrix (the immediate predecessor)

This spec is a direct extension. Backward-compatible: 3-column matrices (shipped before this lands) stay valid; `ae-test` detects shape and runs only the AC mapping check on them. 4-column matrices get the full Level + pyramid pipeline.

### With `ae-edge` and Edge probes table

Edge probes table doesn't get a Level column. ae-edge generates tests that are typically integration- or e2e-level (real call paths through code), but tagging them at row level would add ceremony without clear value. ae-edge tests are tracked separately as "supplementary coverage" outside the pyramid math.

If the operator wants their ae-edge probes counted in the pyramid, they can also list them in the AC Coverage matrix with an appropriate Level. The two tables aren't mutually exclusive — same test can appear in both, no flag.

### With `/focus` and `--auto`

No interaction. Level validation runs inside `ae-test`'s normal Step 6 execution. Pyramid warnings are `should-fix` (informational), so `--auto` doesn't pause on them. Hard-pause behavior is unchanged.

### With `/ship-all`

Per-story matrix work is the same. The `/status` rollup naturally accumulates across the chain. No special handling.

---

## Error handling

| Condition | Behavior |
|---|---|
| 4-column matrix, row has empty Level cell | **Blocker** — same severity as missing AC |
| 4-column matrix, row has unrecognized Level value (e.g., `contract`, `smoke`) | Accept value, exclude row from pyramid math, no warning. Operator's prerogative. |
| 3-column matrix | Pre-pyramid story — skip Level validation entirely. Report `Pyramid: (3-column matrix — pre-pyramid story; skip)` |
| Story has 0 tests in the matrix (refactor / chore) | No pyramid math. Don't compute ratios. Don't emit warnings. |
| Story has exactly 1 test in the matrix | Compute counts but suppress inversion warnings — too small to evaluate shape. |
| All rows have non-canonical Level (e.g., all `contract`) | Total = 0 for canonical math. Render `Pyramid: (all rows non-canonical levels — pyramid math skipped)`. |
| Aggregate across feature shows 0 canonical-level tests | Omit feature-level Pyramid line entirely. |
| Matrix header has extra columns beyond Level | Tolerate. `ae-test` reads columns by header name, not position. Unknown columns ignored. |
| Header column named `Level` but case mismatch (e.g., `level`) | Accept (case-insensitive match on header name) |

No condition crashes `ae-test`. All edge cases produce sensible reports or skip gracefully.

---

## Discoverability touchpoints

| File | Change |
|---|---|
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | PROGRESS.md template adds `Level` column; instruction explains the three levels + multi-row split |
| `agentic-engineering/agents/ae-test/AGENT.md` | Step 6 adds substeps for shape detection, Level validation, pyramid math, inversion warnings; Step 5 report adds `Pyramid:` line |
| `agentic-engineering/agents/ae-test/references/coverage-principles.md` | Append `## Pyramid health` section with the three levels + example tests + warning rules |
| `agentic-engineering/skills/agentic-engineering/commands/status.md` | Render template adds `Pyramid:` line; instructions explain rollup math + feature-level inversion |
| `agentic-engineering/adapters/AGENTS.md.template` | Append sentence to existing AC Coverage matrix paragraph |
| `agentic-engineering/README.md` | Append sentence to existing AC matrix sentence |

**No changes to:** any wrapper file, `commands/ship.md`, `commands/ship-all.md`, `commands/review.md`, `commands/feature.md`, `commands/fix.md`, `commands/focus.md`, `commands/next.md`, `commands/design.md`, `commands/init.md`, `commands/bootstrap.md`, `commands/note.md`, `install.sh`, `USER_COMMANDS`, `.claude-plugin/plugin.json`, any agent file other than `ae-test`.

---

## Verification

No automated tests in this plugin. Verification by installer round-trip + adapter round-trip + scratch-project exercise (deferred to user — needs Claude Code restart).

1. **Installer round-trip:** `bash install.sh` → confirm updated `commands/implement.md`, `commands/status.md`, `agents/ae-test/AGENT.md`, `coverage-principles.md` reach `~/.claude/`.
2. **Adapter round-trip:** `bash install.sh --tool=cursor` to scratch dir → confirm marker block contains the extended matrix paragraph + idempotent on re-install.
3. **Scratch project exercise (deferred to user):**
   - `/init` → `/feature pyramid-test` → confirm AC labels unchanged
   - `/ship STORY-001` → confirm PROGRESS.md matrix has 4 columns
   - Manually corrupt: empty a Level cell → `/review` → expect blocker
   - Manually corrupt: write a 4-row matrix with 3 e2e rows + 1 integration → `/review` → expect inversion warning (should-fix, not blocker)
   - Manually corrupt: write a 4-row matrix with 0 unit + 2 integration + 2 e2e → expect both "inverted" + "no unit" warnings
   - Run `/status` → confirm Pyramid line appears with aggregate
4. **Backward compat:** Ship a story with manually-written 3-column matrix (no Level column) → `/review` → confirm `Pyramid: (3-column matrix — pre-pyramid story; skip)` and no Level-related blocker.

---

## Risks and open questions

**Risk: operator misclassifies tests.** A test that calls a real DB but is labeled `unit` corrupts the pyramid math. Mitigation: `coverage-principles.md` "Pyramid health" section gives concrete examples per level. Beyond that, this is operator discipline — same as any test-classification system.

**Risk: 50% e2e threshold is arbitrary.** Some stories are legitimately e2e-heavy (flow validation, UI-driven AC). Mitigation: warning is `should-fix`, never blocker. Operator dismisses it if intentional. Could become configurable in a follow-on if pattern emerges.

**Risk: 4-column matrix breaks markdown rendering in some renderers.** Most GitHub-flavored markdown handles this fine. Mitigation: `<br>` separator in Tests cell stays unchanged; Level cell is short single-word values; no extra rendering complexity.

**Open question deferred to implementation:** should `ae-test` flag a row whose declared Level seems implausible based on test content (e.g., row declares `unit` but the test path is `tests/e2e/...`)? Decision: **no** for v1. Operator declares; ae-test trusts. Adding consistency checks ("you said unit but the file is in tests/e2e") adds heuristics ae-test was specifically designed to avoid. Defer.

**Open question deferred to implementation:** the `should-fix` warnings emitted by Step 6 — do they get separate per-warning entries in the consolidated `/review` blocker list, or are they bundled into a single "pyramid concerns" entry? Decision: **separate entries**, one per warning, so each can be addressed independently or dismissed. Same pattern as ae-test's existing should-fix items.

---

## Out of scope (explicit)

- Strict pyramid threshold enforcement (always soft warning)
- Auto-classification heuristics (operator declares)
- Per-AC level requirements in STORIES.md (Level lives in matrix)
- Cross-story pyramid trend tracking
- Mutation testing / property-based testing / contract testing
- Retroactive Level fill for pre-pyramid stories
- Configurable warning thresholds (50% e2e is hardcoded for v1)
- ae-edge edge-probe levels (Edge probes table stays unchanged)
- New commands, new agents, new files
