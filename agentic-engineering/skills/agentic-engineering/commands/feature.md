## `/feature [name]` — Feature Research & Planning

**Agents:** PROD (lead), ARCH (validator), REQ (constitution check)

**Inputs (read first):**
- `./CLAUDE.md`, `./docs/INDEX.md`
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/feature <name> --auto`.

### Step 0 — Auto-write focus

Before anything else, run **§B** of `shared/preamble.md` — `title: researching feature: <name>`, `feature: <name>`, `set_by: /feature`. CURRENT already names this feature → only `note: phase: researching feature <name>` + `set_by:` change.

### Step 0c — Read project mode

Read `mode:` from `./docs/INDEX.md` frontmatter — the table below is all `/feature` needs from it (`shared/project-mode.md` has the full scaffold matrix).

No `./docs/INDEX.md` → print `Run /init first — no docs scaffold in this project.` and exit.
No `mode:` key → treat as `full`.

| Mode | Stages run |
|---|---|
| `full` | 0 → 1 → 2 → 2b → 2c → 2d → 3 → 3b |
| `lite` | 2d (only if DB touched) → 3 → 3b |


Lite: REQ still checks every story against CONSTITUTION.md in `/review`; no `PRD.md` or `EPICS.md`, ever.

---

**GIT** creates feature branch before any work:
```
git checkout -b feat/[feature-name]
```

**ARCH** creates feature folder. **Full:**
```
./docs/features/[feature-name]/
  PRD.md
  EPICS.md
  STORIES.md
  PROGRESS.md
  /reviews/
```

**Lite:**
```
./docs/features/[feature-name]/
  STORIES.md
  PROGRESS.md
  /reviews/
```

---

### Stage 0: Intent check *(full mode, not under `--auto`)*

Before ARCH analyzes anything, **PROD** reads `$ARGUMENTS`, `INDEX.md` and the code area the request names, and checks three slots:

- **User** — who acts or benefits: role, segment, calling system. ("add export" — for whom?)
- **Outcome** — what changes for them, how success shows. ("improve onboarding" — to what end?)
- **Constraint** — a limit the design must respect: platform, scale, deadline, compliance, must-not-break.

All three filled → ask nothing, print the note below, go to Stage 1.

Any empty → ⚠️ **Human checkpoint** `[AUTO: skip]` `[ASK: prose]`: **one question per message**, emptiest load-bearing slot first (user → outcome → constraint). Stop the moment all three are filled. **At most 5 questions in total**; a slot still empty after that → `[NEEDS CLARIFICATION]` marker in the PRD, continue. Stakeholder language, no jargon (Gotchas). Codebase suggests an answer → offer it: *"Only `admin/` has exports today — is this for admins?"*

```
PROD — Intent:
User:       [who]
Outcome:    [what changes, how success shows]
Constraint: [limit — or "none stated; assumed: X"]
```

Note feeds Stage 1 (every option must serve it) and Stage 2's Problem + Goals. **Stage 2b never re-asks a slot answered here** — 2b is for what the PRD draft itself left open.

Under `--auto`: SKIP, emit `SKIPPED: intent check [auto]`. Empty slot → `[NEEDS CLARIFICATION]` in PRD → Stage 2b surfaces it; PRD gate (skips only with no open marker) asks.

---

### Stage 1: Research & Options *(full mode only)*

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

⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: Ask user to pick approach before continuing. (Architectural choice — never skipped under `--auto`.)

Options = the three approaches, ARCH's pick first `(Recommended)`, each described by its one-line Pros/Complexity digest — the full analysis is printed above the widget.

---

### Stage 2: PRD Generation *(full mode only)*

**PROD** generates PRD → `./docs/features/[feature-name]/PRD.md`.

Sections: Status · Approach · Problem · Goals · Non-Goals · User Flows · Acceptance Criteria · Technical Notes. Mark unclear items `[NEEDS CLARIFICATION]` inline — surfaced together in Stage 2b.

**Number every acceptance criterion `FR-1`, `FR-2`, … in PRD.md** — feature-scoped, 1-based, sequential, stable for the feature's life. Stage 3 stories claim them; `/converge` audits against them.

```markdown
## Acceptance Criteria

