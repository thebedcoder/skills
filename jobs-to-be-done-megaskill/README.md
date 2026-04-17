# 🎯 JTBD Megaskill

> A Jobs to Be Done research and marketing system for Claude Code — from product brief to landing page copy and ad scripts, powered by parallel specialist agents.

No customer interviews? No positioning? No copy? Start with a one-line product description and chain through five modes to a fully-written landing page and platform-native ad scripts.

---

## The problem this solves

Marketing copy written without customer research is generic. Generic copy doesn't convert. But JTBD research takes time — interviews, synthesis, competitive analysis — and most founders skip it.

This skill runs the full research-to-copy pipeline using specialist agents that work in parallel. You get research-grounded outputs in minutes, not weeks.

---

## How it works

Five chainable modes. Each has a dedicated command file and spawns specialist agents for the heavy lifting.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT ROSTER                                │
├──────────────────┬───────────────────────────────┬─────────────────┤
│ 🔍 RESEARCHER    │ Web search for market data,   │ MODE 0          │
│                  │ competitor landscape, pricing  │                 │
├──────────────────┼───────────────────────────────┼─────────────────┤
│ 🧪 ANALYST       │ Extracts JTBD signal from a   │ MODE 1          │
│                  │ single qualitative source      │                 │
├──────────────────┼───────────────────────────────┼─────────────────┤
│ 🕵️ SCOUT         │ Researches one competitor     │ MODE 2B         │
│                  │ tier (4 run in parallel)       │                 │
├──────────────────┼───────────────────────────────┼─────────────────┤
│ ✍️ COPYWRITER    │ Writes one landing page       │ MODE 3          │
│                  │ section (7 run in parallel)    │                 │
├──────────────────┼───────────────────────────────┼─────────────────┤
│ 🎬 SCRIPTWRITER  │ Writes 3-angle scripts for    │ MODE 4          │
│                  │ one platform (4 in parallel)   │                 │
└──────────────────┴───────────────────────────────┴─────────────────┘
```

Each agent loads reference files on demand — only what's needed for the current task.

---

## Modes

### MODE 0 — Synthetic JTBD Research
**Input:** Product description (1–3 sentences)
**What happens:** RESEARCHER agent searches the web for competitor data, customer voice, and pricing signals. Main thread synthesizes job performers, four forces, opportunity-scored outcomes, and a validation interview guide.
**Output:** Full research report labeled as hypotheses, grounded in real market data.

### MODE 1 — Discovery & Analysis
**Input:** Real qualitative data — interviews, App Store reviews, support tickets, Reddit threads
**What happens:** One ANALYST agent spawned per source, all in parallel. Each extracts struggling moments, four forces, desired outcomes, and voice samples with evidence strength ratings.
**Output:** Consolidated discovery report with cross-source frequency weighting.

### MODE 2 — Persona Definition
**Input:** Research output from MODE 0 or MODE 1
**What happens:** 2–3 JTBD personas built from situation (not demographics). Ranked by commercial value. Messaging implications derived for each.
**Output:** Persona cards with four forces, voice sample, messaging implications, and primary persona recommendation.

### MODE 2B — Competitor Analysis
**Input:** Focus job statement + primary persona
**What happens:** 4 SCOUT agents run in parallel — one per competitor tier (Direct / Adjacent / Workarounds / Do-Nothing). Each loads tier-specific research references.
**Output:** Four-tier alternatives map, differentiation matrix, positioning statement.

### MODE 3 — Landing Page Copy
**Input:** Focus job + persona + positioning statement
**What happens:** 7 COPYWRITER agents run in parallel — one per page section. Each loads section-specific copy rules and anti-patterns.
**Output:** Full landing page copy assembled and consistency-checked.

### MODE 4 — Ad Scripts
**Input:** Focus job + persona + platform selection
**What happens:** Up to 4 SCRIPTWRITER agents run in parallel — one per platform. Each loads platform specs, hook formulas, and angle guides.
**Output:** 3-angle scripts per platform (Pain / Outcome / Proof) with A/B test recommendations.

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  WHAT DO YOU HAVE?                   → START HERE                   │
├─────────────────────────────────────────────────────────────────────┤
│  Only a product idea or brief        → MODE 0  Synthetic Research   │
│  Real interviews / reviews           → MODE 1  Discovery            │
│  JTBD research output                → MODE 2  Personas             │
│  Focus job + persona                 → MODE 2B Competitors          │
│  Job + persona + positioning         → MODE 3  Landing Page         │
│  Job + persona + platform            → MODE 4  Ad Scripts           │
└─────────────────────────────────────────────────────────────────────┘

Full chain (no interviews):   MODE 0 → MODE 2 → MODE 2B → MODE 3 → MODE 4
Full chain (have interviews): MODE 1 → MODE 2 → MODE 2B → MODE 3 → MODE 4
Quick win (copy only):        MODE 3 — provide job + persona + positioning manually
Quick win (ads only):         MODE 4 — provide job + persona + specify platform
```

**Chain checkpoints:** The skill never auto-chains all modes. After each mode completes, it shows a checkpoint and asks you to confirm before proceeding. You can adjust, skip, or stop at any point.

---

## Agent knowledge base

Each agent loads reference files on demand based on the task at hand.

### 🔍 RESEARCHER
```
references/
  competitor-research.md   search patterns, tier classification, signal quality rules
  customer-voice.md        review sources, quote extraction, JTBD signal markers
  pain-points.md           force mapping, frequency heuristics
  pricing-signals.md       price range extraction, WTP signal patterns
```

