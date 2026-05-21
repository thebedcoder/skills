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
