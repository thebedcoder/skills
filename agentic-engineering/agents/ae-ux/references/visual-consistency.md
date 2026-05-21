# Visual Consistency

This is not a pixel-perfection audit. It's a check for patterns that make the
UI feel inconsistent, unprofessional, or hard to read — things users notice even
if they can't articulate why.

---

## Spacing checklist

- [ ] Does spacing follow the project's spacing scale? (4px / 8px base grid, not arbitrary values)
- [ ] Is spacing consistent between similar elements? (all card paddings the same, all section gaps the same)
- [ ] Is there enough breathing room? Content shouldn't feel cramped against edges or each other
- [ ] Are related elements grouped visually? (closer together = belongs together)
- [ ] Is there consistent padding between screen edge and content?

**Flag:** A component with `padding: 13px` when everything else uses 8px/16px grid. Cards with different internal padding in the same list.

---

## Typography checklist

- [ ] Are font sizes from the project's type scale? (not arbitrary sizes)
- [ ] Is there clear visual hierarchy? (headings larger than body, labels smaller than values)
- [ ] Is body text readable at its size? (minimum ~14px for most interfaces)
- [ ] Are font weights used consistently? (bold for emphasis, not just for decoration)
- [ ] Is line height adequate? (1.4-1.6x for body text, tighter for headings)
- [ ] Are text styles consistent between similar screens in this feature?

**Flag:** H1 on one screen, H2 on another for the same semantic level. Random mix of font sizes not in the type scale.

---

## Color checklist

- [ ] Are colors from the design system / token set? (not hardcoded hex values)
- [ ] Is color used consistently for the same purposes? (red = error, green = success, everywhere)
- [ ] Are interactive elements distinguishable from non-interactive ones?
- [ ] Does link color match the rest of the app?
- [ ] Are disabled states visually distinct but not using color alone?
- [ ] Is enough contrast maintained? (see accessibility.md for specifics)

**Flag:** A success message using a different shade of green than the rest of the app. Error state using orange instead of red.

---

## Layout checklist

- [ ] Is the visual hierarchy clear? (most important element draws eye first)
- [ ] Are CTAs prominent enough? (primary action visually dominant)
- [ ] Is there only one primary CTA per screen? (two equal primary buttons = no hierarchy)
- [ ] Are lists consistent? (all items same height/structure unless explicitly variable)
- [ ] Are modals and overlays sized appropriately? (not full-screen for simple confirmations)
- [ ] Is content alignment consistent? (left-aligned text, consistent icon placement)

---

## Icon and image checklist

- [ ] Are icons from the same icon set / same style?
- [ ] Are icons consistent in size within the same context?
- [ ] Do icons have text labels when their meaning isn't universally obvious?
- [ ] Are images shown with aspect ratios preserved? (no stretched images)
- [ ] Do images have alt text or aria-label?
- [ ] Are loading states handled for images? (skeleton or blur-up, not broken image icon)

---

## What NOT to flag

- Pixel-level differences from the design comp (2px off is not a blocker)
- Font rendering differences between design tool and browser
- Exact color hex matching between Figma and CSS (slight rendering differences are normal)
- Subjective aesthetic preferences not reflected in the design spec

---

## Captured artifacts

The `### Visual Artifacts` table in `PROGRESS.md` is the durable visual record of a shipped story's UI behavior. Each row references one capture (file or URL), tagged with the AC it proves and informational notes (viewport, browser, scenario).

### What counts as an artifact

- Static screenshots (`.png`, `.jpg`, `.webp`)
- Screen recordings (`.mp4`, `.webm`, `.mov`, `.gif`, animated `.webp`)
- Hosted recordings via URL (Loom, Notion, YouTube — recognized by `http://` / `https://` prefix in the `File` cell)

### Validation rules

