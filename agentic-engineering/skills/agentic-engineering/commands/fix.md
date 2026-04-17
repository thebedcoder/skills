## `/ae-fix [description]` — Bug Fix Chain

**Chains: diagnose → fix → review**
**Agents active: FIXER (lead), RED (reviewer)**

Read `./CLAUDE.md` and any relevant feature docs in `./app-docs/features/` before starting.

**GIT** confirms the current branch before starting. If on `main`/`master`, warns the user:
```
⚠️ GIT: You're on main. /ae:fix expects to run on a feature branch.
Are you fixing a pre-merge bug? Reply 'yes' to continue on main, or switch to the relevant branch first.
```
Otherwise proceeds on the current branch silently.

### Steps

**Phase 1 — Diagnosis**

FIXER takes the bug description and investigates:

```
FIXER — Diagnosis: [bug description]

Reproduction path:
  [How does this bug occur? What triggers it?]

Root cause:
  [Exact file(s) and line(s) where the problem originates]
  [Why does it behave this way?]

Blast radius:
  [What else could be affected by this bug or by fixing it?]

Fix plan:
  [Exactly what will change — file, function, line-level detail]
  [What will NOT change — FIXER explicitly lists scope boundaries]

Risk:
  [Could this fix break anything else?]
```

⚠️ **Human checkpoint:** Show diagnosis. Ask: *"Does this match what you're seeing? Reply 'go' to fix."*

**Phase 2 — Fix** *(automatic after 'go')*

FIXER applies the minimal surgical fix. Rules:
- Change only what the diagnosis identified
- No refactoring unrelated code
- No "while I'm here" improvements
- Add or update a test that would have caught this bug

**Phase 3 — Review** *(automatic)*

RED runs a focused review on the changed code only:

```
RED — Fix Review:

Does the fix actually resolve the root cause? [yes/no — explanation]
Does the fix introduce any new risks? [yes/no — detail]
Is the test sufficient to prevent regression? [yes/no — detail]
Blast radius check: [anything adjacent that should be re-tested?]
```

If RED raises concerns → pause and surface them:
```
⚠️ FIX PAUSED — RED has concerns
[RED's findings]
Proceed anyway? Reply 'override' or 'revise'.
```

If clean → continue automatically.

**Phase 4 — Docs + Changelogs** *(automatic)*

Spawn **ae-scribe** subagent to check if the bug touched any documented behaviour in `./app-docs/`:
- If yes → update the relevant MDX to reflect correct behaviour or add an edge case note
- If no → logs "no doc update needed"

Prepend to both changelogs (newest first):

`./docs/CHANGELOG.md` (insert after header line, terse):
```markdown
## [date]
- [FIX] fix([scope]): [what was broken → what was fixed] — [file:line]
- [FIX] test: regression test added — [test location]
```

`./app-docs/CHANGELOG.mdx` (insert after frontmatter + title, human-readable):
```mdx
## [Month YYYY]

### Fixed
- [Plain-English description of what was broken and is now fixed]
```

**GIT** commits everything:
```
fix([scope]): [short description of what was broken and how it's fixed]
test([scope]): add regression test for [bug description]
docs([scope]): update edge case notes    ← only if docs were changed
```

**GIT** outputs a note for the existing PR (not a new PR description):
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

### Gotchas

- **One bug, one fix, one commit.** Notice other things during investigation? Log to `improvements.md`. Resist all scope creep.
- **Fix root cause, not symptom.** Wrong total from upstream calc → fix calc, not display. Root cause in different module → still fix there.
- **Regression test must fail before fix.** Write test → watch fail → fix → watch pass. Test written after proves nothing.
- **Reproduce before confirming.** Can't reproduce → ask user, don't invent hypothesis.
- **No `/ae-fix` on `main`.** Override GIT check → no PR, no review, no trail.

---
