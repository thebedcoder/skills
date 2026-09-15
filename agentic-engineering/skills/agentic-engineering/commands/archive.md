## `/archive [feature-name | --all | --apply]` — Extract Durable Knowledge, Then Compact

**Agent:** ARCH

**Goal:** Move what still matters out of a shipped feature's working docs and into the stores agents actually read, then delete the originals. Git history preserves them. Cuts stale-doc scan cost for `/status`, `/ship-all`, `/analyze`.

**Archive is an extraction command. Deletion is the side effect.** The reverse framing is how it destroyed 97% of a project's design reasoning: it compacted files, when the thing worth keeping was a handful of constraints scattered inside them.

### What goes where

Route by what the content *is*, never by which file it sat in. Destination is decided by what gets read:

| Content | Destination | Why there |
|---|---|---|
| Constraint that still binds code | `./docs/DECISIONS.md` — `DEC-NNN`, `source: archive` | read every session (titles), on demand in full |
| Open obligation — unmet gate, override, deferred measurement | `./docs/BACKLOG.md` — `NOTE-NNN` | it is undone work, not history |
| What the feature was · story list · frozen test rollup · pointers to what survived | `SUMMARY.md` | `/status` and `/analyze` read it for archived features |
| Narrative, review transcripts, AC text, epics | deleted | git has it, nothing reads it |

**`SUMMARY.md` is an index, not a store — and an index entry has to identify the thing it indexes.** It is read. `/status` takes the story count and the frozen rollup, `/plan-all` uses it as a skip marker, and `analyze.md` Step 2 instructs agents outright: *"Archived features carry `SUMMARY.md` only — read it."* For a feature whose docs are gone this file is the entire record, so it must say what the feature **was**.

Not a store, though. Durable knowledge written here instead of `DECISIONS.md` or `BACKLOG.md` moves from *deleted* to *present but unread* — `SUMMARY.md` is opened for one feature at a time, by someone already looking at it. Keep it small: identify, point, freeze numbers. Never restate.

**Never write `./docs/MEMORY.md`.** It has a hard line cap and `/cleanup` rewrites it wholesale — an archive append would blow the cap or be clobbered next cleanup.

### Three ways this command destroys value

Every guard and scan below exists for one of them:

1. Deletes the only copy of a decision — the feature's reasoning was never promoted to `DECISIONS.md`. Step 1A.
2. Leaves a dangling citation — source code or a live doc points into the delete set. Step 1B.
3. Compacts docs still being written against — unmerged branch, recent amendment. Guards 4 + 5, Step 1C.

**Archive is the last responsible moment.** It is the final point at which the source docs still exist. Extraction happens here or never.

### Two phases

Extraction is **reconstruction** — a model reading docs it did not write, long after the fact, with no author to check against. Some of it will be wrong, stale, or a restatement of what the code plainly says. `/cleanup` names the cost: an invented `DEC-` entry is worse than none, because it trains the next agent to ignore the file. A hundred unreviewed entries cost you the trust in the entries that are real.

So extraction is proposed, reviewed, then applied:

| Phase | Invocation | Writes | Deletes |
|---|---|---|---|
| 1 — propose | `/archive <feature>` · `/archive --all` | `SUMMARY.md` files, `.agentic/archive-extract.md`, `.agentic/archive-plan.md` | nothing |
| 2 — apply | `/archive --apply` | `DECISIONS.md`, `BACKLOG.md`, `INDEX.md`, `CHANGELOG.md` | the originals |

The human edits `.agentic/archive-extract.md` between the two — in an editor, not a chat widget, because a hundred proposed entries cannot be reviewed in a widget. **Delete a block there and it is never written.** That is the whole review mechanism.

**Phase 1 proposing nothing → no second phase.** A feature whose decisions are already in `DECISIONS.md` and which carries no open obligations has nothing to review: run the gate immediately and apply on approval. Do not force two commands on the simple case.

**Inputs (read first):** `./docs/INDEX.md`. `./docs/DECISIONS.md` — headings **plus** `date:`/`story:` lines, not titles only. SKILL.md's titles-only rule is relaxed for this command: the `story:` field is the attribution key Step 1A runs on. Cheap and bounded:

```bash
grep -nE '^## DEC-|^date: .*story:' docs/DECISIONS.md
```

