# MODE 3: LANDING PAGE COPY

**Goal:** A complete, section-by-section landing page where every word connects to a real job, force, or desired outcome — nothing generic.

**Constraint:** Copy that doesn't map to a JTBD element doesn't get written.

```
Struggling moment → Hero headline      |  Anxiety → FAQ
Functional job    → Subhead + value    |  Social job → Testimonials
Push              → Problem section    |  Habit → "Switch from X"
Pull              → Benefits section   |  Desired outcomes → Feature-outcome cards
```

---

## Gotchas

- COPYWRITER defaults to feature-forward. Every headline must lead with outcome/struggling moment, never product name or feature.
- Testimonials go generic. Each must map to a specific Force. Placeholders → mark clearly.
- FAQ answers re-pitch features. Each must end with concrete de-risking mechanism.
- Consistency check non-optional. Mismatched CTA verbs = subconscious friction.

---

## Required Inputs

Focus job statement + primary persona (four forces, voice sample, messaging implications) + positioning statement.
If missing: offer to derive from product brief (labeled "unvalidated") or run prior modes first.

---

## Execution

Spawn 7 **jtbd-copywriter** agents simultaneously:
COPY-1: HERO | COPY-2: PROBLEM | COPY-3: VALUE PROP | COPY-4: SOCIAL PROOF | COPY-5: HOW IT WORKS | COPY-6: FAQ | COPY-7: FINAL CTA

Each agent receives: section assignment, focus job, persona, positioning statement.

Assemble in page order. Then run consistency check:
- Hero CTA verb = Final CTA verb?
- Problem pain → Value Prop outcome match?
- One testimonial defuses the persona's primary anxiety?
- FAQ covers all four forces' anxieties?

Patch any gaps inline before presenting.

---

## Output

Full assembled page copy in section order, followed by a consistency check summary noting any patches made.

After output: checkpoint + export prompt.
