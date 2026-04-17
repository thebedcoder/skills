# MODE 2B: COMPETITOR ANALYSIS

**Goal:** Map every alternative the customer might hire to do this job — not just direct competitors — and identify the defensible position where your product is the only ✅.

**Constraint:** JTBD lens throughout. The question is never "who has similar features?" but "what else does the customer hire to do this job?"

---

## Gotchas

- The most dangerous competitor is usually Tier 3 (workarounds) or Tier 4 (do-nothing), not Tier 1 — don't let direct competitors dominate the analysis
- Differentiation matrix cells often end up all ✅ for your product — be honest about ⚠️ and ❌; the gaps are where users churn
- Positioning statements often come out generic ("only tool that does X and Y") — the formula works only if X is something competitors genuinely can't claim

---

## Required Inputs

Before spawning: verify focus job statement + primary persona are available. If missing, offer to derive them from a product brief or run MODE 0 first.

---

## Execution

ultrathink

Spawn 4 **jtbd-scout** agents simultaneously, each assigned one tier:
- SCOUT-1: Direct (same category, same job)
- SCOUT-2: Adjacent (different category, same job)  
- SCOUT-3: Workarounds (DIY, spreadsheets, manual)
- SCOUT-4: Do-nothing (accepting current state)

When all return, build:
1. **Differentiation matrix** — top 4–5 desired outcomes vs all tiers
2. **Positioning statement** — the column(s) where product is the only ✅
3. **Messaging implications** — fear to exploit, habit to break, anxiety to defuse, proof format needed

---

## Output Format

```
━━━ COMPETITOR ANALYSIS ━━━

ALTERNATIVES MAP
Tier 1 Direct:    [A] | [B] | [C]
Tier 2 Adjacent:  [A] | [B]
Tier 3 Workaround:[A] | [B]
Tier 4 Do-nothing:[rationale]

DIFFERENTIATION MATRIX
[outcome] | Product | Direct | Adjacent | Workaround
...
✅ Solves | ⚠️ Partial | ❌ Doesn't solve

POSITIONING STATEMENT
For [performer] who need to [job], [Product] is the only [category] that [unique outcome]
— unlike [primary alternative] which [gap].

MESSAGING IMPLICATIONS
Fear to exploit: [...] | Habit to break: [...] | Anxiety to defuse: [...] | Proof format: [...]
```

After output: checkpoint + export prompt.
