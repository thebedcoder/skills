# MODE 4: AD SCRIPTS
*Use when: you have a focus job, primary persona, and desired outcome to lead with.*

---

## Step 1 — Detect Scope (don't re-ask for already-provided inputs)

Check what's already in the conversation or arguments. Only ask for what's missing:

| Input | Already provided? | Action |
|-------|-------------------|--------|
| Platform(s) | e.g. "TikTok" in request | Use it — don't ask |
| Focus job | From MODE 0/2 output | Use it |
| Persona | From MODE 2 output | Use it |
| Funnel stage | User specified | Use it — default to "cold" if omitted |

**If no focus job is available:** Derive one from the product description using this formula:
```
When [most likely struggling moment based on product category],
[target audience] wants to [core outcome the product delivers],
so they can [downstream benefit].
```
Label as "(synthesized — validate with research)".

**If no persona:** Use the target audience description as a minimal persona and proceed.

**Default platform:** If nothing specified, ask: "Which platforms? (TikTok / Reels / YouTube Shorts / Threads / all)"

---

## Step 2 — Spawn Parallel SCRIPTWRITER Agents

Spawn one **jtbd-scriptwriter** subagent per platform, all simultaneously:

| Agent | Platform Assignment |
|-------|-------------------|
| SCRIPT-1 | TikTok |
| SCRIPT-2 | Instagram Reel |
| SCRIPT-3 | YouTube Shorts |
| SCRIPT-4 | Threads |

Pass each agent:
- Their platform assignment
- The focus job statement
- The primary persona (four forces, voice sample, struggling moment)
- The primary desired outcome to lead with
- The funnel stage (if provided)

Dispatch all simultaneously. Wait for all to return.

---

## Step 3 — Assemble Ad Deck

Once all SCRIPTWRITER agents return, assemble in platform order:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIKTOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3 angles from SCRIPT-1]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTAGRAM REEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3 angles from SCRIPT-2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUTUBE SHORTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3 angles from SCRIPT-3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━
THREADS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3 angles from SCRIPT-4]
```

---

## Step 4 — Cross-Platform Test Recommendation

After assembling, add a summary:

```
━━━ TESTING PRIORITY ━━━

FIRST TEST: [Platform] — [Angle] — because [reason based on funnel stage + persona]
SECOND TEST: [Platform] — [Angle]
HYPOTHESIS: If [angle] wins on TikTok, expect same on Reels — test to confirm.

UNIVERSAL HOOK (works across platforms):
"[The single best hook line across all scripts]"
```
