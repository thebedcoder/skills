# MODE 1: DISCOVERY & ANALYSIS
*Use when: you have interviews, transcripts, App Store reviews, support tickets, Reddit threads.*

---

## Step 1 — Identify Sources

Ask the user to provide or list their qualitative sources:
- Interview transcripts (paste text or provide file paths)
- App Store / Google Play reviews
- Support ticket exports
- Reddit threads / forum posts
- Survey open-ends

Count the distinct sources. Each gets its own ANALYST agent.

---

## Step 2 — Spawn Parallel ANALYST Agents

Spawn one **jtbd-analyst** subagent per source, all in parallel.

For each agent, pass:
- The source content (text or file path)
- A source label (e.g. "App Store Reviews — Jan 2025", "Interview with [persona type]")
- The product name and rough job category for context

Dispatch all agents simultaneously. Wait for all to return before proceeding.

---

## Step 3 — Synthesize Findings

Once all ANALYST agents return, synthesize across reports:

1. **Identify the dominant struggling moment** — which one appears most across sources?
2. **Consolidate Four Forces** — merge evidence, weight by frequency and directness of quote
3. **Rank desired outcomes** — which appear most often? Apply opportunity scoring
4. **Select the best voice samples** — pick 3–5 quotes with the highest emotional resonance and specificity
5. **Identify Job Map friction hotspot** — which step is most commonly flagged?

---

## Output Format

```
━━━ DISCOVERY REPORT ━━━
Sources analyzed: [N] — [list source labels]

FOCUS JOB STATEMENT
When [struggling moment], [performer] wants to [progress], so they can [outcome].

FOUR FORCES (evidence-grounded)
Push:    [...] ⭐⭐⭐ (N mentions across sources)
Pull:    [...] ⭐⭐ (N mentions)
Habit:   [...] ⭐⭐ (N mentions)
Anxiety: [...] ⭐ (N mentions)

DESIRED OUTCOMES (ranked by frequency)
1. [Outcome] — mentioned in [N]/[total] sources
2. [Outcome] — ...

EMOTIONAL JOB: [...]
SOCIAL JOB: [...]

JOB MAP: Highest friction at [step] — evidence from [N] sources

VOICE SAMPLES (ready for copy)
• "[quote 1]" — [source]
• "[quote 2]" — [source]
• "[quote 3]" — [source]

CONFIDENCE: High — grounded in [N] real customer sources
```
