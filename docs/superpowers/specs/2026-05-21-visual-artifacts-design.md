# Visual Artifacts — Design

**Date:** 2026-05-21
**Status:** Approved (pending implementation plan)
**Scope:** `agentic-engineering/` plugin
**Builds on:** `2026-05-20-qa-traceability-matrix-design.md` (AC Coverage matrix) and `2026-05-20-verification-pyramid-design.md` (Level column on the matrix)

---

## Goal

Capture **visual evidence** of UI behavior as a first-class verification artifact alongside the existing AC Coverage matrix. Today, `/ship` Phase 5 (SCRIBE / app-docs) writes prose; `ae-ux` reviews fidelity-to-design but emits a prose report; nothing produces a screenshot or recording that a reviewer can scan in seconds. This adds a structured Visual Artifacts table to PROGRESS.md, a 15-entry catalog of capture tools/MCPs spanning every realistic platform, and a constitution toggle for projects that want enforcement.

The intent is **layered**:
- A solo operator with no tooling can paste Loom links into the matrix (Phase 1).
- A project with Playwright + Cypress can let the catalog dispatch captures automatically during `/ship` (Phase 2).
- A team with strict UI quality bars can require visual artifacts via `CONSTITUTION.md` (Phase 3).

Pay only the cost you need. Default is opt-in; nothing is mandatory.

---

## Non-goals

- **No snapshot diff regression.** v1 captures artifacts but doesn't compare against previous runs. Visual regression testing is a different concern (Chromatic, Percy, Applitools) — can be added later as catalog entries.
- **No automated stack detection beyond simple `contains:` substring checks.** No `package.json` parsing, no `Cargo.toml` AST, no Xcode project introspection. Catalog entries declare `detection:` rules as file-presence + substring matches; that's enough for v1.
- **No multi-tool selection per project in v1.** One capture tool per project. Projects with mixed needs (Playwright for web admin + Maestro for mobile app) pick a primary and use other tools' captures manually.
- **No `/status` visual-coverage rollup.** Deferred to follow-on.
- **No hosted-storage integration.** Operator decides whether to commit binaries to git, use Git LFS, link to S3, etc. The plugin tracks references, not storage policy.
- **No annotation overlay on captures.** Plain files.
- **No new commands.** No `/capture`, no `/visuals`. Everything composes through existing commands (`/init`, `/bootstrap`, `/implement`, `/ship`, `/review`).
- **No automatic capture retries.** If the capture tool fails (non-zero exit), emit warning, continue. Operator handles flaky tools manually.
- **No per-developer `.local` capture override.** Selection is committed to `./.claude/visual-capture.md` (team consistency); operators who want per-dev variation can manually swap the file.
- **No catalog growth governance during v1.** Adding entries later is a PR against `agentic-engineering/capture-tools/` with no special review process beyond normal plugin maintenance.

---

## Phase overview

