# Visual Artifacts — Phase 2 (Capture-tools Catalog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated catalog of 15 visual-capture tools at `agentic-engineering/capture-tools/` plus `/init` selection flow that writes `./.claude/visual-capture.md` + `/ship` Phase 4 dispatch that auto-populates the Visual Artifacts table from captured files.

**Architecture:** Catalog mirrors the existing `rules-library/` pattern — one markdown file per tool, frontmatter declares applicability + mechanism, body describes setup + capture command + output dir + /ship integration. `/init` filters catalog by detected stack and writes selection. `/ship` Phase 4 reads the selection, dispatches per `mechanism:` (test-runner / mcp / script / manual / external-link), auto-populates rows tagged `(auto)`.

**Tech Stack:** Markdown agent prompts, markdown catalog files, bash installer. No code or tests in this repo.

**Spec:** `docs/superpowers/specs/2026-05-21-visual-artifacts-design.md` — read the "Phase 2: Capture-tools catalog" section.

**Branch:** Continues on `feat/agentic-engineering-visual-artifacts-phase-1` from Phase 1 (one shared branch for all three phases per user direction). Do NOT create a new branch.

---

## File structure

**Create (16 files):**

| File | Purpose |
|---|---|
| `agentic-engineering/capture-tools/README.md` | Catalog index — read by `/init` to discover tools |
| `agentic-engineering/capture-tools/manual.md` | Always-available manual capture |
| `agentic-engineering/capture-tools/loom-link.md` | External hosted recordings (Loom/Notion/YouTube) |
| `agentic-engineering/capture-tools/playwright.md` | Web — test-runner integration |
| `agentic-engineering/capture-tools/playwright-mcp.md` | Web — MCP-driven (Claude controls browser) |
| `agentic-engineering/capture-tools/cypress.md` | Web — alternative test runner |
| `agentic-engineering/capture-tools/maestro.md` | Mobile cross-platform — declarative flows |
| `agentic-engineering/capture-tools/appium.md` | Mobile cross-platform — mature alternative |
| `agentic-engineering/capture-tools/detox.md` | React Native |
| `agentic-engineering/capture-tools/flutter-integration.md` | Flutter integration_test |
| `agentic-engineering/capture-tools/xcuitest.md` | iOS native |
| `agentic-engineering/capture-tools/fastlane-snapshot.md` | iOS native — App Store-quality |
| `agentic-engineering/capture-tools/espresso.md` | Android native |
| `agentic-engineering/capture-tools/adb-screencap.md` | Android — raw device captures |
| `agentic-engineering/capture-tools/electron-playwright.md` | Desktop (Electron/Tauri) |
| `agentic-engineering/capture-tools/vhs.md` | Terminal / TUI / CLI |

**Modify (9 files):**

| File | Change |
|---|---|
| `agentic-engineering/install.sh` | Copy `capture-tools/` to `~/.claude/skills/agentic-engineering/` (mirrors existing `rules-library/` copy) |
| `agentic-engineering/skills/agentic-engineering/commands/init.md` | New step: visual-capture-tool selection + writes `./.claude/visual-capture.md` |
| `agentic-engineering/skills/agentic-engineering/commands/bootstrap.md` | Mirror of init.md selection step |
| `agentic-engineering/skills/agentic-engineering/commands/ship.md` | Phase 4: capture-dispatch step before review |
| `agentic-engineering/skills/agentic-engineering/commands/implement.md` | Document `(auto)` row marker convention in instruction |
| `agentic-engineering/agents/ae-ux/AGENT.md` | Recognize `(auto)` marker rows (no behavior change — just acknowledge in validation) |
| `agentic-engineering/agents/ae-ux/references/visual-consistency.md` | Document the 5 mechanism types |
| `agentic-engineering/adapters/AGENTS.md.template` | Sentence inside marker block about catalog selection |
| `agentic-engineering/README.md` | Sentence about catalog availability |

**Do NOT modify:** Phase 1 files that are already updated, any agent other than ae-ux, `USER_COMMANDS`, the SKILL.md, any wrapper.

---

## Task 1: Create `capture-tools/README.md` (catalog index)

**Files:**
- Create: `agentic-engineering/capture-tools/README.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/capture-tools
```

- [ ] **Step 2: Write README.md**

Write to `agentic-engineering/capture-tools/README.md`:

````markdown
# Visual Capture Tools

Catalog of tools, MCPs, and approaches for capturing visual artifacts during `/ship` Phase 4.

`/init` and `/bootstrap` read this catalog, filter by detected stack, and offer matching tools to the operator. Selection copies the chosen entry to `./.claude/visual-capture.md`.

## By platform

| Platform | Recommended | Alternatives |
|---|---|---|
| Web | `playwright` | `playwright-mcp`, `cypress` |
| React Native | `detox` | `maestro`, `appium` |
| Flutter | `flutter-integration` | `maestro`, `appium` |
| iOS native | `xcuitest` | `fastlane-snapshot`, `appium` |
| Android native | `espresso` | `appium`, `adb-screencap` |
| Desktop (Electron / Tauri) | `electron-playwright` | `manual` |
| Terminal / TUI | `vhs` | `manual` |
| Any | `manual`, `loom-link` | — |

## By mechanism

| Mechanism | Tools |
|---|---|
| `test-runner` | playwright, cypress, maestro, appium, detox, flutter-integration, xcuitest, fastlane-snapshot, espresso, electron-playwright, vhs |
| `mcp` | playwright-mcp |
| `script` | adb-screencap |
| `manual` | manual |
| `external-link` | loom-link |

## Five mechanism types

- **`test-runner`** — Run the project's test command; capture is a side effect. `/ship` Phase 4 scans the declared `output_dir:` and matches captures to AC by test name.
- **`mcp`** — Implementer agent uses the declared MCP's tools to walk each AC flow and capture per-AC. Files written directly to `docs/features/<name>/artifacts/STORY-XXX/`.
- **`script`** — Project provides a bespoke capture command. `/ship` runs it, scans output, same downstream as `test-runner`.
- **`manual`** — No automation. `/ship` Phase 4 emits a reminder; operator captures by hand.
- **`external-link`** — No automation. Operator records via external service (Loom, Notion, YouTube) and pastes URL into the `File` cell.

## Adding a new tool

1. Copy an existing entry as template
2. Fill frontmatter (`detection:` block enables auto-suggestion during `/init`)
3. Write the 4 body sections (One-time setup, Capture command / MCP usage / Operator workflow, Where captures land, /ship Phase 4 integration)
4. Append a row to the platform + mechanism tables above
5. Submit PR

## Selection during `/init`

`ARCH` detects stack, filters this catalog by `platforms:` + `detection:` matches, presents the candidates with `manual` and `loom-link` always included as fallbacks. Operator picks one or `none` to skip. Selection is committed to `./.claude/visual-capture.md` (the project-level capture-tool config, edited per project).
````

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/README.md
grep -c "^## By platform\|^## By mechanism\|^## Five mechanism types\|^## Adding a new tool\|^## Selection during" agentic-engineering/capture-tools/README.md
```

Expected: count = 5.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/capture-tools/README.md
git commit -m "feat(agentic-engineering): capture-tools catalog README"
```

---

## Task 2: Create generic catalog entries (`manual.md` + `loom-link.md`)

**Files:**
- Create: `agentic-engineering/capture-tools/manual.md`
- Create: `agentic-engineering/capture-tools/loom-link.md`

- [ ] **Step 1: Write `manual.md`**

Write to `agentic-engineering/capture-tools/manual.md`:

````markdown
---
name: manual
description: Operator captures screenshots/recordings by hand; no automation
platforms: [any]
mechanism: manual
detection: []
output_dir: n/a
---

# Manual capture

Always-available fallback. Operator captures by any means — OS screenshot tools, browser devtools, mobile screen recording, etc. — and drops files into the project's story-scoped artifacts directory.

## One-time setup

None.

## Operator workflow

1. Implement the UI behavior for the story.
2. For each AC, capture the relevant UI state(s) by hand:
   - macOS: `Cmd+Shift+4` (region screenshot) or `Cmd+Shift+5` (recording)
   - Windows: `Win+Shift+S` or Game Bar `Win+G`
   - Linux: `gnome-screenshot`, `scrot`, `flameshot`
   - Mobile: device screenshot/recording shortcuts (varies by platform)
   - Browser DevTools: device-mode screenshots, full-page captures
