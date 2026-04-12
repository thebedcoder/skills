## `/ae-analyze` — Project Intelligence

**Agent active: ARCH (lead), PROD (product lens)**

Use this to answer any question about the project — its features, status, architecture,
gaps, or implementation details. Searches docs, app-docs, and codebase as needed.

Question received: $ARGUMENTS

---

### How to answer

**Step 1 — Classify the question**

Determine what kind of answer is needed:
- **Status / coverage** — "which features lack X?" → cross-reference INDEX.md + app-docs + docs/features/
- **Implementation** — "how does X work?" → read codebase + app-docs
- **Planning** — "what's left to build?" → read STORIES.md files via INDEX.md
- **Architecture** — "how is X structured?" → read codebase + CLAUDE.md
- **Cross-cutting** — spans multiple features → read broadly, synthesize

**Step 2 — Gather information**

Read in this order, stopping when you have enough to answer well:

1. `./docs/INDEX.md` — feature list and status
2. `./app-docs/` — human-readable feature docs
3. `./docs/features/*/` — PRDs, stories, progress per feature
4. Codebase files — only if docs don't have the answer

**Step 3 — Answer**

Give a direct, specific answer. No filler.

Format depends on question type:

**For gap/coverage questions** (e.g. "which features lack designs?"):
```
ARCH — Analysis: [question]

Gap found:
- [feature]: [what's missing] — [evidence]
- [feature]: [what's missing] — [evidence]

Complete:
- [feature]: [what's covered]

Recommendation: [what to do about the gaps, if obvious]
```

**For how-it-works questions** (e.g. "how do we process payments?"):
```
ARCH — Analysis: [question]

[Direct answer in plain English]

Key files:
- [file] — [role]

Flow:
[step → step → step]

Edge cases / notes:
- [anything non-obvious]
```

**For planning questions** (e.g. "what's left to build?"):
```
PROD — Analysis: [question]

[Direct answer]

[Table or list as appropriate]

Priority recommendation: [if applicable]
```

**For open-ended questions**, synthesize from all sources and be honest about what's
documented vs. what had to be inferred from code.

---

### If the answer isn't findable

Say so directly:
```
Couldn't find a clear answer in docs or codebase.

Checked:
- [what was read]

Best inference: [educated guess if possible]

To get a definitive answer: [what would need to exist or be clarified]
```