`$ARGUMENTS` contains `--apply` → Step 3 only; everything above it is already done. `--all` → Bulk mode. No argument → run Step 0 + Guards across every feature, then `[ASK: multi]` *"Which features should I archive?"* — one option per eligible feature, none pre-checked, `minSelected: 1`. No eligible features → report why each was excluded (cap 5) and exit without a widget.

### Step 0 — Resolve status, per feature

**`PROGRESS.md` is the status source. `STORIES.md` checkboxes are fallback only.** Checkboxes are written during `/implement` and are routinely never ticked back on features that shipped — a count of them refuses finished work and approves work in flight. `PROGRESS.md` only ever gets an entry when a story actually landed.

Authority order:

| Rank | Source | Reads |
|---|---|---|
| 1 | `PROGRESS.md` | `## STORY-XXX` entry present = that story shipped |
| 2 | `./docs/INDEX.md` feature row | `complete ✅ N/N` = feature claimed done |
| 3 | `STORIES.md` checkboxes | **only when `PROGRESS.md` is absent** |

**Story ids are not all `STORY-NNN`.** Real projects carry `STORY-093`, `STORY-M1`, `STORY-A`, `STORY-CF-001`, `UAP-001`, `IMPROV2-001`. Match the leading token of a story line against `[A-Z][A-Z0-9]*(-[A-Z0-9]+)+`. Never hardcode the `STORY-` prefix.

**Three checkbox dialects coexist**, plus a partial marker. When falling back to rank 3:

| Form | Reading |
|---|---|
| `- [x] STORY-M1: …` / `- [x] **STORY-151**: …` | shipped |
| `- [ ] …` | not shipped |
| `- [~] …` | **partial — in flight.** A checked/unchecked count cannot see it. Treat as not shipped |
| `## STORY-093 — …` | heading form, carries no checkbox. **Never count as unchecked** — resolve it through `PROGRESS.md` |

**Branch lookup.** Needed by Guard 4. In order:

1. `Branch:` line in `PROGRESS.md` — the usual case.
2. `git branch -a --list "*<feature-slug>*"` — exactly one match wins.
3. No match → branch unknown. Not a refusal; report it as informational at the gate.

### Guards (per feature, in order — first failure decides)

1. Feature dir exists under `./docs/features/`. `SUMMARY.md` present + `STORIES.md` absent → already archived, report + exit.
2. **Something to compact.** No `STORIES.md` **and** no `PROGRESS.md` → not eligible. Report + skip. A PRD-only feature trades a full PRD for a thinner summary: pure loss, zero compaction benefit.
3. **Every story shipped**, resolved through Step 0's authority order. Story id in `STORIES.md` with no `PROGRESS.md` entry → refuse, list them (cap 5), exit. Unticked checkboxes alone never refuse a feature whose `PROGRESS.md` is complete.
4. **Branch merged.** Resolve the branch, then:

   ```bash
   base=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)
   ref=$(git rev-parse --verify --quiet "origin/<branch>" || git rev-parse --verify --quiet "<branch>")
   [ -n "$ref" ] && git rev-list --count "$base".."$ref"
   ```

   Count > 0 → refuse. An open PR means reviewers are still reading these exact files. Report `<branch> — N commits ahead of <base>`. Neither ref resolves (branch deleted after merge) → check passes, note it.
5. **In-flight language in `PROGRESS.md`** → refuse regardless of counts. Case-insensitive: `PR open`, `in review`, `in progress`, `WIP`, `blocked`, `not started`, `TODO`. **`Open at completion` is not in-flight language** — it records gates overridden at ship time, and Step 2B routes it to `BACKLOG.md`.

Passing all five makes a feature **eligible**, not approved. Step 1 still runs on every eligible feature, and its findings reach the gate.

### Step 1 — Pre-gate scan (per feature, non-destructive)

#### 1A — Does `DECISIONS.md` actually cover this feature?

**Verify the premise before acting on it.** `## Decisions` links instead of restating because `/cleanup` is supposed to have written each decision to `./docs/DECISIONS.md` already. On a project older than that file, or one where `/cleanup` ran on some features and not others, the premise is false — and archiving then deletes the only copy of the reasoning, which is the one thing `CHANGELOG.md` and `git log` do not carry.

Build the feature's id set: every story id found in `STORIES.md` and `PROGRESS.md` (Step 0 regex). An entry in `DECISIONS.md` is attributable to this feature when any holds:

