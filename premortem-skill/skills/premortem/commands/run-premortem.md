# RUN PREMORTEM

Once context is locked, run the four sub-steps below in order. Do not skip the frame.

---

## Step 1: Set the frame (verbatim)

Print, exactly:

> OK, context locked. Running the premortem.
>
> **It is 6 months from now. [The target] has failed. Done. Looking back to understand what went wrong.**

This single line is the psychological lever. It shifts the mode from "evaluate the plan" (triggers agreeable hedging) to "explain how it died" (triggers honest, specific failure identification).

---

## Step 2: Raw premortem

Generate every genuine failure reason. No prescribed categories, no lenses, no frameworks. Just Klein's method:

- **Specific** — tied to actual details of *this* plan (not generic "won't get adoption")
- **Genuine** — a real threat, not an edge case or minor inconvenience
- **Comprehensive** — find all of them, but don't pad. **4 real > 7 padded.** The number is whatever is actually true for this plan.

Each reason: 1–2 sentences. Number them.

```
━━━ RAW PREMORTEM ━━━
[N] failure reasons identified.

1. [Failure reason — 1-2 sentences, grounded in plan details]
2. [...]
...
```

---

## Step 3: Dispatch investigators (parallel)

Spawn one **premortem-investigator** subagent per failure reason — **all in parallel, single message, multiple Task tool-uses**. Sequential dispatch lets earlier responses bias later ones.

Each agent receives:
- Full captured context (target, audience, success criteria)
- Relevant workspace context (paths, snippets) if discovered in the gate
- Their assigned failure reason (verbatim)
- The frame: "it has already failed, write the story of how it died"

Each agent returns: a 2–3 paragraph failure story, the underlying assumption (1 sentence), 1–2 observable early warning signs. ≤ 300 words total.

**Wait for all agents to return before proceeding.**

---

## Step 4: Synthesize

After all investigators return, produce the synthesis. This is the product — most users skim the cards and read the synthesis.

```
━━━ PREMORTEM SYNTHESIS ━━━

MOST LIKELY FAILURE
[Which scenario is most probable given what's in the plan? Why? — 2-3 sentences.
This is the one the user should focus on first.]

MOST DANGEROUS FAILURE
[Which scenario causes the most damage if it hits, even if less likely? — 2-3 sentences.
This is the one worth insuring against.]

HIDDEN ASSUMPTION
[The single biggest assumption the user is making but probably hasn't questioned —
the thing so obvious to them they forgot it was an assumption. 1-2 sentences.
Often where the real value of the premortem lives.]

REVISED PLAN
1. [Concrete change that maps to a specific failure scenario.
   "Run a $47 pilot with 20 people before committing to $297" — not "consider pricing."]
2. [...]
3. [...]

PRE-LAUNCH CHECKLIST
□ [Specific thing to verify, test, or put in place]
□ [...]
□ [...]
```

3–5 items in the revised plan. 3–5 items in the checklist. Each item must map to a failure mode identified in steps 2–3.

After synthesis: proceed to `save-report.md`.
