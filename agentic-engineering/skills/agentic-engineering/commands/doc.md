## `/doc [feature]` — Interactive Feature Documentation

**Agents:** SCRIBE (lead), ARCH (analysis), RED (improvement spotter)

`./app-docs/` = **end-user product documentation**. Reader = app user. Not dev team. Not AI context.

Use to document existing feature with Q&A for what code alone can't infer. ARCH + RED surface improvement suggestions on the side (saved separately).

`[feature]` missing → SCRIBE lists undocumented/stale features + asks which one.

### Step 0 — Auto-write focus

Before documenting, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT references the same feature → update `note:` to `phase: documenting` and `set_by:` to `/doc`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: documenting <feature>`, `feature: <feature>`, `since: [now]`, `set_by: /doc`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with the command's real work below.

---

### Phase 1 — Code Read → user-reachable capabilities

ARCH reads feature code. Translates into **user-reachable capabilities**, not architecture map.

```
ARCH — Feature Read: [feature name]

User-reachable capabilities (things a user can actually do):
  - [Capability 1 — phrased as user action] — [entry point in UI / API]
  - [Capability 2] — [entry point]

Primary workflow (step-by-step user journey):
  1. [What user does / sees]
  2. [Next step]
  3. [Outcome]

Secondary workflows (if any):
  - [Shorter description of alternate path]

Behaviours a user would care about but might not discover:
  - [Non-obvious limit, shortcut, or edge case]

Questions I can't answer from code alone:
  - [Ambiguity 1 — e.g. "gated behind flag user sees?"]
  - [Ambiguity 2 — e.g. "what user sees when X fails?"]
```

---

### Phase 2 — Q&A

SCRIBE asks questions on ARCH's ambiguities. Grouped + asked together. Frame from user's perspective.

```
SCRIBE — Questions about [feature name]:

About what the user sees:
  1. [question]
  2. [question]

About edge cases the user might hit:
  3. [question]

About intent — who is this for, why use it:
  4. [question]

Answer any you know. Skip any that aren't important. I'll note gaps in the docs.
```

`[ASK: prose]` — these are freeform by nature. Do **not** widget them; a fixed option set can't cover "what does the user see when X fails".

Wait for answers.

---

### Phase 3 — Write End-User Documentation

SCRIBE writes/updates `./app-docs/features/[feature-name].mdx`. Full template + self-check → `ae-scribe.md`. Structure: frontmatter → intro → **What you can do** → **How to use it** (numbered, real UI labels) → **Tips** → **FAQ** (only if real recurring Qs) → **Related**. No file paths / function names / code blocks.

---

### Phase 4 — Improvement Suggestions (saved, not surfaced)

ARCH + RED note anything flagworthy → `./docs/improvements.md`. Never leak into `./app-docs/`.

Append format: `## [Feature] — [date]` header, then ARCH refactoring suggestions, RED potential issues, general improvements — each with file:line + effort/severity.

End of command:
```
Improvements and potential issues saved to ./docs/improvements.md — review when ready.
```

---

### Phase 5 — Git

GIT commits:
```
docs([feature-name]): document [feature name] for end users
```

---