- its `story:` field names an id in the set;
- the feature slug appears in its heading or body;
- it cites an issue number (`#NNN`) that also appears in the feature's own docs.

Zero attributable entries → **no coverage** → the feature's decisions are extracted in Step 2B. Partial coverage → extract only what nothing covers.

Surface the count at the gate verbatim: `N of M features have no DECISIONS.md coverage.`

#### 1B — Who points at the files about to be deleted?

Nothing checked this before. Live citations into the delete set are common, and they include shipped source — a comment in a `.ts` file citing a `PRD.md` for the rule it implements.

```bash
grep -rnE "docs/features/<f>/(PRD|EPICS|STORIES|PROGRESS)\.md|docs/features/<f>/reviews/" . \
  --exclude-dir=.git --exclude-dir=node_modules
```

Drop every hit whose own path is inside a feature dir in the delete set — those citations die with their file. Bucket what remains:

| Bucket | What | At the gate |
|---|---|---|
| **Blocking** | source code (anything outside `docs/` and `app-docs/`), and live docs: `CLAUDE.md`, `docs/DECISIONS.md`, `docs/MEMORY.md`, `docs/CONSTITUTION.md`, `docs/INDEX.md`, `README*`, `app-docs/` | refuse the feature **unless** the user picks Repoint |
| **Informational** | `docs/CHANGELOG.md`, settings globs and config that match by pattern rather than cite a file | shown, never blocks — a dead path in a changelog line is a fact about the past |

Show `file:line → target` form, cap 5, `+N more` after. Repointing rewrites the cited path to `docs/features/<f>/SUMMARY.md`, and happens in Step 3 inside the same commit as the deletion, so the tree is never broken between commits.

**A repoint is only honest if the claim survived.** Source code citing `PRD.md` for a specific rule → that rule becomes a `DEC-` entry in Step 2B, and the citation repoints to it; otherwise the feature is not archivable.

#### 1C — Are these docs still live?

Completed long ago does not mean finished with. A feature's PRD amended last month with a real finding, and cited from shipped source, is a working document.

```bash
git log -1 --format=%ad --date=short -- docs/features/<f>/PRD.md docs/features/<f>/PROGRESS.md docs/features/<f>/STORIES.md
```

Within 90 days → flag at the gate as `recently amended — still in use`. **Not auto-excluded.** The human decides; an old feature getting a correction is exactly the case a rule cannot call. An edit dated *after* the last `PROGRESS.md` story entry is the sharper signal — say so when it holds.

### Step 2 — Propose (Phase 1 — writes nothing destructive)

#### 2A — `SUMMARY.md`, one per feature

Read `PRD.md`, `STORIES.md`, `PROGRESS.md`, `reviews/`. Write `./docs/features/[feature-name]/SUMMARY.md`:

```markdown
# [feature-name] — archived [YYYY-MM-DD]

X stories shipped.

## What it was
[PRD `## Problem`, trimmed to ≤ 3 lines]

**Approach:** [approach — including the option it beat, where the PRD names one]

## Stories
- STORY-001: [title] — [one-line AC digest]

## Where it lives
- src/theme/
- src/components/settings/

## Decisions
- DEC-004, DEC-118 — see ../../DECISIONS.md

## Open at completion
- NOTE-042 — see ../../BACKLOG.md

## Test rollup (frozen at archive)
Tests: M/N AC mapped across K stories (P%). Pyramid: unit U · integration I · e2e E.

## Pointers
- Data model: ./data-model.md
- End-user docs: ../../../app-docs/features/[feature-name].md
- Full history: `git log --follow -- docs/features/[feature-name]/`
```

##### `## What it was` — conditional

Without it the file names a feature, counts its stories and lists its parts, and never says what the feature *was* or why it existed. Once `PRD.md` is deleted nobody can recover that from the summary.

Two things. Both bounded, both prose lifted from `PRD.md`, neither invented:

- **The problem.** `## Problem`, else `## Context`, else the PRD's opening paragraph. Trim to **≤ 3 lines**. Never `## Goals` — goals restate the story list one abstraction up.
- **The `**Approach:**` line**, *including the option it beat* where the PRD names one. PRDs commonly open `**Approach:** Option B — <what>`. That sentence is the cheapest answer to "why is it built this way", and unlike a non-goal it cannot go stale: the choice was made, and the road not taken stays not taken.

