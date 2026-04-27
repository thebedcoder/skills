# Product Brain — demo kit

Everything you need to present Product Brain to your team.

## What's here

| File | Purpose |
|---|---|
| [presentation.md](presentation.md) | 14-slide deck, Marp-compatible (also reads as plain markdown). Topic: "Why we want a product brain — and what it costs." 20-min talk. |
| [walkthrough.md](walkthrough.md) | Live-demo script for the presenter. 10-min screencast or guided show-and-tell. |
| [one-pager.md](one-pager.md) | Slack/email-ready summary. Send before the meeting; reread after. |
| [faq.md](faq.md) | Answers the questions PMs/eng-leads always ask. Hand out after the demo. |
| [diagrams/](diagrams/) | All workflow PNGs from the main repo, copied here for offline use. |
| [sample-records/](sample-records/) | Three example ticket records — one per sub-product — showing what the index looks like in production. |
| [sample-groom-output.md](sample-groom-output.md) | Realistic example of `/brain groom` output. Print this; PMs love seeing the real shape. |
| [demo-script.md](demo-script.md) | Slide-by-slide notes synced with the deck for the presenter. |

## Running the live demo

Allocate ~30 minutes total:

| Time | Activity | What to use |
|---|---|---|
| 0–5 min | Context + problem (slides 1–4) | `presentation.md` |
| 5–15 min | Live demo | `walkthrough.md` |
| 15–25 min | Workflow + cost + rollout (slides 5–12) | `presentation.md` |
| 25–30 min | Q&A | `faq.md` as backup |

## Rendering the slides

```bash
# any markdown viewer renders presentation.md as a doc
# for actual slide presentation:
npx @marp-team/marp-cli presentation.md --pdf
npx @marp-team/marp-cli presentation.md --html -o deck.html
```

## Audience

- **PMs** — focus on slides 1–4 (problem) and the live demo. Skip the architecture detail.
- **Engineering leads** — focus on slides 5–10 (architecture, cost, rollout). They'll want depth on citation discipline and bot operational concerns.
- **Both** — slide 12 (rollout plan) is what they need to commit to.

## What to leave behind

After the meeting, send:
- `one-pager.md` (paste into Slack)
- `sample-groom-output.md` (so the team can see real output shape)
- Link to the main repo and `docs/setup.md` for anyone who wants to try it
