# Story flow — plan → pre-review → implement → verify → record

One story, end to end. Run by `/implement` standalone and by `/ship` Phase 1 (and so by every `/ship-all` story). The caller owns PLAN, focus, the start gate's position and release; this file owns the work.

## Constraints
- No code before plan approved
- No code while a Contract claim is unproven — assertion is not proof
- Tests drive implementation (red → green) — never written after
- No files outside ARCH's explicit plan — scope creep forbidden
- Story marked complete only when all acceptance criteria verified **and** a fresh green evidence row is in `PROGRESS.md` — test command run in this phase, on this code

## Flow

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
later, and "it was in the plan" is unverifiable once the session ends. `ae-doc` checks
for it by name — its "Persisted plan artifacts" rule.

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

**Verify.** Full suite first, through the evidence script, from the repo root — non-watch (SKILL.md "Test Execution Rules"):

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh run --phase implement -- <project test command>
```

Last line = `EVIDENCE-ROW: | implement | … | exit N · <runner summary> | <time> | <tree> |`. Exit ≠ 0 → not done: fix, re-run, new row. Keep the green row for Record. Tree id = fingerprint of the code it ran on (docs excluded) — any later code edit makes the row stale, and `/review` checks.

Then PROD checks each acceptance criterion:

```
PROD — Acceptance Check:
- [ ] Criterion 1: met / not met — [evidence: file:line or test name]
- [ ] Criterion 2: met / not met — [evidence]
```

**Record.** Update docs — evidence first, checkbox last:
- Append to `PROGRESS.md` (the `### Evidence` row pasted verbatim from the script, `EVIDENCE-ROW: ` prefix dropped):

```markdown
## STORY-XXX: [Title] — [date]

### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | [from STORIES.md] | [file:test_name<br>file:test_name] | [unit|integration|e2e] |
| AC-2 | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |
| AC-N | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |

### Evidence
| Phase | Command | Result | Run at | Tree |
|-------|---------|--------|--------|------|
| implement | `npm test` | exit 0 · pass 14 · fail 0 | 2026-09-30 14:02 | 1a2b3c4d5e6f |

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

- Only then mark story `- [x]` in `STORIES.md`. No fresh green row → box stays empty.

**Filling the matrix:**
- One row per AC in `STORIES.md`. Match AC text exactly.
- Tests column lists tests that prove this AC, formatted as `file:test_name` — format test runner emits (`tests/foo.py::test_bar` for pytest, similar for jest/go-test/etc.). Multiple tests per AC → join with `<br>`.
- Wrote test that doesn't map to specific AC (helper, smoke, framework boilerplate)? Don't include it. Orphans surface as `ae-test` informational findings, not blockers.
- `### Edge probes` section starts EMPTY. Populated during the `/ship` Phase 2 blocker-fix when `ae-edge` raises findings. Omit section entirely if `ae-edge` returned no findings for this story.
- Existing `Files changed` + `Notes` unchanged from prior format.
- `### Evidence` — one row per evidence run, newest last, each pasted from `evidence.sh run` output. **Never hand-write a row, never copy one from an earlier phase or story.** Every later phase that changes code (review fixes, frontend) appends its own row; the newest row must match the code under review. Entries written before this section existed stay valid — REQ only gates stories checked in the diff it reviews.

**Level column:** Each matrix row declares one Level: `unit`, `integration`, or `e2e`.
- `unit` — single function/class, no I/O, no network, no DB, no FS, no real time. Mocks for collaborators OK.
- `integration` — multiple components in-process, mocked or local-only external boundaries.
- `e2e` — full system, real network/DB/UI driver, end-to-end user flow.

If row's tests span multiple levels → split into multiple matrix rows (same AC, same Description, different Tests + Level cells). Multiple rows per AC is allowed — AC contract is "≥ 1 row per AC."

Projects that need other levels (`contract`, `smoke`, `perf`) can use them — `ae-test` accepts value but excludes row from pyramid math.

**Visual Artifacts:** For UI-touching stories, capture screenshots or recordings of each AC's behavior. Drop files in `docs/features/<feature-name>/artifacts/STORY-XXX/`. Reference each capture as row in Visual Artifacts table — multiple rows per AC fine (different viewports, scenarios). `Type` informational (`screenshot` / `video` / `animated-gif` / `loom-link` / `youtube-link`). `File` relative path from repo root OR URL (Loom, Notion, YouTube). `Notes` freeform — viewport, browser, scenario.

Omit entire `### Visual Artifacts` section for backend-only or CLI-only stories. `ae-ux` validates references during `/frontend` (it is not in `/review`'s batch) — missing / stale / empty file references emit `should-fix` warnings (informational unless CONSTITUTION.md requires artifacts).

**Rows auto-appended by a capture tool** → `shared/visual-capture.md` (loaded only when `.claude/visual-capture.md` exists).

Standalone `/implement` → prompt *"Story complete. Run `/review` before next story."* Nested → parent continues to its review phase.

## Gotchas

- **No plan skip for small stories.** File list + test plan required. Skip → pattern-match → wrong arch.
- **Claimed green without running.** "Tests pass" with no `evidence.sh` row from this phase is a claim, not evidence — output scrolled past in an earlier phase, a subset run, or "should pass now" all count as not run. REQ blocks a story checked without a fresh row.
- **Criteria are checks, not goals.** Satisfies all but feels wrong → PRD incomplete. Flag it, don't ship on technicality.
- **No pseudo-tests.** `assert result is not None` proves nothing. Every test must fail when logic broken.
- **A green suite is not evidence of a correct model.** Tests written by the author who holds the wrong belief encode that belief and pass. When a Contract claim is wrong, the suite agrees with the bug. Only the *real* collaborator, or a fixture chosen to break the claim, is evidence.
- **Contract claims are not Risks.** Risks are things that might go wrong later. A claim is something asserted as true *now* that the code is built on. Writing "I'm assuming X" under Risks and proceeding is the failure this section replaces — prove it or spike it.
- **A regression test that passes without its fix is not a regression test.** After fixing a review blocker, revert the fix, watch the new test fail, restore. Do it per-fix, not in a batch — a batch revert can leave a test passing for the wrong reason.
- **Pre-review does not replace review.** It moves the CONTRACT errors earlier. Do not shorten the review tier because the plan was pre-reviewed.
- **An unreachable branch gets a recorded gap, not a stubbed test.** If no real input can reach an error path, say so in `PROGRESS.md` with what you probed. A stub tests the stub. Never weaken a failing test until it passes.
