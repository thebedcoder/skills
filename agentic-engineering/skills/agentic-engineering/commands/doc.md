## `/ae-doc [feature]` — Interactive Feature Documentation

**Agents active: SCRIBE (lead), ARCH (analysis), RED (improvement spotter)**

Use when you want to document a specific existing feature properly — with Q&A to fill in
anything that can't be inferred from code alone. ARCH and RED piggyback on the deep read
to surface improvement suggestions, saved separately so they don't interrupt the doc flow.

If `[feature]` is not provided, SCRIBE lists undocumented or stale features from
`./app-docs/features/` and asks which one to document.

---

### Phase 1 — Code Read

ARCH does a thorough read of all files related to the feature:

```
ARCH — Feature Read: [feature name]

Files identified:
  - [path] — [role in this feature]
  - [path] — [role in this feature]

What I can determine from code alone:
  - [behaviour 1]
  - [behaviour 2]

What I cannot determine from code:
  - [ambiguity 1] — [why it's unclear]
  - [ambiguity 2] — [why it's unclear]
```

---

### Phase 2 — Q&A

SCRIBE asks targeted questions about everything ARCH flagged as ambiguous.
Questions are grouped and asked together — not one by one.

```
SCRIBE — Questions about [feature name]:

About behaviour:
  1. [question]
  2. [question]

About edge cases:
  3. [question]

About intent / history:
  4. [question]
  5. [question]

Answer any you know. Skip any that aren't important. I'll note gaps in the docs.
```

Wait for answers before proceeding.

---

### Phase 3 — Write Documentation

SCRIBE writes or updates `./app-docs/features/[feature-name].mdx`:

```mdx
---
title: [Feature Name]
description: [One sentence]
status: stable | beta | deprecated
last_updated: [date]
---

# [Feature Name]

[2-3 sentence plain-English overview. Written for a new team member on day one.]

## What it does

[User-facing description. No code.]

## How it works

[Technical overview. Key files, key functions, data flow.]

## Key files

| File | Purpose |
|------|---------|
| `[path]` | [what it does] |

## Configuration

[Any env vars, feature flags, or config values that affect this feature — if any]

## Edge cases & known behaviour

[Non-obvious behaviour, limits, gotchas — including answers from Q&A]

## Known gaps

[Anything SCRIBE couldn't determine and the user didn't clarify — honest about uncertainty]

## Related features

[Links to connected feature docs]
```

SCRIBE's self-check:
```
SCRIBE — Doc complete:
✅ Readable by a new team member: yes / [note]
✅ Useful as AI context: yes / [note]
✅ Q&A answers incorporated: yes
✅ Gaps documented honestly: yes / none
```

---

### Phase 4 — Improvement Suggestions (saved, not surfaced)

While ARCH and RED were reading the code, they noted anything worth flagging.
These are saved to `./docs/improvements.md` — **not** shown inline during the doc flow.

Append to `./docs/improvements.md` (format: `## [Feature] — [date]` header, then ARCH refactoring suggestions, RED potential issues, and general improvements — each with file:line and effort/severity).

At the end of the command, tell the user:
```
Improvements and potential issues saved to ./docs/improvements.md — review when ready.
```

---

### Phase 5 — Git

GIT commits the doc:
```
docs([feature-name]): document [feature name] with Q&A
```

---