| File cell value | Validation |
|---|---|
| Starts with `http://` or `https://` | URL — skipped; trust the operator |
| Relative path; file exists, non-zero size | OK |
| Relative path; file doesn't exist | `should-fix`: stale reference |
| Relative path; file exists, 0 bytes | `should-fix`: empty file, capture may have failed |
| Empty cell | `should-fix`: empty File reference |

All warnings are `should-fix` in Phase 1 (informational, never blockers).

### When the section is omitted

For backend-only / CLI-only stories with no UI changes, the entire `### Visual Artifacts` section is omitted from PROGRESS.md. `ae-ux` detects non-UI stories by scanning the diff for UI file extensions (`.tsx`, `.jsx`, `.vue`, `.svelte`, SwiftUI `.swift`, Compose `.kt`, Flutter widget `.dart`, `.html`, `.css`, `.scss`) — none present → skip the entire validation step.

### Multiple rows per AC

A single AC can have multiple Visual Artifacts rows — desktop + mobile viewports, light + dark theme, happy path + error state. The AC column may repeat across rows; that's allowed and expected.

### Naming convention

Operator's choice. The matrix's `File` column is the source of truth; filenames inside `docs/features/<name>/artifacts/STORY-XXX/` aren't validated against a pattern. A useful convention:

```
artifacts/STORY-005/
  ac-1-happy-path-desktop.png
  ac-1-happy-path-mobile.png
  ac-2-error-state.mp4
  ac-3-empty-list.png
```

But `screenshot-2026-05-21-3pm.png` is equally valid if it's referenced correctly in the table.

### Capture mechanisms

When `.claude/visual-capture.md` is present (Phase 2 selected a catalog entry), one of five mechanisms drives `/ship` Phase 4:

- **`test-runner`** — Project's existing test framework captures as a side effect. `/ship` runs the test command, scans declared output dir, matches captures to AC by test name.
- **`mcp`** — Implementer agent uses an MCP server (e.g., Playwright MCP) to walk each AC flow and capture per-AC. No test code required.
- **`script`** — Project provides a bespoke capture command. `/ship` runs it, scans the declared output dir, treats results like `test-runner`.
- **`manual`** — No automation. Operator captures by hand. `/ship` emits a reminder only.
- **`external-link`** — No automation. Operator records via Loom / Notion / YouTube, pastes URL into the File cell. `ae-ux` skips URL validation.

The selected mechanism doesn't change `ae-ux`'s validation logic — file paths are checked for existence + non-zero size; URLs are skipped; missing tables on UI stories emit `should-fix`.

### Constitution-based enforcement

Phase 1 + Phase 2 keep all Visual Artifacts findings informational (`should-fix`). Projects that want to enforce visual capture on UI stories opt in via `./docs/CONSTITUTION.md`:

```markdown
## Article N: Visual artifacts

All UI-touching stories must capture visual artifacts (screenshots or screen recordings) and reference them in `PROGRESS.md`'s Visual Artifacts table. Stories that touch frontend files (`.tsx`/`.jsx`/`.vue`/`.svelte`/`.swiftui`/Compose `.kt`/etc.) without captured artifacts are not shipped.
```

Detection regex used by `ae-ux`: `^##\s+Article\s+\S+:\s+Visual artifacts` (case-insensitive). Article number (`I`, `1`, `7`, ...) is flexible.

When the article is present + any Visual Artifacts finding exists, `ae-ux` escalates the severity:

| Finding | Without article (default) | With article (enforced) |
|---|---|---|
| No table on UI story | should-fix | blocker |
| Stale file reference | should-fix | blocker |
| Empty (0-byte) file | should-fix | blocker |
| URL references | (skipped — always valid) | (skipped — always valid) |
| Non-UI story | (skipped — no Visual Artifacts checks) | (skipped — no Visual Artifacts checks) |

Backend-only stories never produce Visual Artifacts findings regardless of the article; the constitution mandate only fires on UI-touching stories.

Operators add the article by uncommenting the scaffold template `/init` generates inside `CONSTITUTION.md`, or by writing the article body directly.
