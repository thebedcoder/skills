---
name: jobs-to-be-done-megaskill
description: "Product strategy & marketing from a brief. Use for: JTBD research, personas, competitor analysis, landing page copy, ad scripts (TikTok, Reels, YouTube, Threads). 5 chainable modes: research → personas → competitors → landing page → ads."
argument-hint: "[product brief or MODE 0-4]"
disable-model-invocation: true
effort: high
---

# Jobs to Be Done — Megaskill
## Product Brief → Research → Personas → Competitors → Landing Page → Ad Scripts

---

## Invocation

If `$ARGUMENTS` contains a MODE number (e.g. "MODE 3" or "mode-3"), jump directly to that mode — run the required-inputs check first, then proceed.
If `$ARGUMENTS` contains a product name or brief, start with MODE 0 only. After completing each mode, show a **checkpoint** and ask the user to confirm before proceeding to the next.
If `$ARGUMENTS` is empty, print the MODE GUIDE below and ask the user which mode to run.

### Chain Checkpoints (mandatory between modes)

Never auto-chain through all modes. After each mode completes, output:

```
━━━ CHECKPOINT ━━━
MODE [N] complete. Ready to proceed to MODE [N+1] — [Mode Name]?
What you'll get: [one-line description of next mode output]
Type YES to continue, or tell me what to adjust first.
```

### Conversational Routing

If the user describes their situation without invoking a mode explicitly, map to the right mode:
- Describes a product idea / brief → suggest MODE 0
- Pastes reviews, transcripts, tickets → suggest MODE 1
- Has research, needs personas → suggest MODE 2
- Has personas, needs competitive position → suggest MODE 2B
- Ready to write the page → suggest MODE 3
- Needs ad creative → suggest MODE 4
- Asks "what should I do?" with qualitative data → suggest MODE 1

Always confirm before proceeding.

---

## MODE GUIDE — Choose Your Starting Point

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WHAT DO YOU HAVE?                        → START HERE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Only a product idea or one-liner brief   → MODE 0  Synthetic Research      │
│  Real interviews, transcripts, reviews    → MODE 1  Discovery & Analysis    │
│  JTBD research (from Mode 0 or 1)         → MODE 2  Persona Definition      │
│  A focus job + primary persona            → MODE 2B Competitor Analysis     │
│  Focus job + persona + competitive gap    → MODE 3  Landing Page Copy       │
│  Focus job + persona + outcome to lead    → MODE 4  Ad Scripts              │
└─────────────────────────────────────────────────────────────────────────────┘

Full chain (no interviews):   MODE 0 → MODE 2 → MODE 2B → MODE 3 → MODE 4
Full chain (have interviews): MODE 1 → MODE 2 → MODE 2B → MODE 3 → MODE 4
Quick win (copy only):        MODE 3 alone — provide persona + job manually
Quick win (ads only):         MODE 4 alone — provide persona + job + platform
```

**MODE 0 — Synthetic JTBD Research**
Use when you have a product idea but no interviews. Spawns 🔍 RESEARCHER to pull real market data, then synthesizes job performers, four forces, opportunity-scored outcomes, and a validation interview guide.
Commands: see [commands/mode-0-research.md](commands/mode-0-research.md)

**MODE 1 — Discovery & Analysis**
Use when you have real qualitative data (transcripts, reviews, support tickets). Spawns parallel 🧪 ANALYST agents — one per source — to extract JTBD signal simultaneously.
Commands: see [commands/mode-1-discovery.md](commands/mode-1-discovery.md)

**MODE 2 — Persona Definition**
Use when you have JTBD research and need to define who to write for. Builds 2–3 situation-based personas, ranks by commercial value, derives messaging implications.
Commands: see [commands/mode-2-personas.md](commands/mode-2-personas.md)

**MODE 2B — Competitor Analysis**
Use when you have a focus job + primary persona. Spawns parallel 🕵️ SCOUT agents — one per competitor tier — to research simultaneously, then synthesizes differentiation matrix and positioning statement.
Commands: see [commands/mode-2b-competitors.md](commands/mode-2b-competitors.md)

**MODE 3 — Landing Page Copy**
Use when you know the job, persona, and competitive position. Spawns parallel ✍️ COPYWRITER agents — one per page section — then assembles final copy.
Commands: see [commands/mode-3-landing-page.md](commands/mode-3-landing-page.md)

**MODE 4 — Ad Scripts**
Use when you have a focus job + persona and want platform-specific creative. Spawns parallel 🎬 SCRIPTWRITER agents — one per platform — to produce 3-angle scripts simultaneously.
Commands: see [commands/mode-4-ad-scripts.md](commands/mode-4-ad-scripts.md)

---

## Agent Roster

| Agent | Role | Used in |
|-------|------|---------|
| 🔍 **RESEARCHER** | Web search for real market data, competitor landscape, App Store reviews | MODE 0 |
| 🧪 **ANALYST** | Extracts JTBD signal from a single qualitative source | MODE 1 |
| 🕵️ **SCOUT** | Researches one competitor tier (direct / adjacent / workarounds / do-nothing) | MODE 2B |
| ✍️ **COPYWRITER** | Writes one landing page section (Hero / Problem / Value Prop / etc.) | MODE 3 |
| 🎬 **SCRIPTWRITER** | Writes all 3 angle variations for one platform | MODE 4 |

All agents return structured output. The main thread synthesizes results and presents to the user.

---

## The Core Mental Model

Customers don't buy products. They **hire** them to make progress in a specific circumstance.

**Three job types:**
- **Functional:** The practical task to accomplish
- **Emotional:** How they want to feel (or stop feeling)
- **Social:** How they want to be perceived by others

**The Four Forces of Progress:**
- **Push** (away from old): frustrations with current situation
- **Pull** (toward new): excitement about a better outcome
- **Habit** (staying put): inertia, sunk cost, "good enough"
- **Anxiety** (resisting new): fear of switching cost, risk, learning curve

Progress happens only when Push + Pull > Habit + Anxiety.

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Job statement is a feature request | Rewrite from the struggling moment, not the solution |
| Personas built on demographics | Segment by situation and struggling moment |
| Competitor list is only direct competitors | Map Tier 2 (adjacent) and Tier 3 (workarounds) always |
| Landing page leads with product name | Lead with struggling moment or desired outcome |
| Testimonials are generic | Map each testimonial to a specific Force it addresses |
| Ad hook is a slow opener | 2–3 second hard stop — claim, pain, or pattern interrupt |
| Ad CTA is "Learn more" or "Sign Up" | Frame CTA as the desired outcome they came for |
| All ads use the same angle | Always produce Pain / Outcome / Proof variations for A/B |
