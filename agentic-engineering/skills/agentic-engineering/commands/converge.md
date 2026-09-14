## `/converge [feature]` — Spec ↔ Code Convergence Audit

**Goal:** Answer the one question `/review` never asks — *does the shipped code actually deliver the whole feature?*

`/review` is diff-scoped and story-scoped — one story's diff, then done. Nobody ever compares `PRD.md` against the repo. `/status` counts checkboxes the same process wrote. `/converge` closes that loop.

**Agents:** ARCH (lead), REQ (constitution lens)

**Runs in the parent, not as subagents.** Greps codebase, may run test suite, writes `STORIES.md` — subagents have no Bash and cannot call `AskUserQuestion`. See "Agent Roster" in `SKILL.md`.

**Read-only against every artifact except `STORIES.md`.** Never edits `PRD.md`, never edits code, never renumbers or unchecks an existing story. It appends.

**Inputs (read first):**
- `./docs/INDEX.md` — resolve the feature; `mode:` decides the inventory source
- `./docs/features/[feature-name]/PRD.md` — the `FR-N` acceptance criteria
- `./docs/features/[feature-name]/STORIES.md` — `Implements:` lines, AC, checkbox state
- `./docs/features/[feature-name]/PROGRESS.md` — AC Coverage matrices, files changed
- **Project memory** — run **§D** of `shared/preamble.md`

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header: `/converge <feature> --auto`.

### Step 0b — Resolve feature and mode

`$ARGUMENTS` names a feature → use it. Bare call → the feature marked `in-progress` in `INDEX.md`; more than one → `[ASK: single]` to pick.

Read `mode:` from `./docs/INDEX.md` frontmatter. See `shared/project-mode.md`.

| Mode | Inventory unit |
|---|---|
| `full` | `FR-N` from `PRD.md` |
| `lite` | `AC-N` of each **checked** story in `STORIES.md` — no PRD exists, never invent FRs |

Feature is `archived` → print `[feature] is archived — PRD and stories are gone. Nothing to converge against.` and exit. No `./docs/INDEX.md` → `Run /init first.`

No PLAN. Single-phase audit, same family as `/analyze` and `/status`.

---

### Phase 1 — Build the intent inventory

One row per inventory unit. Resolve each to the code that should exist.

```
FR-4  claimed by: STORY-002 [x], STORY-005 [ ]
      scope: src/auth/session.ts, src/auth/refresh.ts   (PROGRESS.md "Files changed")
      tests: tests/auth.spec.ts::refreshes_expired      (PROGRESS.md AC Coverage)
```

Scope comes from what the artifacts **name** — `Files changed`, the AC Coverage matrix, paths in ARCH's recorded plan. Nothing named → derive keyword locations from FR text, label scope derived, not declared. An audit that wanders the whole repo reports noise.

FR claimed by no story at all → scope is empty. That is itself a finding (Phase 2, planning gap).

### Phase 2 — Assess and classify

For each inventory unit, inspect its in-scope code. Classify:

| Gap type | Means |
|---|---|
| `missing` | required behavior absent entirely |
| `partial` | code exists, does not fully satisfy the unit |
| `contradicts` | code conflicts with the FR, or with a CONSTITUTION.md MUST |
| `unrequested` | code in scope that no FR asked for |

**Distinguish unbuilt from undelivered. Whole discipline of this command.**

| State | Finding? |
|---|---|
| FR mapped **only** to unchecked stories, code absent | **No finding.** Work is queued and tracked correctly. Count it in the summary as *pending*, never as a gap |
| FR mapped to a **checked** story, code `missing` or `partial` | **Blocker.** A false completion claim — the checkbox says shipped and the repository disagrees |
| FR with **no story at all** | **Blocker.** Planning gap. Stage 3's FR coverage gate catches these at plan time; this one arrived when someone appended to `PRD.md` afterwards |
| `contradicts` an FR or a constitution MUST | **Blocker.** Constitution violations are never downgraded — see `SKILL.md` Core Principles |
| `unrequested` | **Should-fix**, reported for awareness. **Never generates a story** — the fix may be to delete it, and converge does not decide that |

Reporting queued work as a gap is the failure mode that makes this command worthless. A feature two stories into a ten-story plan must converge clean.

**Severity is the same three buckets as `/review`** — Blocker, Should-fix, Won't-fix. Never `CRITICAL`/`HIGH`/`MEDIUM`/`LOW`, never a fourth bucket. A finding matching a prior `./docs/improvements.md` entry → Won't-fix, "previously logged [date]".

**Evidence, or not a finding.** Every row cites `file:line`, or names what was searched and came back empty. "Probably not implemented" is not a finding — grep and say so.

### Phase 3 — Report

