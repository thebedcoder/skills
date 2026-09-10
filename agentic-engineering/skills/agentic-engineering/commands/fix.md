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

FIXER investigates:

```
FIXER — Diagnosis: [bug description]

Reproduction path:
  [How does bug occur? What triggers it?]

Root cause:
  [Exact file(s) + line(s) where problem originates]
  [Why does it behave this way?]

Blast radius:
  [What else could be affected by bug or by fixing it?]

Fix plan:
  [Exactly what will change — file, function, line-level detail]
  [What will NOT change — explicit scope boundaries]

Risk:
  [Could fix break anything else?]
```

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]` `[ASK: single]`: Show diagnosis, then ask *"Does this match what you're seeing?"* → **Yes, fix it (Recommended)** · **Close but not quite** · **Wrong root cause**. Either non-first option → follow up `[ASK: prose]` and re-diagnose; never proceed to Phase 2 on a corrected diagnosis without re-running FIXER. Under `--auto`: SKIP if FIXER identifies exactly one plausible root cause with high confidence (single file/line, no alternative hypotheses); otherwise ASK.

**Phase 2 — Fix** *(automatic after 'go')*

FIXER applies minimal surgical fix. Rules:
- Change only what diagnosis identified
- No refactoring unrelated code
- No "while I'm here" improvements
- Add/update test that would have caught this bug

**Phase 3 — Review** *(automatic)*

RED runs focused review on changed code only:

```
RED — Fix Review:

Does fix actually resolve root cause? [yes/no — explanation]
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

### Gotchas

- **One bug, one fix, one commit.** Notice other things during investigation? → `improvements.md`. Resist scope creep.
- **Fix root cause, not symptom.** Wrong total from upstream calc → fix calc, not display. Root cause in different module → still fix there.
- **Regression test must fail before fix.** Test → watch fail → fix → watch pass. After-the-fact proves nothing.
- **Reproduce before confirming.** Can't reproduce → ask user, don't invent hypothesis.
- **No `/fix` on `main`.** Override GIT check → no PR, no review, no trail.

---
