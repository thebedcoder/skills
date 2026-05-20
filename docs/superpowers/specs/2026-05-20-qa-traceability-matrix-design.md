# QA Traceability Matrix — Design

**Date:** 2026-05-20
**Status:** Approved (pending implementation plan)
**Scope:** `agentic-engineering/` plugin
**Builds on:** `[ae-edge:<category>] STORY-XXX` tag convention from `2026-05-20-edge-case-reviewer-design.md`

---

## Goal

Make AC → test coverage **traceable and verifiable** as a built-in part of every shipped story. Today nothing connects "AC-2 of STORY-005" to the test that proves it — coverage is implicit, drift is undetectable, and `ae-test`'s gap-flagging is per-test-file rather than per-AC.

This adds a structured **AC Coverage** table to `PROGRESS.md` per story, written by the implementer at the same time as the tests, validated by `ae-test` during `/review`. No new command, no test tagging, no new file format — leverages artifacts and agents that already exist.

---

## Non-goals

- **No `/qa` command.** Rejected during brainstorming as over-engineered. The artifact (matrix in PROGRESS.md) is enough — grep finds it, humans read it.
- **No tag convention in test files.** The implementer who writes the tests also writes the matrix; they don't need to embed AC references inside test code. (The existing `[ae-edge:<category>] STORY-XXX` tag for adversarial probes stays — different purpose, different layer.)
- **No `TRACEABILITY.md` or `AC-MAP.json` per feature.** Matrix lives inside PROGRESS.md, where the rest of the per-story narrative lives.
- **No verification pyramid (unit/integration/e2e classification).** Deferred to a follow-on. v1 cares about presence of coverage, not test level.
- **No demo-runner.** AC checkboxes serve as both automated test targets AND human-verification steps.
- **No retroactive matrix fill.** Old PROGRESS.md entries (free-text "Tests added: ...") stay as-is. New rule applies to stories shipped after this change.
- **No matrix mutation outside `/ship` / `/implement`.** `/review`'s `ae-test` only validates the matrix; it never edits it.

---

## Architecture

### The structured matrix in `PROGRESS.md`

Per story, the entry has two tables added to the existing format:

```markdown
## STORY-005: User login — 2026-05-20

### AC Coverage
| AC | Description | Tests |
|----|-------------|-------|
| AC-1 | Submit email + password | tests/auth_test.py::test_login_form_renders<br>tests/auth_test.py::test_login_submit_valid |
| AC-2 | Redirect on success | tests/auth_test.py::test_login_redirects |
| AC-3 | Inline error on failure | tests/auth_test.py::test_login_invalid_credentials |

### Edge probes (from ae-edge)
| Category | Test |
|----------|------|
| malformed | tests/auth_test.py::test_login_malformed_email |
| error-path | tests/auth_test.py::test_login_db_timeout |

### Files changed
- src/auth.py
- src/views/login.tsx
- tests/auth_test.py

### Notes
[narrative — same as today]
```

**Table contract:**

- **AC Coverage** — one row per AC declared in STORIES.md. Each row lists the test(s) that prove that AC. Test references use `file:test_name` (path + test identifier) so they're greppable. Multiple tests per AC → `<br>`-separated (rendered as line breaks in GitHub markdown; plain-text grep still works).
- **Edge probes** — one row per ae-edge finding that landed in this story's tests (added during Phase 2 blocker-fix when ae-edge surfaces an edge-case blocker). Rows have `category` (boundary / null/empty / race / malformed / resource / error-path) and the test identifier. The `Edge probes` section is omitted if ae-edge returned no findings for this story.
- **Files changed** + **Notes** — unchanged from today's PROGRESS.md format.

### AC numbering in `STORIES.md`

`/feature`'s STORIES.md template emits AC with explicit 1-based `AC-N:` labels:

```markdown
- [ ] STORY-005: User login
  **As a** ... **I want** ... **so that** ...
  **Acceptance Criteria:**
  - [ ] AC-1: User can submit email + password
  - [ ] AC-2: Successful login redirects to dashboard
  - [ ] AC-3: Failed login shows error message inline
  **Notes:** ...
```

**Backward compatibility:** AC lists without explicit `AC-N:` labels are inferred by position (1-based). Pre-existing STORIES.md files don't need to be edited; `ae-test`'s matrix check handles both cases.

