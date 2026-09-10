## `/implement` — Implement Next Story

**Goal:** Ship one story end-to-end — plan approved, code + tests written, acceptance criteria verified, progress recorded.

**Agents:** ARCH (plan), PROD (validation), `ae-red` + `ae-sec` (pre-review of the plan)

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- `./docs/INDEX.md` — current feature
- `./docs/features/[feature-name]/STORIES.md` + `PROGRESS.md` — find next unchecked story
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`. `/cleanup` writes these after every chain; a chain that never reads them is a write-only log

**Constraints:**
- No code before plan approved
- No code while a Contract claim is unproven — assertion is not proof
- Tests drive implementation (red → green) — never written after
- No files outside ARCH's explicit plan — scope creep forbidden
- Story marked complete only when all acceptance criteria verified

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/implement <STORY-ID> --auto`. Nested inside `/ship` → inherit the parent's flag.

### Step 0b — PLAN

Nested under `/ship` or `/ship-all` → **do not write a PLAN**; advance the parent's. The parent also owns the start gate — nested, this command's own gate does not fire.

Standalone → write one PLAN line per phase (plan · implement + tests · verify AC · record progress) into `.agentic/focus.md`. See "Progress Tracking" in SKILL.md. Mirror into a harness task list **if this session exposes one** — it is a convenience view, not the record. PLAN survives compaction and session end.


### Step 0 — Auto-write focus

Before planning, update `.agentic/focus.md`:

1. Run **§B step 1** of `shared/preamble.md` — creates `.agentic/` and gitignores it, idempotent.

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references this STORY-ID (likely because `/ship` or `/ship-all` set it as parent) → update `note:` to `phase: implementing` and `set_by:` to `/implement`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: <STORY-ID> — <story title>`, `feature: <feature-name>`, `since: [now]`, `set_by: /implement`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with the flow below.

### Flow

**Plan.** ARCH produces plan. PROD validates vs acceptance criteria.

```
ARCH — Implementation Plan: STORY-XXX

Contract claims:
  - [claim about behavior this story does not own]
    proof: [file:line] OR [probe command + its actual output]
Failure states:
  | Failure point | State of each affected resource | What the outcome reports |
  | [step that can fail] | [per-resource state] | [what the caller is told] |
Files to create:
  - [path] — [purpose]
Files to modify:
  - [path] — [what changes]
Functions / components:
  - [name] — [responsibility]
Test plan:
  - [scenarios to cover]
Edge cases:
  - [case 1]
Risks:
  - [anything that could go wrong]
```

**Contract claims — required.** Every behavior the story depends on but does not
own: another module's data shape, a syscall's semantics, a library's guarantee, a
language primitive's depth. Each needs `file:line` in the real source, or a probe
that was actually run with its actual output pasted in. Reasoning from the name of
a thing is not proof. "Obviously it does X" is the exact sentence this section
exists to catch — an unproven claim is a defect that ships silently, because code
built on a wrong belief still runs, still returns a plausible value, and still
passes tests the same author wrote from the same belief.

If a claim cannot be proven from source, spike it first: write the smallest program
that makes the system state the answer, run it, and paste the output. A spike that
*contradicts* the hypothesis has paid for itself several times over.

**Failure states — required whenever the story can fail partway.** Any commit,
rollback, migration, batch write, or multi-step mutation. Enumerate as a table
before writing code, because these bugs do not arrive one at a time: a reversal
path designed in prose and implemented ad hoc produces a *cluster* of defects, each
individually plausible, all found at once and late. Include the resource that was
never written, the one written then reverted, and the one that can be neither.

Omit the section only when no partial state is reachable — and say so explicitly
rather than dropping the heading.

**Both sections must be PERSISTED, not left in the plan.** A plan lives in the
conversation and dies with it. Copy the Contract claims and the Failure states
table into the story's `PROGRESS.md` entry during the Record step — claims with
their proofs, the table as written *before* implementation, plus any correction
implementation forced on them. A rule whose artifact vanishes cannot be audited
later, and "it was in the plan" is unverifiable once the session ends. This was
caught by `ae-doc` on the first story shipped under the rule: the table had been
written before coding, into a scratchpad, and no trace survived. `ae-doc` checks
for it by name — see its "Persisted plan artifacts" rule.

```
PROD — Plan Review:
[Does plan deliver every acceptance criterion?
Any criterion ARCH's plan doesn't address?
Any scope in plan not in story?
Is every Contract claim backed by file:line or real probe output — not by assertion?
Does the Failure states table cover every step that can fail, or is it missing one?]
```

**Pre-review.** Dispatch `agentic-engineering:ae-red` and `agentic-engineering:ae-sec`
in parallel against the plan — **not** the codebase. Both have a **Mode B — Plan
pre-review** section; say "Mode B" in the prompt so they skip their diff step. Each reads only: the story + its acceptance criteria, ARCH's Contract
claims, ARCH's Failure states. Prompt both with:

> Attack this plan's model of the world, not its style. For each Contract claim:
> does the cited `file:line` actually say what the claim says, and is the claim's
> *converse* also consistent with it? For the Failure states table: name a failure
> point it omits, or a row whose per-resource state is wrong. Report only what you
> can point at. "Looks fine" is a valid finding.

Skip when the plan has no Contract claims **and** no Failure states — a pure
function over owned types has no external model to be wrong about. Emit
`SKIPPED: pre-review (no external contract, no partial state)`.

This runs under `--auto`. It is not a human checkpoint and never pauses: it is the
same pair of reviewers that would find these defects after implementation, moved to
where a fix costs an edit instead of a full re-verify cycle. Findings amend the
plan before any code is written.

⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: confirm]`: Show plan, PROD review, and pre-review findings, then ask *"Start implementation?"* → Go / Stop. Under `--auto`: SKIP — emit `SKIPPED: plan approval (clear story, no ambiguous decisions in plan) [auto]` and proceed. Exception per hard-override #4: if plan introduces a new dependency or alters a public interface, treat as `[AUTO: always-ask]` instead. Second exception: if pre-review returned an unresolved finding on a Contract claim, treat as `[AUTO: always-ask]` — proceeding on a disputed claim is how the cluster forms.

