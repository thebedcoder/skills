## `/ae-doc-all` — Document All Features

Output → `./app-docs/` = **end-user product documentation**. Not internal reference.

Modes:
- **Default** — select from existing features to document/update
- **`--full`** — no app-docs yet. Reconnaissance, builds landing + user guides, documents all user-facing features. Replaces `/ae-init-docs`.

Detect:
- `./app-docs/` missing or empty → suggest `--full`
- Otherwise → default mode

---

## Default Mode

### Phase 1 — Feature Inventory

ARCH scans codebase + cross-references `./app-docs/features/`:

```
ARCH — Feature Inventory:

Undocumented (no MDX file exists):
  1. [feature] — [files] — complexity: S/M/L
  2. [feature] — [files] — complexity: S/M/L

Stale (MDX exists but code changed significantly):
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

Per selected feature, run full `/ae-doc` flow:
- ARCH reads code
- SCRIBE asks Q&A, waits
- Write MDX to `./app-docs/features/[name].mdx`
- Append improvements to `./docs/improvements.md`
- GIT commit

Between features:
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

Use on projects with no `./app-docs/` yet, or to rebuild from scratch.

### Phase 1 — Codebase Reconnaissance

**ARCH** does structural read:

```
ARCH — Codebase Map:

Project type: [web app / API / mobile / library / monorepo]

Entry points:
  - [file] — [purpose]

Feature areas identified:
  - [area] — [what it does, key files]

External dependencies worth noting:
  - [service/lib] — [how used]

Unclear (need closer reading):
  - [area] — [why ambiguous]
```

**PROD** separates user-facing from internal. Only user-facing → app-docs entries:
```
PROD — User-Facing Translation:

User-facing features (will get app-docs pages):
  - [feature] — [what the user can do]
  - [feature] — [what the user can do]

Internal only (skip app-docs):
  - [area] — [why — e.g. background job, infra, dev tooling]

Features spread across files ARCH may have missed:
  - [feature]
```

⚠️ **Human checkpoint:** *"Does this capture everything? Reply 'approved' or correct anything."*

### Phase 2 — Build Docs Landing + User Guides

SCRIBE creates `./app-docs/guides/` with **end-user guides** (not dev onboarding):

- **`getting-started.mdx`** — user sign-up/install/first-use walkthrough. (Dev setup → `README.md` + `./docs/`.)
- **Other user guides** — e.g. `account-settings.mdx`, `shortcuts.mdx`, `troubleshooting.mdx`. Only if real user questions. Skip if none.

**Do not** create `architecture.mdx` / `conventions.mdx` — engineering concerns → `./docs/`.

Create `./app-docs/index.mdx` — **docs landing page**:
```mdx
---
title: [Product name] Docs
description: [One sentence — what product does, written to the user]
last_updated: [date]
---

# [Product name] Docs

[2-3 sentence plain-English welcome. What product is, who it's for, where to start.]

## Get started
- [Getting started](./guides/getting-started.mdx) — [one-line hook]

## Features
- [Feature name](./features/[name].mdx) — [one-line user-facing description]
- [Feature name](./features/[name].mdx) — [one-line user-facing description]

## Guides
- [Guide title](./guides/[name].mdx) — [one-line hook]

(Omit any section with no entries. Don't leave empty headers.)
```

### Phase 3 — Document All User-Facing Features

Per PROD's user-facing list (internal-only skipped), run `/ae-doc` flow — ARCH reads code, SCRIBE Q&A, writes MDX.

### Phase 4 — PROD Review

**PROD** reads every generated file + flags:
- **Engineering leakage** — file paths, function names, code blocks, jargon snuck into app-docs. Remove/reword.
- **Unreachable capabilities** — bullets or steps not exposed to user.
- **Missing workflows** — common user tasks not covered.
- **Confusing sections** — would first-time user follow this?

SCRIBE fixes all flagged.

### Phase 5 — Complete

**GIT** commits:
```
docs: initialise end-user app-docs from codebase analysis
```

```
━━━ DOC-ALL --FULL COMPLETE ━━━

Landing page:        ./app-docs/index.mdx
User guides created: [list]
Features documented: X
Internal-only areas skipped: Y

⚠️ Review ./app-docs/ as if you were a first-time user of the product.
SCRIBE will keep docs updated after every /ae-ship and /ae-fix.
```