No problem statement anywhere in the PRD → omit the whole section. `**Approach:**` absent → omit that line, keep the problem.

**Never copy `## Non-Goals`.** Not trimmed, not summarised, not "for context". A non-goal describes the world **at plan time**; a `SUMMARY.md` is read as describing the world **now**. `multi-format` shipped carrying:

```
- Android `<plurals>` XML tags (deferred — mapped to base string for MVP)
- `.stringsdict` iOS plurals files (deferred)
- Nested i18next JSON keys (flat only for MVP)
```

All three shipped in later features. Freeze that block into a permanent `SUMMARY.md` and you install three false statements about the product, in the one file `/analyze` is told to trust for an archived feature. **A non-goal that still binds code is a decision** — route it to `DECISIONS.md` through Step 2B, which exists for exactly this.

##### `## Stories` — the AC digest is required

`- STORY-001: [title] — [one-line AC digest]`. **The digest is not optional.** It is the easiest part of the line to drop and carries most of the line's information. `DM-002: ThemeProvider + Tailwind config` says nothing the id and title did not. `DM-002: ThemeProvider + Tailwind config — dark class on <html>, tokens resolve from CSS vars` says what shipped.

Digest source, in order: the story's `AC-N` lines in `STORIES.md`, collapsed to one clause; else its `### AC Coverage` rows in `PROGRESS.md`; else the story's own description line. **Story with no AC and no description → title alone, no trailing `—`.** Never invent a digest to fill the slot.

##### `## Where it lives` — conditional, and verified

The one thing a reader cannot cheaply reconstruct is which directories the feature touched. Every other section points at something that still exists; this one has to be rebuilt before `PROGRESS.md` goes.

Derive from path-shaped tokens in `PROGRESS.md` — the `Files changed:` label where present, prose elsewhere. Collapse files to their directories, dedupe, cap ~6 lines.

**Every emitted path must be verified to exist on disk at archive time. Drop the rest.**

```bash
while read -r p; do [ -e "$p" ] && echo "$p"; done
```

Measured on a 102-feature repo, only **7** `PROGRESS.md` files carry a literal `Files changed:` label. Most extraction is therefore from prose, and prose extraction picks up junk — `characterization`, `render` and `src` all surfaced as bare relative fragments indistinguishable from real paths. Existence-filtering removes them, and makes the section self-validating the day it is written. Nothing survives the filter → omit the section.

Rules:

- **Every section is a pointer, a frozen number, or prose lifted from the PRD.** `## Decisions` and `## Open at completion` list ids and link out — they never restate the content. Two copies of one decision drift; the id is stable and the store is the store.
- Ids not known until Phase 2 allocates them → write the section with a `(pending --apply)` placeholder and fill it during Step 3.
- **Section with nothing to point at → omit it.** No empty headings, no `_none_` placeholders. Applies to every section, the two new ones included.
- Rollup numbers: same parse as `/status` (AC Coverage matrices in `PROGRESS.md`). No matrices → omit section.
- Pointer lines only for files that exist.
- **`X stories shipped.` and `## Test rollup (frozen at archive)` are parsing contracts — byte-identical, always.** `/status` reads the archived story count and the frozen rollup out of them; `/plan-all` skips on the file's presence. Reword either and both commands go quiet without erroring.
- Summary ≤ ~55 lines, `## Stories` excepted — a 53-story feature needs 53 lines and the cap was never meetable for it. Narrative history lives in git.

#### 2B — `.agentic/archive-extract.md`, the review file

Gitignored, alongside `.agentic/focus.md`. Two sections. **Delete a block here and it is never written.**

```markdown
# Archive extract — proposed, not yet written
<!-- Edit freely. Delete any block you don't want. Then: /archive --apply -->

## Decisions → docs/DECISIONS.md

### [feature-name] — no DECISIONS.md coverage
```

Per decision, the `/cleanup` Step 3 shape plus two fields this command adds:

```markdown
## DEC-NNN — [decision, one line]
date: [feature's ship date] · story: [STORY-XXX] · status: active
source: archive · confidence: reconstructed

**Chose:** [what]
**Because:** [why]
**Rules out:** [what this forecloses]
```