3. Drop files into `docs/features/<feature-name>/artifacts/STORY-XXX/`.
4. Add one row to PROGRESS.md's `### Visual Artifacts` table per file:

   ```markdown
   | AC-1 | screenshot | artifacts/STORY-005/ac-1-happy.png | Desktop Chrome, 1440x900 |
   ```

## Where captures land

Wherever the operator chooses inside `docs/features/<feature-name>/artifacts/STORY-XXX/`. Filenames aren't validated against a pattern — the matrix's `File` column is the source of truth.

## /ship Phase 4 integration

When `.claude/visual-capture.md` declares `mechanism: manual`, `/ship` Phase 4 emits a reminder only — no dispatch, no automation. Operator has already captured (or captures now, before continuing).
````

- [ ] **Step 2: Write `loom-link.md`**

Write to `agentic-engineering/capture-tools/loom-link.md`:

````markdown
---
name: loom-link
description: Hosted recordings via external service; paste URL into the Visual Artifacts table
platforms: [any]
mechanism: external-link
detection: []
output_dir: n/a
---

# Loom / hosted recording link

Capture via Loom, Notion video, YouTube unlisted, Vimeo, or any hosted recording service. Reference the URL directly in PROGRESS.md — no file lives in the repo.

## One-time setup

Account on the chosen hosted service. Loom is the most common (free tier available, browser extension or desktop app).

## Operator workflow

1. Record the UI flow via the hosted service.
2. Set sharing to organization-wide or unlisted (no public).
3. Copy the share URL.
4. Add a row to PROGRESS.md's `### Visual Artifacts` table with the URL in the `File` cell:

   ```markdown
   | AC-2 | loom-link | https://www.loom.com/share/abc123 | Signup flow end-to-end |
   ```

## Where captures land

External hosting (no file in repo). `ae-ux` recognizes `http://` / `https://` prefixes and skips file-existence validation for URL rows.

## /ship Phase 4 integration

When `.claude/visual-capture.md` declares `mechanism: external-link`, `/ship` Phase 4 emits a reminder to record + paste URL — no dispatch, no automation.
````

- [ ] **Step 3: Verify both files**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/manual.md && \
  test -f agentic-engineering/capture-tools/loom-link.md && \
  head -8 agentic-engineering/capture-tools/manual.md && \
  echo "---" && \
  head -8 agentic-engineering/capture-tools/loom-link.md
```

Expected: both files present; each shows frontmatter with name/description/platforms/mechanism.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/capture-tools/manual.md agentic-engineering/capture-tools/loom-link.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds manual + loom-link entries"
```

---

## Task 3: Create `playwright.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/playwright.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/playwright.md`:

````markdown
---
name: playwright
description: Playwright test runner with screenshot + video capture as test side effect
platforms: [web]
mechanism: test-runner
detection:
  - file: package.json
    contains: "@playwright/test"
output_dir: test-results/
---

# Playwright

Captures screenshots + videos as a side effect of running tests. Configure once in `playwright.config.ts`, get artifacts for free per test run.

## One-time setup

In `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  use: {
    screenshot: 'on',          // capture at end of every test (use 'only-on-failure' to save space)
    video: 'on',               // capture full test video
    trace: 'on-first-retry',
  },
  reporter: [['html'], ['list']],
})
```

For story-scoped artifact runs (slower but exhaustive), use `screenshot: 'on'` + `video: 'on'`. For fast iteration, use `'only-on-failure'` for both.

## Capture command

```bash
npx playwright test
```

Optional: `--project=chromium` to limit browsers, `--workers=1` for deterministic ordering.

## Where captures land

```
test-results/
  <sanitized-test-name>-<browser>/
    test-finished-1.png        # screenshot
    video.webm                 # video recording
    trace.zip                  # full trace (if enabled)
```

Test name sanitization: spaces → dashes, special chars stripped.

## /ship Phase 4 integration

1. `/ship` Phase 4 runs `npx playwright test` and waits for exit.
2. Implementer agent scans `test-results/` for `<test-name>-<browser>/` directories.
3. For each directory, matches the test name against the AC Coverage matrix's `Tests` cells (which use the format `tests/foo.spec.ts::test_name` per the QA Traceability convention).
4. Moves captured `.png` + `.webm` files into `docs/features/<feature-name>/artifacts/STORY-XXX/<test-name>.<ext>`.
5. Appends a row to the Visual Artifacts table per file, with `Notes: (auto, backfill scenario)`.

On test failure: artifacts may not exist for failing tests. Implementer agent emits a warning but doesn't block the ship chain.
````

- [ ] **Step 2: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/playwright.md
grep -c "mechanism: test-runner\|platforms: \[web\]" agentic-engineering/capture-tools/playwright.md
```

Expected: file present; count = 2 (one per frontmatter key).

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/capture-tools/playwright.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds playwright entry"
```

---

## Task 4: Create `playwright-mcp.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/playwright-mcp.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/playwright-mcp.md`:

````markdown
---
name: playwright-mcp
description: Playwright MCP — Claude controls the browser directly, captures per-AC
platforms: [web]
mechanism: mcp
detection: []
output_dir: docs/features/<feature-name>/artifacts/STORY-XXX/
---

# Playwright MCP

Model Context Protocol server that gives Claude direct browser control. Claude navigates, fills forms, clicks, and screenshots without running test code. Useful for stories where AC describe user flows but no test exists yet.

Reference: https://github.com/microsoft/playwright-mcp

## One-time setup

Install the Playwright MCP server in Claude Code per the project's documentation. Typically:

```bash
# In Claude Code settings, add MCP server:
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Verify the server is listed in Claude Code's MCP server view after restart.

## MCP usage (instead of a capture command)

During `/ship` Phase 4, the implementer agent uses these MCP tools:

- `mcp__playwright__navigate(url)` — open the dev server URL
- `mcp__playwright__fill(selector, value)` — fill form fields
- `mcp__playwright__click(selector)` — click buttons / links
- `mcp__playwright__screenshot(path)` — capture current viewport, write to disk
- `mcp__playwright__close()` — clean up

The agent walks through each AC's user flow (derived from the AC text + the implementation), captures the relevant viewport state(s), and writes files directly to the artifacts dir.

## Where captures land

Written directly via the MCP to `docs/features/<feature-name>/artifacts/STORY-XXX/` with names matching AC numbers (e.g., `ac-1-happy-path.png`, `ac-2-error-state.png`).

## /ship Phase 4 integration

1. `/ship` Phase 4 detects `mechanism: mcp` in `.claude/visual-capture.md`.
2. Implementer agent reads STORIES.md for the active story; extracts AC text.
3. Per AC, agent uses MCP tools to navigate + interact + screenshot. Captures land directly in artifacts dir with predictable per-AC names.
4. Agent populates Visual Artifacts table rows from the captured files.

On MCP failure (server not running, selectors missing, navigation timeout): emit warning, mark affected AC as skipped, continue ship chain. Operator captures manually for those AC.

## Tradeoffs vs Playwright test runner

| | playwright (test-runner) | playwright-mcp (MCP) |
|---|---|---|
| Requires test code | Yes — your existing test suite | No — Claude scripts the flow from AC text |
| Reproducible across runs | Yes (deterministic) | Less (depends on Claude's flow interpretation) |
| Captures match tests | Yes (1:1 with test names) | No (1:1 with AC) |
| Setup overhead | Low if Playwright tests exist | Low if MCP server installed |

Use `playwright` when you have a Playwright test suite. Use `playwright-mcp` for early-stage projects or for AC that aren't yet covered by automated tests.
````

- [ ] **Step 2: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/playwright-mcp.md
grep -c "mechanism: mcp\|mcp__playwright__" agentic-engineering/capture-tools/playwright-mcp.md
```

