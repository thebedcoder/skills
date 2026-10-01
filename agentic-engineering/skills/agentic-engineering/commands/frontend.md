## `/frontend` — Frontend Implementation

**Agents:** `ae-arch` (frontend plan — standalone only), `ae-impl` (build), `ae-ux` (fidelity), PROD (UX validation, inline)

Read `./CLAUDE.md`, target story, `./docs/specs/[feature-name]-design.md`.
No `/design` yet → prompt user to run it first or confirm proceeding without designs.

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/frontend <STORY-ID> --auto`. `/frontend` is normally nested inside `/ship`, which propagates `AUTO=true` down — inherit it when present rather than re-parsing.

### Step 0 — Auto-write focus

Run **§B** of `shared/preamble.md` — `title: frontend for <STORY-ID>`, `set_by: /frontend`. Almost always nested in `/ship`: CURRENT already names the story → only `note: phase: frontend pass` + `set_by:` change.

### Steps

**Main session orchestrates** (`shared/story-flow.md` rules): the plan comes from `ae-arch`, the code from `ae-impl`; the main session writes no component code.

1. **Plan.**
   - Nested in `/ship` → the brief `.agentic/briefs/<STORY-ID>.md` already holds the `Frontend:` block `ae-arch` wrote in Phase 1. No second planning pass.
   - Standalone, or the brief has no `Frontend:` block → dispatch `agentic-engineering:ae-arch` with `mode: frontend`, the story id, `STORIES.md`, the handoff spec, `CONSTITUTION.md`, `CLAUDE.md`, plugin root. Write or extend the brief with its plan.

2. **PROD** reviews the frontend plan vs the user flow:
```
PROD — UX Review:
[Does this deliver every screen + state in handoff?
Any interaction state missing — loading, empty, error?
Any shortcut diverging from approved design?]
```

No approval gate — the design was approved in `/design`. Escalations only (`shared/story-flow.md` §1): a new UI dependency, a public interface change. No design handoff spec exists → HARD-PAUSE regardless of tag (hard-override #4) — never build UI against no design.

3. **Build.** Dispatch `agentic-engineering:ae-impl` with `model: sonnet` (frontend is never Haiku-tier — fidelity is judgement), `mode: frontend`, brief path, plugin root. It writes component tests first, records the red run, builds pixel-faithful to the handoff, records the green run:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh run --phase frontend -- <project test command>
```
Nested in `/ship` this is Phase 3's evidence row — same run, not a second one.

4. **Verify** as in `shared/story-flow.md` §3: `evidence.sh check` → `fresh`, files within the plan. Red → back to the implementer before ae-ux runs.

5. **ae-ux** runs structured fidelity review.

**This is the only place `ae-ux` is dispatched in the `/ship` chain.** It is not in
`/review`'s reviewer batch (seven agents, six in this frontend pass) — that batch is fixed. `/improve` dispatches it separately
for UI-touching diffs, in no-spec mode.

Dispatch `agentic-engineering:ae-ux`. Pass all four:
- `./docs/specs/[feature-name]-design.md` — approved handoff (omit if none exists; ae-ux switches to no-spec mode)
- changed frontend files for this story
- `./docs/features/<feature-name>/PROGRESS.md` — it validates the Visual Artifacts table against it
- `./docs/CONSTITUTION.md`
- the plugin root `${CLAUDE_PLUGIN_ROOT}`, so it can reach its reference files

ae-ux loads own references based on story + returns structured report:
```
UX — Fidelity Check: STORY-XXX

BLOCKERS (user cannot complete task):
1. [issue] — [file:component] — [fix]

POLISH (noticeable, not blocking):
1. [issue] — [file:component] — [fix]

CLEAN: [what was checked + done well]

Visual Artifacts:
  ✅ M/N references valid (STORY-XXX) | ⚠️ Stale: <path> not found | (non-UI story — skipped)

SUMMARY: X findings — Blockers: N, Polish: M
```

The `Visual Artifacts:` block is part of the report, not an extra. ae-ux appends it every
run; a report without it means ae-ux never got `PROGRESS.md`.

6. **PROD** final UX spot-check:
```
PROD — Final Check:
[Does experience feel right end-to-end?
Anything technically working but wrong to use?]
```

7. **Standalone only** — nested in `/ship`, Phase 4 owns the blockers and Phase 3 the commit; skip this step. ae-ux BLOCKERS → `shared/fix-loop.md` (implementer fix rounds, `--phase frontend-fix`, ae-ux re-reviews); its §4 gate fires only on survivors or a decision. Clean → **GIT** commits `feat([feature-name]): STORY-XXX — frontend implementation`.

### Step N — Auto-mode summary

Run **§C** of `shared/preamble.md`. Nested under `/ship` → parent prints the combined summary; skip here.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Frontend plan approval | **none** — design was approved in `/design`; escalations only (`shared/story-flow.md` §1) |
| No `/design` handoff spec found | `[AUTO: always-ask]` (hard-override #4) — never build UI against no design |
| ae-ux BLOCKERS that survive the fix loop | `[AUTO: always-ask]` (hard-override #1) — nested: parent `/ship` Phase 4; standalone: step 7 |

### Gotchas

- **ae-ux is the last word on fidelity, not PROD.** PROD's spot-check is a sanity read, not a substitute for the structured report.
- **No design spec → stop, don't improvise.** Building UI against an imagined design is unreviewable.
- **Claimed green without running.** UI code changes the tree; Phase 1's evidence row does not cover it. Step 3's row does — and step 4 checks it against the ledger.
- **No component code in the main session.** The implementer builds; the orchestrator verifies.
