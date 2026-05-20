## `/design` — UI/UX Design

**Agents:** UX (lead), PROD (flow validator)

Read `./CLAUDE.md` + `./docs/features/[feature-name]/PRD.md` before starting. PRD must be approved before running.

### Step 0a — Parse `--auto` flag

Detect whether `$ARGUMENTS` contains the `--auto` token.

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- If `AUTO`: Step 0 (below) appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- If `AUTO`: ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /design <feature> --auto
  ```

See "Auto Mode" in SKILL.md for the tag taxonomy, hard-override list, and ambiguity heuristic. Apply checkpoint tags from the table at the bottom of this file.

### Step 0 — Auto-write focus

Before designing, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT references the same feature → update `note:` to `phase: designing UI` and `set_by:` to `/design`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: designing UI for <feature>`, `feature: <feature>`, `since: [now]`, `set_by: /design`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with the command's real work below.

---

**UX** reads `Design Tool` from `./CLAUDE.md` + confirms:
```
UX — Design Tool: [figma | pencil | none]
[One line confirming which tool + why]
```

---

### Stage 1: Flow Mapping

**PROD** extracts user flows from PRD + lists every screen:

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

**UX** reviews + challenges:
```
UX — Flow Review:
[Any screens PROD missed?
Any transition or modal needing own frame?
Any state painful to implement without design?]
```

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]`: Confirm screen list before any design work. Under `--auto`: SKIP if screen list is fully derivable from the PRD with no gaps; otherwise ASK.

---

### Stage 2: Mobile Design

**UX** generates mobile-first mockups using configured tool.

Order:
1. Main screens (happy path, fully populated)
2. Empty states (first-time user, no data)
3. Loading states (skeleton screens, not spinners where possible)
4. Error states (what goes wrong + how user recovers)
5. Modals + overlays

#### `figma`
UX creates frames via Figma MCP (paid plan + MCP required).

#### `pencil`
UX creates frames in Pencil.dev via local MCP (must be running in IDE). `.pen` files in repo — Git-friendly.

Both tools progress: `✅ [Screen] — done` / `⏳ [Screen] — in progress`.

#### `none`
UX produces detailed Markdown wireframe specs:

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

⚠️ **Human checkpoint** `[AUTO: always-ask]`: *"Mobile designs are ready. Please review in [Figma / Pencil / the specs above]. Edit anything that needs changing. Reply 'mobile approved' when ready."* (Visual review can't be auto-judged — never skipped.)

---

### Stage 3: Desktop Adaptation

**UX** extends approved mobile → desktop using same tool.

```
UX — Desktop Notes:
[What changes mobile → desktop per screen?
Any layout needing fundamentally different treatment at wider widths?
Any mobile pattern breaking on desktop?]
```

⚠️ **Human checkpoint** `[AUTO: always-ask]`: *"Desktop designs are ready. Reply 'approved' when ready to proceed."* (Visual review can't be auto-judged — never skipped.)

---

### Stage 4: Design Handoff

**UX** produces handoff spec → `./docs/specs/[feature-name]-design.md`:

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
- [anything left for developer to decide]
```

**PROD** signs off:
```
PROD — Handoff Review:
[Does design cover every user flow in PRD?
Any acceptance criterion design doesn't address?]
```

After approval: *"Design complete. Run `/ship` to start building."*

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Confirm screen list | `[AUTO: ask-if-ambiguous]` — skip when screen list fully derivable from PRD |
| Mobile designs review | `[AUTO: always-ask]` — visual review is human-only |
| Desktop designs review | `[AUTO: always-ask]` — visual review is human-only |
| Design tool selection (from CLAUDE.md) | `[AUTO: ask-if-ambiguous]` — defer to project's existing setting |

---
