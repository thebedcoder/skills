# MODE 0: SYNTHETIC JTBD RESEARCH
*Use when: you have a product idea or brief, but no interviews yet.*

---

## Step 1 — Product Brief Intake

Extract or ask for:
```
Product name / working title: ___________
What it does (one sentence): ____________
Who it's for (rough): ___________________
What problem it solves: _________________
Key capabilities / differentiators: _____
Price point / model (if known): _________
Stage (idea / MVP / live): ______________
```

---

## Step 2 — Spawn RESEARCHER (before generating hypotheses)

Spawn the **jtbd-researcher** subagent with the product brief.

Pass it:
- Product name and category
- What problem it solves
- Target audience (rough)

While RESEARCHER runs, proceed to Step 3 in parallel.
When RESEARCHER returns, incorporate its findings into Step 3 outputs — replacing or enriching hypotheses with real market data where available.

**If RESEARCHER returns no useful data** (niche product, no search results, or very early-stage idea): proceed with fully synthetic hypotheses and label the entire report as `HYPOTHESIS-ONLY — no market data available`. This is still valid — just lower confidence.

---

## Step 3 — Infer the Job Landscape

Generate as **hypotheses**, enriched by RESEARCHER findings:

### A. Job Performer Candidates
List 3–5 types of people who face this problem. For each:
```
Job Performer N: [who they are]
  └─ Current alternative hired: [what they use today]
  └─ Why it fails them: [the gap]
```

### B. Focus Job Selection
Pick the most commercially valuable performer (highest frequency + pain + willingness to pay).
State using:
```
When [specific struggling moment],
[job performer] wants to [desired progress],
so they can [desired outcome].
```

### C. Four Forces (hypothesized, grounded in research)
| Force | Hypothesis |
|-------|-----------|
| **Push** | What's most frustrating about current alternatives? |
| **Pull** | What outcome makes the switch feel worth it? |
| **Habit** | What's keeping them with the old approach? |
| **Anxiety** | What would make them hesitate to try this? |

### D. Desired Outcomes
Generate 6–8 solution-agnostic outcome statements:
- *"Minimize the time it takes to ___"*
- *"Reduce the likelihood of ___"*
- *"Increase the number of ___ without ___"*
- *"Eliminate the need to ___"*

### E. Emotional + Social Jobs
- Emotional: *"Feel [state] instead of [current negative state]"*
- Social: *"Be seen as [perception] by [audience]"*

### F. Opportunity Score
For each outcome: **Importance** (1–10) + **Satisfaction** (1–10)
**Opportunity** = Importance + max(Importance − Satisfaction, 0)
Flag scores > 15 as primary innovation targets.

### G. Validation Interview Guide
10–12 questions anchored in past behavior:
- 2 struggling moment questions
- 2 push/pull questions
- 2 habit/anxiety questions
- 2 current alternatives questions
- 2 desired outcome validation questions

---

## Output Format

```
━━━ SYNTHETIC JTBD RESEARCH REPORT ━━━
[HYPOTHESIS — enriched with real market data from RESEARCHER]

FOCUS JOB STATEMENT
When [struggling moment], [performer] wants to [progress], so they can [outcome].

JOB PERFORMERS IDENTIFIED
1. [Performer A] — currently hiring [alternative]
2. [Performer B] — currently hiring [alternative]
3. [Performer C] — currently hiring [alternative]

PRIMARY PERFORMER (recommended focus): [Name + rationale]

FOUR FORCES
Push:    [...] (source: RESEARCHER / synthesized)
Pull:    [...] (source: RESEARCHER / synthesized)
Habit:   [...] (source: RESEARCHER / synthesized)
Anxiety: [...] (source: RESEARCHER / synthesized)

DESIRED OUTCOMES (ranked by opportunity score)
1. [Outcome] — Importance: X, Satisfaction: Y, Score: Z ⭐ (if >15)
...

EMOTIONAL JOB: [...]
SOCIAL JOB: [...]

VALIDATION INTERVIEW GUIDE
Q1: [...] ... Q10: [...]

CONFIDENCE NOTE
Hypotheses grounded in real market data from web research. Still validate with customer interviews before committing to positioning or ad spend.
```
