# Visual Artifacts — Phase 1 (Manual Baseline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `### Visual Artifacts` table to PROGRESS.md per shipped story (sibling to Edge probes), validated by `ae-ux` during Phase 4 review. Missing / stale / empty file references emit `should-fix` warnings (informational, never blockers). Section is omitted for backend-only stories.

**Architecture:** New markdown table written by `/implement` at Phase 1, validated by `ae-ux` during Phase 4. No new commands, no new agents, no catalog (catalog ships in Phase 2 — separate plan). All warnings are informational-only; constitution-based escalation ships in Phase 3 (separate plan).

**Tech Stack:** Markdown agent prompts, markdown command bodies, no code or tests in this repo — verification is installer round-trip + adapter round-trip + scratch-project exercise after restart.

**Spec:** `docs/superpowers/specs/2026-05-21-visual-artifacts-design.md` — read the "Phase 1: Manual baseline" section.

---

## File structure

**Modify (6 files):**

| File | Change |
|---|---|
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | PROGRESS.md template gains `### Visual Artifacts` section (placed between Edge probes and Files changed) + instruction |
| `agentic-engineering/skills/agentic-engineering/commands/ship.md` | Phase 4 (frontend implementation) gains a prose reminder before invoking review |
| `agentic-engineering/agents/ae-ux/AGENT.md` | Adds Visual Artifacts validation step; existing report template gains `Visual Artifacts:` block |
| `agentic-engineering/agents/ae-ux/references/visual-consistency.md` | Append `## Captured artifacts` section |
| `agentic-engineering/adapters/AGENTS.md.template` | One sentence inside marker block |
| `agentic-engineering/README.md` | One sentence in `/ship` row description |

**Create:** none.

**Do NOT modify:** `install.sh` (no install changes — Phase 2 adds the catalog copy), any agent other than `ae-ux`, `commands/review.md`, `commands/feature.md`, `commands/init.md`, `commands/bootstrap.md`, `commands/fix.md`, any wrapper, `USER_COMMANDS`, the SKILL.md.

---

## Branch setup

- [ ] **Step 0: Create feature branch**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git checkout -b feat/agentic-engineering-visual-artifacts-phase-1
git branch --show-current
```

Expected: `feat/agentic-engineering-visual-artifacts-phase-1`.

---

## Task 1: Add `### Visual Artifacts` section to PROGRESS.md template in `/implement`

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/implement.md`

- [ ] **Step 1: Locate the existing template inside `/implement`**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "### AC Coverage\|### Edge probes\|### Files changed" agentic-engineering/skills/agentic-engineering/commands/implement.md
```

