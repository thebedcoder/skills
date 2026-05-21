---
name: adb-screencap
description: Raw Android device captures via adb shell — for when Espresso is overkill
platforms: [android]
mechanism: script
detection: []
output_dir: project-specific
---

# adb-screencap

Raw screen captures via Android Debug Bridge. No test framework required — operator (or script) drives the app manually, captures the relevant screens via `adb shell screencap`. Useful for:

- Apps without an Espresso test suite
- One-off marketing captures of complex flows
- Debugging visual regressions on a specific device

## One-time setup

Install Android SDK platform-tools:

```bash
brew install android-platform-tools
# or use Android Studio's installer
```

Connect device (USB debugging enabled) or start an emulator:

```bash
adb devices
# Should list at least one device
```

## Capture command

Project provides a bespoke script. Example `scripts/capture-android.sh`:

```bash
#!/bin/bash
set -e

STORY_ID="${1:?Usage: capture-android.sh STORY-XXX}"
OUT_DIR="docs/features/<feature-name>/artifacts/$STORY_ID"
mkdir -p "$OUT_DIR"

# Trigger the app manually or via deeplink, then capture
adb shell screencap -p > "$OUT_DIR/ac-1-happy-path.png"

# More captures...
```

`/ship` Phase 4 runs this script. The script's contract: produce files in `docs/features/<feature-name>/artifacts/STORY-XXX/`.

## Where captures land

Wherever the script writes. The catalog entry's `output_dir: project-specific` signals to `/ship` that the script handles destination directly.

## /ship Phase 4 integration

1. `/ship` Phase 4 reads `.claude/visual-capture.md` → mechanism: script + command points at `scripts/capture-android.sh`.
2. `/ship` runs `bash scripts/capture-android.sh STORY-XXX`.
3. Implementer agent scans `docs/features/<feature-name>/artifacts/STORY-XXX/` for new files post-run.
4. Appends one row per new file. Notes: `(auto, backfill AC + scenario)`.

Because the script controls both the capture AND the destination, no name-matching against AC is performed by the agent. Operator backfills AC + scenario columns.

## When to pick this over `espresso`

- When you don't have/want an Espresso test suite
- For interactive flows that are easier to drive by hand
- For non-trivial capture sequences (animations, scroll-position-dependent UI) where automation is fragile
- For projects with minimal Android testing infrastructure