### What `ae-test` validates

`ae-test`'s existing coverage review gains one new rule:

**Matrix-vs-reality check.** Per story being reviewed, after reading PROGRESS.md and STORIES.md:

1. **Every AC in STORIES.md must appear as a row in the AC Coverage table.** Missing AC → **blocker** (review-blocker class; pauses the chain under `--auto`).
2. **Every test listed in the matrix must exist in the repo.** Stale entry (test not found via grep) → **blocker**.
3. **Tests in the repo that aren't in any matrix.** Flagged as `should-cover` (informational, not a blocker). Orphans are real but don't block ship — they may be helper tests, framework-required smoke tests, or tests written for cross-cutting concerns.
4. **The story is "pre-matrix"** (no `### AC Coverage` heading in its PROGRESS.md entry) → **skip the matrix check** (backward compat). `ae-test`'s existing coverage rules still run.

The matrix check runs alongside `ae-test`'s existing review of test quality + scenario coverage. It does not replace them.

### Where the change lands in `/ship`

```
Phase 1 — implement (UNCHANGED contract, MODIFIED PROGRESS.md template)
  - ARCH plans
  - PROD validates
  - implement + tests
  - update STORIES.md + PROGRESS.md     ← PROGRESS.md now uses the matrix template

Phase 2 — review (UNCHANGED, NEW rule inside ae-test)
  - 6-agent parallel batch
  - ae-test enforces matrix-vs-reality (new)
  - blockers pause the chain (existing flow)

Phase 2.5 — ae-edge in batch (UNCHANGED)
  - ae-edge findings flow into consolidated blocker list

If Phase 2 blockers from ae-edge → during the blocker-fix step,
the implementer ALSO appends fixed-probe rows to the Edge probes table.

Phases 3-6 — frontend, frontend review, docs, PR (UNCHANGED)
```

No new phases. The matrix is an artifact of Phase 1, validated in Phase 2, augmented during Phase 2 blocker-fix.

---

## Components

### Updated `commands/implement.md`

Modify the PROGRESS.md generation step (currently emits a free-text "Tests added:" line). The new template (caveman-style internal):

````markdown
## STORY-XXX: [Title] — [date]

### AC Coverage
| AC | Description | Tests |
|----|-------------|-------|
| AC-1 | [from STORIES.md] | [file:test_name, file:test_name] |
| AC-2 | [from STORIES.md] | [file:test_name] |
| ... | ... | ... |

### Edge probes (from ae-edge)
(populated during Phase 2 blocker-fix if ae-edge raised findings; omit section entirely otherwise)

### Files changed
- [list]

### Notes
[narrative]
````

**Instruction to implementer (added to commands/implement.md):**

> *Write AC Coverage from STORIES.md exactly. One row per AC. Tests column lists the specific tests that prove this AC, formatted as `file:test_name` so they're greppable. Use `<br>` between multiple tests per row. If you wrote a test that doesn't map to any specific AC (helper, smoke, framework boilerplate), don't add it to the matrix — orphans are surfaced by ae-test as informational findings.*

### Updated `commands/feature.md`

In the STORIES.md template emission, change:

```markdown
**Acceptance Criteria:**
- [ ] [criterion]
- [ ] [criterion]
```

to:

```markdown
**Acceptance Criteria:**
- [ ] AC-1: [criterion]
- [ ] AC-2: [criterion]
```

PROD emits AC with explicit 1-based labels. Numbering is sequential per story (not per feature, not global).

### Updated `agents/ae-test/AGENT.md`

Add a new step (Step 6) to the existing review workflow:

```markdown
## Step 6 — Matrix-vs-reality check

For the story being reviewed:

1. Read STORIES.md → extract AC list (with or without explicit AC-N labels; infer by position if absent)
2. Read PROGRESS.md → find the story's entry; locate `### AC Coverage` table
3. If `### AC Coverage` is absent → story is pre-matrix. Skip this step. Other coverage checks still apply.
4. If present:
   - Every AC from STORIES.md must appear as a row → missing = blocker
   - Every test in the matrix must exist (grep the test_name in the file referenced) → missing = blocker
   - Find tests in repo that aren't in the matrix or any sibling matrix → list as `should-cover` (informational)

