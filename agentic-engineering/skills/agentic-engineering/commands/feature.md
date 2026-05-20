## `/feature [name]` — Feature Research & Planning

**Agents:** PROD (lead), ARCH (validator), REQ (constitution check)

Read `./CLAUDE.md`, `./docs/INDEX.md`, `./docs/CONSTITUTION.md` before starting.

### Step 0a — Parse `--auto` flag

Detect whether `$ARGUMENTS` contains the `--auto` token (not a substring inside a name).

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- If `AUTO`: Step 0 (below) appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- If `AUTO`: ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /feature <name> --auto
  ```

See "Auto Mode" in SKILL.md for the tag taxonomy, hard-override list, and ambiguity heuristic. Apply checkpoint tags from the table at the bottom of this file.

### Step 0 — Auto-write focus

Before doing anything else, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references the same feature name → update `note:` to `phase: researching feature <name>` and `set_by:` to `/feature`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: researching feature: <name>`, `feature: <name>`, `since: [now]`, `set_by: /feature`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with the command's real work below.

---

**GIT** creates feature branch before any work:
```
git checkout -b feat/[feature-name]
```

**ARCH** creates feature folder:
```
./docs/features/[feature-name]/
  PRD.md
  EPICS.md
  STORIES.md
  PROGRESS.md
  /reviews/
```

---

### Stage 1: Research & Options

**ARCH** analyzes codebase + proposes **3 implementation approaches**:

```
ARCH — Approach Analysis: [Feature Name]

Option A: [Name]
  What: [brief description]
  Pros: [strengths]
  Cons: [weaknesses / risks]
  Complexity: S / M / L
  Recommended: yes/no — [one sentence reason]

Option B: [Name]
  ...

Option C: [Name]
  ...

ARCH's pick: Option [X] because [reason].
```

**PROD** challenges ARCH's recommendation from user perspective:
```
PROD — Challenge:
[Does ARCH's recommendation actually serve the user well?
Any implementation shortcut that would hurt UX?
Any option simpler but creates user confusion?]
```

⚠️ **Human checkpoint** `[AUTO: always-ask]`: Ask user to pick approach before continuing. (Architectural choice — never skipped under `--auto`.)

---

### Stage 2: PRD Generation

**PROD** generates PRD → `./docs/features/[feature-name]/PRD.md`.

Sections: Status · Approach · Problem · Goals · Non-Goals · User Flows · Acceptance Criteria · Technical Notes. Mark unclear items `[NEEDS CLARIFICATION]` inline — surfaced together in Stage 2b.

**ARCH** reviews PRD for technical issues:
```
ARCH — PRD Review:
[Any technical constraints PROD missed?
Any acceptance criteria technically ambiguous?
Any scope harder than it looks?]
```

---

### Stage 2b: Clarification Pass

Any `[NEEDS CLARIFICATION]` items → **PROD** surfaces all at once:

```
PROD — Clarification Required:

1. [Item from PRD] — [why needs clarification]
2. [Item from PRD] — [why needs clarification]
...

Answer any you know. Skip any that aren't important — SCRIBE will note gaps in the docs.
```

Wait for answers. PROD updates PRD, replaces `[NEEDS CLARIFICATION]` markers with real content or "gap: not yet determined".

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]`: *"PRD updated with clarifications. Please review PRD.md. Reply 'approved' when ready."* Under `--auto`: SKIP if PRD has no open `[NEEDS CLARIFICATION]` markers and no constitution conflicts; otherwise ASK.

---

### Stage 2c: Constitution Check

**REQ** reads `./docs/CONSTITUTION.md` + checks approved PRD vs every article:

```
REQ — Constitution Check: [Feature Name]

✅ Article I [Testing]: [how this feature satisfies it]
✅ Article II [Architecture]: [compliant — reason]
⚠️ Article III [API Design]: [potential conflict — what needs to change]
❌ Article IV [Security]: [violation — what must be addressed before stories are written]
```

Violations found → surface to user + resolve before story breakdown.
Clean → continue.

---

### Stage 2d: Data Model (if applicable)

Feature touches DB → **ARCH** generates `./docs/features/[feature-name]/data-model.md`: new entities (name, fields, constraints), modified entities (entity, change, reason), migrations required, API contracts if applicable.

No DB changes → skip silently.

---

### Stage 3: Story Breakdown

**PROD** writes epics → `./docs/features/[feature-name]/EPICS.md`, stories → `./docs/features/[feature-name]/STORIES.md`.

Tag each story `[P]` if runnable parallel (no dependencies):

```markdown
## [Feature Name] — Stories

- [ ] STORY-XXX: [Title] [P]
  **As a** [user], **I want** [action] **so that** [benefit]
  **Acceptance Criteria:**
  - [ ] [criterion]
  **Notes:** [technical context from ARCH]
  **Parallel:** yes — no dependency on other stories

- [ ] STORY-XXX: [Title]
  **As a** [user], **I want** [action] **so that** [benefit]
  **Acceptance Criteria:**
  - [ ] [criterion]
  **Notes:** depends on STORY-XXX
  **Parallel:** no — requires STORY-XXX first
```

**ARCH** validates story independence + parallel markers:
```
ARCH — Story Review:
[Any stories with hidden dependencies?
Any story too large (>2hrs)?
Any missing story the breakdown overlooks?
Parallel markers correct? Any [P] with hidden deps?]
```

Stories must be: independent where possible, small (≤2hrs), testable.

**PROD** outputs final summary: story count, parallel opportunities, recommended next step.

Feature has UI screens → end: *"Run `/design` to prepare mockups before building."*
Purely backend/API/CLI, no UI → end: *"Run `/ship` to start implementing."*
Never suggest `/implement` — internal command.

**ARCH** updates `./docs/INDEX.md`:
```markdown
| [feature-name] | planning | ./docs/features/[feature-name]/ |
```

**GIT** commits planning docs:
```
chore([feature-name]): add PRD, epics and stories
```

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Line | Checkpoint | Tag |
|---|---|---|
| Approach pick | Choose A/B/C architectural option | `[AUTO: always-ask]` |
| PRD review | Approve PRD draft | `[AUTO: ask-if-ambiguous]` — skip if no open clarification markers + no constitution conflict |
| Story breakdown | (implicit — generated from PRD) | `[AUTO: skip]` — proceed silently when PRD is approved |

### Gotchas

- **Three approaches ≠ three variations.** A/B/C = genuinely different architectural bets, not library swaps or naming.
- **No jargon in `[NEEDS CLARIFICATION]`.** Stakeholder-readable: "idempotent?" → "charge twice on double submit?"
- **Constitution check not ceremonial.** Conflict → approach changes. Adjusting constitution to fit approach = red flag.
- **Stories = deployable slices, not split requirements.** "Set up DB schema" not a story. Infra-only stories = smell.
- **`[P]` requires real file-path independence.** Same file modified by both → not parallel, even if logically independent.
- **Don't over-decompose.** Under 2hrs + testable → don't split. Coordination overhead > value.

---
