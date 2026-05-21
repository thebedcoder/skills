---
name: maestro
description: Maestro declarative mobile UI flows, iOS + Android
platforms: [mobile]
mechanism: test-runner
detection:
  - file: .maestro/
    contains: ".yaml"
output_dir: maestro-output/
---

# Maestro

Declarative mobile UI testing tool. YAML flows describe taps + assertions; Maestro captures screenshots at each step automatically. Works on iOS Simulator, Android Emulator, and real devices.

Reference: https://maestro.mobile.dev/

## One-time setup

Install Maestro:

```bash
brew install maestro
# or: curl -Ls "https://get.maestro.mobile.dev" | bash
```

Create flow files under `.maestro/flows/`:

```yaml
# .maestro/flows/login.yaml
appId: com.example.app
---
- launchApp
- tapOn: "Email"
- inputText: "alice@example.com"
- tapOn: "Password"
- inputText: "secret"
- tapOn: "Sign In"
- assertVisible: "Dashboard"
- takeScreenshot: login-success
```

The `takeScreenshot` step is optional — Maestro also captures screenshots at every step automatically when `--debug-output` is enabled.

## Capture command

```bash
maestro test --debug-output maestro-output .maestro/flows/
```

## Where captures land

```
maestro-output/
  <flow-name>/
    screenshot-step-N.png      # auto-captured at each step
    screenshot-named.png       # from explicit takeScreenshot
    recording.mp4              # if --record-video flag passed
```

## /ship Phase 4 integration

1. `/ship` Phase 4 runs `maestro test --debug-output maestro-output .maestro/flows/`.
2. Implementer agent scans `maestro-output/<flow-name>/` directories.
3. Matches flow file names against the AC Coverage matrix's Tests cells (which reference `.maestro/flows/<flow>.yaml` per project's testing convention).
4. Moves screenshots into `docs/features/<feature-name>/artifacts/STORY-XXX/<flow-name>-step-N.png`.
5. Appends rows with `Notes: (auto, backfill scenario)`.

On flow failure: Maestro still produces partial captures up to the failure point. Keep them; mark with `(auto, from failed flow)`.