Expected: file present; count ≥ 2.

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/capture-tools/playwright-mcp.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds playwright-mcp entry"
```

---

## Task 5: Create `cypress.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/cypress.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/cypress.md`:

````markdown
---
name: cypress
description: Cypress test runner with screenshot + video capture
platforms: [web]
mechanism: test-runner
detection:
  - file: package.json
    contains: "cypress"
  - file: cypress.config.js
    contains: ""
output_dir: cypress/screenshots/
---

# Cypress

Cypress captures screenshots on failure by default and can record video for every test. Configure once in `cypress.config.js`, capture per test run.

## One-time setup

In `cypress.config.js`:

```javascript
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  video: true,                       // capture video for every test
  screenshotOnRunFailure: true,      // already default, but explicit
  videoCompression: 32,              // 0-51, lower = larger file but better quality
  e2e: {
    setupNodeEvents(on, config) {},
  },
})
```

For story-scoped artifact runs, you can also add `cy.screenshot()` calls in specific tests to capture intermediate states.

## Capture command

```bash
npx cypress run
```

Optional: `--spec "cypress/e2e/auth/**.cy.ts"` to scope to a subset.

## Where captures land

```
cypress/
  screenshots/
    <spec-file>.cy.ts/
      <test-name> -- <step>.png    # screenshot on failure or explicit cy.screenshot()
  videos/
    <spec-file>.cy.ts.mp4          # video per spec file
```

## /ship Phase 4 integration

1. `/ship` Phase 4 runs `npx cypress run` and waits for exit.
2. Implementer agent scans `cypress/screenshots/` + `cypress/videos/` for files.
3. Matches spec file + test name against the AC Coverage matrix's Tests cells. Cypress test references typically look like `cypress/e2e/auth.cy.ts > login > redirects to dashboard` — the agent splits on `>` and matches the test name.
4. Moves screenshots into `docs/features/<feature-name>/artifacts/STORY-XXX/<test-name>.png` and videos into the same dir as `<spec-name>.mp4`.
5. Appends rows with `Notes: (auto, backfill scenario)`.

On Cypress failure: screenshots produced for failed tests are still useful — keep them, mark with `Notes: (auto, from failed test)`.
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/cypress.md
git add agentic-engineering/capture-tools/cypress.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds cypress entry"
```

---

## Task 6: Create `maestro.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/maestro.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/maestro.md`:

````markdown
---
name: maestro
description: Maestro declarative mobile UI flows, iOS + Android
platforms: [mobile]
mechanism: test-runner
detection:
  - file: .maestro/
    contains: ".yaml"
output_dir: maestro-output/
---

# Maestro

Declarative mobile UI testing tool. YAML flows describe taps + assertions; Maestro captures screenshots at each step automatically. Works on iOS Simulator, Android Emulator, and real devices.

Reference: https://maestro.mobile.dev/

## One-time setup

Install Maestro:

```bash
brew install maestro
# or: curl -Ls "https://get.maestro.mobile.dev" | bash
```

Create flow files under `.maestro/flows/`:

```yaml
# .maestro/flows/login.yaml
appId: com.example.app
---
- launchApp
- tapOn: "Email"
- inputText: "alice@example.com"
- tapOn: "Password"
- inputText: "secret"
- tapOn: "Sign In"
- assertVisible: "Dashboard"
- takeScreenshot: login-success
```

The `takeScreenshot` step is optional — Maestro also captures screenshots at every step automatically when `--debug-output` is enabled.

## Capture command

```bash
maestro test --debug-output maestro-output .maestro/flows/
```

## Where captures land

```
maestro-output/
  <flow-name>/
    screenshot-step-N.png      # auto-captured at each step
    screenshot-named.png       # from explicit takeScreenshot
    recording.mp4              # if --record-video flag passed
```

## /ship Phase 4 integration

1. `/ship` Phase 4 runs `maestro test --debug-output maestro-output .maestro/flows/`.
2. Implementer agent scans `maestro-output/<flow-name>/` directories.
3. Matches flow file names against the AC Coverage matrix's Tests cells (which reference `.maestro/flows/<flow>.yaml` per project's testing convention).
4. Moves screenshots into `docs/features/<feature-name>/artifacts/STORY-XXX/<flow-name>-step-N.png`.
5. Appends rows with `Notes: (auto, backfill scenario)`.

On flow failure: Maestro still produces partial captures up to the failure point. Keep them; mark with `(auto, from failed flow)`.
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/maestro.md
git add agentic-engineering/capture-tools/maestro.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds maestro entry"
```

---

## Task 7: Create `appium.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/appium.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/appium.md`:

````markdown
---
name: appium
description: Appium cross-platform mobile automation (iOS + Android + Windows)
platforms: [mobile]
mechanism: test-runner
detection:
  - file: package.json
    contains: "appium"
  - file: requirements.txt
    contains: "Appium-Python-Client"
  - file: pom.xml
    contains: "appium-java-client"
output_dir: appium-screenshots/
---

# Appium

Cross-platform mobile automation framework. Drives iOS, Android, and Windows apps via WebDriver protocol. Multiple language bindings (JavaScript, Python, Java, Ruby).

Reference: https://appium.io/

## One-time setup

Install Appium server + drivers:

```bash
npm install -g appium
appium driver install xcuitest        # iOS
appium driver install uiautomator2    # Android
```

In your test framework (example: JavaScript with WebdriverIO):

```javascript
// wdio.conf.js
exports.config = {
  capabilities: [
    {
      platformName: 'iOS',
      'appium:deviceName': 'iPhone 15',
      'appium:app': '/path/to/app.app',
    },
  ],
  afterTest: async function (test, context, { passed }) {
    // Always capture, not just on failure
    await browser.saveScreenshot(`./appium-screenshots/${test.title.replace(/\s+/g, '-')}.png`)
  },
}
```

## Capture command

Project-specific. Typical:

```bash
# JavaScript:
npm run test:appium
# Python:
pytest tests/mobile/
# Java:
mvn test -Dgroups=mobile
```

## Where captures land

`appium-screenshots/` (or wherever the test framework's `afterTest` / `tearDown` writes). Naming convention is up to the test framework — typical: `<test-name>.png` per test.

## /ship Phase 4 integration

1. `/ship` Phase 4 runs the project's Appium test command.
2. Implementer agent scans the declared `output_dir` (default `appium-screenshots/`, but operator can edit `.claude/visual-capture.md` to point elsewhere).
3. Matches test names against AC Coverage matrix Tests cells.
4. Moves files into `docs/features/<feature-name>/artifacts/STORY-XXX/`.
5. Appends rows with `Notes: (auto, backfill scenario)`.

Appium's flexibility means projects vary in capture conventions. The catalog entry's `output_dir:` is a default; operator edits `.claude/visual-capture.md` to match their project's actual output path.
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/appium.md
git add agentic-engineering/capture-tools/appium.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds appium entry"
```

---

## Task 8: Create `detox.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/detox.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/detox.md`:

````markdown
---
name: detox
description: Detox end-to-end testing for React Native with screenshot + video capture
platforms: [rn]
mechanism: test-runner
detection:
  - file: package.json
    contains: "detox"
output_dir: artifacts/
---

# Detox

End-to-end testing framework for React Native apps. Native-driven (no Appium / WebDriver bridge), so it's fast and stable. Captures screenshots + videos when configured.

Reference: https://wix.github.io/Detox/

## One-time setup

In `.detoxrc.js`:

```javascript
module.exports = {
  artifacts: {
    plugins: {
      screenshot: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false,   // capture every test, not just failures
        shouldTakeAutomaticSnapshots: true,
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false,
      },
    },
  },
  // ... configurations
}
```

## Capture command

```bash
detox test --record-videos all --take-screenshots all --configuration ios.sim.release
```

The `--record-videos all` and `--take-screenshots all` flags force capture even when `keepOnlyFailedTestsArtifacts: false` is already set — belt-and-suspenders.

## Where captures land

```
artifacts/
  <configuration>/
    <run-id>/
      <test-name>/
        <test-name>.png        # screenshot at end of test
        <test-name>.mp4        # video of test run
```

`<configuration>` is `ios.sim.release` / `android.emu.debug` / etc. `<run-id>` is a timestamp.

## /ship Phase 4 integration