**Implement.** Per plan. Write each test before code it covers — watch fail with meaningful error, then pass.

Where a Contract claim is load-bearing, the test that covers it must exercise the
*real* collaborator, not the author's model of it — a fixture that only contains
cases where the claim holds proves nothing. Pick the fixture that would expose the
claim being backwards.

**Verify.** PROD checks each acceptance criterion:

```
PROD — Acceptance Check:
- [ ] Criterion 1: met / not met — [evidence: file:line or test name]
- [ ] Criterion 2: met / not met — [evidence]
```

**Record.** Update docs:
- Mark story `- [x]` in `STORIES.md`
- Append to `PROGRESS.md`:

```markdown
## STORY-XXX: [Title] — [date]

### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | [from STORIES.md] | [file:test_name<br>file:test_name] | [unit|integration|e2e] |
| AC-2 | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |
| AC-N | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |

### Edge probes (from ae-edge)
| Category | Test |
|----------|------|
| [category] | [file:test_name] |

### Visual Artifacts
(omit for backend-only / CLI-only stories)
| AC | Type | File | Notes |
|----|------|------|-------|
| AC-1 | screenshot | artifacts/STORY-XXX/ac-1-name.png | [scenario / viewport / browser] |
| AC-2 | video | artifacts/STORY-XXX/ac-2-name.mp4 | [scenario / viewport / browser] |
| AC-N | [type] | [path or URL] | [notes] |

### Files changed
- [list]

### Notes
[anything notable — narrative continues here]
```

**Filling the matrix:**
- One row per AC in `STORIES.md`. Match AC text exactly.
- Tests column lists tests that prove this AC, formatted as `file:test_name` — format test runner emits (`tests/foo.py::test_bar` for pytest, similar for jest/go-test/etc.). Multiple tests per AC → join with `<br>`.
- Wrote test that doesn't map to specific AC (helper, smoke, framework boilerplate)? Don't include it. Orphans surface as `ae-test` informational findings, not blockers.
- `### Edge probes` section starts EMPTY. Populated during the `/ship` Phase 2 blocker-fix when `ae-edge` raises findings. Omit section entirely if `ae-edge` returned no findings for this story.
- Existing `Files changed` + `Notes` unchanged from prior format.

**Level column:** Each matrix row declares one Level: `unit`, `integration`, or `e2e`.
- `unit` — single function/class, no I/O, no network, no DB, no FS, no real time. Mocks for collaborators OK.
- `integration` — multiple components in-process, mocked or local-only external boundaries.
- `e2e` — full system, real network/DB/UI driver, end-to-end user flow.

If row's tests span multiple levels → split into multiple matrix rows (same AC, same Description, different Tests + Level cells). Multiple rows per AC is allowed — AC contract is "≥ 1 row per AC."

