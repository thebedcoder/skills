## `/frontend` — Frontend Implementation

**Agents:** ARCH (structure), UX (fidelity), PROD (UX validation)

Read `./CLAUDE.md`, target story, `./docs/specs/[feature-name]-design.md`.
No `/design` yet → prompt user to run it first or confirm proceeding without designs.

### Step 0a — Parse `--auto` flag

Detect whether `$ARGUMENTS` contains the `--auto` token. `/frontend` is normally nested inside `/ship`, which propagates `AUTO=true` down — inherit it when present.

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- If `AUTO`: Step 0 (below) appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- If `AUTO`: ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /frontend <STORY-ID> --auto
  ```

See "Auto Mode" in SKILL.md for the tag taxonomy, hard-override list, and ambiguity heuristic. Apply checkpoint tags from the table at the bottom of this file.

### Step 0 — Auto-write focus

`/frontend` is almost always nested inside `/ship`. Update `.agentic/focus.md` accordingly:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references this STORY-ID (set by parent `/ship`) → only update `note:` to `phase: frontend pass` and `set_by:` to `/frontend`. Leave `title:` + `since:` alone. **Expected path when nested.**
   - Otherwise (rare — `/frontend` invoked standalone) → overwrite CURRENT: `title: frontend for <STORY-ID>`, `since: [now]`, `set_by: /frontend`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with the command's real work below.

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

5. **ae-ux** runs structured fidelity review.

Spawn `ae-ux` subagent. Pass:
- `./docs/specs/[feature-name]-design.md` — approved handoff
- All changed frontend files for story

ae-ux loads own references based on story + returns structured report:
```
UX — Fidelity Check: STORY-XXX

BLOCKERS (user cannot complete task):
1. [issue] — [file:component] — [fix]

POLISH (noticeable, not blocking):
1. [issue] — [file:component] — [fix]

CLEAN: [what was checked + done well]
```

6. **PROD** final UX spot-check:
```
PROD — Final Check:
[Does experience feel right end-to-end?
Anything technically working but wrong to use?]
```

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip. Nested under `/ship` → parent prints the combined summary; skip here.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Frontend plan approval ('go' to implement) | `[AUTO: skip]` — proceed silently when handoff spec exists |
| No `/design` handoff spec found | `[AUTO: always-ask]` (hard-override #4) — never build UI against no design |
| ae-ux fidelity BLOCKERS | `[AUTO: always-ask]` (hard-override #1) — surfaced by parent `/ship` Phase 4 |

### Gotchas

- **ae-ux is the last word on fidelity, not PROD.** PROD's spot-check is a sanity read, not a substitute for the structured report.
- **No design spec → stop, don't improvise.** Building UI against an imagined design is unreviewable.