```
━━━ CONVERGE: [feature-name] ━━━

Inventory: N FRs · M delivered · P pending (queued in unchecked stories)

Blockers:
1. FR-4 — partial — STORY-002 checked, but refresh path never revokes the old token
   evidence: src/auth/refresh.ts:61 issues without revoking; no test covers revocation
   remaining: revoke prior token on refresh + regression test

2. FR-7 — missing — no story claims it
   evidence: grepped src/ for `export`, `retention` — nothing
   remaining: plan and ship the export path

Should-fix:
1. unrequested — src/auth/impersonate.ts:1-88 — no FR asks for impersonation
   (reported only — converge writes no story for unrequested code)

Won't-fix:
1. [finding] — previously logged YYYY-MM-DD

Converged:
- FR-1, FR-2, FR-3, FR-5 — code + tests present, match criterion
- FR-6 — pending, STORY-008 unchecked (not a gap)
```

Cap each list at 5 per `SKILL.md` Human-Facing Output Rules #3 — `+N more` and the full report at `./docs/features/[feature-name]/reviews/converge-YYYY-MM-DD.md`.

Clean run → print the Converged block and stop. Do not append an empty section to `STORIES.md`.

### Phase 4 — Append remaining work

Blockers with remaining work become stories. Draft them first, show them, **then** gate.

⚠️ **Human checkpoint** `[ASK: single]` `[AUTO: ask-if-ambiguous]`: *"Append N stories to STORIES.md?"* → **Append all (Recommended)** · **Pick which** · **Report only**. Second option → `[ASK: multi]` follow-up listing the drafts.

Under `--auto`: append silently when every finding is `missing` or `partial` against a defined FR — those are unambiguous. Any `contradicts` finding → `[AUTO: always-ask]`. Fix may be the PRD, not the code — not converge's call.

Appended story shape — the Stage 3 template plus one provenance line:

```markdown
- [ ] STORY-014: Revoke prior token on refresh
  **As a** signed-in user, **I want** my old session token to stop working after refresh **so that** a stolen token expires
  **Priority:** P1
  **Implements:** FR-4
  **Acceptance Criteria:**
  - [ ] AC-1: refresh revokes the prior token
  - [ ] AC-2: request with a revoked token returns 401
  **Notes:** converge finding — src/auth/refresh.ts:61
  **Parallel:** no — same file as STORY-002
  **Source:** converge YYYY-MM-DD
```

Rules:
- Continue the feature's existing `STORY-NNN` numbering. Never reuse a retired number.
- Inherit `Priority:` from the FR's original story. FR with no story → `P1`; a requirement nobody planned is not optional.
- `Source:` marks it converge-generated so `/status` and the next converge can tell it from planned work.
- Append under a `## Convergence — YYYY-MM-DD` heading. Never interleave with planned stories, never reorder them.

**GIT** commits: `chore([feature-name]): append convergence stories`. Report-only → no commit.

### Step N — Auto-mode summary

Run **§C** of `shared/preamble.md`.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Feature ambiguous (several in-progress) | untagged → `always-ask` |
| Append N stories to STORIES.md | `[AUTO: ask-if-ambiguous]` — silent append when all findings are `missing`/`partial` on a defined FR |
| Any `contradicts` finding in the set | `[AUTO: always-ask]` — escalates from the row above |

`Next:` — blockers appended → `/ship-all` to close them. Clean → `/archive [feature]` if every story is checked, else `/status`.

### Gotchas

- **Unbuilt is not undelivered.** Reporting queued stories as gaps is the main failure mode. Check the checkbox before classifying.
- **A checked story with no matching code is the finding converge exists for.** Everything else `/review` would have caught. Treat it as the primary signal, not an edge case.
- **`Implements:` is a claim.** A story citing FR-4 proves only that someone intended to deliver FR-4. Read the code.
- **Never fix anything.** Converge assesses and appends. The fix runs through `/ship` or `/fix` with a full review behind it — a repair applied inline here ships unreviewed.
- **Never edit `PRD.md`.** Code contradicting a requirement is a blocker, not a reason to rewrite the requirement to match what was built. That is the loop this command exists to break.
- **Don't re-derive scope the artifacts already declare.** `Files changed` in `PROGRESS.md` is the scope. Keyword search is the fallback for FRs nobody recorded, and it gets labelled as derived.
- **Run it before `/archive`, not after.** `/archive` deletes `PRD.md` and `STORIES.md`; the inventory goes with them.
- **Lite mode has no FRs.** Audit checked stories' `AC-N` against code. Never invent FR ids to have something to cite.
- **Test runners non-watch mode** if converge runs the suite to confirm a claim. See `SKILL.md` "Test Execution Rules."

---