1. `/ship` Phase 4 runs the detox command.
2. Implementer agent scans the latest `artifacts/<configuration>/<run-id>/` directory.
3. For each `<test-name>/` subdirectory, matches the test name against AC Coverage matrix Tests cells.
4. Moves the `.png` and `.mp4` into `docs/features/<feature-name>/artifacts/STORY-XXX/<test-name>.{png,mp4}`.
5. Appends rows with `Notes: (auto, backfill scenario)`.
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/detox.md
git add agentic-engineering/capture-tools/detox.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds detox entry"
```

---

## Task 9: Create `flutter-integration.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/flutter-integration.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/flutter-integration.md`:

````markdown
---
name: flutter-integration
description: Flutter integration_test package with screenshot capture
platforms: [flutter]
mechanism: test-runner
detection:
  - file: pubspec.yaml
    contains: "integration_test"
output_dir: integration_test/screenshots/
---

# Flutter integration_test

Flutter's built-in integration testing package. Runs in a real Flutter app context (not headless), supports screenshot capture via `IntegrationTestWidgetsFlutterBinding.takeScreenshot`.

Reference: https://docs.flutter.dev/cookbook/testing/integration/screenshots

## One-time setup

In `pubspec.yaml`:

```yaml
dev_dependencies:
  integration_test:
    sdk: flutter
  flutter_test:
    sdk: flutter
```

Create `integration_test/screenshot_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('login flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // ... interactions ...

    await binding.takeScreenshot('login-success');
  });
}
```

The driver script `test_driver/integration_test.dart` writes screenshots to disk:

```dart
import 'dart:io';
import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  await integrationDriver(
    onScreenshot: (name, bytes, [args]) async {
      final file = File('integration_test/screenshots/$name.png');
      await file.create(recursive: true);
      await file.writeAsBytes(bytes);
      return true;
    },
  );
}
```

## Capture command

```bash
flutter drive \
  --driver=test_driver/integration_test.dart \
  --target=integration_test/screenshot_test.dart
```

## Where captures land

```
integration_test/screenshots/
  login-success.png
  login-error.png
  ...
```

Names come from `binding.takeScreenshot(<name>)` calls in test code.

## /ship Phase 4 integration

1. `/ship` Phase 4 runs the flutter drive command.
2. Implementer agent scans `integration_test/screenshots/`.
3. Matches screenshot names against AC Coverage matrix Tests cells (or against AC text when test names align — e.g., `login-success.png` → AC-1).
4. Moves files into `docs/features/<feature-name>/artifacts/STORY-XXX/`.
5. Appends rows with `Notes: (auto, backfill scenario)`.
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/flutter-integration.md
git add agentic-engineering/capture-tools/flutter-integration.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds flutter-integration entry"
```

---

## Task 10: Create `xcuitest.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/xcuitest.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/xcuitest.md`:

````markdown
---
name: xcuitest
description: Apple's first-party UI testing framework for iOS apps
platforms: [ios]
mechanism: test-runner
detection:
  - file: "*.xcodeproj"
    contains: "XCUITest"
output_dir: TestResults/
---

# XCUITest

Apple's native UI testing framework, built into Xcode. UI test targets run in a separate process from the app and drive it via the Accessibility API. Screenshots captured via `XCTAttachment`.

## One-time setup

In your UI test target's swift file:

```swift
import XCTest

final class LoginUITests: XCTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testLoginSuccess() throws {
    let app = XCUIApplication()
    app.launch()

    app.textFields["email"].tap()
    app.textFields["email"].typeText("alice@example.com")

    // Capture screenshot
    let screenshot = XCUIScreen.main.screenshot()
    let attachment = XCTAttachment(screenshot: screenshot)
    attachment.lifetime = .keepAlways
    attachment.name = "login-success"
    add(attachment)
  }
}
```

Configure your Test plan to enable attachments:

- Xcode → scheme → Edit Scheme → Test → Test Plans → enable "Screenshot" + "Recording" under "Test Plan Configurations"

## Capture command

```bash
xcodebuild test \
  -scheme MyAppUITests \
  -destination "platform=iOS Simulator,name=iPhone 15" \
  -resultBundlePath TestResults
```

## Where captures land

```
TestResults.xcresult/
  Staging/
    .../Attachments/
      <attachment-id>.png      # screenshots
      <attachment-id>.mp4      # videos (if enabled in test plan)
```

Attachments are buried inside the `.xcresult` bundle. Extract them with `xcrun xcresulttool`:

```bash
xcrun xcresulttool get --path TestResults.xcresult --format json > test-result.json
xcrun xcresulttool export --type file --path TestResults.xcresult --output-path ./extracted/ --id <attachment-id>
```

## /ship Phase 4 integration

1. `/ship` Phase 4 runs the xcodebuild command.
2. Implementer agent runs `xcrun xcresulttool` to extract attachments from `TestResults.xcresult/`.
3. Matches attachment names (set via `attachment.name = "..."` in test code) against AC Coverage matrix Tests cells.
4. Moves extracted PNGs into `docs/features/<feature-name>/artifacts/STORY-XXX/`.
5. Appends rows with `Notes: (auto, backfill scenario)`.

XCUITest's bundle format is more involved than other test runners. The extraction step adds latency but is robust to test failure (attachments are preserved even when tests fail).
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/xcuitest.md
git add agentic-engineering/capture-tools/xcuitest.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds xcuitest entry"
```

---

## Task 11: Create `fastlane-snapshot.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/fastlane-snapshot.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/fastlane-snapshot.md`:

````markdown
---
name: fastlane-snapshot
description: Fastlane snapshot — App Store-quality marketing captures via XCUITest
platforms: [ios]
mechanism: test-runner
detection:
  - file: fastlane/Snapfile
    contains: "devices"
output_dir: fastlane/screenshots/
---

# Fastlane Snapshot

Fastlane's `snapshot` action drives XCUITest to capture screenshots across multiple devices + languages — designed for App Store marketing screenshots. Uses XCUITest under the hood but with sugar for multi-device, multi-language runs.

Reference: https://docs.fastlane.tools/actions/snapshot/

## One-time setup

Install Fastlane:

```bash
brew install fastlane
# or: gem install fastlane
```

In project root:

```bash
fastlane snapshot init
```

This creates `fastlane/Snapfile`:

```ruby
devices([
  "iPhone 15 Pro Max",
  "iPhone SE (3rd generation)",
  "iPad Pro (12.9-inch) (6th generation)",
])

languages([
  "en-US",
  "de-DE",
  "ja-JP",
])

scheme("MyAppUITests")
output_directory("./fastlane/screenshots")
clear_previous_screenshots(true)
```

And `SnapshotHelper.swift` (or `.h` for Objective-C) — drop into your UI test target. In test code:

```swift
import XCTest

class LoginUITests: XCTestCase {
  override func setUp() {
    super.setUp()
    let app = XCUIApplication()
    setupSnapshot(app)
    app.launch()
  }

  func testLogin() {
    snapshot("01_login_screen")
    // ... interactions ...
    snapshot("02_dashboard")
  }
}
```

## Capture command

```bash
fastlane snapshot
```

## Where captures land

```
fastlane/screenshots/
  en-US/
    iPhone 15 Pro Max-01_login_screen_framed.png
    iPhone 15 Pro Max-02_dashboard_framed.png
    iPhone SE (3rd generation)-01_login_screen_framed.png
    ...
  de-DE/
    ...
```

Per-language, per-device, per-named-snapshot.

## /ship Phase 4 integration

1. `/ship` Phase 4 runs `fastlane snapshot`.
2. Implementer agent scans `fastlane/screenshots/<lang>/<device>-<name>.png`.
3. The `<name>` portion (e.g., `01_login_screen`) maps to AC — typically `01_*` ↔ AC-1, `02_*` ↔ AC-2 (operator-confirmable convention).
4. Moves screenshots into `docs/features/<feature-name>/artifacts/STORY-XXX/<lang>-<device>-<name>.png`.
5. Appends one row per captured file. Notes include `(auto, <lang>, <device>)` for backfill.

When to pick this over `xcuitest`: when you need marketing-quality screenshots across multiple devices and languages. Use `xcuitest` for dev-iteration screenshots; use `fastlane-snapshot` for App Store submissions or marketing reviews.
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/fastlane-snapshot.md
git add agentic-engineering/capture-tools/fastlane-snapshot.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds fastlane-snapshot entry"
```

---

## Task 12: Create `espresso.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/espresso.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/espresso.md`:

````markdown
---
name: espresso
description: Espresso — Google's first-party UI testing for Android
platforms: [android]
mechanism: test-runner
detection:
  - file: build.gradle
    contains: "androidx.test.espresso"
  - file: app/build.gradle
    contains: "espresso"
output_dir: app/build/outputs/connected_android_test_additional_output/
---

# Espresso

Google's native UI testing framework for Android. Runs on-device or on emulator. Screenshot capture via Android's Test Storage Service.

Reference: https://developer.android.com/training/testing/espresso

