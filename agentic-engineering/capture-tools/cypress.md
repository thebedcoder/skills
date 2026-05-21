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