- **`date:` is the feature's ship date**, from its last `PROGRESS.md` entry — never today. Stamping two years of history with today's date is how a decision log becomes unreadable.
- **`source: archive · confidence: reconstructed`** is mandatory and never omitted. A reader must be able to tell a decision recorded when it was made from one inferred afterward.
- **Write the title to stand alone.** `DECISIONS.md` is read titles-only at session start; that one line is the entire anti-re-litigation payload. `DEC-118 — Canonical intermediate format is ARB, not XLIFF` works. `DEC-118 — Format decision` does not.
- Sources, in order: `PRD.md` non-goals and rationale, `PROGRESS.md` `### Notes`, resolutions in `reviews/`.
- Apply `/cleanup` Step 3's test — *would someone six months from now change this by accident if it weren't written down?* No → drop it. Extract only what still constrains code. **Zero for a feature is a normal, correct answer.**
- Ids are provisional. Step 3 allocates the real ones from the highest existing `DEC-NNN` at apply time.

Second section, same file:

```markdown
## Open obligations → docs/BACKLOG.md

### [feature-name] — from PROGRESS.md "Open at completion"
```

Per obligation, the `/note` Phase 3 shape:

```markdown
## NOTE-NNN: [short title] — [feature's ship date]
**Type:** improvement
**Status:** backlog
**Complexity:** [S/M/L, or unknown]
**Priority:** high

**Description:**
[verbatim from PROGRESS.md]

**Related feature:** [feature-name] (archived)
```

Source: `PROGRESS.md`'s `Open at completion` / `Open` / `Deferred` section, copied verbatim. No such section → scrape lines matching unmet-gate language: `GATE … open`, `override`, `overridden`, `waived`, `never been taken`, `not measured`, `still owed`, `deferred to`. Nothing found → the feature contributes no block.

**An unmet gate is debt, not history.** Three overridden quality gates recorded only in a shipping feature's `PROGRESS.md` are invisible the moment that file is deleted — and equally invisible in a `SUMMARY.md` nothing reads. `BACKLOG.md` is where undone work is looked for. Default `Priority: high` — an override survived a gate once and nobody has decided it is acceptable forever.

#### 2C — `.agentic/archive-plan.md`, the deletion table

One row per feature: name · files to delete · bytes before → after · DEC coverage · inbound refs · last amended. This is what the gate cites instead of rendering 94 deletion lists into chat.

### The gate

⚠️ **Human checkpoint** `[ASK: single]`. Nothing is deleted before approval — Steps 1 and 2 only read and write proposals.

Message body, above the widget:

```
Deleting N files across M features · 2,543 KB → 68 KB (97.3% discarded)

Extracted for review:
  41 decisions → docs/DECISIONS.md   (all marked source: archive)
   6 obligations → docs/BACKLOG.md

⚠️  12 of 94 features have no DECISIONS.md coverage
⚠️  7 inbound citations point into the delete set (4 blocking, 3 informational)
⚠️  20 features amended within 90 days — still in use

⚠️  Archiving ends /converge for these features permanently — PRD and stories
    are the inventory it audits against. Run /converge first if you ever will.

Blocking citations:
  packages/core/src/types/arb.ts:574   → validation-engine/PRD.md
  apps/cli/src/write-transaction.ts:22 → stringlane-run-write-safety/PROGRESS.md
  +2 more

Review before applying:  .agentic/archive-extract.md   ← edit or delete blocks here
Full deletion table:     .agentic/archive-plan.md
Written summaries:       docs/features/*/SUMMARY.md
```

Then the widget → **Stop here — I'll review the extract (Recommended)** · **Apply now** · **Cancel**.

- **Stop here** → print `Next: edit .agentic/archive-extract.md, then run /archive --apply` and exit. Nothing deleted.
- **Apply now** → straight into Step 3 with the extract unedited. Only recommend this when Step 2B proposed nothing.
- **Cancel** → nothing deleted, and the written `SUMMARY.md` files are left untracked. Say so, with the cleanup line:

  ```bash
  git clean -f -- 'docs/features/*/SUMMARY.md'
  ```

Blocking citations exist and the chosen path archives those features → follow-up `[ASK: confirm]`: *"Repoint N citations?"* → **Repoint** · **Skip those features**.

### Step 3 — Apply (`--apply`)

No `.agentic/archive-extract.md` → `Nothing staged. Run /archive [feature | --all] first.` and exit.

**Re-run Guards 1–5 before touching anything.** The tree moved between phases — a branch may have reopened, a doc may have been amended. A guard that now fails drops that feature from the batch and says so.