Report the matrix check results in the existing `TEST — Coverage Report` output, under a new sub-heading:

```
Matrix:
  ✅ 3/3 AC mapped to tests (STORY-005)
  ⚠️ Orphan: tests/auth_test.py::test_helper_setup — not referenced by any matrix
```

If a blocker is found → emit in the `Missing coverage:` section of the existing report. Use blocker tagging consistent with peers.
```

### Updated `agents/ae-test/references/coverage-principles.md`

Add one section at the end:

```markdown
## AC Traceability

A story's `STORIES.md` AC list and its `PROGRESS.md` AC Coverage matrix should align 1:1:

- Every `AC-N` in STORIES.md → at least one row in the matrix
- Every test in the matrix → exists in the repo
- Tests not in any matrix → informational, not a blocker (helpers, smoke, boilerplate, cross-cutting tests)

Missing-AC blockers and stale-test blockers belong in the matrix-check, not in scenario-coverage feedback. They're structural — not "you forgot to test edge case X" but "you claimed test X covers AC-2, and either X doesn't exist or AC-2 isn't in your matrix."

Stories shipped before this convention (no `### AC Coverage` heading in PROGRESS.md) skip the matrix check. Apply scenario-coverage review as usual.
```

### Updated `commands/status.md`

Optional: when rendering each feature's row, add a one-liner showing coverage rollup:

```
[Feature Name] — in-progress
  Completed: 5 / 8 stories
  Tests: 18/20 AC mapped across 5 shipped stories (90% · 2 gaps)
```

The rollup is calculated by reading every shipped story's PROGRESS.md, parsing the AC Coverage table, counting rows that have non-empty Tests cells, comparing against the AC count from STORIES.md. Stories without a matrix (pre-convention) count their AC as "unknown" and are excluded from both numerator and denominator.

This is a nice-to-have, not load-bearing. Defer if it complicates the implementation plan.

### Updated `commands/feature.md` AC emission

When PROD generates STORIES.md, AC are labeled `AC-1:`, `AC-2:`, etc. The format is:

```markdown
**Acceptance Criteria:**
- [ ] AC-1: [criterion text]
- [ ] AC-2: [criterion text]
```

If PROD is updating an existing STORIES.md and the story already has unlabeled AC, PROD does NOT retro-label. New stories get labels; old stories stay as-is. The matrix check handles both via the position-inference rule.

### Updated `adapters/AGENTS.md.template`

One paragraph inside the marker block, describing the matrix convention for non-Claude tools:

```
Every shipped story records an **AC Coverage matrix** in `./docs/features/<name>/PROGRESS.md`. The matrix is a markdown table listing every Acceptance Criterion (AC-1, AC-2, ...) from `STORIES.md` and the specific tests that prove it (formatted `file:test_name`). When ae-edge probes find edge-case blockers, the implementer also appends an `Edge probes` table. During `/review`, the test-coverage reviewer (`ae-test`) validates that every AC has at least one test entry and every claimed test exists — missing AC or stale entries become review blockers. Matrix is read-only at review time; only `/implement` and Phase 2 blocker-fix mutate it.
```

### Updated `README.md`

Single sentence in the `/ship` description or wherever STORIES.md / PROGRESS.md is described:

> Every shipped story writes an **AC Coverage matrix** to `PROGRESS.md`, mapping each Acceptance Criterion to the tests that prove it. `ae-test` validates the matrix against reality during `/review` — missing AC or stale test references become blockers.

---

## Data flow

```
/feature
  ↓ PROD emits STORIES.md with AC-1, AC-2, AC-3 labels
  ↓ User reviews

/ship (or /implement)
  ↓ Phase 1: ARCH plans, implementer writes tests + impl
  ↓ Phase 1 end: implementer writes PROGRESS.md including:
      - AC Coverage table (one row per AC from STORIES.md)
      - Files changed
      - Notes
      - (Edge probes table starts empty — added in Phase 2)

/review (= Phase 2 of /ship)
  ↓ Six-agent parallel batch (ae-red, ae-req, ae-test, ae-doc, ae-sec, ae-edge)
  ↓ ae-test executes the matrix check:
      - Match every AC from STORIES.md
      - Verify every test reference exists in repo
      - Surface orphan tests (informational)
  ↓ Consolidate findings into review output
  ↓ Blockers (including missing-AC + stale-test) pause the chain

