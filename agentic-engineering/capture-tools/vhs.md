---
name: vhs
description: VHS — tape-driven terminal session captures (TUI / CLI / shell)
platforms: [terminal]
mechanism: test-runner
detection:
  - file: "*.tape"
    contains: "Output"
output_dir: declared per tape file
---

# VHS

Charm's VHS tool generates terminal session recordings (mp4 / gif / webm / png) from declarative `.tape` script files. Drives a real terminal in a headless container. Ideal for CLI tools, TUI apps (Bubbletea, Textual, etc.), and terminal demos.

Reference: https://github.com/charmbracelet/vhs

## One-time setup

Install VHS:

```bash
brew install vhs
# or: go install github.com/charmbracelet/vhs@latest
```

Create `.tape` files describing the terminal session:

```bash
# demo.tape
Output demo.gif
Set FontSize 20
Set Width 1200
Set Height 800

Type "myapp --help"
Sleep 500ms
Enter
Sleep 2s

Type "myapp run --verbose"
Sleep 500ms
Enter
Sleep 3s
```

## Capture command

```bash
vhs <tape-file>
```

E.g., `vhs .vhs/login-flow.tape`. Each tape file produces one output file declared via the `Output` directive.

## Where captures land

Wherever the tape file's `Output` directive points. The convention is to keep outputs adjacent to tapes:

```
.vhs/
  login-flow.tape
  login-flow.gif       # produced by `vhs login-flow.tape`
  error-state.tape
  error-state.mp4
```

## /ship Phase 4 integration

1. `/ship` Phase 4 reads all `.tape` files under `.vhs/` (or wherever `.claude/visual-capture.md` declares).
2. For each tape, runs `vhs <tape-file>`.
3. Parses each tape's `Output` directive to find the produced file.
4. Maps tape filename to AC — typically `login-flow.tape` → AC for "login flow", operator-confirmable.
5. Moves outputs into `docs/features/<feature-name>/artifacts/STORY-XXX/<tape-name>.<ext>`.
6. Appends rows with `Notes: (auto, terminal recording, backfill scenario)`.

## When to pick this over `manual`

- For CLI tools where the README's demo is part of the value proposition
- For TUI apps where the user-perceived behavior is the terminal interaction
- For automated documentation pipelines that regenerate demos on every release
