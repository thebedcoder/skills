## `/frontend` — Frontend Implementation

**Agents:** ARCH (structure), UX (fidelity), PROD (UX validation)

Read `./CLAUDE.md`, target story, `./docs/specs/[feature-name]-design.md`.
No `/design` yet → prompt user to run it first or confirm proceeding without designs.

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/frontend <STORY-ID> --auto`. `/frontend` is normally nested inside `/ship`, which propagates `AUTO=true` down — inherit it when present rather than re-parsing.

### Step 0 — Auto-write focus

Run **§B** of `shared/preamble.md` — `title: frontend for <STORY-ID>`, `set_by: /frontend`. Almost always nested in `/ship`: CURRENT already names the story → only `note: phase: frontend pass` + `set_by:` change.

### Steps

1. **UX** reads design handoff spec + summarises:
```
UX — Design Brief: STORY-XXX
[Key screens + states this story covers]
[Interaction notes from handoff spec]
[What developer needs to watch for]
```

2. **ARCH** audits design system. Lists reuse vs build:

```
ARCH — Frontend Plan: STORY-XXX

Reuse:
  - [component] from [path]

Build new:
  - [component] — [props, variants, states needed]

Data connections:
  - [API call] → [expected shape]

Responsive:
  - [mobile / tablet / desktop notes from UX handoff]
```

3. **PROD** reviews plan vs user flow:
```
PROD — UX Review:
[Does this deliver every screen + state in handoff?
Any interaction state missing — loading, empty, error?
Any shortcut diverging from approved design?]
```

⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: confirm]`: Show all three, then ask *"Implement this frontend plan?"* → Go / Stop. Under `--auto`: SKIP — emit `SKIPPED: frontend plan approval [auto]` and proceed. Exception per hard-override #4: no design handoff spec exists → HARD-PAUSE regardless of tag.

4. Implement per ARCH's plan, pixel-faithful to handoff.

4b. **Verify.** Full suite from the repo root, non-watch (SKILL.md "Test Execution Rules"):
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh run --phase frontend -- <project test command>
```
Red → not done; fix before ae-ux runs. Green row → append to the story's `### Evidence` table in `PROGRESS.md`. Nested in `/ship` this is Phase 3's evidence row — same run, not a second one.

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

7. **Standalone only** — nested in `/ship`, Phase 4 owns the blocker gate and Phase 3 the commit; skip this step. ae-ux BLOCKERS → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"How do you want to handle the UX blockers?"* → **Fix now (Recommended)** · **I'll fix them** · **Stop here**. Fix → new evidence row (4b), re-run ae-ux. Clean or accepted → **GIT** commits `feat([feature-name]): STORY-XXX — frontend implementation`.

### Step N — Auto-mode summary

Run **§C** of `shared/preamble.md`. Nested under `/ship` → parent prints the combined summary; skip here.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Frontend plan approval ('go' to implement) | `[AUTO: skip]` — proceed silently when handoff spec exists |
| No `/design` handoff spec found | `[AUTO: always-ask]` (hard-override #4) — never build UI against no design |
| ae-ux fidelity BLOCKERS | `[AUTO: always-ask]` (hard-override #1) — nested: parent `/ship` Phase 4 gate; standalone: step 7 |

### Gotchas

- **ae-ux is the last word on fidelity, not PROD.** PROD's spot-check is a sanity read, not a substitute for the structured report.
- **No design spec → stop, don't improvise.** Building UI against an imagined design is unreviewable.
- **Claimed green without running.** UI code changes the tree; Phase 1's evidence row does not cover it. 4b's row does.