## One-time setup

In `app/build.gradle`:

```gradle
android {
  defaultConfig {
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    testInstrumentationRunnerArguments useTestStorageService: 'true'
  }
}

dependencies {
  androidTestImplementation "androidx.test.espresso:espresso-core:3.5.1"
  androidTestImplementation "androidx.test.ext:junit:1.1.5"
  androidTestImplementation "androidx.test:rules:1.5.0"
  androidTestUtil "androidx.test.services:test-services:1.4.2"
}
```

In test code:

```kotlin
import androidx.test.core.app.takeScreenshot
import androidx.test.runner.screenshot.Screenshot

@Test
fun loginSuccess() {
    onView(withId(R.id.email)).perform(typeText("alice@example.com"))
    onView(withId(R.id.password)).perform(typeText("secret"))
    onView(withId(R.id.signIn)).perform(click())
    onView(withText("Dashboard")).check(matches(isDisplayed()))

    // Capture screenshot via Test Storage Service
    val processor = Screenshot.capture()
    processor.name = "login-success"
    processor.format = Bitmap.CompressFormat.PNG
    processor.process()
}
```

## Capture command

```bash
./gradlew connectedAndroidTest
```

## Where captures land

```
app/build/outputs/connected_android_test_additional_output/
  <variant>/
    <device>/
      <screenshot-name>.png
```

Or, when using the AndroidX Test Storage Service, screenshots are pulled to:

```
app/build/outputs/managed_device_android_test_additional_output/
  <device>/
    <test-name>/
      <screenshot-name>.png
```

