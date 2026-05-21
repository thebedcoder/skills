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
