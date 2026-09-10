# Visual Capture Tools

Catalog of tools, MCPs, and approaches for capturing visual artifacts during `/ship` Phase 3.

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

- **`test-runner`** — Run the project's test command; capture is a side effect. `/ship` Phase 3 scans the declared `output_dir:` and matches captures to AC by test name.
- **`mcp`** — Implementer agent uses the declared MCP's tools to walk each AC flow and capture per-AC. Files written directly to `docs/features/<name>/artifacts/STORY-XXX/`.
- **`script`** — Project provides a bespoke capture command. `/ship` runs it, scans output, same downstream as `test-runner`.
- **`manual`** — No automation. `/ship` Phase 3 emits a reminder; operator captures by hand.
- **`external-link`** — No automation. Operator records via external service (Loom, Notion, YouTube) and pastes URL into the `File` cell.

## Frontmatter grammar

Every entry declares the same seven keys. `/init` reads them mechanically, so an
entry that plays loose with them is silently unmatchable.

| Key | Type | Rules |
|---|---|---|
| `name` | string | must equal the filename stem |
| `description` | string | one line, shown in the `/init` picker |
| `platforms` | list | any of `web`, `mobile`, `ios`, `android`, `rn`, `flutter`, `desktop`, `terminal`, `any` |
| `mechanism` | enum | exactly one of `test-runner`, `mcp`, `script`, `manual`, `external-link` |
| `detection` | list of `{file, contains}` | see below. `[]` means never auto-suggested |
| `output_dir` | path | see below |

**`detection:`** — each entry is a `file:` and a `contains:`.

- `file:` is a path **or glob relative to the project root**, and must name a
  *file*, never a directory. `.maestro/` is wrong; `.maestro/flows/*.yaml` is
  right. A directory never matches, so the tool is never suggested.
- `contains:` is a literal substring searched in that file. An empty string
  matches any file that exists — use it when presence alone is the signal.
- Entries are OR-ed: any one match suggests the tool.
- List every real config spelling. A rule that names `cypress.config.js` will
  not match a project using `cypress.config.ts`, and `build.gradle` will not
  match `build.gradle.kts`.

**`output_dir:`** — must be a real, scannable path relative to the project root.
`/ship` Phase 3 scans exactly this directory for new files after the capture
command runs, so prose (`project-specific`, `declared per tape file`) gives it
nothing to scan and the auto-populate step silently produces no rows. When the
path genuinely varies per project, declare the default and say in the body that
the operator edits it in `.claude/visual-capture.md`.

## Adding a new tool

1. Copy an existing entry as template
2. Fill frontmatter (`detection:` block enables auto-suggestion during `/init`)
3. Write the 4 body sections (One-time setup, Capture command / MCP usage / Operator workflow, Where captures land, /ship Phase 3 integration)
3b. Check the frontmatter against the grammar above — a bad `detection:` or `output_dir:` fails silently, never loudly
4. Append a row to the platform + mechanism tables above
5. Submit PR

## Selection during `/init`

`ARCH` detects stack, filters this catalog by `platforms:` + `detection:` matches, presents the candidates with `manual` and `loom-link` always included as fallbacks. Operator picks one or `none` to skip. Selection is committed to `./.claude/visual-capture.md` (the project-level capture-tool config, edited per project).
