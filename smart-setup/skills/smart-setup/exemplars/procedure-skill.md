<!-- EXEMPLAR: quality bar for generated procedure skills. Match density. Do not pad. -->
---
name: release
description: >
  Cut App Store release for this Flutter app. Use when user says "release",
  "cut release", "ship to TestFlight", or bumps version in pubspec.yaml.
---

# Release

## Steps

1. `flutter test` — all pass or stop.
2. Bump version in `pubspec.yaml` — `version: x.y.z+build`. Build number always increments, even for same version.
3. `flutter build ipa --release --obfuscate --split-debug-info=build/symbols`
4. `xcrun altool --upload-app -f build/ios/ipa/*.ipa` — needs `APP_STORE_API_KEY` env var set.
5. Tag: `git tag vX.Y.Z && git push --tags`

## Gotchas

- Build fails on "pod install" → `cd ios && pod repo update` first. Happens after every Flutter upgrade.
- `build/symbols` gitignored — never commit.
