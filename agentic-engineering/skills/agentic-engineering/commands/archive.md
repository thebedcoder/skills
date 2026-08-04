## `/archive [feature-name | --all]` — Compact Shipped Feature Docs

**Agent:** ARCH

**Goal:** Replace shipped feature's working docs with single `SUMMARY.md`. Originals deleted — git history preserves them. Cuts stale-doc scan cost for `/status`, `/ship-all`, `/analyze`.

**Inputs (read first):** `./docs/INDEX.md`. `$ARGUMENTS` contains `--all` → Bulk mode section below. No argument → list features where all stories checked + not yet archived, then `[ASK: multi]` *"Which features should I archive?"* — one option per eligible feature, none pre-checked, `minSelected: 1`. Selecting every option is equivalent to `--all` (one combined gate). No eligible features → report and exit without a widget.

### Guards

1. Feature dir exists under `./docs/features/`. `SUMMARY.md` present + `STORIES.md` absent → already archived, report + exit.
2. Every checkbox in `STORIES.md` checked. Unchecked stories → refuse, list them, exit. Partial archive = lost AC for remaining work.
3. **HARD GATE** `[ASK: confirm]`: print the full list of files to be deleted **and** the rendered `SUMMARY.md` in the message body first, then ask *"Delete these N files and replace with SUMMARY.md?"* → **Archive it** · **Cancel**. Nothing deleted before approval. Per SKILL.md, a destructive gate never shows the widget without the deletion list above it.

### Step 1 — Build SUMMARY.md

Read `PRD.md`, `STORIES.md`, `PROGRESS.md`, `reviews/`. Write `./docs/features/[feature-name]/SUMMARY.md`:

```markdown
# [feature-name] — archived [YYYY-MM-DD]

X stories shipped.

## Stories
- STORY-001: [title] — [one-line AC digest]

## Binding decisions
<!-- only decisions constraining future work: API contracts, chosen libraries, rejected approaches -->
- [decision] — [why]

## Test rollup (frozen at archive)
Tests: M/N AC mapped across K stories (P%). Pyramid: unit U · integration I · e2e E.

## Pointers
- Data model: ./data-model.md
- End-user docs: ../../../app-docs/features/[feature-name].mdx
- Full history: `git log --follow -- docs/features/[feature-name]/`
```

Rules:
- Rollup numbers: same parse as `/status` (AC Coverage matrices in `PROGRESS.md`). No matrices → omit section.
- Pointer lines only for files that exist.
- Summary ≤ ~40 lines. Narrative history lives in git, not SUMMARY.md.

### Step 2 — Delete originals

After approval: delete `PRD.md`, `EPICS.md`, `STORIES.md`, `PROGRESS.md`, `reviews/`, `artifacts/`, `data-model.md` **stays** — schema decisions outlive stories. Feature dir after: `SUMMARY.md` (+ `data-model.md` if existed).

### Step 3 — Update INDEX + changelog

- `./docs/INDEX.md` feature row: status → `archived 📦`.
- `./docs/CHANGELOG.md` prepend: `- [ARCHIVE] [feature-name] docs compacted to SUMMARY.md`.

### Step 4 — Commit

```
chore([feature-name]): archive feature docs to SUMMARY.md
```

### Bulk mode (`--all`)

1. Eligible = every feature passing Guards 1–2 (all stories checked, not yet archived). None → report "nothing to archive" + exit.
2. Build SUMMARY.md content per feature — Step 1 rules.
3. **ONE combined HARD GATE:** show per feature — deletion list + rendered SUMMARY.md. Single confirmation for whole batch. User names exclusions → drop those, proceed with rest.
4. Apply per feature in sequence: write SUMMARY.md → delete originals → update INDEX row + CHANGELOG line → commit. **Separate commit per feature** — single revert un-archives single feature. Never one batch commit.

### Gotchas

- **Won't-fix findings already live in `./docs/improvements.md`.** Never copy review findings into SUMMARY.md — one source of truth.
- **app-docs untouched.** End-user docs are product surface, not working docs.
- **Un-archive = git revert**, not regeneration. User wants originals back → `git log --follow` the feature dir.
- **Binding decisions ≠ story recap.** Decision earns a line only if it constrains code not yet written.
