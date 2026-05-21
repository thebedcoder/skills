# Visual Capture Tools

Catalog of tools, MCPs, and approaches for capturing visual artifacts during `/ship` Phase 4.

`/init` and `/bootstrap` read this catalog, filter by detected stack, and offer matching tools to the operator. Selection copies the chosen entry to `./.claude/visual-capture.md`.

## By platform

| Platform | Recommended | Alternatives |
|---|---|---|
| Web | `playwright` | `playwright-mcp`, `cypress` |
| React Native | `detox` | `maestro`, `appium` |
| Flutter | `flutter-integration` | `maestro`, `appium` |
| iOS native | `xcuitest` | `fastlane-snapshot`, `appium` |
| Android native | `espresso` | `appium`, `adb-screencap` |
| Desktop (Electron / Tauri) | `electron-playwright` | `manual` |
| Terminal / TUI | `vhs` | `manual` |
| Any | `manual`, `loom-link` | — |

## By mechanism

| Mechanism | Tools |
|---|---|
| `test-runner` | playwright, cypress, maestro, appium, detox, flutter-integration, xcuitest, fastlane-snapshot, espresso, electron-playwright, vhs |
| `mcp` | playwright-mcp |
| `script` | adb-screencap |
| `manual` | manual |
| `external-link` | loom-link |

## Five mechanism types

- **`test-runner`** — Run the project's test command; capture is a side effect. `/ship` Phase 4 scans the declared `output_dir:` and matches captures to AC by test name.
- **`mcp`** — Implementer agent uses the declared MCP's tools to walk each AC flow and capture per-AC. Files written directly to `docs/features/<name>/artifacts/STORY-XXX/`.
- **`script`** — Project provides a bespoke capture command. `/ship` runs it, scans output, same downstream as `test-runner`.
- **`manual`** — No automation. `/ship` Phase 4 emits a reminder; operator captures by hand.
- **`external-link`** — No automation. Operator records via external service (Loom, Notion, YouTube) and pastes URL into the `File` cell.

## Adding a new tool

1. Copy an existing entry as template
2. Fill frontmatter (`detection:` block enables auto-suggestion during `/init`)
3. Write the 4 body sections (One-time setup, Capture command / MCP usage / Operator workflow, Where captures land, /ship Phase 4 integration)
4. Append a row to the platform + mechanism tables above
5. Submit PR

## Selection during `/init`

`ARCH` detects stack, filters this catalog by `platforms:` + `detection:` matches, presents the candidates with `manual` and `loom-link` always included as fallbacks. Operator picks one or `none` to skip. Selection is committed to `./.claude/visual-capture.md` (the project-level capture-tool config, edited per project).