(Path varies slightly between AGP versions; the catalog entry's `output_dir:` is the most common.)

## /ship Phase 4 integration

1. `/ship` Phase 4 runs `./gradlew connectedAndroidTest`.
2. Implementer agent scans the variant + device subdirectories.
3. Matches screenshot names against AC Coverage matrix Tests cells.
4. Moves PNGs into `docs/features/<feature-name>/artifacts/STORY-XXX/<device>-<name>.png`.
5. Appends rows with `Notes: (auto, <device>, backfill scenario)`.
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/espresso.md
git add agentic-engineering/capture-tools/espresso.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds espresso entry"
```

---

## Task 13: Create `adb-screencap.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/adb-screencap.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/adb-screencap.md`:

````markdown
---
name: adb-screencap
description: Raw Android device captures via adb shell — for when Espresso is overkill
platforms: [android]
mechanism: script
detection: []
output_dir: project-specific
---

# adb-screencap

Raw screen captures via Android Debug Bridge. No test framework required — operator (or script) drives the app manually, captures the relevant screens via `adb shell screencap`. Useful for:

- Apps without an Espresso test suite
- One-off marketing captures of complex flows
- Debugging visual regressions on a specific device

## One-time setup

Install Android SDK platform-tools:

```bash
brew install android-platform-tools
# or use Android Studio's installer
```

Connect device (USB debugging enabled) or start an emulator:

```bash
adb devices
# Should list at least one device
```

## Capture command

Project provides a bespoke script. Example `scripts/capture-android.sh`:

```bash
#!/bin/bash
set -e

STORY_ID="${1:?Usage: capture-android.sh STORY-XXX}"
OUT_DIR="docs/features/<feature-name>/artifacts/$STORY_ID"
mkdir -p "$OUT_DIR"

# Trigger the app manually or via deeplink, then capture
adb shell screencap -p > "$OUT_DIR/ac-1-happy-path.png"

# More captures...
```

`/ship` Phase 4 runs this script. The script's contract: produce files in `docs/features/<feature-name>/artifacts/STORY-XXX/`.

## Where captures land

Wherever the script writes. The catalog entry's `output_dir: project-specific` signals to `/ship` that the script handles destination directly.

## /ship Phase 4 integration

1. `/ship` Phase 4 reads `.claude/visual-capture.md` → mechanism: script + command points at `scripts/capture-android.sh`.
2. `/ship` runs `bash scripts/capture-android.sh STORY-XXX`.
3. Implementer agent scans `docs/features/<feature-name>/artifacts/STORY-XXX/` for new files post-run.
4. Appends one row per new file. Notes: `(auto, backfill AC + scenario)`.

Because the script controls both the capture AND the destination, no name-matching against AC is performed by the agent. Operator backfills AC + scenario columns.

## When to pick this over `espresso`

- When you don't have/want an Espresso test suite
- For interactive flows that are easier to drive by hand
- For non-trivial capture sequences (animations, scroll-position-dependent UI) where automation is fragile
- For projects with minimal Android testing infrastructure
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/adb-screencap.md
git add agentic-engineering/capture-tools/adb-screencap.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds adb-screencap entry"
```

---

## Task 14: Create `electron-playwright.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/electron-playwright.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/electron-playwright.md`:

````markdown
---
name: electron-playwright
description: Playwright for Electron and Tauri desktop apps
platforms: [desktop]
mechanism: test-runner
detection:
  - file: package.json
    contains: "electron"
  - file: package.json
    contains: "@tauri-apps"
output_dir: test-results/
---

# Electron Playwright

Playwright includes first-class Electron support. Same capture flags as web Playwright; works for Tauri (Rust + JS) with the experimental `_electron` API or by treating Tauri as a regular webview.

Reference: https://playwright.dev/docs/api/class-electron

## One-time setup

In `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  use: {
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'electron',
      testMatch: 'electron/**/*.spec.ts',
    },
  ],
})
```

Test code:

```typescript
import { _electron as electron, expect, test } from '@playwright/test'

test('login flow', async () => {
  const app = await electron.launch({ args: ['./dist/main.js'] })
  const window = await app.firstWindow()

  await window.click('#login-button')
  await window.screenshot({ path: 'test-results/login-button.png' })

  await app.close()
})
```

For Tauri: launch the dev binary via Playwright's standard `launch` or attach to a running instance via CDP.

## Capture command

```bash
npx playwright test
```

(Same as web Playwright. The catalog entry exists to make the desktop option discoverable to `/init` for Electron/Tauri projects.)

## Where captures land

Same as web Playwright: `test-results/<test-name>-<project>/test-finished-N.png` + `.webm`.

## /ship Phase 4 integration

Identical to the `playwright` catalog entry. The agent matches test names to AC Coverage matrix Tests cells, moves captures into the artifacts directory.

## When to pick this over `manual`

- If your Electron/Tauri project already has Playwright tests
- For multi-window or complex IPC flows that are hard to capture by hand
- For projects shipping cross-platform desktop apps where consistency across builds matters
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/electron-playwright.md
git add agentic-engineering/capture-tools/electron-playwright.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds electron-playwright entry"
```

---

## Task 15: Create `vhs.md` catalog entry

**Files:**
- Create: `agentic-engineering/capture-tools/vhs.md`

- [ ] **Step 1: Write the file**

Write to `agentic-engineering/capture-tools/vhs.md`:

````markdown
---
name: vhs
description: VHS — tape-driven terminal session captures (TUI / CLI / shell)
platforms: [terminal]
mechanism: test-runner
detection:
  - file: "*.tape"
    contains: "Output"
output_dir: declared per tape file
---

# VHS

Charm's VHS tool generates terminal session recordings (mp4 / gif / webm / png) from declarative `.tape` script files. Drives a real terminal in a headless container. Ideal for CLI tools, TUI apps (Bubbletea, Textual, etc.), and terminal demos.

Reference: https://github.com/charmbracelet/vhs

## One-time setup

Install VHS:

```bash
brew install vhs
# or: go install github.com/charmbracelet/vhs@latest
```

Create `.tape` files describing the terminal session:

```bash
# demo.tape
Output demo.gif
Set FontSize 20
Set Width 1200
Set Height 800

Type "myapp --help"
Sleep 500ms
Enter
Sleep 2s

Type "myapp run --verbose"
Sleep 500ms
Enter
Sleep 3s
```

## Capture command

```bash
vhs <tape-file>
```

E.g., `vhs .vhs/login-flow.tape`. Each tape file produces one output file declared via the `Output` directive.

## Where captures land

Wherever the tape file's `Output` directive points. The convention is to keep outputs adjacent to tapes:

```
.vhs/
  login-flow.tape
  login-flow.gif       # produced by `vhs login-flow.tape`
  error-state.tape
  error-state.mp4
```

## /ship Phase 4 integration

1. `/ship` Phase 4 reads all `.tape` files under `.vhs/` (or wherever `.claude/visual-capture.md` declares).
2. For each tape, runs `vhs <tape-file>`.
3. Parses each tape's `Output` directive to find the produced file.
4. Maps tape filename to AC — typically `login-flow.tape` → AC for "login flow", operator-confirmable.
5. Moves outputs into `docs/features/<feature-name>/artifacts/STORY-XXX/<tape-name>.<ext>`.
6. Appends rows with `Notes: (auto, terminal recording, backfill scenario)`.

## When to pick this over `manual`

- For CLI tools where the README's demo is part of the value proposition
- For TUI apps where the user-perceived behavior is the terminal interaction
- For automated documentation pipelines that regenerate demos on every release
````

- [ ] **Step 2: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
test -f agentic-engineering/capture-tools/vhs.md
git add agentic-engineering/capture-tools/vhs.md
git commit -m "feat(agentic-engineering): capture-tools catalog adds vhs entry"
```

---

## Task 16: Wire `capture-tools/` into `install.sh`

**Files:**
- Modify: `agentic-engineering/install.sh`

- [ ] **Step 1: Locate the existing rules-library copy step**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "rules-library\|Copying rules library" agentic-engineering/install.sh
```

Find the line that copies `rules-library/` to `~/.claude/skills/agentic-engineering/`:

```bash
echo "  → Copying rules library..."
cp -r "$SCRIPT_DIR/rules-library" ~/.claude/skills/agentic-engineering/
```

- [ ] **Step 2: Add capture-tools copy immediately after rules-library copy**

After the `cp -r "$SCRIPT_DIR/rules-library" ~/.claude/skills/agentic-engineering/` line, add:

```bash

# Install capture-tools library — /init reads from this to offer visual-capture tools
echo "  → Copying capture-tools library..."
cp -r "$SCRIPT_DIR/capture-tools" ~/.claude/skills/agentic-engineering/
```

(Leading blank line for visual separation; same shape as the rules-library copy.)

- [ ] **Step 3: Run installer to verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
bash install.sh 2>&1 | tail -10
ls ~/.claude/skills/agentic-engineering/capture-tools/ | wc -l
```

Expected: install succeeds; capture-tools directory contains 16 files (README + 15 entries).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/install.sh
git commit -m "feat(agentic-engineering): install.sh copies capture-tools catalog"
```

---

## Task 17: Add visual-capture-tool selection step to `/init`

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/init.md`

- [ ] **Step 1: Locate the rules-library selection step in init.md**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "rules-library\|Stack rules\|rule templates" agentic-engineering/skills/agentic-engineering/commands/init.md | head -10
```

Find the existing step where ARCH reads `rules-library/README.md` and offers rule templates. The new visual-capture selection step appends AFTER that step (both are part of `/init`'s late-stage tool offers).

- [ ] **Step 2: Insert the new selection step**

After the rules-library selection step (which ends with ARCH confirming installed rules), insert a new section (caveman style):

````markdown
### Visual capture tool selection

**ARCH** reads `~/.claude/skills/agentic-engineering/capture-tools/README.md` + each catalog entry's frontmatter.

Filter catalog by detected stack:
- Read CLAUDE.md (just generated above) + scan repo for files matching each entry's `detection:` rules
- Match by `platforms:` (web / mobile / ios / android / rn / flutter / desktop / terminal / any)
- Always include `manual` and `loom-link` as fallback candidates

Present matching tools to operator:

```
PROD — Visual capture tool selection:

Detected stack: <stack summary>

Matching capture tools:
  1. <tool-name>       — <one-line description>
  2. <tool-name>       — <one-line description>
  3. manual            — capture by hand, no automation
  4. loom-link         — paste hosted recording URLs

Pick one (1-N) or 'none' to skip visual capture setup.
```

⚠️ **Human checkpoint:** wait for operator's selection.

On selection:
1. Copy `~/.claude/skills/agentic-engineering/capture-tools/<name>.md` → `./.claude/visual-capture.md`
2. ARCH announces: *"Capture tool configured at `.claude/visual-capture.md`. Edit to tune project-specific values (command, output dir, etc.). Committed to git so the team uses the same tool."*

On 'none':
3. ARCH announces: *"Skipping visual capture setup. UI stories will receive informational reminders during `/ship` Phase 4; Visual Artifacts table in PROGRESS.md can be filled manually."*

(No `.claude/visual-capture.md` written when 'none' selected — Phase 1's manual flow applies by default.)
````

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Visual capture tool selection\|capture-tools/README.md\|.claude/visual-capture.md" agentic-engineering/skills/agentic-engineering/commands/init.md
```

Expected: count ≥ 3.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/init.md
git commit -m "feat(agentic-engineering): /init offers visual-capture-tool selection from catalog"
```

---

## Task 18: Mirror the selection step in `/bootstrap`

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/bootstrap.md`

- [ ] **Step 1: Locate the rules-library selection step in bootstrap.md**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "rules-library\|Stack rules\|rule templates" agentic-engineering/skills/agentic-engineering/commands/bootstrap.md | head -10
```

`/bootstrap` mirrors `/init` for new-project scaffolding. Find the rules-library selection step.

- [ ] **Step 2: Insert the same Visual capture tool selection step**

Insert AFTER the rules-library selection step (same content as Task 17 Step 2). The exact block from Task 17 Step 2 is copy-pasted here verbatim:

````markdown
### Visual capture tool selection

**ARCH** reads `~/.claude/skills/agentic-engineering/capture-tools/README.md` + each catalog entry's frontmatter.

Filter catalog by detected stack:
- Read CLAUDE.md (just generated above) + scan repo for files matching each entry's `detection:` rules
- Match by `platforms:` (web / mobile / ios / android / rn / flutter / desktop / terminal / any)
- Always include `manual` and `loom-link` as fallback candidates

Present matching tools to operator:

```
PROD — Visual capture tool selection:

Detected stack: <stack summary>

Matching capture tools:
  1. <tool-name>       — <one-line description>
  2. <tool-name>       — <one-line description>
  3. manual            — capture by hand, no automation
  4. loom-link         — paste hosted recording URLs

Pick one (1-N) or 'none' to skip visual capture setup.
```

⚠️ **Human checkpoint:** wait for operator's selection.

On selection:
1. Copy `~/.claude/skills/agentic-engineering/capture-tools/<name>.md` → `./.claude/visual-capture.md`
2. ARCH announces: *"Capture tool configured at `.claude/visual-capture.md`. Edit to tune project-specific values (command, output dir, etc.). Committed to git so the team uses the same tool."*

On 'none':
3. ARCH announces: *"Skipping visual capture setup. UI stories will receive informational reminders during `/ship` Phase 4; Visual Artifacts table in PROGRESS.md can be filled manually."*

(No `.claude/visual-capture.md` written when 'none' selected — Phase 1's manual flow applies by default.)
````

- [ ] **Step 3: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Visual capture tool selection" agentic-engineering/skills/agentic-engineering/commands/bootstrap.md
git add agentic-engineering/skills/agentic-engineering/commands/bootstrap.md
git commit -m "feat(agentic-engineering): /bootstrap mirrors /init capture-tool selection"
```

Expected count: 1.

---

## Task 19: Add Phase 4 capture-dispatch step to `/ship`

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/ship.md`

- [ ] **Step 1: Locate the Phase 4 frontend-review section**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "Phase 3 — Frontend\|Phase 4 — Frontend Review\|Reminder before review" agentic-engineering/skills/agentic-engineering/commands/ship.md
```

In Phase 1 (already shipped), Phase 3 ends with a "Reminder before review" prose line. Phase 2 replaces / extends that with an actual capture-dispatch step.

- [ ] **Step 2: Insert the capture-dispatch step**

Find the `**Reminder before review**` bullet (added by Phase 1). Replace that bullet with a fuller step:

````
- **Visual capture dispatch** *(automatic if `.claude/visual-capture.md` exists)*

  1. Read `./.claude/visual-capture.md`. If absent → emit reminder (Phase 1 fallback) and proceed to Phase 4 review.
  2. Parse `mechanism:` field. Dispatch:
     - `test-runner` / `script` → run the declared `## Capture command` via Bash, capture exit code
     - `mcp` → use the declared MCP tools per AC, capture per-AC, write to artifacts dir directly
     - `manual` → emit reminder, proceed
     - `external-link` → emit reminder to record + paste URLs, proceed
  3. On dispatch success (`test-runner` / `script`):
     - Scan declared `output_dir:` for new files
     - For each file, match against AC Coverage matrix Tests cells when possible
     - Move/copy into `docs/features/<feature-name>/artifacts/STORY-XXX/<file>`
     - Append rows to PROGRESS.md Visual Artifacts table; tag Notes cell with `(auto, backfill scenario)` or `(auto, no test-match, backfill AC)`
  4. On dispatch failure (non-zero exit, missing files): emit warning, do NOT block ship chain. Operator captures manually for this story.
  5. Proceed to Phase 4 review (the 6-agent batch).
````

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Visual capture dispatch\|.claude/visual-capture.md" agentic-engineering/skills/agentic-engineering/commands/ship.md
grep -c "Reminder before review" agentic-engineering/skills/agentic-engineering/commands/ship.md
```

Expected: first count ≥ 2 (dispatch step + .claude config reference); second count = 0 (Phase 1's prose-only reminder replaced).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/ship.md
git commit -m "feat(agentic-engineering): /ship Phase 4 dispatches visual capture per .claude/visual-capture.md"
```

---

## Task 20: Document `(auto)` row marker in `/implement` instruction

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/implement.md`

- [ ] **Step 1: Locate the Visual Artifacts instruction block (added by Phase 1)**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "Visual Artifacts:\*\*" agentic-engineering/skills/agentic-engineering/commands/implement.md
```

Find the `**Visual Artifacts:**` instruction paragraph. We're appending a new paragraph immediately after it.

- [ ] **Step 2: Append the `(auto)` marker paragraph**

After the existing `**Visual Artifacts:**` paragraph (and its trailing blank line if any), append:

```
**`(auto)` row marker:** When `/ship` Phase 4 dispatches a capture tool (Phase 2 behavior), rows it auto-appends to the Visual Artifacts table use a Notes prefix:

- `(auto, backfill scenario)` — capture matched an AC via test name; operator updates the Notes column with viewport / browser / scenario context
- `(auto, no test-match, backfill AC)` — capture didn't match any AC matrix Tests cell; operator corrects the AC column AND backfills scenario

Operator removes the `(auto, ...)` prefix from Notes once the row is reviewed and accurate. `ae-ux` doesn't validate Notes content — the marker is human-facing only.
```

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "\`(auto)\` row marker\|(auto, backfill scenario)\|(auto, no test-match" agentic-engineering/skills/agentic-engineering/commands/implement.md
```

Expected: count ≥ 3.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/implement.md
git commit -m "feat(agentic-engineering): /implement documents (auto) row marker convention"
```

---

## Task 21: Acknowledge `(auto)` rows in `ae-ux/AGENT.md` (no behavior change)

**Files:**
- Modify: `agentic-engineering/agents/ae-ux/AGENT.md`

- [ ] **Step 1: Locate the Phase 1 Visual Artifacts validation step**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "Visual Artifacts validation\|Substep 3" agentic-engineering/agents/ae-ux/AGENT.md
```

The validation step has substeps for UI-change detection, table location, per-row validation. We're adding a note about `(auto)` rows — they're validated like any other row, but acknowledged in the report.

- [ ] **Step 2: Add a paragraph to Substep 3 acknowledging `(auto)` rows**

Inside the existing Visual Artifacts validation step's Substep 3 ("Validate each row of the Visual Artifacts table"), at the END of the substep (after the URL skip rule + missing/empty-file rules), add:

```
**`(auto)` markers:** Rows with `Notes` starting `(auto, ...)` are auto-populated by `/ship` Phase 4's capture dispatch. Validate them like any other row (URL skip, file existence, non-zero size). Don't emit warnings about the `(auto)` marker itself — that's a human-facing TODO for the operator to backfill the scenario. If the marker is still present after a story ships, the file reference is still validated; the marker is informational only.
```

- [ ] **Step 3: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "(auto) markers\|auto-populated by" agentic-engineering/agents/ae-ux/AGENT.md
git add agentic-engineering/agents/ae-ux/AGENT.md
git commit -m "feat(agentic-engineering): ae-ux acknowledges (auto) marker rows in validation"
```

Expected count: ≥ 1.

---

## Task 22: Document the 5 mechanism types in `visual-consistency.md`

**Files:**
- Modify: `agentic-engineering/agents/ae-ux/references/visual-consistency.md`

- [ ] **Step 1: Locate the Phase 1 "Captured artifacts" section**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "^## Captured artifacts\|^### Validation rules" agentic-engineering/agents/ae-ux/references/visual-consistency.md
```

The "Captured artifacts" section was added by Phase 1. We're appending a new sub-section about the 5 mechanism types under that.

- [ ] **Step 2: Append the mechanism-types sub-section**

At the END of the "Captured artifacts" section (after the "Naming convention" sub-section that closes Phase 1), append:

````markdown

### Capture mechanisms

When `.claude/visual-capture.md` is present (Phase 2 selected a catalog entry), one of five mechanisms drives `/ship` Phase 4:

- **`test-runner`** — Project's existing test framework captures as a side effect. `/ship` runs the test command, scans declared output dir, matches captures to AC by test name.
- **`mcp`** — Implementer agent uses an MCP server (e.g., Playwright MCP) to walk each AC flow and capture per-AC. No test code required.
- **`script`** — Project provides a bespoke capture command. `/ship` runs it, scans the declared output dir, treats results like `test-runner`.
- **`manual`** — No automation. Operator captures by hand. `/ship` emits a reminder only.
- **`external-link`** — No automation. Operator records via Loom / Notion / YouTube, pastes URL into the File cell. `ae-ux` skips URL validation.

The selected mechanism doesn't change `ae-ux`'s validation logic — file paths are checked for existence + non-zero size; URLs are skipped; missing tables on UI stories emit `should-fix`.
````

- [ ] **Step 3: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "Capture mechanisms\|test-runner\|mcp\|script\|manual\|external-link" agentic-engineering/agents/ae-ux/references/visual-consistency.md
git add agentic-engineering/agents/ae-ux/references/visual-consistency.md
git commit -m "docs(agentic-engineering): visual-consistency documents 5 capture mechanisms"
```

Expected count: ≥ 5 (one per mechanism term + the section heading).

---

## Task 23: Add catalog sentence to AGENTS.md adapter

**Files:**
- Modify: `agentic-engineering/adapters/AGENTS.md.template`

- [ ] **Step 1: Locate the Visual Artifacts paragraph added in Phase 1**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "Visual Artifacts table\|agentic-engineering:start\|agentic-engineering:end" agentic-engineering/adapters/AGENTS.md.template
```

The Phase 1 paragraph is inside the marker block. We're appending one more sentence to it (in-place) about catalog selection.

- [ ] **Step 2: Append the catalog sentence in-place**

Find the closing sentence of the Visual Artifacts paragraph (ends with `...omitted entirely for backend-only or CLI-only stories.`). Append a new sentence with a single space separator:

```
 Projects that opt in during `/init` pick a capture tool from the `capture-tools/` catalog (Playwright, Cypress, Maestro, Detox, XCUITest, Espresso, etc.); the selection writes to `.claude/visual-capture.md` and `/ship` Phase 4 dispatches the chosen mechanism (test-runner / mcp / script / manual / external-link) to auto-populate the table with `(auto)`-tagged rows for operator backfill.
```

- [ ] **Step 3: Verify + Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "agentic-engineering:start v1\|agentic-engineering:end v1" agentic-engineering/adapters/AGENTS.md.template
grep -c "capture-tools/.*catalog\|.claude/visual-capture.md" agentic-engineering/adapters/AGENTS.md.template
git add agentic-engineering/adapters/AGENTS.md.template
git commit -m "docs(agentic-engineering): AGENTS.md template documents catalog-based capture"
```

Expected counts: first = 2 (markers); second ≥ 1.

---

## Task 24: Add catalog sentence to README

**Files:**
- Modify: `agentic-engineering/README.md`

- [ ] **Step 1: Locate the `/ship` table row with the existing Visual Artifacts sentence**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -n "^| \`/ship\`\|Visual Artifacts table" agentic-engineering/README.md
```

The `/ship` row already has a sentence about the Visual Artifacts table (from Phase 1). Append one more sentence to the same row (still inside the table cell).

- [ ] **Step 2: Append the catalog sentence in-place**

Find the trailing `|` of the `/ship` row. Before the trailing `|`, append a space + sentence + space:

```
 Projects opt into automated capture during `/init` by picking a tool from the 15-entry catalog (`agentic-engineering/capture-tools/`); `/ship` Phase 4 then dispatches per mechanism and auto-populates the table.
```

- [ ] **Step 3: Verify**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
grep -c "15-entry catalog\|capture-tools/" agentic-engineering/README.md
awk '/^\| `\/ship`/' agentic-engineering/README.md | wc -l
```

Expected: first ≥ 1; second = 1 (still one line — table intact).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/README.md
git commit -m "docs(agentic-engineering): README documents capture-tools catalog"
```

---

## Task 25: Installer round-trip verification

**Goal:** Confirm `capture-tools/` reaches `~/.claude/` and prior features still install correctly.

- [ ] **Step 1: Run installer**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
bash install.sh
```

Expected: "✅ Done." with no errors.

- [ ] **Step 2: Verify catalog installed**

```bash
ls ~/.claude/skills/agentic-engineering/capture-tools/ | sort
ls ~/.claude/skills/agentic-engineering/capture-tools/ | wc -l
```

Expected: 16 files (README + 15 entries).

- [ ] **Step 3: Verify integration updates landed**

```bash
grep -c "Visual capture tool selection" ~/.claude/skills/agentic-engineering/commands/init.md
grep -c "Visual capture tool selection" ~/.claude/skills/agentic-engineering/commands/bootstrap.md
grep -c "Visual capture dispatch" ~/.claude/skills/agentic-engineering/commands/ship.md
grep -c "(auto) markers" ~/.claude/agents/ae-ux/AGENT.md
```

Expected: each count ≥ 1.

- [ ] **Step 4: Regression — prior features intact**

```bash
grep -c "### Visual Artifacts" ~/.claude/skills/agentic-engineering/commands/implement.md   # Phase 1 still present
grep -c "Pyramid math" ~/.claude/agents/ae-test/AGENT.md                                     # Pyramid still present
test -f ~/.claude/agents/ae-edge/AGENT.md && echo "ae-edge: OK"                             # ae-edge intact
```

Expected: counts ≥ 1; ae-edge OK.

(No commit — verification only.)

---

## Task 26: Adapter round-trip verification

**Goal:** Confirm AGENTS.md catalog sentence + idempotency.

- [ ] **Step 1: Set up scratch**

```bash
rm -rf /tmp/visual-artifacts-phase-2-adapter-test
mkdir -p /tmp/visual-artifacts-phase-2-adapter-test
cd /tmp/visual-artifacts-phase-2-adapter-test
```

- [ ] **Step 2: Run multi-tool installer for cursor**

```bash
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
```

- [ ] **Step 3: Verify markers + catalog sentence**

```bash
grep -c "agentic-engineering:start v1\|agentic-engineering:end v1" /tmp/visual-artifacts-phase-2-adapter-test/AGENTS.md
grep -c "capture-tools.*catalog\|.claude/visual-capture.md\|Visual Artifacts table" /tmp/visual-artifacts-phase-2-adapter-test/AGENTS.md
```

Expected: first = 2 (markers); second ≥ 2 (Phase 1 paragraph + Phase 2 sentence).

- [ ] **Step 4: Idempotency re-run**

```bash
cd /tmp/visual-artifacts-phase-2-adapter-test
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
grep -c "agentic-engineering:start v1" /tmp/visual-artifacts-phase-2-adapter-test/AGENTS.md
grep -c ".claude/visual-capture.md" /tmp/visual-artifacts-phase-2-adapter-test/AGENTS.md
```

Expected: each count = 1.

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/visual-artifacts-phase-2-adapter-test
```

(No commit — verification only.)

---

## Task 27: Graphify refresh

- [ ] **Step 1: Run graphify update**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
graphify update . 2>&1 | tail -5
```

If markdown-only changes → "no code files found"; skip commit.

If `git status agentic-engineering/graphify-out/` shows changes:

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/graphify-out/
git commit -m "chore(agentic-engineering): refresh graphify snapshot for Visual Artifacts Phase 2"
```

(Skip task entirely if `graphify` unavailable.)

---

## Task 28: Deferred live verification (needs Claude Code restart)

**Goal:** Confirm catalog selection + capture dispatch work end-to-end.

**Cannot be automated.** Hand off to user. Steps after restart:

- [ ] **Step 1: Restart Claude Code**

Exit + re-launch.

- [ ] **Step 2: Scratch Playwright project**

```bash
mkdir -p /tmp/visual-artifacts-phase-2-e2e
cd /tmp/visual-artifacts-phase-2-e2e
git init -q
npm init -y
npm install -D @playwright/test
npx playwright install chromium
```

Create a minimal Playwright test in `tests/example.spec.ts` and a placeholder `playwright.config.ts`.

- [ ] **Step 3: Run `/init`**

In Claude Code, run `/init`. Approve generated files.

Verify: PROD presents visual-capture-tool options. `playwright` should be in the list (detected from package.json).

Pick `playwright`. Verify `.claude/visual-capture.md` is written with playwright catalog content.

- [ ] **Step 4: Generate a UI story + `/ship`**

`/feature button`. Approve PRD with 2 AC. `/ship STORY-001`.

Verify Phase 4: `/ship` reads `.claude/visual-capture.md`, runs `npx playwright test`, scans `test-results/`, moves files into `docs/features/button/artifacts/STORY-001/`, appends `(auto, backfill scenario)`-tagged rows to PROGRESS.md Visual Artifacts table.

- [ ] **Step 5: Selection of 'none'**

In a new scratch project: `/init` → pick 'none' → verify NO `.claude/visual-capture.md` written. Run `/ship STORY-001` → verify Phase 1 fallback reminder emitted, no dispatch.

- [ ] **Step 6: MCP mechanism (optional, requires Playwright MCP installed)**

If Playwright MCP is installed: scratch project, `/init` → pick `playwright-mcp`. `/ship STORY-001` → verify agent uses MCP tools to capture, writes files directly to artifacts dir.

- [ ] **Step 7: Mobile fixture (optional)**

Scratch React Native project with detox installed. `/init` → verify `detox` appears in suggestions. Pick it. Confirm `.claude/visual-capture.md` content matches `detox.md` catalog entry.

---

## Final step: finish the branch

After Tasks 1–27 complete and Task 28 documented:

- [ ] If Phase 3 is being implemented in the same branch (per user direction "implement all 3 together"), **do NOT finish the branch yet** — proceed to Phase 3's plan.
- [ ] If Phase 3 is deferred to a separate session, **announce:** "I'm using the finishing-a-development-branch skill to complete this work." and use `superpowers:finishing-a-development-branch`.

---

## Self-review notes

- **Spec coverage:** every Phase 2 requirement from the spec maps to a task.
  - Catalog directory + 15 entries → Tasks 2–15 (one task per file or pair)
  - README → Task 1
  - install.sh capture-tools copy → Task 16
  - /init selection step → Task 17
  - /bootstrap mirror → Task 18
  - /ship Phase 4 dispatch → Task 19
  - /implement (auto) marker → Task 20
  - ae-ux acknowledges (auto) rows → Task 21
  - visual-consistency mechanism types → Task 22
  - AGENTS.md adapter → Task 23
  - README → Task 24
  - Verification → Tasks 25, 26, 27, 28
- **Placeholder scan:** no TBD / vague prose. Each catalog entry has full content (frontmatter + 4 body sections). Open questions from the spec are addressed (none decision skips `.claude/visual-capture.md` write; single tool per project for v1).
- **Type consistency:** catalog entry shape is identical across all 15 — `mechanism:` enum values (`test-runner` / `mcp` / `script` / `manual` / `external-link`) match the documented set; the 4 body sections appear in the same order; YAML frontmatter fields use the same keys.
- **Anti-pattern check:** each task touches at most 2 files (Task 2 touches 2 — the two generic entries are conceptually paired and tiny). Tasks 3–15 each touch one file. Integration tasks (17–24) each touch one file. Verification tasks are read-only.
- **Out-of-scope discipline:** This plan does NOT touch the CONSTITUTION.md path (Phase 3 — separate plan), does NOT change `ae-ux`'s severity classification (still `should-fix`, Phase 3 will add escalation), does NOT add a `/status` rollup (deferred).
