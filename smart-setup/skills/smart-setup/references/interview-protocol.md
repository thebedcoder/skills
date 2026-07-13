# Interview Protocol

## Rules

- One question per message. Never batch.
- Multiple choice when options enumerable. Open-ended otherwise.
- Skip questions scan already answered. Never ask what code shows.
- Stop when manifest inputs complete — no curiosity questions.

## Greenfield facts (no code to scan)

Ask in order, skip already known:

1. Project one-liner — what + for whom?
2. Stack — language, framework, DB, deploy target?
3. Tier signals — throwaway or real? users planned? team size?
4. Test framework preference?
5. Conventions to enforce from day one?

## Domain knowledge (tier 2 default; tier 1 only when user asks)

Goal: facts agent cannot infer from code. Per candidate domain area:

1. "Concepts or invariants agent must never violate?" (examples: "balance never negative", "events immutable")
2. "What did past contributors get wrong repeatedly?"
3. "Which module hides most surprises? What are they?"

Each answer → candidate domain skill or rule. Candidate goes into manifest, user prunes there.

## Preference questions (all tiers > 0)

- Memory: default layers OK? (permanent `CLAUDE.md` / decisions `docs/decisions.md` / disposable `.claude/scratch.md`)
- Agents: which role handles wanted from palette — QA, SecOps, Lead, Frontend, Backend, Infra, Product, Designer? Only roles with something concrete to verify get generated.
