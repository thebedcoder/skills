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
