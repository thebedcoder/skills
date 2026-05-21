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
