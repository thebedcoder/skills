# Story flow — plan → pre-review → build → verify → record

One story, end to end. Run by `/implement` standalone and by `/ship` Phase 1 (and so by every `/ship-all` story). The caller owns PLAN, focus and release; this file owns the work.

**Main session = orchestrator.** It holds artifacts, not work: the plan comes from `ae-arch` (session model), the code from `ae-impl` (Sonnet by default), each in a fresh context of its own. The main session never writes source or test files in this flow — doing so is the role-play failure by hand, and `/diagnose` flags it.

## Constraints
- No code before the plan clears: PROD validation done, pre-review findings resolved, no open escalation
- No code while a Contract claim is unproven — assertion is not proof
- Tests drive implementation — the red run is recorded before code exists
- No files outside the plan — scope creep forbidden
- Story ticked only when every AC is verified **and** `evidence.sh check` says `fresh` — ledger-verified, this code

## 1 · Plan — `ae-arch`, session model, fresh context

Dispatch `agentic-engineering:ae-arch`. No `model` parameter: its `model: inherit` runs it on the session's own model. Prompt carries paths, not content:

- `mode: story`, the story id, the plugin root
- `docs/features/<feature>/STORIES.md`, `PRD.md` (full mode), `docs/CONSTITUTION.md`, `docs/MEMORY.md`, `./CLAUDE.md`
- the `DECISIONS.md` titles from §D, pasted (it is the one list worth inlining — a few lines)
- `docs/specs/<feature>-design.md` when the story has UI
- `PROGRESS.md` when the story's `Notes:` names a dependency

It returns the plan (format in `agents/ae-arch.md`): Contract claims with proof, Failure states, files, test plan with red and full test commands, precedent, frontend block for UI stories, escalations, implementer tier, proportion. **Print it** — when a human reads it, the Human-Facing Output Rules apply.

**PROD — Plan Review** (inline):

```
PROD — Plan Review:
[Does plan deliver every acceptance criterion? Any AC with no test-plan line?
Any scope in plan not in story?
Is every Contract claim backed by file:line or real probe output — not by assertion?
Does the Failure states table cover every step that can fail, or is it missing one?
Proportional? Function bodies in plan, or sections bigger than the story needs → trim.]
```

Small gaps → PROD amends the plan text itself. A missing AC, an unproven claim, a wrong approach → re-dispatch `ae-arch` once with `replan:` + PROD's note. Second miss → escalation gate below.

**Brief.** Write `.agentic/briefs/<STORY-ID>.md` — working state, gitignored with the rest of `.agentic/`:

```markdown
# Brief: STORY-XXX — [title]
feature: [name] · dir: docs/features/[name]/
mode: build
implementer tier: [haiku | sonnet]
approved: [hard-override operations the human approved at the gate below, or none]

## Story
[the story block from STORIES.md, verbatim]

## Plan
[ARCH's plan as amended by PROD and pre-review]
```

A parallel build adds `base:`, `branch:` and `setup:` header lines (`shared/parallel-build.md` §P2).

**Pre-review.** Dispatch `agentic-engineering:ae-red` and `agentic-engineering:ae-sec` in **one message**, against the plan — **not** the codebase. Both have a **Mode B — Plan pre-review** section; say "Mode B" so they skip their diff step. Pass the brief path; each reads only the story, its AC, the Contract claims and the Failure states. Prompt both with:

> Attack this plan's model of the world, not its style. For each Contract claim:
> does the cited `file:line` actually say what the claim says, and is the claim's
> *converse* also consistent with it? For the Failure states table: name a failure
> point it omits, or a row whose per-resource state is wrong. Report only what you
> can point at. "Looks fine" is a valid finding.

Skip when the plan has no Contract claims **and** no Failure states — emit `SKIPPED: pre-review (no external contract, no partial state)`. Never a checkpoint, never pauses, runs under `--auto`. Findings amend the brief's plan before any code is written.

**Escalation gate — the only stop in this flow.** There is no plan-approval gate: stories were approved in planning, and the plan is printed above. The gate fires only when:

