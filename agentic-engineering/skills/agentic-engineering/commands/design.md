## `/ae-design` — UI/UX Design

**Agents active: UX (lead), PROD (flow validator)**

Read `./CLAUDE.md` and `./docs/features/[feature-name]/PRD.md` before starting. The PRD must be approved before running this command.

**UX** reads the `Design Tool` field from `./CLAUDE.md` and confirms:
```
UX — Design Tool: [figma | pencil | none]
[One line confirming which tool will be used and why]
```

---

### Stage 1: Flow Mapping

**PROD** extracts the user flows from the PRD and lists every screen needed:

```
PROD — Screen Inventory: [Feature Name]

Screens required:
  1. [Screen name] — [purpose]
  2. [Screen name] — [purpose]
  ...

States per screen (must be designed):
  - Default / loaded
  - Loading / skeleton
  - Empty state
  - Error state
  - [any feature-specific states]
```

**UX** reviews and challenges the list:
```
UX — Flow Review:
[Any screens PROD missed?
Any transition or modal that needs its own frame?
Any state that will be painful to implement without a design?]
```

⚠️ **Human checkpoint:** Confirm the screen list before any design work starts.

---

### Stage 2: Mobile Design

**UX** generates mobile-first mockups using the configured design tool.

Order of operations:
1. Main screens (the happy path, fully populated)
2. Empty states (first-time user, no data)
3. Loading states (skeleton screens, not spinners where possible)
4. Error states (what goes wrong and how the user recovers)
5. Modals and overlays

#### If design tool = `figma`
UX creates frames via Figma MCP. Requires Figma paid plan + MCP server configured.
```
UX — Figma Progress:
✅ [Screen] — mobile done
⏳ [Screen] — in progress
```

#### If design tool = `pencil`
UX creates frames in Pencil.dev via its local MCP server. Pencil must be running in the IDE (VS Code extension or desktop app). Design files are saved as `.pen` files in the project repo — Git-friendly and version controlled alongside code.
```
UX — Pencil Progress:
✅ [Screen] — mobile done
⏳ [Screen] — in progress
```

#### If design tool = `none`
UX produces detailed Markdown wireframe specs instead:

```markdown
## Screen: [Name]

Layout:
  - [element] at [position] — [purpose]
  - [element] at [position] — [purpose]

Interactions:
  - Tap [element] → [what happens]

States:
  - Loading: [description]
  - Empty: [description]
  - Error: [description]
```

⚠️ **Human checkpoint:** *"Mobile designs are ready. Please review in [Figma / Pencil / the specs above]. Edit anything that needs changing. Reply 'mobile approved' when ready."*

---

### Stage 3: Desktop Adaptation

**UX** extends approved mobile designs to desktop layout using the same tool.

```
UX — Desktop Notes:
[What changes from mobile to desktop for each screen?
Any layout that needs a fundamentally different treatment at wider widths?
Any mobile pattern that breaks on desktop?]
```

⚠️ **Human checkpoint:** *"Desktop designs are ready. Reply 'approved' when ready to proceed."*

---

### Stage 4: Design Handoff

**UX** produces a handoff spec saved to `./docs/specs/[feature-name]-design.md`:

```markdown
# Design Handoff: [Feature Name]

## Design Tool
[Figma | Pencil | Markdown specs]

## Link / Location
[URL if Figma or Pencil — or "see specs below" if none]

## Screens
| Screen | Mobile Frame | Desktop Frame | States covered |
|--------|-------------|---------------|----------------|
| [name] | [link/ref]  | [link/ref]    | default, empty, error, loading |

## Design Tokens Used
- Colors: [list any new tokens, or "uses existing system"]
- Typography: [same]
- Spacing: [same]

## Interaction Notes
- [anything non-obvious about transitions or animations]

## Open Questions
- [anything left for the developer to decide]
```

**PROD** signs off:
```
PROD — Handoff Review:
[Does this design cover every user flow in the PRD?
Any acceptance criterion that the design doesn't address?]
```

After approval, prompt: *"Design complete. Run `/ae-ship` to start building."*

---
