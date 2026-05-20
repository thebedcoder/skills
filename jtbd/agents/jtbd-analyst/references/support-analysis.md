# Support Ticket / Chat Log Analysis Guide

## What Support Data Reveals

Support tickets are pure `Push force` signal — people only contact support when something is failing their job.

Forces defined in [SKILL.md → #forces](../../../skills/jtbd/SKILL.md#forces). Cite — don't redefine.

## Ticket Categories → JTBD Mapping

| Ticket type | JTBD signal |
|-------------|------------|
| "How do I..." questions | Job Map friction — Execute or Prepare step |
| "It's not working" | `Push force` — specific functional failure |
| "Why can't I..." | Desired outcome blocked — high opportunity score candidate |
| "I want to cancel" | Firing trigger — peak frustration + switching moment |
| "Can you add..." | Desired outcome stated directly |

## Extraction Rules

1. Group tickets by theme — don't report individual tickets
2. Count occurrences per theme — frequency = evidence strength
3. For cancellation tickets: extract the explicit reason as a Push force finding
4. For feature requests: reframe as an outcome statement ("Increase the ability to X")

## Chat Log Specifics

- The moment a customer says "I give up" or "forget it" → Job Map failure point
- Questions asked repeatedly in same session → Prepare step friction
- Long silences / short replies → `Anxiety force` or `Habit force` signal
