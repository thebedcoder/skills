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
