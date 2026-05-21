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
