---
name: maestro
description: Maestro declarative mobile UI flows, iOS + Android
platforms: [mobile]
mechanism: test-runner
detection:
  - file: .maestro/flows/*.yaml
    contains: ""
  - file: .maestro/config.yaml
    contains: ""
output_dir: .maestro/captures/
---

# Maestro

Declarative mobile UI testing tool. YAML flows describe taps + assertions; Maestro captures screenshots at each step automatically. Works on iOS Simulator, Android Emulator, and real devices.

Reference: https://maestro.mobile.dev/

## One-time setup

Install Maestro:

```bash
brew tap mobile-dev-inc/tap && brew install maestro
# or: curl -Ls "https://get.maestro.mobile.dev" | bash
```

Maestro is not in homebrew-core — without the tap, `brew install maestro`
installs something else or fails.

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

**Use explicit `takeScreenshot` steps.** `--debug-output` writes a debug bundle (logs, and screenshots on failure); it is not a documented per-step screenshot feature, and its layout is not a stable contract. Name each screenshot after the AC it proves.

## Capture command

```bash
maestro test .maestro/flows/
```

Point each flow's `takeScreenshot` at `.maestro/captures/<name>` so output lands
in the declared `output_dir:`. Add `--debug-output maestro-debug` when you want
the failure bundle as well; that directory is for debugging, not for artifacts.

## Where captures land

```
maestro-output/
  <flow-name>/
    <name>.png                 # one per takeScreenshot step
```

For video, Maestro has a separate command — `maestro record .maestro/flows/<flow>.yaml`
— or a `startRecording:` / `stopRecording:` pair inside the flow. There is no
`--record-video` flag on `maestro test`.

## /ship Phase 3 integration

1. `/ship` Phase 3 runs `maestro test .maestro/flows/`.
2. Implementer agent scans `.maestro/captures/` for new files.
3. Matches flow file names against the AC Coverage matrix's Tests cells (which reference `.maestro/flows/<flow>.yaml` per project's testing convention).
4. Moves screenshots into `docs/features/<feature-name>/artifacts/STORY-XXX/<name>.png`.
5. Appends rows with `Notes: (auto, backfill scenario)`.

On flow failure: Maestro still produces partial captures up to the failure point. Keep them; mark with `(auto, from failed flow)`.
