## `/fix [description]` — Bug Fix Chain

**Chain:** diagnose → fix → review
**Agents:** FIXER (lead), RED (reviewer)

Read `./CLAUDE.md` + relevant feature docs in `./app-docs/features/` before starting.

### Step 0a — Parse `--auto` flag

Detect whether `$ARGUMENTS` contains the `--auto` token (not a substring inside a name).

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- If `AUTO`: Step 0 (below) appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- If `AUTO`: ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /fix <bug summary> --auto
  ```

See "Auto Mode" in SKILL.md for the tag taxonomy, hard-override list, and ambiguity heuristic. Apply checkpoint tags from the table at the bottom of this file.

### Step 0 — Auto-write focus

Before diagnosing, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references the same bug summary → update `note:` to `phase: fixing` and `set_by:` to `/fix`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: fixing: <bug summary>`, `since: [now]`, `set_by: /fix`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with the command's real work below.

---

**GIT** confirms current branch. On `main`/`master`, warn:
```
⚠️ GIT: You're on main. /ae:fix expects to run on a feature branch.
Are you fixing a pre-merge bug? Reply 'yes' to continue on main, or switch to the relevant branch first.
```
Otherwise proceeds silently.

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

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]`: Show diagnosis. Ask: *"Does this match what you're seeing? Reply 'go' to fix."* Under `--auto`: SKIP if FIXER identifies exactly one plausible root cause with high confidence (single file/line, no alternative hypotheses); otherwise ASK.

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

RED raises concerns → pause:
```
⚠️ FIX PAUSED — RED has concerns
[RED's findings]
Proceed anyway? Reply 'override' or 'revise'.
```

Clean → continue.

**Phase 4 — End-user docs + Changelogs** *(automatic — final step before fix commit)*

`./app-docs/` updated only if user-facing behaviour changed.

Spawn **ae-scribe** subagent:
- User-noticeable change (UI response, workflow outcome, visible error, API shape they consume)? Yes → update feature MDX. No → returns `no user-facing change, app-docs unchanged`.

Prepend to both changelogs (newest first):

`./docs/CHANGELOG.md` (after header, terse):
```markdown
## [date]
- [FIX] fix([scope]): [what was broken → what was fixed] — [file:line]
- [FIX] test: regression test added — [test location]
```

`./app-docs/CHANGELOG.mdx` (after frontmatter + title, **product release note to end users**):
```mdx
## [Month YYYY]

### Fixed
- [Plain-English, user-perspective — what they saw wrong, what they now see. No file paths / stack traces.]
```

SCRIBE reported "no user-facing change" → skip `### Fixed` entry entirely. Internal-only fixes stay in `docs/CHANGELOG.md` (engineering log), never surface in `app-docs/CHANGELOG.mdx`.

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
