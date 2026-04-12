## `/ae-doc-all` — Document All Features

Documents multiple features interactively. Supports two modes:

- **Default** — select from existing features to document or update
- **`--full`** — for projects with no app-docs yet. Runs full codebase reconnaissance first, builds guides, then documents all features. Replaces `/ae-init-docs`.

Detect which mode to use:
- If `./app-docs/` doesn't exist or is empty → suggest `--full` automatically
- Otherwise → run default mode

---

## Default Mode

### Phase 1 — Feature Inventory

ARCH scans the codebase and cross-references `./app-docs/features/`:

```
ARCH — Feature Inventory:

Undocumented (no MDX file exists):
  1. [feature] — [files] — complexity: S/M/L
  2. [feature] — [files] — complexity: S/M/L

Stale (MDX exists but code has changed significantly):
  3. [feature] — [last updated: date] — [what changed]

Up to date (skip):
  4. [feature] — ✅

Total to document: X features
```

### Phase 2 — Selection

⚠️ **Human checkpoint:**
```
Which features do you want to document?

  'all'    → document everything listed
  '1,2,4'  → specific numbers
  'undoc'  → only undocumented
  'stale'  → only stale
```

### Phase 3 — Doc Loop

For each selected feature, run the full `/ae-doc` flow:
- ARCH reads the code
- SCRIBE asks Q&A questions, waits for answers
- Write the MDX to `./app-docs/features/[name].mdx`
- Append improvements to `./docs/improvements.md`
- GIT commit

Between each feature:
```
✅ [feature] documented ([X] of [Y])
Next: [feature name] — questions coming up.
```

### Phase 4 — Complete

```
━━━ DOC-ALL COMPLETE ━━━
Documented: X features
Skipped:    Y (up to date)
Improvements: ./docs/improvements.md
Git: X commits
```

---

## Full Mode (`--full`)

Use on projects with no `./app-docs/` yet, or to fully rebuild from scratch.

### Phase 1 — Codebase Reconnaissance

**ARCH** does a full structural read:

```
ARCH — Codebase Map:

Project type: [web app / API / mobile / library / monorepo]

Entry points:
  - [file] — [purpose]

Feature areas identified:
  - [area] — [what it does, key files]

Architectural patterns:
  - [pattern] — [where used]

External dependencies worth documenting:
  - [service/lib] — [how used]

Unclear (need closer reading):
  - [area] — [why ambiguous]
```

**PROD** translates to user-facing context:
```
PROD — Feature Translation:
[Which areas are user-facing vs. internal infrastructure?
Any feature ARCH missed because it's spread across files?]
```

⚠️ **Human checkpoint:** *"Does this capture everything? Reply 'approved' or correct anything."*

### Phase 2 — Build Guides

SCRIBE creates `./app-docs/guides/` before feature docs:

- **`getting-started.mdx`** — setup instructions from README, package.json scripts, config files
- **`architecture.mdx`** — ARCH's structural map rewritten for humans: layers, data flow, key decisions
- **`conventions.mdx`** — coding conventions from CLAUDE.md, linting config, and observed patterns

Also creates `./app-docs/index.mdx`:
```mdx
---
title: [Project Name]
description: [One sentence]
last_updated: [date]
---

# [Project Name]

[2-3 sentence overview.]

## Features
- [Feature name](./features/[name].mdx) — [one line]

## Guides
- [Getting Started](./guides/getting-started.mdx)
- [Architecture](./guides/architecture.mdx)
- [Conventions](./guides/conventions.mdx)
```

### Phase 3 — Document All Features

Run the full feature inventory (same as default Phase 1), then document all undocumented features using the `/ae-doc` flow — no selection step, documents everything found.

### Phase 4 — PROD Review

**PROD** reads every generated file:
```
PROD — Docs Review:

Readable by new team member:
✅ [file] — clear
⚠️ [file] — [what's confusing]

Accurate to actual behaviour:
✅ [file] — accurate
⚠️ [file] — [what seems off]

Missing:
- [anything a new dev would need]
```

SCRIBE fixes issues PROD flags.

### Phase 5 — Complete

**GIT** commits:
```
docs: initialise app-docs from codebase analysis
```

```
━━━ DOC-ALL --FULL COMPLETE ━━━

Guides created:    getting-started, architecture, conventions
Features documented: X
index.mdx:         ✅ created

⚠️ Review ./app-docs/ and correct anything that feels off.
SCRIBE will keep docs updated after every /ae-ship and /ae-fix.
```
