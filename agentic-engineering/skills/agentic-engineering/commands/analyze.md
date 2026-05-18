## `/analyze` — Project Intelligence

**Agents:** ARCH (lead), PROD (product lens)

Use to answer any question about the project — features, status, architecture, gaps, implementation. Searches docs, app-docs, codebase as needed.

Question received: $ARGUMENTS

---

### How to answer

**Step 1 — Classify question**

Determine answer type:
- **Status / coverage** — "which features lack X?" → cross-reference INDEX.md + app-docs + docs/features/
- **Implementation** — "how does X work?" → read codebase + app-docs
- **Planning** — "what's left to build?" → read STORIES.md files via INDEX.md
- **Architecture** — "how is X structured?" → read codebase + CLAUDE.md
- **Cross-cutting** — spans multiple features → read broadly, synthesize

**Step 2 — Gather information**

Read in order, stopping when you have enough:

1. `./docs/INDEX.md` — feature list + status
2. `./app-docs/` — end-user product docs (useful for "what can a user do?" — not architecture)
3. `./docs/features/*/` — PRDs, stories, progress per feature (engineering source of truth)
4. Codebase files — only if docs don't have answer

Note: `./app-docs/` written for users of the app, not dev team — prefer `./docs/` + codebase for architecture, data flow, implementation questions.

**Step 3 — Answer**

Direct, specific. No filler.

Format per question type:

**Gap/coverage** (e.g. "which features lack designs?"):
```
ARCH — Analysis: [question]

Gap found:
- [feature]: [what's missing] — [evidence]
- [feature]: [what's missing] — [evidence]

Complete:
- [feature]: [what's covered]

Recommendation: [what to do about gaps, if obvious]
```

**How-it-works** (e.g. "how do we process payments?"):
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

**Planning** (e.g. "what's left to build?"):
```
PROD — Analysis: [question]

[Direct answer]

[Table or list as appropriate]

Priority recommendation: [if applicable]
```

**Open-ended** → synthesize from all sources. Be honest about documented vs inferred from code.

---

### If answer not findable

Say so directly:
```
Couldn't find a clear answer in docs or codebase.

Checked:
- [what was read]

Best inference: [educated guess if possible]

To get a definitive answer: [what would need to exist or be clarified]
```
