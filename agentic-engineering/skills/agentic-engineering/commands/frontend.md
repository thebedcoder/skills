## `/ae-frontend` — Frontend Implementation

**Agents:** ARCH (structure), UX (fidelity), PROD (UX validation)

Read `./CLAUDE.md`, target story, `./docs/specs/[feature-name]-design.md`.
No `/ae-design` yet → prompt user to run it first or confirm proceeding without designs.

### Steps

1. **UX** reads design handoff spec + summarises:
```
UX — Design Brief: STORY-XXX
[Key screens + states this story covers]
[Interaction notes from handoff spec]
[What developer needs to watch for]
```

2. **ARCH** audits design system. Lists reuse vs build:

```
ARCH — Frontend Plan: STORY-XXX

Reuse:
  - [component] from [path]

Build new:
  - [component] — [props, variants, states needed]

Data connections:
  - [API call] → [expected shape]

Responsive:
  - [mobile / tablet / desktop notes from UX handoff]
```

3. **PROD** reviews plan vs user flow:
```
PROD — UX Review:
[Does this deliver every screen + state in handoff?
Any interaction state missing — loading, empty, error?
Any shortcut diverging from approved design?]
```

⚠️ **Human checkpoint:** Show all three. Ask: *"Reply 'go' to implement."*

4. Implement per ARCH's plan, pixel-faithful to handoff.

5. **ae-ux** runs structured fidelity review.

Spawn `ae-ux` subagent. Pass:
- `./docs/specs/[feature-name]-design.md` — approved handoff
- All changed frontend files for story

ae-ux loads own references based on story + returns structured report:
```
UX — Fidelity Check: STORY-XXX

BLOCKERS (user cannot complete task):
1. [issue] — [file:component] — [fix]

POLISH (noticeable, not blocking):
1. [issue] — [file:component] — [fix]

CLEAN: [what was checked + done well]
```

6. **PROD** final UX spot-check:
```
PROD — Final Check:
[Does experience feel right end-to-end?
Anything technically working but wrong to use?]
```

---

## Core Principles

1. **Never skip human checkpoint.** Every gate exists for reason.
2. **Agents challenge each other.** PROD vs ARCH. RED assumes failure. Tension is the point.
3. **One story at a time.** No batching.
4. **Tests not optional.** Done = implemented + tested.
5. **Docs stay in sync.** PROGRESS.md, STORIES.md, reviews reflect reality.
6. **Plan before code.** ARCH plans. PROD validates. Then build.
