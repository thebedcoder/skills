# CONTEXT GATE

A premortem is only as good as the context it runs on. Vague input → generic failures → wasted time.

---

## Step 1: Scan existing context

Before asking the user anything, scan what's available:

- **Conversation history** — earlier in this session, did the user describe the plan / decision?
- **Workspace files** (use `Glob` + quick `Read`):
  - `CLAUDE.md` / `claude.md` — business + project context, constraints
  - `memory/` — audience profiles, prior decisions, past incidents
  - User-attached or referenced files
  - Plans, briefs, PRDs related to the target

Cap this at ~30 seconds. You're after the key files, not exhaustive coverage.

---

## Step 2: Check the minimum bar

Three things must be clear before proceeding:

1. **What is it?** — One-sentence description of the target. (A product launch? A hire? A pricing change?)
2. **Who is it for / who's affected?** — Audience, customer, team, stakeholders. Failure scenarios depend heavily on this.
3. **What does success look like?** — Failure is the inverse. No success = no failure to imagine.

---

## Step 3: Fill gaps conversationally

If all three are clear: proceed to `run-premortem.md` immediately. Don't ask filler questions.

If gaps exist: ask the most important missing piece first. **One question at a time.** Re-evaluate after each answer. Stop as soon as the threshold is met.

Focused question templates:

| Missing | Ask |
|---------|-----|
| What it is | "What specifically are you about to launch / build / decide?" |
| Audience | "Who is this for?" |
| Success | "What does a win look like for this in 6 months?" |

If you can infer an answer from context, do that — don't ask.

---

## Output (when threshold met)

Print, before handing off:

```
━━━ CONTEXT LOCKED ━━━
TARGET:    [one sentence]
AUDIENCE:  [who's affected]
SUCCESS:   [what a win looks like]
```

Then proceed to `run-premortem.md`.
