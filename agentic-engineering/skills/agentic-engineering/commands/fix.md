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

- **Scope creep is the #1 failure of `/ae-fix`.** While investigating the bug, you'll notice other things — a related bit of dead code, an adjacent file that could use refactoring. Resist all of it. One bug, one fix, one commit. Log observations to `improvements.md`.
- **Don't fix the symptom.** If user report is "the page shows wrong total" and you find the total is wrong because an upstream calculation is wrong — fix the calculation, not the display. If the root cause is in a different module, that's still what gets fixed.
- **The regression test must actually fail before the fix.** Write the test first, watch it fail, then apply the fix and watch it pass. A test written after the fix that doesn't demonstrate the bug is worthless — it proves nothing about whether the bug can recur.
- **Don't confirm "I see the bug" without reproducing it.** Guessing at the bug from the description is a path to fixing something unrelated. If you can't reproduce, ask the user for more specifics — don't invent a hypothesis and run with it.
- **Don't run `/ae-fix` on `main`.** The GIT check prompts you. If you override it, you're likely about to commit a fix with no PR — that means no review, no trail, and a changelog entry attached to nothing reviewable.

---
