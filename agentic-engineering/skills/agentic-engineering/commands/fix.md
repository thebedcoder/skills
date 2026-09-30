## `/fix [description]` — Bug Fix Chain

**Chain:** diagnose → fix → review
**Agents:** FIXER (lead), RED (reviewer)

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- relevant feature docs in `./app-docs/features/`
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`. `/cleanup` writes these after every chain; a chain that never reads them is a write-only log

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/fix <bug summary> --auto`.

### Step 0b — Write the phase PLAN

Per "Progress Tracking" in SKILL.md, write one PLAN line per phase before any work starts:

1. `Diagnose — reproduce + root cause`
2. `Fix + regression test`
3. `RED review of the fix`
4. `End-user docs + changelogs`
5. `Cleanup — decisions + memory`

Mark #1 in progress at Phase 1. Advance one at a time. No user-facing change → close #4 with `changelogs only (internal fix)`. RED concerns unresolved → leave the current line open; do not close #5, Phase 5 is skipped.

Write these into the `# PLAN` section of `.agentic/focus.md`. Mirror into a harness task list **if this session exposes one** — it is a convenience view, not the record. PLAN survives compaction and session end.


### Step 0 — Auto-write focus

Before diagnosing, update `.agentic/focus.md`:

1. Run **§B step 1** of `shared/preamble.md` — creates `.agentic/` and gitignores it, idempotent.

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references the same bug summary → update `note:` to `phase: fixing` and `set_by:` to `/fix`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: fixing: <bug summary>`, `since: [now]`, `set_by: /fix`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Write the chain into the `# PLAN` section of `.agentic/focus.md` (see `commands/focus.md`) — `diagnose`, `fix + regression test`, `RED review`, `docs + changelogs`, `cleanup`. Tick each as its phase closes.

4. Continue with the command's real work below.

---

**GIT** confirms current branch. On `main`/`master`, print `⚠️ GIT: You're on main. /fix expects to run on a feature branch.` then gate — ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"Continue on main?"* → **Branch first (Recommended)** · **Continue on main** · **Abort**. Never proceed silently on `main`, even under `--auto`.

Off `main` → proceeds silently, no gate.

### Steps

**Phase 1 — Diagnosis**

FIXER investigates, in this order — each step feeds the next, and no fix is proposed before the hypothesis holds:

1. **Reproduce — run it.** Failing test, script or command, executed now; paste the real output. Can't reproduce → gather data (logs, inputs, environment diff) or ask `[ASK: prose]`; never diagnose a bug nobody has seen fail.
2. **Recent changes** — *regressions only* (it used to work). `git log --oneline -15 -- <path>`, `git log -S'<symbol>'`; known-good commit + scriptable repro → `git bisect run <repro>`. Never-worked → `n/a`.
3. **Trace to the origin.** Error surfaces deep → walk the bad value backwards, caller by caller, to where it is first produced. Crosses components (API → service → DB, CI → build → deploy) → one instrumentation pass: log what enters and leaves each boundary, run once, read where good turns bad. Temporary — removed before commit.
4. **Working sibling.** Similar code in this repo that works (another handler, the other format, the previous version) → list every difference. Nothing similar → say so.
5. **One hypothesis, tested.** "X causes Y because Z." Smallest probe that could refute it — one variable, no fix attached. Refuted → new hypothesis from what the probe showed; never stack guesses.

