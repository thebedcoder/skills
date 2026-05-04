# Craft Guide — Failure Story, Assumption, Signals

Universal craft notes. Load on every investigation.

---

## The failure story (2–3 paragraphs)

Past tense. Specific. Use the actual numbers, names, audiences from the brief.

**Pattern:** Set the scene → first crack → cascade → final state.

| Section | What goes here |
|---------|----------------|
| Set the scene | The plan launched as designed. Specific details from the brief. |
| First crack | The exact moment your assigned failure mode started showing — small, easy to dismiss at the time. |
| Cascade | How the small problem compounded. What got worse and why. |
| Final state | What "failed" looks like 6 months in — the metric, the verdict, the visible damage. |

**Avoid:**
- Generic phrasing ("users were unhappy", "engagement dropped")
- Multiple failure modes (stay on yours — others have their own investigators)
- Hedging ("perhaps", "might have", "could have led to")
- Hindsight without mechanism ("they should have known")

---

## The underlying assumption (1 sentence)

The thing the user was *taking for granted*. Often invisible to them at the time of planning — that's what makes it dangerous.

**Sniff test:** if you state the opposite of the assumption, does the plan immediately look weaker? If yes, you found it.

| Weak | Strong |
|------|--------|
| "Assumed users would adopt it." | "Assumed marketing managers self-identify that way and gather in places you can reach." |
| "Assumed pricing was right." | "Assumed your buyer signs off on $297 personal-development spend without approval friction." |
| "Assumed there was demand." | "Assumed solopreneurs and team managers want the same thing from this workshop." |

---

## Early warning signs (1–2 bullets)

Observable. Measurable. Something a human could notice in week 2 instead of month 6.

| Weak (vague feeling) | Strong (observable signal) |
|----------------------|----------------------------|
| "Engagement feels low." | "Workshop signups under 15 in week 1 of promotion." |
| "Customers seem confused." | "Support tickets containing 'how do I' rise above 40% of total." |
| "Sales are slow." | "Free-tier-to-paid conversion below 3% by day 14." |
| "Team morale dropped." | "Pull request review time doubles within 6 weeks of the hire." |

If you can't name the metric or the observation, sharpen the signal until you can.