### 🧪 ANALYST
```
references/
  interview-analysis.md    timeline markers, four forces language patterns, job map steps
  review-analysis.md       star rating signal density, volume heuristics
  support-analysis.md      ticket categories → JTBD mapping, cancellation signal
```

### 🕵️ SCOUT
```
references/
  direct.md        same-category competitor analysis
  adjacent.md      different-category tools hired for the same job
  workarounds.md   DIY / spreadsheet / manual process analysis
  do-nothing.md    acceptance threshold, rationalizations, forcing events
```

### ✍️ COPYWRITER
```
references/
  hero.md          headline formulas, CTA framing, anti-patterns
  problem.md       pain point format, empathy tone, anti-patterns
  value-prop.md    outcome card structure, feature-vs-outcome rules
  social-proof.md  force mapping for testimonials, placeholder guidance
  how-it-works.md  customer-job steps vs product-feature steps
  faq.md           anxiety → Q&A mapping, de-risking mechanisms
  final-cta.md     echo/amplify pattern, risk reversal options
```

### 🎬 SCRIPTWRITER
```
references/
  hooks.md           5 hook types with formulas (Pain / Outcome / Proof / Interrupt / Identity)
  angles.md          3-angle framework, A/B test priority, cross-platform consistency
  tiktok.md          2s hook window, sound-off rules, format template
  instagram-reel.md  3s hook window, sound-off-first design, format template
  youtube-shorts.md  searchability, demo format, 3–5s hook window
  threads.md         500-char limit, person-not-brand tone, white space rules
```

---

## Installation

### Option A — Claude Code CLI

```bash
unzip jtbd-megaskill.zip
cd jtbd-megaskill
./install.sh
```

Restart Claude Code. The skill is available immediately.

**What gets installed:**
```
~/.claude/
├── skills/
│   └── jtbd/
│       ├── SKILL.md              ← router + mode guide + mental model
│       └── commands/             ← 6 mode files, loaded on demand
└── agents/
    ├── jtbd-researcher/
    │   ├── AGENT.md
    │   └── references/           ← 4 market research guides
    ├── jtbd-analyst/
    │   ├── AGENT.md
    │   └── references/           ← 3 source-type analysis guides
    ├── jtbd-scout/
    │   ├── AGENT.md
    │   └── references/           ← 4 competitor tier guides
    ├── jtbd-copywriter/
    │   ├── AGENT.md
    │   └── references/           ← 7 section copy guides
    └── jtbd-scriptwriter/
        ├── AGENT.md
        └── references/           ← 6 platform + creative guides
```

### Option B — Claude.ai

Upload `jtbd.skill` via **Settings → Customize → Skills → Upload**.

---

## Usage

```bash
# Full chain from a brief
/jtbd Relaty — a personal relationship manager that sends AI-personalized messages on important occasions

# Jump to a specific mode
/jtbd MODE 3

# Show the mode guide
/jtbd
```

---

## Example session

```
You:      /jtbd Relaty — personal relationship manager, AI messages for birthdays

          → RESEARCHER runs in parallel while main thread generates hypotheses
          → Research report + focus job + four forces returned

━━━ CHECKPOINT ━━━
MODE 0 complete. Proceed to MODE 2 (Personas)?

You:      yes

          → 3 JTBD personas generated, ranked by commercial value
          → Primary: "The Reconnector" — 30s professional who drifted from close friends

━━━ CHECKPOINT ━━━
MODE 2 complete. Proceed to MODE 2B (Competitor Analysis)?

You:      yes

          → 4 SCOUT agents run in parallel (Direct / Adjacent / Workarounds / Do-Nothing)
          → Differentiation matrix + positioning statement returned

━━━ CHECKPOINT ━━━
MODE 2B complete. Proceed to MODE 3 (Landing Page Copy)?

You:      yes, but skip social proof section — I'll write that manually

          → 6 COPYWRITER agents run in parallel (Hero, Problem, Value Prop, How It Works, FAQ, Final CTA)
          → Full page assembled and consistency-checked

━━━ CHECKPOINT ━━━
MODE 3 complete. Proceed to MODE 4 (Ad Scripts)?

You:      TikTok and Threads only, cold traffic

          → 2 SCRIPTWRITER agents run in parallel
          → 3-angle scripts per platform with A/B test recommendations
```

---

## The JTBD mental model

Customers don't buy products. They **hire** them to make progress in a specific circumstance.

**Three job types — every real job has all three:**
- **Functional:** The practical task to accomplish
- **Emotional:** How they want to feel (or stop feeling)
- **Social:** How they want to be perceived by others

**The Four Forces of Progress:**
- **Push** — frustrations driving them away from the current solution
- **Pull** — excitement pulling them toward the desired outcome
- **Habit** — inertia, sunk cost, "good enough"
- **Anxiety** — fear of switching cost, learning curve, risk

Progress happens only when **Push + Pull > Habit + Anxiety**.

---

## Credits

Built with Claude Code. Informed by:
- Clayton Christensen — *Competing Against Luck* (2016)
- Bob Moesta & Chris Spiek — *Demand-Side Sales 101* (2020)
- Tony Ulwick — *Jobs to Be Done: Theory to Practice* (2016)
- Joanna Wiebe (Copyhackers) — voice-of-customer copy methodology
- April Dunford — *Obviously Awesome* (2019) — positioning

---

## License

MIT