If Phase 2 surfaces ae-edge findings → blocker-fix step:
  ↓ Implementer fixes the edge cases (writes failing tests + fixes impl)
  ↓ Implementer ALSO appends fixed-probe rows to "Edge probes" table in PROGRESS.md
  ↓ Review re-runs (existing pattern)

Phases 3-6 unchanged.
```

---

## Composition with existing features

### With `/focus` and `--auto`

- `/focus` and `--auto` are unaffected. Matrix is an artifact within `/ship` Phase 1; it doesn't interact with focus pointer or auto-mode checkpoints.
- Matrix-related blockers from `ae-test` follow hard-override #1 (review blockers always pause under `--auto`). Same as today.

### With `/ship-all`

- Each story in the chain runs `/ship` which now writes the matrix. No change to `/ship-all` machinery.
- Mid-chain compact between stories preserves matrix state (it's persisted to PROGRESS.md, not in conversation).

### With `ae-edge` (the agent shipped in the prior spec)

- ae-edge runs in Phase 2 as the 6th reviewer. When it finds blockers, the blocker-fix step now has two responsibilities:
  1. Fix the implementation (existing behavior)
  2. Append a row to the Edge probes table in PROGRESS.md (new)
- The Edge probes table is **not** validated by ae-test's matrix check — it's narrative, not contract. ae-test only validates the AC Coverage table.

### With `ae-test`'s existing coverage review

- The new matrix check is **additive**. ae-test still reviews scenario types, error paths, edge cases, test quality. The matrix check is a structural pre-check (does the claimed coverage match reality?); the existing checks are content review (is the actual coverage good?).
- Both can produce blockers. Both feed into the same `TEST — Coverage Report:` output, but in distinct sub-sections.

---

## Error handling

| Condition | Behavior |
|---|---|
| PROGRESS.md has `### AC Coverage` but it's empty or malformed | Treat as missing → ae-test blocker. Implementer must fix during blocker-fix step. |
| STORIES.md has 5 AC, matrix has 3 rows | 2 missing AC → blocker. Listed by AC-N in the review output. |
| Matrix row references `tests/foo_test.py::test_x` but neither the file nor the function exists | Stale → blocker. Possible causes: renamed test, deleted test, typo. |
| Story is pre-matrix (no `### AC Coverage` heading) | Skip the matrix check. Run existing coverage checks as usual. Don't auto-generate a matrix retroactively. |
| AC list in STORIES.md uses unlabeled `- [ ] criterion` (legacy) | Infer AC numbering by 1-based position. Matrix entries reference AC-1, AC-2, etc. by inferred index. |
| Test row contains `<br>`-separated multi-test entries | ae-test splits on `<br>` and validates each test independently. Empty entries between `<br>` markers → warning (not blocker). |
| Same test appears in multiple rows (one test covers multiple AC) | Allowed. Not flagged. |
| Same test appears in matrix AND Edge probes table | Allowed — ae-edge probes can also cover AC. Not flagged. |
| Story has 0 AC in STORIES.md (rare — refactor stories, chores) | Matrix is empty. ae-test treats this as valid (nothing to validate). Existing scenario-coverage checks still run. |

No error condition in the matrix check should crash the parallel batch — failures are reported as blockers and surface to the user via the existing review flow.

---

## Discoverability touchpoints

| File | Change |
|---|---|
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | PROGRESS.md template now includes AC Coverage + Edge probes tables |
| `agentic-engineering/skills/agentic-engineering/commands/feature.md` | STORIES.md template emits AC with explicit AC-N labels |
| `agentic-engineering/agents/ae-test/AGENT.md` | Add Step 6 "Matrix-vs-reality check" |
| `agentic-engineering/agents/ae-test/references/coverage-principles.md` | Add "AC Traceability" section |
| `agentic-engineering/skills/agentic-engineering/commands/status.md` | Optional rollup line per feature |
| `agentic-engineering/adapters/AGENTS.md.template` | One paragraph inside marker block |
| `agentic-engineering/README.md` | One sentence in the `/ship` or PROGRESS.md description |