| Phase | Goal | Standalone? | Implementation order |
|---|---|---|---|
| 1 | Manual baseline: Visual Artifacts table in PROGRESS.md + `ae-ux` validates references | Yes | Ship first as its own change |
| 2 | Capture-tools catalog (15 entries) + selection during `/init` + `/ship` Phase 4 dispatch | No (depends on Phase 1's table) | Ship after Phase 1 lands |
| 3 | Constitution-based enforcement — escalate `should-fix` → blocker when the constitution mandates it | No (depends on Phase 1's validation) | Independent of Phase 2; can ship either order after Phase 1 |

Each phase gets its own implementation plan. **This spec covers all three** for design coherence; the writing-plans skill creates one plan per phase.

---

## Phase 1: Manual baseline

### `### Visual Artifacts` table in PROGRESS.md

Sits between `### Edge probes` and `### Files changed`. Sibling to the Edge probes table — same omit-when-empty pattern.

```markdown
### Visual Artifacts
| AC | Type | File | Notes |
|----|------|------|-------|
| AC-1 | screenshot | artifacts/STORY-005/ac-1-happy-path.png | Desktop Chrome |
| AC-2 | video | artifacts/STORY-005/ac-2-error-state.mp4 | Error toast appears after 2s |
| AC-3 | screenshot | artifacts/STORY-005/ac-3-empty-list.png | Empty state, desktop |
| AC-3 | screenshot | artifacts/STORY-005/ac-3-empty-list-mobile.png | Same AC, mobile viewport |
```

**Rules:**
- One row per artifact. Multiple rows per AC OK (different viewports, scenarios).
- `Type` is descriptive (`screenshot` / `video` / `animated-gif` / `loom-link` / `youtube-link`) — informational, not validated.
- `File` is either a relative path from repo root OR a URL (Loom, Notion, YouTube, etc.). `ae-ux` skips URL validation.
- `Notes` is freeform — viewport, browser, scenario, recording context.
- **Section omitted entirely** for backend-only / CLI-only stories (same pattern as Edge probes).

### Artifacts directory convention

`docs/features/<feature-name>/artifacts/STORY-XXX/` per story. Operator drops files in. Naming is up to the operator; the matrix's `File` column is the source of truth.

```
docs/features/auth/artifacts/STORY-005/
  ac-1-happy-path.png
  ac-2-error-state.mp4
  ac-3-empty-list.png
  ac-3-empty-list-mobile.png
```

Operator decides commit policy:
- Small PNGs → commit to git
- Large MP4s / long videos → consider Git LFS or external hosting + URL refs
- Plugin doesn't dictate; just tracks references

### `/implement` PROGRESS.md template update (Phase 1)

The existing PROGRESS.md template (from QA Traceability + Verification Pyramid) gains a Visual Artifacts section. The section is `(omit if no UI changes)` by default — emitted only when the story actually touches UI.

Updated template:

```markdown
## STORY-XXX: [Title] — [date]

### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | [from STORIES.md] | [file:test_name] | [unit|integration|e2e] |

### Edge probes (from ae-edge)
(omit if ae-edge returned no findings)

### Visual Artifacts
(omit for backend-only / CLI-only stories)
| AC | Type | File | Notes |
|----|------|------|-------|
| AC-1 | screenshot | artifacts/STORY-XXX/ac-1-name.png | [scenario / viewport / browser] |

### Files changed
- [list]

### Notes
[narrative]
```

Instruction text added (caveman style):

```
**Visual Artifacts:** For UI-touching stories, capture screenshots or recordings of each AC's behavior. Drop files in `docs/features/<feature-name>/artifacts/STORY-XXX/`. Reference each capture as a row in the table — multiple rows per AC are fine (different viewports, scenarios). Type is informational. File is a relative path OR a URL (Loom, Notion, YouTube). Notes is freeform.

Omit the entire section for backend-only or CLI-only stories. ae-ux validates references during `/review` — missing/stale/empty files emit `should-fix` warnings (informational, never blockers in Phase 1).
```

### `ae-ux` extension (Phase 1)

`ae-ux` already runs in `/ship` Phase 4 (frontend review). Add a new validation substep:

1. **UI-change detection:** scan diff for file extensions `.tsx`, `.jsx`, `.vue`, `.svelte`, `.swiftui`, Compose `.kt`, `.dart` UI widgets, `.html`, `.css`. If none present → story is non-UI → skip the Visual Artifacts check entirely.
2. **If story has UI changes AND no `### Visual Artifacts` section in PROGRESS.md** → emit `should-fix`: *"No visual artifacts captured. Consider adding screenshots or screen recordings to `docs/features/<name>/artifacts/STORY-XXX/` so reviewers can verify the UI without running the app."*
3. **If `### Visual Artifacts` section is present** → validate each row:
   - If `File` cell looks like a URL (starts with `http://` or `https://`) → skip validation (operator may use Loom / Notion / YouTube links)
   - Else treat as relative path. Check existence + non-zero size:
     - Missing file → `should-fix`: *"Stale reference: `artifacts/STORY-005/ac-1.png` not found in repo."*
     - 0-byte file → `should-fix`: *"Empty file at `artifacts/STORY-005/ac-1.png` — capture may have failed."*
4. All warnings are `should-fix` (informational, never blockers in Phase 1). Severity escalates to blocker only under Phase 3 mandate.

Report appended to `ae-ux`'s existing output:

```
Visual Artifacts:
  ✅ 4/4 references valid (STORY-005)
  ⚠️ Stale: artifacts/STORY-005/ac-2-error.mp4 not found

  (or, when section absent on UI story):
  ⚠️ No visual artifacts captured — consider adding screenshots/recordings
```

### `/ship` Phase 4 reminder (Phase 1)

After frontend implementation step, before invoking `/review`, the implementer agent emits a reminder to the operator (single line, not a checkpoint):

> *Before review, capture screenshots/recordings of each UI AC and drop them into `docs/features/<feature-name>/artifacts/STORY-XXX/`. Reference them in PROGRESS.md's Visual Artifacts table.*

This is prose-only in Phase 1 — no dispatch, no automation, no human prompt. Operator handles capture by hand.

### Phase 1 discoverability touchpoints

| File | Change |
|---|---|
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | PROGRESS.md template adds Visual Artifacts section + instruction |
| `agentic-engineering/skills/agentic-engineering/commands/ship.md` | Phase 4 prose reminder before frontend review |
| `agentic-engineering/agents/ae-ux/AGENT.md` | New validation substep |
| `agentic-engineering/agents/ae-ux/references/visual-consistency.md` | Append "Captured artifacts" section |
| `agentic-engineering/adapters/AGENTS.md.template` | One sentence in the marker block |
| `agentic-engineering/README.md` | One sentence in the `/ship` row description |

**No changes to:** `install.sh`, `USER_COMMANDS`, any new files, any other agent.

---

## Phase 2: Capture-tools catalog

### Catalog location

New directory: `agentic-engineering/capture-tools/`. Mirrors the existing `rules-library/` pattern. One markdown file per tool/MCP.

```
agentic-engineering/capture-tools/
  README.md                       ← catalog index, read by /init
  manual.md                       ← always-available fallback
  loom-link.md                    ← external hosted recordings
  playwright.md                   ← web — test-runner integration
  playwright-mcp.md               ← web — MCP-driven (Claude controls browser)
  cypress.md                      ← web — popular alternative
  maestro.md                      ← mobile (iOS + Android) — declarative flows
  appium.md                       ← mobile (cross-platform) — mature
  detox.md                        ← React Native
  flutter-integration.md          ← Flutter
  xcuitest.md                     ← iOS native
  fastlane-snapshot.md            ← iOS native — App Store-quality
  espresso.md                     ← Android native
  adb-screencap.md                ← Android — raw device captures
  electron-playwright.md          ← Desktop (Electron, Tauri)
  vhs.md                          ← Terminal / TUI / CLI
```

**Total: 15 entries + 1 README** = 16 files.

### Catalog entry shape (template all 15 follow)

YAML frontmatter (used by `/init` for stack-aware filtering):

```yaml
---
name: <kebab-case-id>
description: <one-line summary>
platforms: [web | mobile | ios | android | rn | flutter | desktop | terminal | any]
mechanism: test-runner | mcp | script | manual | external-link
detection:
  - file: <path>
    contains: <substring>
output_dir: <relative-path-from-repo-root | n/a>
---
```

Body (4 sections, caveman style):

1. **`## One-time setup`** — project config changes needed before this tool can be used. e.g. for Playwright: add `screenshot: 'on', video: 'on'` to `playwright.config.ts`.
2. **`## Capture command`** (for `test-runner` / `script` mechanisms) OR **`## MCP usage`** (for `mcp`) OR **`## Operator workflow`** (for `manual` / `external-link`).
3. **`## Where captures land`** — output directory + naming convention. `n/a` for `manual` and `external-link`.
4. **`## /ship Phase 4 integration`** — how the implementer agent processes output into the Visual Artifacts table.

### Five mechanism types

| Mechanism | Behavior in `/ship` Phase 4 |
|---|---|
| `test-runner` | Run command, scan `output_dir`, match test names to AC matrix Tests references, move/link captures into artifacts dir, auto-populate Visual Artifacts table |
| `mcp` | Implementer agent uses declared MCP tools directly to capture per-AC flows; writes to artifacts dir; populates table |
| `script` | Run a project-specific command (kept for projects with bespoke needs); scan declared output_dir; same downstream as `test-runner` |
| `manual` | Print reminder; no automation; operator handles |
| `external-link` | Print reminder + paste-URL guidance; operator handles |

### Per-entry sketches (writing-plans skill expands these into full file content)

The plan writes all 15 catalog entries. Each follows the shape above with platform-specific details. Sketches below show the load-bearing fields for each entry; the plan expands each into a full ~30-50-line markdown file with setup + capture command + integration notes.

**`manual.md`** — `mechanism: manual`, `platforms: [any]`, `detection: []`, `output_dir: n/a`. Body explains the operator workflow: capture by any means (built-in screenshot tools, OS recorder, browser devtools), drop in artifacts dir, reference in table.

**`loom-link.md`** — `mechanism: external-link`, `platforms: [any]`, `detection: []`. Body explains pasting Loom/Notion/YouTube URLs into the File cell; ae-ux skips URL validation.

**`playwright.md`** — `mechanism: test-runner`, `platforms: [web]`, `detection: package.json contains "@playwright/test"`, `output_dir: test-results/`. Setup adds `screenshot: 'on'` + `video: 'on'` to `playwright.config.ts`. Command: `npx playwright test`. Match `test-results/<sanitized-test-name>/` dirs to AC matrix Tests cells.

**`playwright-mcp.md`** — `mechanism: mcp`, `platforms: [web]`, `detection: []` (MCPs are user-installed; can't auto-detect). Setup: install Playwright MCP per https://github.com/microsoft/playwright-mcp. Implementer agent uses `mcp__playwright__navigate`, `mcp__playwright__screenshot`, etc. to walk each AC flow.

**`cypress.md`** — `mechanism: test-runner`, `platforms: [web]`, `detection: package.json contains "cypress"` OR `cypress.config.js` exists. Output: `cypress/screenshots/` and `cypress/videos/`. Command: `npx cypress run`.

**`maestro.md`** — `mechanism: test-runner`, `platforms: [mobile]`, `detection: .maestro/ dir exists` OR `package.json contains "maestro"`. Command: `maestro test --output <output_dir> .maestro/flows/`. Output: declared per-flow directories.

**`appium.md`** — `mechanism: test-runner`, `platforms: [mobile]`, `detection: package.json contains "appium"` OR `requirements.txt contains "Appium-Python-Client"`. Command project-specific; typical: `pytest tests/mobile/` or `npm run test:appium`. Output: project-specified.

**`detox.md`** — `mechanism: test-runner`, `platforms: [rn]`, `detection: package.json contains "detox"`. Command: `detox test --record-videos all --take-screenshots all`. Output: `artifacts/<config>/<run-id>/`.

**`flutter-integration.md`** — `mechanism: test-runner`, `platforms: [flutter]`, `detection: pubspec.yaml contains "integration_test"`. Command: `flutter test integration_test/ --reporter=expanded --machine`. Output: `test_driver/screenshots/` (project-configured).

**`xcuitest.md`** — `mechanism: test-runner`, `platforms: [ios]`, `detection: <project>.xcodeproj/ exists` OR `Package.swift contains "XCUITest"`. Command: `xcodebuild test -scheme <scheme> -destination "platform=iOS Simulator,name=iPhone 15"`. Output: `~/Library/Developer/Xcode/DerivedData/.../Logs/Test/<test-id>/Attachments/`. Move attachments via project `scripts/post-test.sh` or implementer agent's file-discovery.

**`fastlane-snapshot.md`** — `mechanism: test-runner`, `platforms: [ios]`, `detection: fastlane/ dir contains "Snapfile"`. Command: `fastlane snapshot`. Output: `fastlane/screenshots/<lang>/<device>/`. Notes that fastlane snapshot uses XCUITest under the hood — pick this entry for marketing-quality captures; pick `xcuitest.md` for dev iteration.

**`espresso.md`** — `mechanism: test-runner`, `platforms: [android]`, `detection: build.gradle contains "androidx.test.espresso"`. Command: `./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.useTestStorageService=true`. Output: project-specified screenshot rule (e.g., `screenshots/` via the AndroidX test storage service).

**`adb-screencap.md`** — `mechanism: script`, `platforms: [android]`, `detection: []` (always available with `adb`). Command project-specific (operator writes a per-AC bash script that pipes through `adb shell screencap -p`). Output: operator-chosen.

**`electron-playwright.md`** — `mechanism: test-runner`, `platforms: [desktop]`, `detection: package.json contains "electron"` OR `package.json contains "@tauri-apps/api"`. Same Playwright config + commands as `playwright.md`; entry exists to make the desktop option discoverable.

**`vhs.md`** — `mechanism: test-runner`, `platforms: [terminal]`, `detection: *.tape files exist` OR `Brewfile contains "vhs"`. Command: `vhs <tape-file>`. Output: declared in the tape file (e.g., `output demo.gif`).

### Catalog README

`capture-tools/README.md`:

```markdown
# Visual Capture Tools

Catalog of tools, MCPs, and approaches for capturing visual artifacts during `/ship` Phase 4.

`/init` and `/bootstrap` read this catalog, filter by detected stack, offer matching tools to the operator. Selection copies the chosen entry to `./.claude/visual-capture.md`.

## By platform

| Platform | Recommended | Alternatives |
|---|---|---|
| Web | playwright | playwright-mcp, cypress |
| React Native | detox | maestro, appium |
| Flutter | flutter-integration | maestro, appium |
| iOS native | xcuitest | fastlane-snapshot, appium |
| Android native | espresso | appium, adb-screencap |
| Desktop (Electron/Tauri) | electron-playwright | manual |
| Terminal / TUI | vhs | manual |
| Any | manual, loom-link | — |

## By mechanism

| Mechanism | Tools |
|---|---|
| test-runner | playwright, cypress, maestro, appium, detox, flutter-integration, xcuitest, fastlane-snapshot, espresso, electron-playwright, vhs |
| mcp | playwright-mcp |
| script | adb-screencap |
| manual | manual |
| external-link | loom-link |

## Adding a new tool

1. Copy an existing entry as template
2. Fill frontmatter (`detection:` block enables auto-suggestion during `/init`)
3. Write the 4 body sections (One-time setup, Capture command/MCP usage/Operator workflow, Where captures land, /ship Phase 4 integration)
4. Append a row to the platform table above
5. Submit PR
```

### Selection flow during `/init` / `/bootstrap`

`ARCH` extended with a visual-capture-selection step:

1. Detect project stack from CLAUDE.md + existing project state (package.json, build.gradle, pubspec.yaml, Cargo.toml, .pen files, etc.)
2. Read `~/.claude/skills/agentic-engineering/capture-tools/README.md` + each catalog file's frontmatter
3. Filter by `platforms:` matching detected stack AND `detection:` rules matching repo contents
4. Always include `manual` and `loom-link` in the offer list
5. Present:

```
PROD — Visual capture tool selection:

Detected stack: React + Playwright (from package.json)

Recommended capture tools:
  1. playwright           — test-runner integration (uses your existing Playwright setup)
  2. playwright-mcp       — MCP-driven (Claude controls browser directly, no tests needed)
  3. cypress              — alternative web test runner
  4. manual               — capture by hand, no automation
  5. loom-link            — paste hosted recording URLs

Pick one (1-5) or 'none' to skip visual capture entirely.
```

6. On selection: copy `~/.claude/skills/agentic-engineering/capture-tools/<name>.md` → `./.claude/visual-capture.md`
7. Operator can edit `.claude/visual-capture.md` to tune project-specific values (capture command flags, output dir, etc.)
8. Committed to git by default — team uses the same tool. Per-developer variation: rename to `.claude/visual-capture.local.md` and gitignore (out-of-scope for v1; operator does manually).

### `/ship` Phase 4 dispatch (Phase 2)

After frontend implementation step, before `/review`:

```
Step N+1: Visual capture (if .claude/visual-capture.md exists)

1. Read .claude/visual-capture.md → extract mechanism + command/output_dir/MCP-tools
2. Dispatch per mechanism:
   - test-runner / script → run the declared command via Bash tool, capture exit code + output
   - mcp → use the declared MCP tools to walk each AC flow, capture per-AC
   - manual → emit reminder, no dispatch
   - external-link → emit reminder, no dispatch
3. On dispatch success (test-runner / script):
   - Scan declared output_dir
   - For each captured file, match against AC matrix Tests cell test names
   - Move/link file into docs/features/<name>/artifacts/STORY-XXX/<source-filename>
   - Append row to PROGRESS.md Visual Artifacts table with `Notes: (auto, backfill scenario)`
4. On dispatch failure (non-zero exit, missing files):
   - Emit warning, do NOT block ship chain
   - Operator falls back to manual capture for this story
5. Proceed to frontend review (Phase 4 batch dispatch)
```

### `(auto)` row marker convention

Rows appended by Phase 2's auto-dispatch are tagged `(auto)` in the Notes cell:

```markdown
| AC-1 | screenshot | artifacts/STORY-005/test-user-login-1.png | (auto, backfill scenario) |
```

Operator backfills the Notes (replaces `(auto, backfill scenario)` with the actual scenario) and may correct the AC column if the auto-mapping was wrong. `ae-ux` doesn't validate Notes content — the marker is purely human-facing.

### Phase 2 discoverability touchpoints

| File | Change |
|---|---|
| `agentic-engineering/capture-tools/README.md` | New (catalog index) |
| `agentic-engineering/capture-tools/{manual,loom-link,playwright,playwright-mcp,cypress,maestro,appium,detox,flutter-integration,xcuitest,fastlane-snapshot,espresso,adb-screencap,electron-playwright,vhs}.md` | 15 new catalog entries |
| `agentic-engineering/skills/agentic-engineering/commands/init.md` | New step: visual-capture-tool selection + writes `.claude/visual-capture.md` |
| `agentic-engineering/skills/agentic-engineering/commands/bootstrap.md` | Mirror of init.md change |
| `agentic-engineering/skills/agentic-engineering/commands/ship.md` | Phase 4: capture-dispatch step before review |
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | `(auto)` row marker convention documented in instruction |
| `agentic-engineering/agents/ae-ux/AGENT.md` | Recognize `(auto)` marker rows (still validate them like any other row) |
| `agentic-engineering/agents/ae-ux/references/visual-consistency.md` | Document the 5 mechanism types |
| `agentic-engineering/install.sh` | `cp -r "$SCRIPT_DIR/capture-tools" ~/.claude/skills/agentic-engineering/` (mirrors existing `rules-library/` copy on line ~20) |
| `agentic-engineering/adapters/AGENTS.md.template` | Sentence inside marker block about catalog selection |
| `agentic-engineering/README.md` | Sentence about catalog availability |

**No `USER_COMMANDS` change.** Catalog is config, not a slash command.

---

## Phase 3: Constitution-based enforcement

### CONSTITUTION.md article

Default behavior across Phases 1 and 2: all visual-artifact warnings are `should-fix` (informational, never blockers). Projects that want enforcement opt in by adding an article to `./docs/CONSTITUTION.md`:

```markdown
## Article N: Visual artifacts

All UI-touching stories must capture visual artifacts (screenshots or screen recordings) and reference them in `PROGRESS.md`'s Visual Artifacts table. Stories that touch frontend files (`.tsx`/`.jsx`/`.vue`/`.svelte`/`.swiftui`/Compose `.kt`/etc.) without captured artifacts are not shipped.
```

Operators write this article by hand (or `/init` includes it in the commented `## Default Decisions` block as an example to copy).

### `ae-ux` extension to read `CONSTITUTION.md`

`ae-ux` currently doesn't read `CONSTITUTION.md` (that's `ae-req`'s job today). Phase 3 adds a second consumer:

1. After detecting UI changes, `ae-ux` reads `./docs/CONSTITUTION.md`
2. Scans for a "Visual artifacts" mandate (case-insensitive title match — `## Article N: Visual artifacts`, robust to article numbering changes)
3. If found AND any Phase 1 validation produced `should-fix` warnings → **escalate ALL of them to blocker severity** for this story
4. If not found → standard Phase 1/2 behavior (should-fix only)

The escalation is per-story. A project with the article applies it to every UI story. A project without it stays informational-only.

### `/init` constitution scaffold update

The existing `## Default Decisions` block (added during the earlier auto-mode work) includes a commented example for visual artifacts:

```markdown
<!--
- Visual artifacts mandatory for UI stories: uncomment the "## Article N: Visual artifacts" article below to enforce. ae-ux will escalate missing-artifact warnings to blockers.
-->
```

And a commented article-body template the operator can uncomment + renumber:

```markdown
<!--
## Article N: Visual artifacts

All UI-touching stories must capture visual artifacts (screenshots or screen recordings) and reference them in `PROGRESS.md`'s Visual Artifacts table. Stories that touch frontend files (`.tsx`/`.jsx`/`.vue`/`.svelte`/`.swiftui`/Compose `.kt`/etc.) without captured artifacts are not shipped.
-->
```

### Phase 3 discoverability touchpoints

| File | Change |
|---|---|
| `agentic-engineering/skills/agentic-engineering/commands/init.md` | Commented constitution-article scaffold for the visual-artifacts mandate |
| `agentic-engineering/agents/ae-ux/AGENT.md` | New step: read CONSTITUTION.md, scan for "Visual artifacts" article, escalate severity on match |
| `agentic-engineering/agents/ae-ux/references/visual-consistency.md` | Document the constitution article shape |
| `agentic-engineering/adapters/AGENTS.md.template` | Sentence about constitution-enforced mode |
| `agentic-engineering/README.md` | Sentence about the mandatory toggle |

**No `--auto` interaction:** Phase 3 still produces should-fix warnings *or* blockers — neither category is special-cased by `--auto`. Blockers trigger the existing hard-override #1 (review-blocker class), pausing the chain. Same flow as any other blocker.

---

## Data flow (across phases)

```
/init or /bootstrap (Phase 2 active)
  ↓ ARCH detects stack
  ↓ ARCH reads capture-tools/ catalog, filters by stack
  ↓ PROD presents options
  ↓ Operator picks tool
  ↓ Selection copied to ./.claude/visual-capture.md
  ↓ Optional: operator adds Visual artifacts article to CONSTITUTION.md (Phase 3)

/implement (or /ship Phase 1)
  ↓ Implementer writes code + tests
  ↓ Implementer writes PROGRESS.md with AC Coverage table
  ↓ For UI stories: emits empty Visual Artifacts section as template placeholder

/ship Phase 4 (frontend implementation + capture)
  ↓ Frontend implementation completes
  ↓ Reminder emitted to operator (Phase 1)
  ↓ If .claude/visual-capture.md exists (Phase 2):
      → Dispatch per mechanism
      → Auto-populate Visual Artifacts table from captured files
      → Mark auto rows with (auto, backfill scenario)
  ↓ Operator backfills Notes + corrects AC mapping if needed

/ship Phase 4 (frontend review — ae-ux in the 6-agent batch)
  ↓ ae-ux detects UI changes in diff
  ↓ ae-ux validates Visual Artifacts table:
      - No section + UI changes → should-fix (Phase 1)
      - References missing/stale/empty → should-fix
      - URLs skipped from validation
  ↓ ae-ux reads CONSTITUTION.md (Phase 3)
  ↓ If "Visual artifacts" article present → escalate should-fix → blocker
  ↓ Findings flow into consolidated /review blocker list

/ship Phase 5 (docs)
  ↓ Unchanged — SCRIBE writes app-docs as before
```

---

## Composition with existing features

### With AC Coverage matrix + Edge probes + Pyramid Level column

All four tables coexist in PROGRESS.md. Order:
1. `### AC Coverage` (4-column: AC | Description | Tests | Level)
2. `### Edge probes (from ae-edge)` — omit if empty
3. `### Visual Artifacts` — omit if no UI changes
4. `### Files changed`
5. `### Notes`

No interaction between Visual Artifacts and the other matrix sections. Independent concern.

### With `ae-test` Step 6 (matrix-vs-reality check)

`ae-test` validates the AC Coverage + Edge probes tables. It does NOT validate Visual Artifacts — that's `ae-ux`'s job. Clear separation.

### With `ae-edge`

ae-edge's Edge probes table is unchanged. Edge tests typically don't have visual representations (they're correctness probes, not UX flows). If operators want visual captures for edge cases, they add them to the Visual Artifacts table manually — no special integration.

### With `/focus` and `--auto`

- `/focus` unaffected.
- `--auto` doesn't change Phase 1/2 behavior (should-fix warnings never pause).
- Phase 3 blockers under `--auto` follow standard hard-override #1 (review-blocker class) — auto-mode pauses.

### With `/ship-all`

Per-story Visual Artifacts handling is the same. Chain unchanged.

### With existing `rules-library/` selection during `/init`

Capture-tools selection happens in the SAME `/init` flow as rules-library selection (sequential steps within init). No conflict.

---

## Error handling

| Condition | Behavior |
|---|---|
| PROGRESS.md has empty Visual Artifacts section (header but no rows) | Treat as missing → ae-ux emits "no visual artifacts captured" should-fix |
| Visual Artifacts row has empty File cell | should-fix: "Empty File reference in row N" |
| File cell looks like a URL (http://, https://) | ae-ux skips validation; passes through |
| File cell is relative path but file doesn't exist | should-fix (Phase 1/2) OR blocker (Phase 3) |
| File exists but is 0 bytes | should-fix (Phase 1/2) OR blocker (Phase 3) |
| File is referenced as huge binary committed to git | No special handling; operator's choice (Git LFS recommendation in catalog docs) |
| Project has .claude/visual-capture.md but no `### Visual Artifacts` section in PROGRESS.md | Phase 1 behavior — should-fix "no artifacts captured" |
| Phase 2 dispatch: capture tool exits non-zero | Emit warning, continue ship chain. Operator captures manually for this story. |
| Phase 2 dispatch: capture tool exits 0 but produces no files | Same as non-zero exit — warning + continue |
| Phase 2 dispatch: captured files don't match any AC matrix test name | Auto-row inserted with `AC: ?` and `Notes: (auto, no test-match, backfill AC)` — operator decides |
| Phase 3: CONSTITUTION.md has the article but story has no UI changes | No escalation — non-UI stories don't trigger Visual Artifacts checks regardless |
| Phase 3: CONSTITUTION.md has the article but Visual Artifacts table is valid + complete | No blocker — escalation only fires when there's actually a should-fix to escalate |
| Phase 2: project's `mechanism:` is `mcp` but the MCP isn't installed | Capture call fails → warning emitted; falls back to manual flow |
| Phase 2: operator edits `.claude/visual-capture.md` to a non-existent mechanism | ae-ux + /ship treat as unrecognized → fall back to manual flow + warning |

No condition aborts `/ship`. Capture is opt-in best-effort; the ship chain proceeds.

---

## Discoverability touchpoints (full table)

| File | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| `commands/implement.md` | Visual Artifacts in PROGRESS template | `(auto)` row marker convention | — |
| `commands/ship.md` | Phase 4 reminder before review | Phase 4 capture-dispatch step | — |
| `commands/init.md` | — | Capture-tool selection step + write `.claude/visual-capture.md` | Constitution-article scaffold (commented) |
| `commands/bootstrap.md` | — | Mirror of init.md changes | — |
| `capture-tools/README.md` | — | New (catalog index) | — |
| `capture-tools/*.md` (×15) | — | New catalog entries | — |
| `agents/ae-ux/AGENT.md` | New validation substep | Recognize `(auto)` rows | Read CONSTITUTION.md, escalate severity |
| `agents/ae-ux/references/visual-consistency.md` | Append "Captured artifacts" | Document 5 mechanism types | Document constitution article shape |
| `install.sh` | — | `cp -r capture-tools/` to skill dir | — |
| `adapters/AGENTS.md.template` | Sentence | Sentence about catalog | Sentence about constitution mode |
| `README.md` | Sentence | Sentence | Sentence |

**Files NOT modified across all phases:** any wrapper file under `agentic-engineering/commands/`, any agent other than `ae-ux`, `commands/ship-all.md`, `commands/review.md`, `commands/feature.md`, `commands/fix.md`, `commands/focus.md`, `commands/next.md`, `commands/design.md`, `commands/note.md`, `commands/status.md`, `commands/analyze.md`, `USER_COMMANDS` array.

---

## Verification

No automated tests in this plugin. Verification by installer round-trip + adapter round-trip + scratch-project exercise (deferred to user — needs Claude Code restart).

### Per-phase verification

**Phase 1:**
1. Installer round-trip: confirm updated `commands/implement.md`, `ship.md`, `ae-ux/AGENT.md` reach `~/.claude/`
2. Manually create scratch project with UI story; verify PROGRESS.md template emits Visual Artifacts placeholder
3. Run `/review` with no captures → expect ae-ux should-fix warning
4. Drop screenshots into `artifacts/STORY-XXX/`, add table rows, re-run `/review` → expect ✅
5. Corrupt: change a File reference to a missing path → expect should-fix "stale reference"
6. Set Type=loom-link and File=https://...  → expect ae-ux passes (URL skipped from validation)

**Phase 2:**
1. Installer round-trip: confirm `~/.claude/skills/agentic-engineering/capture-tools/` populated with 16 files (README + 15 entries)
2. Adapter round-trip: confirm AGENTS.md template includes catalog-selection sentence
3. In a Playwright project, run `/init` → confirm playwright catalog entry is in the suggestion list AND `.claude/visual-capture.md` written on selection
4. In a Flutter project, confirm flutter-integration is suggested
5. Run `/ship` against a UI story with `.claude/visual-capture.md` pointing at `manual` → confirm reminder emitted, no automation
6. With Playwright entry: confirm `/ship` Phase 4 runs `npx playwright test` and populates the Visual Artifacts table with `(auto)` markers

**Phase 3:**
1. Add the Visual artifacts article to a scratch project's CONSTITUTION.md
2. Ship a UI story with no captures → expect blocker (escalated from should-fix)
3. Add captures, re-run `/review` → expect ✅ (no should-fix to escalate)
4. Ship a backend-only story with the article present → expect no blocker (article only applies to UI stories)

### Adapter round-trip (all phases)

Run multi-tool installer for cursor in a scratch dir. Confirm `AGENTS.md` marker block includes:
- Phase 1 sentence about Visual Artifacts table
- Phase 2 sentence about catalog selection
- Phase 3 sentence about constitution-based enforcement

All three sentences land inside the existing `<!-- agentic-engineering:start v1 -->` marker block; re-run is idempotent.

---

## Risks and open questions

**Risk: catalog entries go stale as tools update.** Playwright config syntax changes, Maestro CLI args shift. Mitigation: catalog entries are normal markdown — updated via PR like any other plugin file. Community ownership via the `capture-tools/README.md` extension pattern.

**Risk: stack detection produces false positives** (e.g., a Python backend project that has a `package.json` for build tooling). Catalog entries' `detection:` rules use simple substring matches; ARCH should err on the side of presenting fewer candidates with a clear "or pick `manual`" fallback.

**Risk: Phase 2 auto-population maps wrong tests to wrong AC.** Captured file names won't always match test names cleanly. Mitigation: `(auto, backfill scenario)` marker + `(auto, no test-match, backfill AC)` explicitly invite operator review. Auto rows are starting points, not final answers.

**Risk: Phase 3 article-detection is too lenient (matches "visual" elsewhere in CONSTITUTION.md).** ae-ux uses an explicit title-pattern match: `^##\s+Article\s+\S+:\s+Visual artifacts` (case-insensitive, regex-style). Strict enough to avoid accidental triggers.

**Risk: large captures bloat the repo if naively committed.** Plugin doesn't enforce policy — operator decides. Catalog entries recommend Git LFS for `.mp4`/`.webm` over a size threshold in their setup notes.

**Open question deferred to implementation:** does `/init`'s capture-tool offer respect the user choosing `none`? Decision: **yes** — `none` skips writing `.claude/visual-capture.md` entirely; Phase 1 behavior applies (manual flow only, with should-fix warnings on missing artifacts). Operator can re-run setup later if needed.

**Open question deferred to implementation:** what if the operator selects two catalog entries (e.g., for a project with web + mobile)? Decision for v1: **single selection only.** UI presents radio-style choice. Multi-tool support is explicit follow-on. Operators with mixed needs pick the primary tool for `/init` and reference the others' captures manually in the table.

**Open question deferred to implementation:** does the catalog README's table get updated automatically when new entries are added? Decision: **no automation in v1.** The README is normal markdown; contributors edit it as part of adding a new entry. Same as `rules-library/` today.

---

## Out of scope (final list, locked)

- Snapshot diff regression / visual regression testing as a service (Chromatic, Percy, Applitools — can be added as catalog entries later by community)
- Multi-tool selection in v1 (one tool per project)
- `/status` visual-coverage rollup
- Hosted-storage integration (Git LFS, S3, CDN — operator handles)
- Annotation overlay on captures
- Auto-fallback to a second tool if the first fails
- Per-developer `.local` capture-tool override (operators do manually if needed)
- Per-AC mandatory marking (e.g., "AC-1 requires a screenshot, AC-2 doesn't") — too granular
- Capture format conversion / compression
- Multi-platform matrix as a separate dimension (still solved with multiple rows per AC)
- Storybook component-level capture (can be added as catalog entry later)
- Windows native (non-Electron) desktop, VR/AR, embedded UI — community can add catalog entries
- Auto-generation of capture scripts from PRD / AC text (interesting follow-on; not v1)
- Validation that captures actually match the design handoff (different concern; that's ae-ux's existing prose review)
