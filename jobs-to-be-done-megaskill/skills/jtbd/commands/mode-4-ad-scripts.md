# MODE 4: AD SCRIPTS

**Goal:** Platform-native scripts with 3 angle variations each — Pain, Outcome, Proof — ready to hand to a creator or run as paid ads.

**Constraint:** Every script must pass the sound-off test (message lands with no audio) and the 2-second hook test (would a fast scroller stop?).

---

## Gotchas

- Scripts often open with slow builds ("Hey guys, I wanted to share...") — the hook must be the very first thing, no warm-up
- CTA defaults to "Sign up" or "Learn more" — always frame as the desired outcome ("Start remembering what matters")
- SCRIPTWRITER agents tend to write all 3 angles with the same hook energy — Pain angle should feel empathetic, Outcome should feel aspirational, Proof should feel matter-of-fact
- Threads posts often end up sounding like ads — the product mention should feel like an afterthought in the final line, not the point

---

## Execution

Detect what's already provided — don't re-ask for inputs already in context.
If no focus job: synthesize one from product description, label "(synthesized)".
If no platform specified: ask once — "TikTok / Reels / YouTube Shorts / Threads / all?"
Default funnel stage: cold traffic.

Spawn one **jtbd-scriptwriter** per selected platform simultaneously.
Each receives: platform, focus job, persona (four forces + voice sample), primary desired outcome, funnel stage.

Assemble results. Add cross-platform test recommendation and universal hook.

---

## Output

Scripts in platform order, each with 3 angles + A/B recommendation + casting note + sound-off check.
Followed by:
```
━━━ TESTING PRIORITY ━━━
FIRST TEST: [Platform] — [Angle] — [reason]
UNIVERSAL HOOK: "[best hook line across all platforms]"
```

After output: checkpoint + export prompt.