**No changes to:** `install.sh`, `USER_COMMANDS`, any wrapper file, `commands/ship.md`, `commands/ship-all.md`, `commands/review.md`, `commands/fix.md`, `commands/focus.md`, `commands/next.md`, `commands/design.md`, `commands/init.md`, `commands/bootstrap.md`. No new files, no new commands, no new agents.

---

## Verification

No automated tests in this plugin. Verification by inspecting installer + exercising in a scratch project.

1. **Installer round-trip:** `bash install.sh` writes the updated `~/.claude/skills/agentic-engineering/commands/implement.md`, `commands/feature.md`, etc.
2. **Scratch project exercise (deferred to user — needs Claude Code restart):**
   - Run `/init` to scaffold
   - Run `/feature test-feature`
   - Inspect generated STORIES.md → AC has explicit AC-N labels
   - Run `/ship STORY-001` against a minimal story
   - Inspect PROGRESS.md → contains AC Coverage table
   - Manually corrupt the matrix (delete an AC row), re-run `/review` → ae-test should report a blocker
   - Restore matrix, add a test in repo that isn't referenced → re-run `/review` → orphan flagged as informational, not blocker
3. **Backward compat check:** create a story with unlabeled AC + no `### AC Coverage` in PROGRESS.md → run `/review` → ae-test should NOT report a matrix-related blocker (pre-matrix story).
4. **Adapter round-trip:** `bash install.sh --tool=cursor --skill=agentic-engineering` into a scratch dir → confirm AGENTS.md marker block contains the new AC Coverage paragraph.

---

## Risks and open questions

**Risk: implementer forgets to write the matrix.** Mitigation: ae-test's matrix-check is a blocker for new stories. The first `/review` after this lands will fail loudly until the implementer writes the matrix. Self-correcting via the existing blocker-fix flow.

**Risk: test references in the matrix go stale silently.** Mitigation: ae-test greps for the test_name in the referenced file. If neither file nor function exists → blocker. Re-running review catches drift introduced by refactors. Not perfect (won't catch test that exists but no longer covers the AC — content review handles that) but catches the obvious cases.

**Risk: `<br>`-separated test lists in a markdown table are awkward.** Acceptable trade-off — keeps the table greppable in plain text while rendering as line breaks in GitHub. Alternative (one row per AC × test combination) bloats the table. Going with `<br>` for v1.

**Risk: orphan tests get spammy.** A project with cross-cutting tests (smoke, framework boilerplate, helper modules) will have many orphans. Mitigation: orphans are informational only, not blockers; ae-test reports them in a should-cover sub-section that can be skimmed past. If noise is bad in practice, add a heuristic later: orphan with `_helper`, `_smoke`, `conftest`, `fixtures` in name → skip from informational output.

**Open question deferred to implementation:** does `/feature` retroactively label old AC when updating an existing STORIES.md? Decision: **no.** Don't churn existing files. New AC get AC-N labels; old AC stay unlabeled and are referenced by position. Document this as a known idempotency rule.

**Open question deferred to implementation:** what test-identifier format is canonical for each language/framework? Examples:
- pytest: `tests/auth_test.py::test_login_redirects`
- jest: `tests/auth.test.ts > login > redirects on success` or `tests/auth.test.ts::test_login_redirects` (variant)
- go test: `auth/auth_test.go::TestLoginRedirects`

Decision: use the format that the project's test runner outputs natively (i.e., what `pytest`/`jest`/`go test` prints for a failing test). The implementer infers from the test runner. Document examples for the common frameworks in `coverage-principles.md` "AC Traceability" section.

---

## Out of scope (explicit, for clarity)

- `/qa` command (rejected during brainstorming)
- Test file tagging convention `[STORY-XXX:AC-N]` (rejected — implementer knows the mapping)
- `TRACEABILITY.md` per feature (rejected — PROGRESS.md is the natural home)
- `AC-MAP.json` structured mapping (rejected — markdown idiom)
- Verification pyramid (deferred to follow-on)
- Demo-runner integration (out of scope)
- Auto-tagging tests (out of scope — implementer discipline)
- Retroactive matrix fill for already-shipped stories (out of scope — backward compat handled)
- AC reuse across stories (out of scope — each story is independent)
- Cross-story coverage rollups beyond `/status`'s optional one-liner (out of scope — wait for `/qa` revisit if needed)