The current template (inside a fenced ```markdown block) has this structure:

```
### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| ... |

### Edge probes (from ae-edge)
| Category | Test |
|----------|------|
| ... |

### Files changed
- [list]

### Notes
[anything notable — narrative continues here]
```

We're inserting `### Visual Artifacts` between `### Edge probes` and `### Files changed`.

- [ ] **Step 2: Insert the Visual Artifacts section in the template**

Use Edit. Find the EXACT block that has the existing `### Edge probes` table immediately followed by `### Files changed`. The block is:

```
### Edge probes (from ae-edge)
| Category | Test |
|----------|------|
| [category] | [file:test_name] |

### Files changed
- [list]
```

Replace with:

```
### Edge probes (from ae-edge)
| Category | Test |
|----------|------|
| [category] | [file:test_name] |

### Visual Artifacts
(omit for backend-only / CLI-only stories)
| AC | Type | File | Notes |
|----|------|------|-------|
| AC-1 | screenshot | artifacts/STORY-XXX/ac-1-name.png | [scenario / viewport / browser] |
| AC-2 | video | artifacts/STORY-XXX/ac-2-name.mp4 | [scenario / viewport / browser] |
| AC-N | [type] | [path or URL] | [notes] |

### Files changed
- [list]
```

- [ ] **Step 3: Add the Visual Artifacts instruction block AFTER the existing "Level column:" instructions**

Find the existing `**Level column:**` instruction paragraph (added during the Verification Pyramid work). After its last bullet, append (caveman style):

```
**Visual Artifacts:** For UI-touching stories, capture screenshots or recordings of each AC's behavior. Drop files in `docs/features/<feature-name>/artifacts/STORY-XXX/`. Reference each capture as a row in the Visual Artifacts table — multiple rows per AC are fine (different viewports, scenarios). `Type` is informational (`screenshot` / `video` / `animated-gif` / `loom-link` / `youtube-link`). `File` is a relative path from repo root OR a URL (Loom, Notion, YouTube). `Notes` is freeform — viewport, browser, scenario.

Omit the entire `### Visual Artifacts` section for backend-only or CLI-only stories. `ae-ux` validates references during `/review` — missing / stale / empty file references emit `should-fix` warnings (informational, never blockers in Phase 1).
```

If a similar paragraph already exists, append to it rather than duplicating.

- [ ] **Step 4: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "### Visual Artifacts" agentic-engineering/skills/agentic-engineering/commands/implement.md
grep -c "Visual Artifacts:\*\*" agentic-engineering/skills/agentic-engineering/commands/implement.md
grep -n "### Edge probes\|### Visual Artifacts\|### Files changed" agentic-engineering/skills/agentic-engineering/commands/implement.md
```

Expected:
- First count = 1 (template heading)
- Second count = 1 (instruction block)
- Third grep shows the three headings IN ORDER: Edge probes, then Visual Artifacts, then Files changed

- [ ] **Step 5: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/implement.md
git commit -m "feat(agentic-engineering): /implement PROGRESS.md template gains Visual Artifacts section"
```

---

## Task 2: Add Phase 4 capture reminder in `/ship`

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/ship.md`

- [ ] **Step 1: Locate the Phase 3 / Phase 4 boundary in ship.md**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "Phase 3 — Frontend\|Phase 4 — Frontend Review\|Phase 5 — End-user docs" agentic-engineering/skills/agentic-engineering/commands/ship.md
```

Find the section heading `**Phase 3 — Frontend**` and its sub-bullets, ending right before `**Phase 4 — Frontend Review**`. Phase 3 currently ends with a GIT commit step (`feat([feature-name]): STORY-XXX — frontend implementation`).

- [ ] **Step 2: Add a reminder bullet at the END of Phase 3**

In `commands/ship.md`, find the closing lines of Phase 3 — they contain something like:

```
- **GIT** commits:
```
feat([feature-name]): STORY-XXX — frontend implementation
```
```

After that block (before the `**Phase 4 — Frontend Review**` heading), insert:

```
- **Reminder before review** *(prose only — not a checkpoint)*: capture screenshots or recordings of each UI AC and drop them into `docs/features/<feature-name>/artifacts/STORY-XXX/`. Reference them in PROGRESS.md's Visual Artifacts table. `ae-ux` validates the references during Phase 4 — missing or stale refs become should-fix warnings (informational, not blockers).
```

(Single line bullet, no checkpoint tag. Phase 3 doesn't pause for visual capture; this is a prose nudge only.)

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Reminder before review" agentic-engineering/skills/agentic-engineering/commands/ship.md
grep -B 1 -A 1 "artifacts/STORY-XXX" agentic-engineering/skills/agentic-engineering/commands/ship.md | head -10
```

Expected: first count = 1; second grep shows the reminder line in context.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/ship.md
git commit -m "feat(agentic-engineering): /ship Phase 3 reminds operator to capture UI before review"
```

---

## Task 3: Add Visual Artifacts validation step to `ae-ux/AGENT.md`

**Files:**
- Modify: `agentic-engineering/agents/ae-ux/AGENT.md`

- [ ] **Step 1: Inspect current ae-ux step structure**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "^## " agentic-engineering/agents/ae-ux/AGENT.md
```

Expected sections include `## Step 1 — ...` through some Step N + a `## Reference files` section. The new validation step appends as the LAST step before `## Reference files`.

- [ ] **Step 2: Insert the new "Visual Artifacts validation" step**

Find the `## Reference files` heading. Insert IMMEDIATELY BEFORE it (with a separator `---` like the existing inter-step separators):

````
---

## Step N — Visual Artifacts validation

Validate captured visual artifacts after the per-area UX review.

### Substep 1: Detect UI changes

Scan the diff (`git diff main...HEAD`). UI is touched if any changed file has an extension or path matching:

- `.tsx`, `.jsx`, `.vue`, `.svelte` (web frontend)
- `.swiftui` files OR `.swift` in `Views/` directories (iOS SwiftUI)
- `.kt` files containing `@Composable` annotations (Android Jetpack Compose)
- `.dart` files in `lib/widgets/` or files containing `extends StatelessWidget` / `extends StatefulWidget` (Flutter UI)
- `.html`, `.css`, `.scss` (web markup/style)

If NONE match → story is non-UI → skip Substep 2 + 3. Report `Visual Artifacts: (non-UI story — skipped)`.

### Substep 2: Locate Visual Artifacts table

Read `./docs/features/<feature-name>/PROGRESS.md`, find the current story's entry, scan for `### Visual Artifacts` heading.

- **If heading is absent AND story has UI changes** → emit `should-fix`: *"No visual artifacts captured. Consider adding screenshots or screen recordings to `docs/features/<name>/artifacts/STORY-XXX/` so reviewers can verify the UI without running the app."*
- **If heading is absent AND story is non-UI** → skip silently (already handled in Substep 1).
- **If heading is present** → continue to Substep 3.

### Substep 3: Validate each row of the Visual Artifacts table

Parse the table. For each row's `File` cell:

1. If the cell value starts with `http://` or `https://` → URL reference (Loom, Notion, YouTube). Skip validation. Continue.
2. Otherwise treat as a relative path from repo root. Check:
   - File exists → continue (no warning)
   - File doesn't exist → emit `should-fix`: *"Stale reference: `<path>` not found in repo."*
   - File exists but is 0 bytes → emit `should-fix`: *"Empty file at `<path>` — capture may have failed."*

All findings are `should-fix` (informational, never blockers in Phase 1). Tag each finding with the AC number from the row when emitting.

### Report

Append to the existing `ae-ux` report a `Visual Artifacts:` block (placed near the report's summary lines):

```
Visual Artifacts:
  ✅ M/N references valid (STORY-XXX)
  ⚠️ Stale: artifacts/STORY-XXX/ac-2-error.mp4 not found
```

For non-UI stories:

```
Visual Artifacts:
  (non-UI story — skipped)
```

For UI stories with no table:

```
Visual Artifacts:
  ⚠️ No visual artifacts captured — consider adding screenshots/recordings
```
````

- [ ] **Step 3: Update the existing Step report template if it exists**

Look at the final report step inside ae-ux's existing structure (likely titled "## Step N — Report" or similar). If there's a formal report block template, add a `Visual Artifacts:` placeholder line near the bottom. If the agent's report is more freeform (no explicit template), skip this — the Step N report block above is sufficient.

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -B 1 -A 5 "^## Step .* — Report" agentic-engineering/agents/ae-ux/AGENT.md
```

If a report template exists, add this line to the template:

```
Visual Artifacts: [✅ M/N valid / ⚠️ N stale, M missing-table / (non-UI story — skipped)]
```

If no formal template — proceed without this step.

- [ ] **Step 4: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Visual Artifacts validation" agentic-engineering/agents/ae-ux/AGENT.md
grep -c "Stale reference\|Empty file\|No visual artifacts captured" agentic-engineering/agents/ae-ux/AGENT.md
grep -c "Visual Artifacts:" agentic-engineering/agents/ae-ux/AGENT.md
```

Expected: first count = 1; second count ≥ 3 (three warning strings); third count ≥ 2 (one in step body + at least one in reports).

- [ ] **Step 5: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-ux/AGENT.md
git commit -m "feat(agentic-engineering): ae-ux validates Visual Artifacts table references"
```

---

## Task 4: Append "Captured artifacts" section to `visual-consistency.md`

**Files:**
- Modify: `agentic-engineering/agents/ae-ux/references/visual-consistency.md`

- [ ] **Step 1: Confirm current file ending**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
tail -10 agentic-engineering/agents/ae-ux/references/visual-consistency.md
```

We're appending a new top-level section at the end of the file.

- [ ] **Step 2: Append the section**

Append exactly the following block to the END of `agentic-engineering/agents/ae-ux/references/visual-consistency.md`:

````markdown

---

## Captured artifacts

The `### Visual Artifacts` table in `PROGRESS.md` is the durable visual record of a shipped story's UI behavior. Each row references one capture (file or URL), tagged with the AC it proves and informational notes (viewport, browser, scenario).

### What counts as an artifact

- Static screenshots (`.png`, `.jpg`, `.webp`)
- Screen recordings (`.mp4`, `.webm`, `.mov`, `.gif`, animated `.webp`)
- Hosted recordings via URL (Loom, Notion, YouTube — recognized by `http://` / `https://` prefix in the `File` cell)

### Validation rules

| File cell value | Validation |
|---|---|
| Starts with `http://` or `https://` | URL — skipped; trust the operator |
| Relative path; file exists, non-zero size | OK |
| Relative path; file doesn't exist | `should-fix`: stale reference |
| Relative path; file exists, 0 bytes | `should-fix`: empty file, capture may have failed |
| Empty cell | `should-fix`: empty File reference |

All warnings are `should-fix` in Phase 1 (informational, never blockers).

### When the section is omitted

For backend-only / CLI-only stories with no UI changes, the entire `### Visual Artifacts` section is omitted from PROGRESS.md. `ae-ux` detects non-UI stories by scanning the diff for UI file extensions (`.tsx`, `.jsx`, `.vue`, `.svelte`, SwiftUI `.swift`, Compose `.kt`, Flutter widget `.dart`, `.html`, `.css`, `.scss`) — none present → skip the entire validation step.

### Multiple rows per AC

A single AC can have multiple Visual Artifacts rows — desktop + mobile viewports, light + dark theme, happy path + error state. The AC column may repeat across rows; that's allowed and expected.

### Naming convention

Operator's choice. The matrix's `File` column is the source of truth; filenames inside `docs/features/<name>/artifacts/STORY-XXX/` aren't validated against a pattern. A useful convention:

```
artifacts/STORY-005/
  ac-1-happy-path-desktop.png
  ac-1-happy-path-mobile.png
  ac-2-error-state.mp4
  ac-3-empty-list.png
```

But `screenshot-2026-05-21-3pm.png` is equally valid if it's referenced correctly in the table.
````

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "^## Captured artifacts" agentic-engineering/agents/ae-ux/references/visual-consistency.md
grep -c "What counts as an artifact\|Validation rules\|When the section is omitted\|Multiple rows per AC\|Naming convention" agentic-engineering/agents/ae-ux/references/visual-consistency.md
tail -3 agentic-engineering/agents/ae-ux/references/visual-consistency.md
```

Expected: first count = 1; second count ≥ 5 (one per sub-heading); tail shows the closing `screenshot-2026-05-21-3pm.png` example.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-ux/references/visual-consistency.md
git commit -m "docs(agentic-engineering): visual-consistency documents Visual Artifacts contract"
```

---

## Task 5: Add Visual Artifacts paragraph to AGENTS.md adapter

**Files:**
- Modify: `agentic-engineering/adapters/AGENTS.md.template`

- [ ] **Step 1: Locate the marker block + existing AC Coverage paragraph**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "agentic-engineering:start v1\|agentic-engineering:end v1\|AC Coverage matrix" agentic-engineering/adapters/AGENTS.md.template
```

The AC Coverage matrix paragraph (added during QA Traceability + extended in Verification Pyramid) sits inside the marker block.

- [ ] **Step 2: Append a new sentence (or paragraph) about Visual Artifacts inside the marker block**

The cleanest spot is **right after** the existing AC Coverage matrix paragraph (which describes the matrix + Level column + pyramid warnings). Insert as a NEW paragraph (with a blank line separator) — Visual Artifacts is a distinct concern from the matrix:

Find the closing of the AC Coverage matrix paragraph (the sentence ending with `...informational, never blockers).` from the pyramid work). After that closing, leave one blank line, then add this new paragraph:

```
**Visual Artifacts table.** UI-touching stories additionally record a `### Visual Artifacts` table in `PROGRESS.md` — one row per captured screenshot or screen recording, mapped to the AC it proves. Files live in `docs/features/<name>/artifacts/STORY-XXX/`. The `File` cell accepts either a relative path or a URL (Loom, Notion, YouTube). `ae-ux` validates references during `/review` — missing or stale refs emit `should-fix` warnings (informational, never blockers in Phase 1). The section is omitted entirely for backend-only or CLI-only stories.
```

- [ ] **Step 3: Verify markers intact + new paragraph landed**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "agentic-engineering:start v1" agentic-engineering/adapters/AGENTS.md.template
grep -c "agentic-engineering:end v1" agentic-engineering/adapters/AGENTS.md.template
grep -c "Visual Artifacts table" agentic-engineering/adapters/AGENTS.md.template
grep -c "AC Coverage matrix" agentic-engineering/adapters/AGENTS.md.template
```

Expected: first two = 1 each (markers not duplicated); third = 1 (new paragraph); fourth ≥ 1 (existing matrix paragraph still present).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/adapters/AGENTS.md.template
git commit -m "docs(agentic-engineering): AGENTS.md template documents Visual Artifacts table"
```

---

## Task 6: Add Visual Artifacts sentence to README

**Files:**
- Modify: `agentic-engineering/README.md`

- [ ] **Step 1: Locate the existing `/ship` row in the commands table**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "^| \`/ship\`" agentic-engineering/README.md
```

Find the `/ship` row (a single line in the table). It currently ends with the pyramid-mix sentence appended during the Verification Pyramid work.

- [ ] **Step 2: Append one more sentence to the same `/ship` row's description cell**

The existing line ends with something like `...soft warning when over half the tests are e2e or zero unit tests exist. |`.

Replace the trailing `|` with a space + new sentence + `|`. Concretely, append BEFORE the final `|` of the row:

```
 UI-touching stories also record a Visual Artifacts table in PROGRESS.md (screenshots/recordings per AC); `ae-ux` validates references during `/review` — stale or missing references become should-fix warnings.
```

(Note: leading space so it follows the existing sentence cleanly; trailing whitespace then closing `|`.)

The result: the `/ship` row is still ONE LINE (no embedded newlines), now with three sentences in its description cell: the original ship-chain description + AC matrix sentence + pyramid sentence + new Visual Artifacts sentence.

- [ ] **Step 3: Verify table integrity**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Visual Artifacts table in PROGRESS.md" agentic-engineering/README.md
awk '/^\| `\/ship`/' agentic-engineering/README.md | wc -l
```

Expected: first count = 1; second = 1 (the `/ship` row is still a single line, no embedded line breaks).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/README.md
git commit -m "docs(agentic-engineering): README documents Visual Artifacts table in /ship"
```

---

## Task 7: Installer round-trip verification

**Goal:** Confirm the per-plugin installer copies the updated files to `~/.claude/` and prior features still install correctly.

- [ ] **Step 1: Run installer**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
bash install.sh
```

Expected: "✅ Done. Restart Claude Code to pick up the changes." with no errors.

- [ ] **Step 2: Verify updated content at `~/.claude/`**

```bash
grep -c "### Visual Artifacts" ~/.claude/skills/agentic-engineering/commands/implement.md
grep -c "Reminder before review" ~/.claude/skills/agentic-engineering/commands/ship.md
grep -c "Visual Artifacts validation\|Stale reference" ~/.claude/agents/ae-ux/AGENT.md
grep -c "^## Captured artifacts" ~/.claude/agents/ae-ux/references/visual-consistency.md
```

Expected: each count ≥ 1.

- [ ] **Step 3: Regression — confirm prior features still installed correctly**

```bash
test -f ~/.claude/agents/ae-edge/AGENT.md && echo "ae-edge: OK"
test -f ~/.claude/skills/agentic-engineering/commands/focus.md && echo "focus: OK"
grep -c "Pyramid math\|Level-field validation" ~/.claude/agents/ae-test/AGENT.md
grep -c "user-invocable" ~/.claude/skills/agentic-engineering/SKILL.md
```

Expected: both echoes succeed; pyramid + Level checks ≥ 1; `user-invocable` ≥ 1 (the install.sh fix from earlier is still applying correctly).

(No commit — verification only.)

---

## Task 8: Adapter round-trip verification

**Goal:** Confirm the multi-tool installer writes the Visual Artifacts paragraph into a non-Claude tool's AGENTS.md and marker block stays idempotent.

- [ ] **Step 1: Set up scratch directory**

```bash
rm -rf /tmp/visual-artifacts-adapter-test
mkdir -p /tmp/visual-artifacts-adapter-test
cd /tmp/visual-artifacts-adapter-test
```

- [ ] **Step 2: Run the multi-tool installer for cursor**

```bash
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
```

Expected: installer reports writing AGENTS.md + `.cursor/rules/`.

- [ ] **Step 3: Verify markers + new paragraph + prior paragraphs**

```bash
grep -c "agentic-engineering:start v1\|agentic-engineering:end v1" /tmp/visual-artifacts-adapter-test/AGENTS.md
grep -c "Visual Artifacts table" /tmp/visual-artifacts-adapter-test/AGENTS.md
grep -c "AC Coverage matrix\|Level\` column declares" /tmp/visual-artifacts-adapter-test/AGENTS.md
```

Expected: first count = 2 (markers intact); second = 1 (new paragraph); third ≥ 1 (prior matrix + pyramid paragraphs still present).

- [ ] **Step 4: Re-run for idempotency**

```bash
cd /tmp/visual-artifacts-adapter-test
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
grep -c "agentic-engineering:start v1" /tmp/visual-artifacts-adapter-test/AGENTS.md
grep -c "Visual Artifacts table" /tmp/visual-artifacts-adapter-test/AGENTS.md
```

Expected: each count = 1 (no duplication on re-install).

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/visual-artifacts-adapter-test
```

(No commit — verification only.)

---

## Task 9: Refresh graphify snapshot

**Goal:** Keep the local knowledge graph current after markdown changes.

- [ ] **Step 1: Run graphify update**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
graphify update . 2>&1 | tail -5
```

If output is "no code files found — nothing to rebuild" → markdown-only changes, no graph update needed. Skip commit.

If `git status agentic-engineering/graphify-out/` shows changes:

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/graphify-out/
git commit -m "chore(agentic-engineering): refresh graphify snapshot for Visual Artifacts Phase 1"
```

(Skip this task entirely if `graphify` binary unavailable.)

---

## Task 10: Deferred live verification (needs Claude Code restart)

**Goal:** Confirm Visual Artifacts validation works end-to-end through `/feature` → `/ship` → `/review`.

**Cannot be automated from this session.** Hand off to the user. Steps for the user to run after restart:

- [ ] **Step 1: Restart Claude Code**

Exit + re-launch so it re-reads `~/.claude/skills/` and `~/.claude/agents/`.

- [ ] **Step 2: Scratch project**

```bash
mkdir -p /tmp/visual-artifacts-e2e
cd /tmp/visual-artifacts-e2e
git init -q
```

Run `/init` in Claude Code; approve generated files.

- [ ] **Step 3: Generate a UI-touching feature**

Run `/feature button-component`. Approve PRD with at least 2 AC. Approve stories.

- [ ] **Step 4: Ship a UI story without captures**

Pick or write a small UI story. Run `/ship STORY-001`.

Verify after the chain completes (or pauses on review):
- `PROGRESS.md` contains a `### Visual Artifacts` table placeholder (empty rows or comment about omission)
- `ae-ux`'s review output emits a `should-fix` warning: "No visual artifacts captured."
- The warning is NOT a blocker — the chain continues to Phase 5 if no other blockers exist.

- [ ] **Step 5: Add captures and re-run review**

Drop a screenshot file at `docs/features/button-component/artifacts/STORY-001/ac-1-button.png`. Add a row to the Visual Artifacts table referencing it. Run `/review` again. Expected: `ae-ux` reports `✅ 1/1 references valid`, no warnings.

- [ ] **Step 6: Stale-reference test**

Edit PROGRESS.md to reference a missing file: `artifacts/STORY-001/nonexistent.png`. Run `/review`. Expected: `should-fix` warning about stale reference. Still not a blocker.

- [ ] **Step 7: URL reference**

Replace the file reference with a Loom-style URL: `https://www.loom.com/share/abc123`. Run `/review`. Expected: `ae-ux` skips URL validation, no warning emitted.

- [ ] **Step 8: Backend-only story compat check**

Create a story that touches only Python/Go/etc. (no `.tsx`/`.jsx`/`.vue`/etc. in the diff). Confirm the `### Visual Artifacts` section is omitted entirely from PROGRESS.md. Run `/review`. Expected: `ae-ux` reports `Visual Artifacts: (non-UI story — skipped)`. No warnings.

- [ ] **Step 9: 0-byte file test**

Create an empty file via `touch docs/features/button-component/artifacts/STORY-001/empty.png`. Reference it in the table. Run `/review`. Expected: `should-fix` warning about empty file.

---

## Final step: finish the branch

After Tasks 1–9 complete and Task 10 documented:

- [ ] **Announce:** "I'm using the finishing-a-development-branch skill to complete this work."
- [ ] **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`. There are no automated tests in this plugin — verification is the installer round-trip in Task 7 + adapter round-trip in Task 8. Task 10 stays deferred for the user to exercise after restart.

---

## Self-review notes

- **Spec coverage:** every Phase 1 requirement from the spec maps to a task.
  - Visual Artifacts table in PROGRESS.md → Task 1
  - Phase 4 reminder → Task 2
  - ae-ux validation step (UI detection + table presence check + per-row validation + URL skip) → Task 3
  - Report block with Visual Artifacts: line → Task 3
  - "Captured artifacts" reference section → Task 4
  - AGENTS.md adapter paragraph → Task 5
  - README sentence → Task 6
  - Verification (installer + adapter + graphify + deferred live) → Tasks 7, 8, 9, 10
- **Placeholder scan:** no TBD / vague prose. Every step has exact strings to find/insert or commands to run. Open questions from the spec are deferred to Phase 2/3 plans (not this plan).
- **Type consistency:**
  - `### Visual Artifacts` heading is spelled identically across implement.md template, ae-ux validation step, visual-consistency.md reference, AGENTS.md template paragraph, and the deferred live verification (Task 10).
  - Table columns (`AC | Type | File | Notes`) are identical in every place they appear.
  - Severity classification consistent: `should-fix` (Phase 1), never blocker in Phase 1 — repeated in implement.md instruction, ae-ux step, references file, adapter, and README.
  - UI-detection file extensions are listed in two places (ae-ux Substep 1 + visual-consistency.md "When the section is omitted") — both lists include `.tsx`, `.jsx`, `.vue`, `.svelte`, SwiftUI `.swift`, Compose `.kt`, Flutter widget `.dart`, `.html`, `.css`, `.scss`. Identical sets.
- **Anti-pattern check:** each task touches exactly 1 file. No cross-file fan-out per task. Each task has its own commit.
- **Out-of-scope discipline:** This plan does NOT introduce the catalog (Phase 2), MCP integration (Phase 2), constitution-based escalation (Phase 3), `.claude/visual-capture.md` (Phase 2), or any change to `install.sh` (Phase 2). All those are explicitly deferred to follow-on plans.
