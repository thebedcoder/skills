# MODE 2B: COMPETITOR ANALYSIS
*Use when: you have a focus job and primary persona.*

Ask: not "who builds similar features?" but "what else does the customer hire to do this job?"

---

## Required Inputs Check

Before spawning agents, verify these are available. If any are missing, ask for them:

```
✓ Focus job statement (When X, [performer] wants to Y, so they can Z)
✓ Primary persona (name, struggling moment, four forces)
✓ Product name and one-line description
```

If the user doesn't have these, offer: "Run MODE 0 first to generate them, or provide a brief product description and I'll derive them."

---

## Step 1 — Spawn 4 Parallel SCOUT Agents

Spawn four **jtbd-scout** subagents simultaneously — one per tier:

| Agent | Tier Assignment |
|-------|----------------|
| SCOUT-1 | Direct competitors (same category, same job) |
| SCOUT-2 | Adjacent tools (different category, same job) |
| SCOUT-3 | Analog workarounds (no software, DIY, spreadsheets) |
| SCOUT-4 | Do-nothing (accepting the current state) |

Pass each agent:
- The focus job statement
- The primary persona description
- Their specific tier assignment

Dispatch all 4 simultaneously. Wait for all to return before proceeding.

---

## Step 2 — Build Differentiation Matrix

Once all SCOUT reports return, consolidate into a matrix across the top 4–5 desired outcomes:

```
OUTCOME                | Your Product | Direct | Adjacent | Workaround | Do-Nothing
───────────────────────┼─────────────┼────────┼──────────┼────────────┼───────────
Minimize [outcome 1]   |     ✅       |   ⚠️   |    ❌    |     ❌     |    ❌
Reduce [outcome 2]     |     ✅       |   ✅   |    ⚠️    |     ❌     |    ❌
Increase [outcome 3]   |     ⚠️       |   ❌   |    ❌    |     ❌     |    ❌
Eliminate [outcome 4]  |     ✅       |   ❌   |    ❌    |     ❌     |    ❌
```
✅ Solves well | ⚠️ Partial | ❌ Does not solve

---

## Step 3 — Positioning Statement

Find the column(s) where your product is the only ✅:

```
For [job performer] who need to [focus job],
[Product] is the only [category] that [unique outcome]
— unlike [primary alternative] which [the gap it leaves].
```

---

## Step 4 — Messaging Implications

Synthesize from all 4 SCOUT reports:
- **Fear to exploit** — the strongest push any competitor creates
- **Habit to break** — what the primary persona defaults to at rest
- **Anxiety to defuse** — the most common switching concern
- **Social proof format** — what comparison content will convert best
