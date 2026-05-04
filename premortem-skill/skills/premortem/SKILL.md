---
name: premortem
description: "Run a premortem on any plan, launch, product, hire, strategy, or decision. Assumes it already failed 6 months from now and works backward to find every reason why. Produces a revised plan with blind spots exposed. Triggers: 'premortem this', 'premortem my X', 'run a premortem', 'what could kill this', 'future-proof this', 'stress test this plan', 'what am i missing here', 'find the blind spots', 'poke holes in this', 'where will this break', 'devil's advocate this', 'what could go wrong'. Do NOT trigger on simple feedback requests, factual questions, or LLM Council requests."
argument-hint: "[plan, decision, or target to premortem] [--html]"
disable-model-invocation: false
effort: medium
allowed-tools: Bash(date *) Bash(ls *) Bash(echo *) Read Glob Write Task
---

# Premortem

Current date: !`date +"%Y-%m-%d"`

Assume the target has already failed 6 months from now. Work backward.

Method: Gary Klein (HBR). Kahneman's single most valuable decision-making technique. Forces the brain into prospective hindsight — generates more specific, honest failure reasons than "what could go wrong?"

The default failure mode in AI-assisted decisions: agreeable, hedged "is this a good plan?" answers. Premortem breaks that pattern by reframing to "this is dead, explain how it died."

---

## When to run

Good targets — anything reversible where the cost of being wrong is high:
- Product or feature about to ship
- Launch with money / reputation on the line
- Pricing change or business model shift
- Hire about to make
- Strategy or positioning pivot
- Partnership or deal under evaluation

Bad targets — defer or redirect:
- Vague ideas with no concrete plan (help them plan first, then premortem)
- Questions with one right answer (just answer)
- Creative feedback on a draft (that's editing)
- Decisions already made + irreversible (premortem only useful if course can change)

If the user wants multiple perspectives on a decision *right now* (not failure analysis), suggest LLM Council instead. Different mechanism, different output.

---

## Flow

```
1. CONTEXT GATE     → commands/context-gate.md
2. RUN PREMORTEM    → commands/run-premortem.md
   ├─ set frame ("it failed")
   ├─ raw premortem    (generate failure reasons)
   ├─ dispatch         (one premortem-investigator per reason, parallel)
   └─ synthesize       (most likely / most dangerous / hidden assumption / revised plan / checklist)
3. SAVE REPORT      → commands/save-report.md
```

Always run all three in order. Skipping the context gate produces generic failures that waste the user's time.

---

## Agent

| Agent | Role |
|-------|------|
| 🔮 **INVESTIGATOR** | Deep-dives one assigned failure reason → story + assumption + early warning signs |

---

## Hard rules

- **Always set the frame explicitly.** "It is 6 months from now. This has failed." Without that line, the analysis defaults to polite risk assessment.
- **Spawn all investigators in parallel.** Sequential dispatch lets earlier responses bias later ones.
- **Find every genuine failure reason. No padding.** 4 real reasons > 7 padded ones. Number whatever is actually true for *this* plan.
- **The synthesis is the product.** Most users skim cards and read the synthesis. Make it specific and actionable.
- **Revisions must be concrete.** "Test pricing at $X with 20 people first" — not "consider your pricing."
- **Don't sugarcoat.** The point is to surface things the user doesn't want to hear before reality does.

---

## Output

Two markdown files saved to working directory:

```
premortem-[target-slug]-[YYYY-MM-DD].md             # synthesis + per-failure cards
premortem-transcript-[target-slug]-[YYYY-MM-DD].md  # full reasoning trail
```

Plus a 3-sentence chat summary: most likely failure, hidden assumption, single most important revision.

**Optional `--html` flag** — if `$ARGUMENTS` contains `--html`, also emit a self-contained, styled `premortem-[slug]-[date].html` alongside the markdown. Use when sharing with non-technical stakeholders or producing a one-shot artifact outside the repo. Default stays markdown-only — it composes with the rest of the toolchain (`ae-analyze`, `pb-sync`, PR diffs).