Then, per feature, in one commit:

1. **Append surviving `## Decisions` blocks** to `./docs/DECISIONS.md` under a trailing `## Backfilled from archive` heading, ids allocated from the highest existing `DEC-NNN`. Appended at the bottom, not prepended — the live section stays newest-first, and back-dated reconstructions do not masquerade as recent decisions.
2. **Append surviving obligation blocks** to `./docs/BACKLOG.md`, ids from the highest existing `NOTE-NNN`.
3. **Fill the `(pending --apply)` placeholders** in that feature's `SUMMARY.md` with the ids just allocated.
4. **Repoint** blocking citations from Step 1B, if the user chose Repoint.
5. **Delete** `PRD.md`, `EPICS.md`, `STORIES.md`, `PROGRESS.md`, `reviews/`, `artifacts/`. `data-model.md` **stays** — schema decisions outlive stories. Feature dir after: `SUMMARY.md` (+ `data-model.md` if it existed).
6. `./docs/INDEX.md` feature row: status → `archived 📦`.
7. `./docs/CHANGELOG.md` prepend: `- [ARCHIVE] [feature-name] docs compacted to SUMMARY.md — N decisions, M obligations extracted`.

```
chore([feature-name]): archive feature docs to SUMMARY.md
```

**Separate commit per feature** — single revert un-archives a single feature. Never one batch commit.

**Rolling back a partial `--apply`: `git reset --hard <sha>`, and nothing wider.** It already removes staged-but-uncommitted new files, which is the only thing `git clean` would add here. **Never widen a `git clean` to a directory.** A directory-scoped clean during rollback of a real `--apply` destroyed untracked working docs belonging to a feature the run had *refused* — they were in no branch, no stash and no snapshot. The Cancel path's `git clean -f -- 'docs/features/*/SUMMARY.md'` is safe only because it is pinned to that one filename.

Batch complete → delete `.agentic/archive-extract.md` and `.agentic/archive-plan.md`. Stale staging files are how a second run re-applies the first run's extract.

### Bulk mode (`--all`)

1. Eligible = every feature passing Guards 1–5. None → report "nothing to archive" + exit.
2. Run Step 1 scans per feature.
3. Run Step 2 per feature — all three artifacts, nothing deleted.
4. **ONE combined gate**, in the form above. **Never render per-feature deletion lists or full summaries in chat** — at 94 features that is thousands of lines, and it violates SKILL.md's cap of 5 surfaced items. The gate shows counts, the aggregate ratio, the flags, **2–3 rendered `SUMMARY.md` samples** (largest, one flagged, one plain), and the on-disk paths.
5. `/archive --apply` after review → Step 3 in sequence.

### Gotchas

- **Checkboxes lie in both directions.** A finished feature with 53 unticked boxes and an in-flight feature with zero unticked boxes are both routine. `PROGRESS.md` is the source; see Step 0.
- **Verify the `DECISIONS.md` premise per feature, never once per project.** The file existing does not mean it covers the feature in front of you. Most of a long-lived project predates it.
- **Destination is decided by what reads it, not by what the content is about.** `SUMMARY.md` is read for one feature, by someone already looking at that feature. `DECISIONS.md` is read titles-first every session, by everyone. A constraint filed in the first is invisible to the agent about to break it. That is the whole reason this command routes.
- **`confidence: reconstructed` is never dropped to make an entry look better.** The marker is what keeps the other entries trustworthy.
- **A non-goal states the world at plan time, not now.** `multi-format` deferred Android `<plurals>`, `.stringsdict` and nested i18next keys; all three shipped in later features. Copy that block into a permanent `SUMMARY.md` and it becomes three false claims in the file `/analyze` is told to trust. Non-goal that still binds code → `DECISIONS.md` via Step 2B. Never `SUMMARY.md`.
- **Won't-fix findings already live in `./docs/improvements.md`.** Never copy review findings into `SUMMARY.md` or `BACKLOG.md` — one source of truth.
- **app-docs untouched.** End-user docs are product surface, not working docs.
- **Un-archive = git revert**, not regeneration. User wants originals back → `git log --follow` the feature dir.
- **Compression ratio is not the score.** 97% discarded is a good number only if what was extracted holds the decisions, the obligations and whatever source code was citing. Otherwise it is the measure of what was lost.