Projects that need other levels (`contract`, `smoke`, `perf`) can use them — `ae-test` accepts value but excludes row from pyramid math.

**Visual Artifacts:** For UI-touching stories, capture screenshots or recordings of each AC's behavior. Drop files in `docs/features/<feature-name>/artifacts/STORY-XXX/`. Reference each capture as row in Visual Artifacts table — multiple rows per AC fine (different viewports, scenarios). `Type` informational (`screenshot` / `video` / `animated-gif` / `loom-link` / `youtube-link`). `File` relative path from repo root OR URL (Loom, Notion, YouTube). `Notes` freeform — viewport, browser, scenario.

Omit entire `### Visual Artifacts` section for backend-only or CLI-only stories. `ae-ux` validates references during `/frontend` (it is not in `/review`'s batch) — missing / stale / empty file references emit `should-fix` warnings (informational unless CONSTITUTION.md requires artifacts).

**`(auto)` row marker:** When `/ship` Phase 3 dispatches a capture tool, rows it auto-appends to the Visual Artifacts table use a Notes prefix:

- `(auto, backfill scenario)` — capture matched an AC via test name; operator updates the Notes column with viewport / browser / scenario context
- `(auto, no test-match, backfill AC)` — capture didn't match any AC matrix Tests cell; operator corrects the AC column AND backfills scenario

Operator removes the `(auto, ...)` prefix from Notes once the row is reviewed and accurate. `ae-ux` doesn't validate Notes content — the marker is human-facing only.

Prompt: *"Story complete. Run `/review` before next story."*

### Step N — Release focus

If this `/implement` is **not** nested under `/ship` or `/ship-all` (detect by inspecting `set_by:` on CURRENT — if it contains `/ship` or `/ship-all`, the parent owns release):

- If invoked with `--auto` → run `/focus done auto` (auto-promotes NEXT silently per `commands/focus.md` Phase 3).
- Else → run `/focus done` (interactive prompt y/n/b).

If nested under `/ship` / `/ship-all` → skip; the parent handles release.

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Plan-approval ('go' to start) | `[AUTO: skip]` — proceed silently when plan has no new deps / interface changes |
| Plan introduces new library or alters public API | `[AUTO: always-ask]` — escalates from skip to ask |
| Pre-review disputes a Contract claim, unresolved | `[AUTO: always-ask]` — escalates from skip to ask |
| Pre-review itself (`ae-red` + `ae-sec` on the plan) | not a checkpoint — always runs, never pauses |
| Tests passing → commit | `[AUTO: skip]` — tests verify correctness; no user judgment needed |

### Gotchas

- **No plan skip for small stories.** File list + test plan required. Skip → pattern-match → wrong arch.
- **No test-after-implementation.** Test → watch fail → implement → watch pass. Test after proves nothing.
- **No files outside ARCH's plan.** Need new file? Update plan first. Never silently widen scope.
- **Complete ≠ implementation done.** Code works + tests pass + criteria verified + PROGRESS.md updated. Early mark = review on stale state.
- **Criteria are checks, not goals.** Satisfies all but feels wrong → PRD incomplete. Flag it, don't ship on technicality.
- **No pseudo-tests.** `assert result is not None` proves nothing. Every test must fail when logic broken.
- **A green suite is not evidence of a correct model.** Tests written by the author who holds the wrong belief encode that belief and pass. When a Contract claim is wrong, the suite agrees with the bug. Only the *real* collaborator, or a fixture chosen to break the claim, is evidence.
- **Contract claims are not Risks.** Risks are things that might go wrong later. A claim is something asserted as true *now* that the code is built on. Writing "I'm assuming X" under Risks and proceeding is the failure this section replaces — prove it or spike it.
- **A regression test that passes without its fix is not a regression test.** After fixing a review blocker, revert the fix, watch the new test fail, restore. Do it per-fix, not in a batch — a batch revert can leave a test passing for the wrong reason. Two "verified" fixes on the first story under this rule turned out to have one test that did not bite; the revert is what found it.
- **Pre-review does not replace review.** It moves the CONTRACT errors earlier. On the first story under this rule, pre-review found six plan defects and the six-agent pass still found six implementation defects, two of them security. Do not shorten the review tier because the plan was pre-reviewed.
- **An unreachable branch gets a recorded gap, not a stubbed test.** If no real input can reach an error path, say so in `PROGRESS.md` with what you probed. A stub tests the stub. Never weaken a failing test until it passes.

---
