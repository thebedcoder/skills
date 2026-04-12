# MODE 3: LANDING PAGE COPY
*Use when: you have a focus job, primary persona, and competitive position.*

Every section maps to a JTBD element. Copy that doesn't connect to a real job, force, or outcome will not convert.

```
Struggling moment     → Hero headline
Functional job        → Subhead + value prop
Pull (desired future) → Benefits / outcomes section
Push (current pain)   → Problem section
Anxiety               → FAQ / objection handling
Social job            → Testimonials + proof
Habit                 → "Switch from X" messaging
Desired outcomes      → Feature-to-outcome cards
CTA framing           → Button copy + commitment line
```

---

## Required Inputs Check

Before spawning agents, verify these are available:

```
✓ Focus job statement
✓ Primary persona (four forces, voice sample, messaging implications)
✓ Positioning statement (from MODE 2B, or user-provided)
```

**If inputs are missing:**
- No research at all → offer to run MODE 0 first (takes ~2 min)
- Have a product brief but no persona/positioning → derive minimal versions inline and proceed, labeling outputs as "unvalidated"
- Have some research but no positioning → derive positioning from available inputs and proceed

Ask: "I'm missing [X]. Should I derive it from your product brief, or would you like to run MODE [N] first?"

---

## Step 1 — Spawn 7 Parallel COPYWRITER Agents

Spawn seven **jtbd-copywriter** subagents simultaneously — one per section:

| Agent | Section Assignment |
|-------|-------------------|
| COPY-1 | HERO |
| COPY-2 | PROBLEM |
| COPY-3 | VALUE PROPOSITION |
| COPY-4 | SOCIAL PROOF |
| COPY-5 | HOW IT WORKS |
| COPY-6 | FAQ |
| COPY-7 | FINAL CTA |

Pass each agent:
- Their section assignment
- The focus job statement
- The primary persona (four forces, voice sample, messaging implications)
- The positioning statement

Dispatch all 7 simultaneously. Wait for all to return before proceeding.

---

## Step 2 — Assemble Full Page

Once all COPYWRITER agents return, assemble in page order:

```
━━━ HERO ━━━
[from COPY-1]

━━━ PROBLEM ━━━
[from COPY-2]

━━━ VALUE PROPOSITION ━━━
[from COPY-3]

━━━ SOCIAL PROOF ━━━
[from COPY-4]

━━━ HOW IT WORKS ━━━
[from COPY-5]

━━━ FAQ ━━━
[from COPY-6]

━━━ FINAL CTA ━━━
[from COPY-7]
```

---

## Step 3 — Consistency Check

Review assembled copy for:
- Hero CTA verb matches Final CTA verb
- Problem section pain maps to a Value Prop outcome
- At least one testimonial defuses the anxiety named in the Hero trust line
- FAQ covers every anxiety from the persona's four forces

Flag any gaps and patch inline.
