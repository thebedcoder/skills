## `/ae-feature [name]` — Feature Research & Planning

**Agents active: PROD (lead), ARCH (validator), REQ (constitution check)**

Read `./CLAUDE.md`, `./docs/INDEX.md`, and `./docs/CONSTITUTION.md` before starting.

**GIT** creates the feature branch before any work begins:
```
git checkout -b feat/[feature-name]
```

**ARCH** creates the feature folder:
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

**ARCH** analyzes the codebase and proposes **3 implementation approaches**:

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

**PROD** challenges ARCH's recommendation from the user perspective:
```
PROD — Challenge:
[Does ARCH's recommendation actually serve the user well?
Any implementation shortcut that would hurt the UX?
Any option that seems simpler but creates user confusion?]
```

⚠️ **Human checkpoint:** Ask the user to pick an approach before continuing.

---

### Stage 2: PRD Generation

**PROD** generates the PRD and saves to `./docs/features/[feature-name]/PRD.md`.

Sections: Status · Approach · Problem · Goals · Non-Goals · User Flows · Acceptance Criteria · Technical Notes. Mark unclear items `[NEEDS CLARIFICATION]` inline — all will be surfaced together in Stage 2b.

**ARCH** reviews the PRD for technical issues:
```
ARCH — PRD Review:
[Any technical constraints PROD missed?
Any acceptance criteria that are technically ambiguous?
Any scope that will be harder than it looks?]
```

---

### Stage 2b: Clarification Pass

If any `[NEEDS CLARIFICATION]` items exist, **PROD** surfaces them all at once:

```
PROD — Clarification Required:

1. [Item from PRD] — [why this needs clarification]
2. [Item from PRD] — [why this needs clarification]
...

Answer any you know. Skip any that aren't important — SCRIBE will note gaps in the docs.
```

Wait for answers. PROD updates the PRD, replacing `[NEEDS CLARIFICATION]` markers with real content or noting "gap: not yet determined".

⚠️ **Human checkpoint:** *"PRD updated with clarifications. Please review PRD.md. Reply 'approved' when ready."*

---

### Stage 2c: Constitution Check

**REQ** reads `./docs/CONSTITUTION.md` and checks the approved PRD against every article:

```
REQ — Constitution Check: [Feature Name]

✅ Article I [Testing]: [how this feature satisfies it]
✅ Article II [Architecture]: [compliant — reason]
⚠️ Article III [API Design]: [potential conflict — what needs to change]
❌ Article IV [Security]: [violation — what must be addressed before stories are written]
```

If violations found → surface to user and resolve before proceeding to story breakdown.
If clean → continue automatically.

---

### Stage 2d: Data Model (if applicable)

If feature touches DB, **ARCH** generates `./docs/features/[feature-name]/data-model.md`: new entities (name, fields, constraints), modified entities (entity, change, reason), migrations required, API contracts if applicable.

If no DB changes → skip silently.

---

### Stage 3: Story Breakdown

**PROD** writes epics to `./docs/features/[feature-name]/EPICS.md` and stories to `./docs/features/[feature-name]/STORIES.md`.

Tag each story with `[P]` if it can run in parallel with other stories (no dependencies):

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

**ARCH** validates story independence and parallel markers:
```
ARCH — Story Review:
[Any stories with hidden dependencies?
Any story too large (>2hrs)?
Any missing story the breakdown overlooks?
Parallel markers correct? Any [P] stories that actually have hidden deps?]
```

Stories must be: independent where possible, small (≤2hrs), and testable.

**PROD** outputs a final summary: story count, parallel opportunities, and recommended next step.

If the feature has any UI screens → end with: *"Run `/ae-design` to prepare mockups before building."*
If the feature is purely backend/API/CLI with no UI → end with: *"Run `/ae-ship` to start implementing."*
Never suggest `/ae-implement` — that's an internal command.

**ARCH** updates `./docs/INDEX.md` to register the new feature:
```markdown
| [feature-name] | planning | ./docs/features/[feature-name]/ |
```

**GIT** commits the planning docs:
```
chore([feature-name]): add PRD, epics and stories
```

### Gotchas

- **Three approaches ≠ three variations.** A/B/C must represent genuinely different architectural bets, not library swaps or naming choices.
- **No jargon in `[NEEDS CLARIFICATION]` items.** Must be stakeholder-readable: "idempotent?" → "charge twice on double submit?"
- **Constitution check is not ceremonial.** Conflict found → approach changes. Adjusting constitution to fit approach is a red flag.
- **Stories = deployable slices, not split requirements.** "Set up DB schema" is not a story. Infrastructure-only stories are a smell.
- **`[P]` requires real file-path independence.** Same file modified by both → not parallel, even if logically independent.
- **Don't over-decompose.** Under 2hrs + testable → don't split. Coordination overhead > value.

---