```
FIXER — Diagnosis: [bug description]

Reproduced:
  [command] → [actual failing output, ≤5 lines]   (or: cannot reproduce — [what was tried])

Recent changes:
  [commit / bisect result that introduced it]      (or: n/a — never worked)

Trace:
  [symptom file:line] ← [caller file:line] ← … ← [origin file:line]

Working sibling:
  [file:line that works — the difference that matters]   (or: none found)

Hypothesis:
  [X causes Y because Z] — probe: [check] → [confirmed | refuted, then next hypothesis]

Root cause:
  [Exact file(s) + line(s) where problem originates]
  [Why does it behave this way?]

Blast radius:
  [What else could be affected by bug or by fixing it?]

Fix plan:
  [Exactly what will change — file, function, line-level detail]
  [What will NOT change — explicit scope boundaries]

Guards (defense in depth — optional):
  [layer on THIS bug's data path → check that makes it impossible, each with a test]   (or: none)

Risk:
  [Could fix break anything else?]
```

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]` `[ASK: single]`: Show diagnosis, then ask *"Does this match what you're seeing?"* → **Yes, fix it (Recommended)** · **Close but not quite** · **Wrong root cause**. Either non-first option → follow up `[ASK: prose]` and re-diagnose; never proceed to Phase 2 on a corrected diagnosis without re-running FIXER. Under `--auto`: SKIP only if the bug was reproduced, the hypothesis was confirmed by its probe, and exactly one root cause remains (single file/line, no alternative); otherwise ASK.

**Phase 2 — Fix** *(automatic after 'go')*

FIXER applies minimal surgical fix. Rules:
- Change only what diagnosis identified
- No refactoring unrelated code
- No "while I'm here" improvements
- Add/update test that would have caught this bug
- Guards from the plan only — same data path, each with its own test. A check on some other path is another fix → `improvements.md`
- Instrumentation from diagnosis step 3 removed before commit

**Failed attempt** — regression test still red, or evidence red → back to Phase 1 with what the attempt taught; never a second patch on top of the first. Count attempts in the PLAN line note (`attempt 2 of 3`). **Third failed attempt → stop.** Each fix revealing a new problem somewhere else is a design signal, not bad luck. ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"Three fixes failed, each exposing something new. This looks like a design problem, not one bug. How do you want to proceed?"* → **Rethink the approach (Recommended)** · **Try once more** · **Stop and log to BACKLOG**. First option → `/improve` or `/feature` scale, not `/fix`.

**Evidence — fix is not done until the suite says so, on this code.** After the last edit, full suite from repo root:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/evidence.sh run --phase fix -- <project test command>
```

Red → not fixed; back to diagnosis, new row after the next attempt. Green row goes to three places: RED's review prompt, the `━━━ FIX COMPLETE` block, and an `Evidence:` trailer on the `fix(` commit. Bug belongs to a story with a `PROGRESS.md` entry (a review blocker, a regression in a shipped story) → also append the row to that story's `### Evidence` table. `/fix` has no story entry of its own; never invent one.

**Phase 3 — Review** *(automatic)*

RED runs focused review on changed code only:

```
RED — Fix Review:

Does fix actually resolve root cause? [yes/no — explanation]
Evidence row fresh and green? [yes/no — the row]
Does fix introduce new risks? [yes/no — detail]
Is test sufficient to prevent regression? [yes/no — detail]
Blast radius check: [anything adjacent to re-test?]
```

RED raises concerns → pause. Print `⚠️ FIX PAUSED — RED has concerns` + RED's findings, then ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"How do you want to proceed?"* → **Revise the fix (Recommended)** · **Ship it anyway** · **Revert the fix**.

Clean → continue.

**Phase 4 — End-user docs + Changelogs** *(automatic — final step before fix commit)*

`./app-docs/` updated only if user-facing behaviour changed.

Dispatch `agentic-engineering:ae-scribe` — **app-docs pages only; this command writes both changelogs, below**:
- User-noticeable change (UI response, workflow outcome, visible error, API shape they consume)? Yes → update the feature's `app-docs/features/[name].md`. No → returns `no user-facing change, app-docs unchanged`.

`./app-docs/` absent → **the parent creates the tree, not SCRIBE**: `index.md`, `CHANGELOG.md`, `features/`, `guides/`, seeded from the templates in `commands/init.md`. Do it before dispatching. Existence check, not mode check — lite projects skip the tree at init and grow it on first user-facing change. SCRIBE writes pages into a tree that already exists; it has no create-tree rule.

Prepend to both changelogs (newest first):

