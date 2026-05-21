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
