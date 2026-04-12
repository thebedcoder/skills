## `/ae-frontend` — Frontend Implementation

**Agents active: ARCH (structure), UX (fidelity check), PROD (UX validation)**

Read `./CLAUDE.md`, the target story, and `./docs/specs/[feature-name]-design.md`.
If `/ae-design` hasn't been run yet, prompt the user to run it first or confirm they want to proceed without designs.

### Steps

1. **UX** reads the design handoff spec and summarises what needs to be built:
```
UX — Design Brief: STORY-XXX
[Key screens and states this story covers]
[Any interaction notes from the handoff spec]
[Anything the developer needs to watch out for]
```

2. **ARCH** audits the existing design system and lists what's available to reuse vs. what needs building:

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

3. **PROD** reviews the plan against user flow:
```
PROD — UX Review:
[Does this deliver every screen and state in the design handoff?
Any interaction state missing — loading, empty, error?
Any shortcut that would diverge from the approved design?]
```

⚠️ **Human checkpoint:** Show all three agents. Ask: *"Reply 'go' to implement."*

4. Implement following ARCH's plan, pixel-faithful to the design handoff.

5. **ae-ux** runs a structured fidelity review:

Spawn `ae-ux` as a subagent, passing:
- `./docs/specs/[feature-name]-design.md` — the approved design handoff
- All changed frontend files for this story

ae-ux loads its reference files based on what the story contains and returns a structured report:
```
UX — Fidelity Check: STORY-XXX

BLOCKERS (user cannot complete the task):
1. [issue] — [file:component] — [fix]

POLISH (noticeable but not blocking):
1. [issue] — [file:component] — [fix]

CLEAN: [what was checked and done well]
```

6. **PROD** does a final UX spot-check:
```
PROD — Final Check:
[Does the overall experience feel right end-to-end?
Anything that works technically but feels wrong to use?]
```

---

## Core Principles (Always Enforced)

1. **Never skip a human checkpoint.** Every gate exists for a reason.
2. **Agents challenge each other.** PROD challenges ARCH. RED assumes failure. This tension is the point.
3. **One story at a time.** No batching.
4. **Tests are not optional.** Done = implemented + tested.
5. **Docs stay in sync.** PROGRESS.md, STORIES.md, and reviews must reflect reality.
6. **Plan before code.** ARCH shows a plan. PROD validates it. Then you build.