1. the plan's `Escalations:` is not `none` — new dependency, public interface change;
2. pre-review left an unresolved finding on a Contract claim — proceeding on a disputed claim is how a cluster of defects forms;
3. the plan needs a hard-override operation (`shared/auto-mode.md` #2 — migration creating/dropping tables, CI config, secrets, >10 deletions, force-push) → `HARD-PAUSE`;
4. required project state is missing — no test framework, a UI story with no design handoff (#4) → `HARD-PAUSE`;
5. PROD's second replan still misses.

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: print the escalation(s), then *"STORY-XXX's plan needs your call. How should it go?"* → **Approve the plan (Recommended)** · **Revise it** · **Stop here**. Revise → `[ASK: prose]` for what to change → re-dispatch `ae-arch` with `replan:`. Approve on a hard-override item → list it under `approved:` in the brief; the implementer refuses anything not listed there.

## 2 · Build — `ae-impl`, fresh context

**Tier.** ARCH proposes; the orchestrator decides:

| Tier | When |
|---|---|
| `haiku` | **all** hold: no Contract claims, no Failure states, ≤3 files, no new module or public interface, change copies a precedent cited by `file:line` |
| `sonnet` | everything else — the default |
| session model | fix round 3 (`shared/fix-loop.md`), or a retry after `BLOCKED` on capability |

Session model = the `model` value naming the session's own family (`opus` when unsure). Write the tier into the brief header; the implementer copies it into `PROGRESS.md` as `Implementer:`.

Dispatch `agentic-engineering:ae-impl` with `model: <tier>`, in the foreground (`run_in_background: false` where the harness offers it) — the chain waits on it. Prompt: `brief: .agentic/briefs/<STORY-ID>.md`, `mode: build`, `plugin root: ${CLAUDE_PLUGIN_ROOT}`. Nothing else — no paraphrase of the story; the brief has it.

It writes tests, records the red run, implements, records the green run, appends the story's `PROGRESS.md` entry (template in `agents/ae-impl.md`), writes `.agentic/briefs/<STORY-ID>.report.md`, and returns ≤12 lines:

| Status | Orchestrator does |
|---|---|
| `DONE` · `DONE_WITH_CONCERNS` | Verify (§3). Concerns go to `### Notes` or `BACKLOG.md` — never fixed "while there" |
| `NEEDS_PLAN_CHANGE` | Re-dispatch `ae-arch` with `replan:` + the implementer's note; PROD re-validates; the escalation gate applies to the amended plan; fresh `ae-impl`. Second time for one story → escalation gate |
| `BLOCKED` on a hard-override item | `HARD-PAUSE` — escalation gate |
| `BLOCKED` on capability (third red full-suite run) | One retry: fresh `ae-impl` on the session model, with the report path. Still blocked → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"The implementer is stuck on STORY-XXX: [one line]. How do you want to proceed?"* → **Work it through together (Recommended)** · **Skip this story** · **Stop here** |

## 3 · Verify — mechanical, in the main session

Never take the report's word.

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh check docs/features/<feature>/PROGRESS.md <STORY-ID>
git status --porcelain
```

- Verdict must be `fresh`. Anything else → resume the implementer once (`SendMessage` to its agent id when the harness has it, else fresh `ae-impl` with brief + report) to produce a real run. `unverified` = a typed or edited row: say so plainly.
- `red=missing` → note it; REQ reports it in review. Not a stop.
- Files changed vs the plan's lists → a file outside the plan goes back to the implementer once: revert it, or justify it in the report. Justified → PROD rules on it, recorded in `### Notes`.

Then PROD checks each AC, reading only the tests the report's `AC → tests` map names:

```
PROD — Acceptance Check:
- [ ] AC-1: met / not met — [evidence: file:test_name]
- [ ] AC-2: met / not met — [evidence]
```

Not met → back to the implementer as a fix round (`shared/fix-loop.md` with PROD as the source agent).

## 4 · Record

- `PROGRESS.md` entry: written by the implementer. The orchestrator adds only `### Visual Artifacts` rows (capture, below) and `### Edge probes` rows (Phase 2 fixes).
- **Only then** tick the story `- [x]` in `STORIES.md` — the orchestrator, last. No `fresh` verdict → box stays empty.

**Visual Artifacts.** UI story → screenshots or recordings per AC in `docs/features/<feature-name>/artifacts/STORY-XXX/`, one row per capture:

```markdown
### Visual Artifacts
| AC | Type | File | Notes |
|----|------|------|-------|
| AC-1 | screenshot | artifacts/STORY-XXX/ac-1-name.png | [scenario / viewport / browser] |
```

`Type` informational (`screenshot` / `video` / `animated-gif` / `loom-link` / `youtube-link`); `File` = path from repo root or URL. Omit the section for backend-only or CLI-only stories. `ae-ux` validates the references during `/frontend`. Rows auto-appended by a capture tool → `shared/visual-capture.md` (loaded only when `.claude/visual-capture.md` exists).

Standalone `/implement` → *"Story complete. Run `/review` before next story."* Nested → parent continues to its review phase.

## Gotchas

- **No plan skip for small stories.** File list + test plan required. Skip → pattern-match → wrong arch.
- **The main session writes no source here.** Not "just this one small fix" — that is the context this flow exists to keep clean, and the work nobody reviews as the implementer's.
- **A report is a claim.** `DONE` with a typed evidence row reads `unverified`; `DONE` with an out-of-plan file is scope creep with a nice summary. Verify mechanically, every story.
- **Criteria are checks, not goals.** Satisfies all but feels wrong → PRD incomplete. Flag it, don't ship on technicality.
- **A green suite is not evidence of a correct model.** Tests written from a wrong belief encode it and pass. Only the *real* collaborator, or a fixture chosen to break the claim, is evidence.
- **Contract claims are not Risks.** Risks might go wrong later; a claim is asserted true *now* and the code is built on it. "I'm assuming X" under Risks is the failure this section replaces.
- **Haiku is for copies, not decisions.** A story with any Contract claim is never Haiku-tier, however small its diff.
- **Pre-review does not replace review.** It moves contract errors earlier. The review tier stays.
