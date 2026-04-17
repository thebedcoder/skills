# MODE 0: SYNTHETIC JTBD RESEARCH

**Goal:** Produce a research report that would take 3+ hours of manual work — job performers, four forces, opportunity-scored outcomes, interview guide — grounded in real market data where available.

**Constraint:** Label all outputs as hypotheses. Don't claim certainty you don't have.

---

## Gotchas

- Vague job statements → push for specific struggling moment, not category.
- Scores cluster 12–14. Force outliers >15 or scoring is useless.
- RESEARCHER may return marketing copy. Only use quotes revealing frustration or desired outcomes.
- Emotional job ≠ desired outcome. "Feel less anxious" = emotional. "Reduce forgetting likelihood" = outcome.

---

## Intake

If product brief is incomplete, use AskUserQuestion to collect: product name, what it does, who it's for, what problem it solves. One question at a time. Stop when you have enough to proceed — don't over-interview.

If prior `jtbd-*.md` files exist in the working dir, ask if any are relevant before starting fresh.

---

## Execution

ultrathink

Spawn **jtbd-researcher** with: product name, category, problem, rough target audience.
While it runs, draft job performer candidates from your own knowledge.
When RESEARCHER returns, enrich or replace your drafts with real signal. If it returns no data, label report `HYPOTHESIS-ONLY` and proceed.

Produce:
- **Focus job statement** — `When [specific struggling moment], [performer] wants to [progress], so they can [outcome]`
- **3–5 job performers** with current alternative + gap
- **Four forces** (each sourced: RESEARCHER / synthesized)
- **6–8 desired outcomes** with opportunity scores; flag >15
- **Emotional + social jobs**
- **10–12 interview questions** anchored in past behavior

---

## Output Format

```
━━━ JTBD RESEARCH REPORT ━━━
[HYPOTHESIS — grounded in real market data / HYPOTHESIS-ONLY]

FOCUS JOB STATEMENT
When [struggling moment], [performer] wants to [progress], so they can [outcome].

JOB PERFORMERS
1. [Performer] — hiring [alternative] — gap: [...]
...
PRIMARY: [Name] — [rationale]

FOUR FORCES
Push:    [...] (source)
Pull:    [...] (source)
Habit:   [...] (source)
Anxiety: [...] (source)

DESIRED OUTCOMES (by opportunity score)
1. [Outcome] — I: X, S: Y, Score: Z ⭐ (if >15)
...

EMOTIONAL JOB: [...]
SOCIAL JOB: [...]

INTERVIEW GUIDE
Q1–Q12: [...]

CONFIDENCE: [High / Medium / Low] — [reason]
```

After output: checkpoint + export prompt.