`./docs/CHANGELOG.md` (after header, terse):
```markdown
## [date]
- [FIX] fix([scope]): [what was broken → what was fixed] — [file:line]
- [FIX] test: regression test added — [test location]
```

`./app-docs/CHANGELOG.md` (after frontmatter + title, **product release note to end users**):
```md
## [Month YYYY]

### Fixed
- [Plain-English, user-perspective — what they saw wrong, what they now see. No file paths / stack traces.]
```

SCRIBE reported "no user-facing change" → skip `### Fixed` entry entirely. Internal-only fixes stay in `docs/CHANGELOG.md` (engineering log), never surface in `app-docs/CHANGELOG.md`.

**GIT** commits:
```
fix([scope]): [short description of what was broken and how it's fixed]
test([scope]): add regression test for [bug description]
docs([scope]): update edge case notes    ← only if docs changed
```

The `fix(` commit body ends with the trailer `Evidence: [command] → exit 0 · [runner summary] · tree [id]`.

**GIT** outputs note for existing PR (not new PR description):
```markdown
### Fix applied to this PR

**What was broken:** [plain-English bug description]
**Root cause:** [one line]
**Changed:** [files]
**Regression test:** [name/location]
```

**Phase 5 — Cleanup** *(automatic — last phase)*

Run the `/cleanup` flow inline for this fix (`commands/cleanup.md`). Phase 4 already wrote the CHANGELOG entry — cleanup skips that step and does the remaining two: binding decisions → `./docs/DECISIONS.md`, rewrite `./docs/MEMORY.md`.

Most fixes yield no binding decision. That's the normal case — record nothing rather than inventing a `DEC-` entry. A fix earns one only when it changes a contract, rules out an approach, or reveals a constraint future work must respect.

Chain ended with RED's concerns unresolved ("Ship it anyway" is resolved; an abandoned fix is not) → skip Phase 5.

**Fix complete:**
```
━━━ FIX COMPLETE ━━━
Bug:        [description]
Root cause: [one line]
Changed:    [files]
Test:       ✅ added / updated
Evidence:   ✅ [command] → [runner summary] · tree [id]
Docs:       ✅ updated / not needed
Changelog:  ✅ both updated
Git:        ✅ committed on [branch name]
Cleanup:    ✅ MEMORY.md refreshed · [DEC-XXX recorded | no binding decision]
```

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Branch warning when on `main` | `[AUTO: always-ask]` — never proceed silently on `main` |
| Show diagnosis, ask 'go' | `[AUTO: ask-if-ambiguous]` — skip when single high-confidence root cause |
| Review post-fix `FIX PAUSED — RED has concerns` | `[AUTO: always-ask]` (also hard-override #1) |
| Third failed fix attempt | `[AUTO: always-ask]` — design question, never retried silently |
| Can't reproduce | `[ASK: prose]` — untagged → `always-ask` |

### Gotchas

- **One bug, one fix, one commit.** Notice other things during investigation? → `improvements.md`. Resist scope creep.
- **Fix root cause, not symptom.** Wrong total from upstream calc → fix calc, not display. Root cause in different module → still fix there.
- **Claimed green without running.** "Fixed" means an `evidence.sh` row from after the last edit shows exit 0. The failing run from diagnosis, a single-test run, or "should pass now" is not that row.
- **Regression test must fail before fix.** Test → watch fail → fix → watch pass. After-the-fact proves nothing.
- **Reproduce before confirming.** Can't reproduce → ask user, don't invent hypothesis. "Reproduction path" written from reading code is a guess; the pasted failing output is the reproduction.
- **Hypothesis before patch.** "Let me try changing X" is a probe only when it changes nothing else and its result is read before the next step. Two edits at once → cannot tell which one mattered.
- **Fix at the origin, guard on the path.** Trace ends where the bad value is born; fix there. Guards on the same path are defense in depth; validation added elsewhere "while here" is scope creep.
- **Three failed fixes = stop.** Fix #4 without the design conversation is how a bug becomes a rewrite nobody planned.
- **No `/fix` on `main`.** Override GIT check → no PR, no review, no trail.

---
