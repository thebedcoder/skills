# MODE 1: DISCOVERY & ANALYSIS

**Goal:** Extract the JTBD signal that's already latent in real customer data — struggling moments, four forces with evidence, desired outcomes, voice samples ready for copy.

**Constraint:** Only report what the data actually says. Never infer without flagging it as inference.

---

## Gotchas

- Reviews skew negative — don't over-weight Push forces; actively look for Pull signals in 4–5 star reviews
- Interview transcripts often bury the real struggling moment in minute 20 — read fully before extracting
- "I want a feature that does X" is not a desired outcome; reframe as "Reduce the time it takes to accomplish X"
- If sources conflict on the same force, report the conflict — don't average it away

---

## Execution

Ask user to list their qualitative sources (transcripts, reviews, tickets, Reddit threads, surveys). Confirm the list before spawning.

Spawn one **jtbd-analyst** per source simultaneously. Each receives: source content, source label, product name.

When all return, synthesize:
- Dominant struggling moment (most frequent across sources)
- Four forces with evidence strength ratings and mention counts
- Desired outcomes ranked by frequency; apply opportunity scoring
- 3–5 voice samples selected for emotional specificity (not length)
- Job Map friction hotspot

---

## Output Format

```
━━━ DISCOVERY REPORT ━━━
Sources: [N] — [labels]

FOCUS JOB STATEMENT
When [struggling moment], [performer] wants to [progress], so they can [outcome].

FOUR FORCES (evidence-grounded)
Push:    [...] ⭐⭐⭐ (N mentions)
Pull:    [...] ⭐⭐ (N mentions)
Habit:   [...] ⭐⭐ (N mentions)
Anxiety: [...] ⭐ (N mentions)

DESIRED OUTCOMES (by frequency)
1. [Outcome] — [N]/[total] sources

EMOTIONAL JOB: [...] | SOCIAL JOB: [...]
JOB MAP: Highest friction at [step]

VOICE SAMPLES
• "[quote]" — [source]
...

CONFIDENCE: High — [N] real sources
```

After output: checkpoint + export prompt.