- FR-1: [criterion]
- FR-2: [criterion]
```

Never renumber an existing FR — a story, a review and a `/converge` report may already cite it. New criterion appended late gets the next free number even if it belongs mid-list. Criterion dropped → leave the number retired with `— dropped [date]`, don't reuse it.

PRD criteria are feature-level and outlive any one story. Story-level `AC-N` (Stage 3) are per-story checks that *prove* an FR. Different layers, never merged.


**ARCH** reviews PRD for technical issues:
```
ARCH — PRD Review:
[Any technical constraints PROD missed?
Any acceptance criteria technically ambiguous?
Any scope harder than it looks?]
```

---

### Stage 2b: Clarification Pass *(full mode only)*

Any `[NEEDS CLARIFICATION]` items → **PROD** surfaces all at once:

```
PROD — Clarification Required:

1. [Item from PRD] — [why needs clarification]
2. [Item from PRD] — [why needs clarification]
...

Answer any you know. Skip any that aren't important — SCRIBE will note gaps in the docs.
```

`[ASK: prose]` — clarification answers are freeform by nature. Do **not** widget them.

Wait for answers. PROD updates PRD, replaces `[NEEDS CLARIFICATION]` markers with real content or "gap: not yet determined".

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]` `[ASK: confirm]`: *"PRD updated with clarifications. Review PRD.md."* → Approve / Revise. Under `--auto`: SKIP if PRD has no open `[NEEDS CLARIFICATION]` markers and no constitution conflicts; otherwise ASK.

---

### Stage 2c: Constitution Check *(full mode only)*

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

**Full:** PROD writes epics → `./docs/features/[feature-name]/EPICS.md`, stories → `./docs/features/[feature-name]/STORIES.md`.

**Lite:** PROD writes stories only → `./docs/features/[feature-name]/STORIES.md`. Source is the user's `$ARGUMENTS` description plus a codebase read, not a PRD. Ask `[ASK: prose]` once if the description is too thin to derive acceptance criteria from — one round, then write. No epics file.

Every story carries a `Priority:`. Tag a story `[P]` if runnable parallel (no dependencies):

```markdown
## [Feature Name] — Stories

- [ ] STORY-XXX: [Title] [P]
  **As a** [user], **I want** [action] **so that** [benefit]
  **Priority:** P1
  **Implements:** FR-1, FR-3
  **Acceptance Criteria:**
  - [ ] AC-1: [criterion]
  - [ ] AC-2: [criterion]
  **Notes:** [technical context from ARCH]
  **Parallel:** yes — no dependency on other stories

- [ ] STORY-XXX: [Title]
  **As a** [user], **I want** [action] **so that** [benefit]
  **Priority:** P2
  **Implements:** FR-2
  **Acceptance Criteria:**
  - [ ] AC-1: [criterion]
  - [ ] AC-2: [criterion]
  **Notes:** depends on STORY-XXX
  **Parallel:** no — requires STORY-XXX first
```

**`Priority:` is P1, P2 or P3 — one per story, on its own line.**

| Level | Means |
|---|---|
| `P1` | the MVP. Ship only the P1 set and the feature is worth deploying |
| `P2` | completes the feature as specified |
| `P3` | wanted, survives being cut |

**The P1 set alone must be deployable** — the only hard rule here. A P1 set that needs a P2 story is mis-labelled: promote the P2 or demote the P1. "Everything is P1" = no slice found; push back and re-cut, never record it.

**Never write priority inside the title bracket** — `[P]` there is the parallel marker; `[P1]` reads as a malformed one.

**`Implements:` is the PRD → story link** — the `FR-N` ids this story delivers, comma-separated. One FR may span several stories and vice versa. It is `/converge`'s inventory.

**Lite mode omits the line entirely** — there is no `PRD.md`, so there are no FR ids to cite. Never invent them.


**AC labeling:** `AC-1:`, `AC-2:`, … per story, 1-based, restarting in every story — even a single AC is `AC-1:`. Existing unlabelled AC stay as they are; never retro-label.

**ARCH** validates story independence + parallel markers:
```
ARCH — Story Review:
[Any stories with hidden dependencies?
Any story too large (>2hrs)?
Any missing story the breakdown overlooks?
Parallel markers correct? Any [P] with hidden deps?
Is the P1 set deployable on its own, or does it need a P2 story to work?
Any story priced P1 that the feature would survive without?]
```

**Full mode — FR coverage is a hard gate, not a review question.** ARCH builds the map both ways before continuing:

- FR with zero stories → the breakdown is incomplete. Write the missing story or record in `PRD.md` why the FR is out of scope. Never proceed on an unmapped FR.
- Story citing an undefined FR → typo or a requirement PROD never wrote down. Fix the id or add the FR.

Print the map:

```
FR coverage: 7/7 mapped
  FR-4 → STORY-002, STORY-005
  FR-6 → STORY-003
```

