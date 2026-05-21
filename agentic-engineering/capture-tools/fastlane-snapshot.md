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