Unmapped FRs → list them and stop for the fix. Lite mode skips this whole check — no PRD, no FRs.

Stories must be: independent where possible, small (≤2hrs), testable.

---

### Stage 3b: Spec Audit

Spec complete, nothing built — cheapest moment to find it wrong.

Dispatch **one** subagent: `agentic-engineering:ae-req`. Say **"Mode B"** in the prompt so it audits the spec instead of hunting for code that does not exist yet.

Pass paths, not content:

- `./docs/features/[feature-name]/PRD.md` *(full mode only)*
- `./docs/features/[feature-name]/EPICS.md` *(full mode only)*
- `./docs/features/[feature-name]/STORIES.md`
- `./docs/features/[feature-name]/data-model.md` *(if Stage 2d wrote one)*
- `./docs/CONSTITUTION.md`

Prompt it with:

> Mode B — spec audit. Nothing is implemented. Run all six detection passes over
> the artifacts at the paths below and report by id. Do not open implementation
> files. "Nothing found" is a valid result for any pass.

**Not a repeat of Stage 3's FR check** — ARCH audits its own breakdown; `ae-req` reads it cold, with no stake in it.

**Blockers get fixed here, before the commit** — one edit now instead of a re-plan later.

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]` `[ASK: single]`: *"Spec audit found N blockers. How do you want to handle them?"* → **Fix the spec now (Recommended)** · **Show the full report** · **Proceed anyway**. No blockers → no gate; print clean summary and continue.

Under `--auto`: audit always runs, never pauses on its own. A **blocker** escalates to `[AUTO: always-ask]`; a constitution conflict is hard-override #3 regardless. Should-fix applies silently only when the fix is unambiguous — threshold CONSTITUTION.md already sets, exact duplicate merged. Log as `DECISION:`. Anything else → record open in PRD.md and report.

**Lite mode runs this too**, scoped to `STORIES.md` + `CONSTITUTION.md` — thin one-line stories need it most.

Fixes land in `PRD.md` / `STORIES.md`. Re-run the audit only if a fix added or removed an FR. Rewording → no second pass.

---

**PROD** outputs final summary: story count, the MVP slice, parallel opportunities, recommended next step.

```
MVP (P1): 3 of 9 stories — STORY-001, STORY-002, STORY-004
          covers FR-1, FR-2, FR-5. Deployable without the other six.
```

MVP line is required — it answers "smallest shippable thing".

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

Lite → `chore([feature-name]): add stories`.

### Step N — Auto-mode summary

Run **§C** of `shared/preamble.md`.

### Checkpoint tag reference (this file)

| Line | Checkpoint | Tag |
|---|---|---|
| Intent check | ≤5 questions, one per message, when user / outcome / constraint missing | `[AUTO: skip]` — empty slots become `[NEEDS CLARIFICATION]` markers |
| Approach pick | Choose A/B/C architectural option | `[AUTO: always-ask]` |
| PRD review | Approve PRD draft | `[AUTO: ask-if-ambiguous]` — skip if no open clarification markers + no constitution conflict |
| Story breakdown | (implicit — generated from PRD) | `[AUTO: skip]` — proceed silently when PRD is approved |
| FR coverage gate | unmapped FR or undefined FR cited | not a checkpoint — a hard stop; fix the breakdown |
| Spec audit itself (`ae-req` Mode B) | — | not a checkpoint — always runs, never pauses |
| Spec audit reports a blocker | `[AUTO: always-ask]` |


Lite mode: first three rows never fire — their stages don't run. Only the thin-description `[ASK: prose]` in Stage 3 can pause a lite `/feature`.

### Gotchas

- **Three approaches ≠ three variations.** A/B/C = genuinely different architectural bets, not library swaps or naming.
- **No jargon in `[NEEDS CLARIFICATION]`.** Stakeholder-readable: "idempotent?" → "charge twice on double submit?"
- **Constitution check not ceremonial.** Conflict → approach changes. Adjusting constitution to fit approach = red flag.
- **Stories = deployable slices, not split requirements.** "Set up DB schema" not a story. Infra-only stories = smell.
- **`[P]` requires real file-path independence.** Same file modified by both → not parallel, even if logically independent.
- **Priority ≠ parallelism.** `Priority:` says what ships first, `[P]` says what can run at once. A P1 story that blocks every other story is still P1.
- **Don't over-decompose.** Under 2hrs + testable → don't split. Coordination overhead > value.
- **An FR mapped to a story is a claim, not proof.** `Implements:` records intent at planning time. `/converge` checks the shipped code actually delivers it.


---
