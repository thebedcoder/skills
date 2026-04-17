## `/ae-implement` — Implement Next Story

**Goal:** Ship one story end-to-end: plan approved by user, code and tests written, acceptance criteria verified, progress recorded.

**Agents active:** ARCH (planning), PROD (validation)

**Inputs (read first):**
- `./CLAUDE.md` — project conventions
- `./docs/INDEX.md` — current feature
- `./docs/features/[feature-name]/STORIES.md` and `PROGRESS.md` — find next unchecked story

**Constraints:**
- No code is written until the plan is approved
- Tests drive implementation (red → green), never written after the fact
- No files touched outside ARCH's explicit plan — scope creep is not permitted
- Story is marked complete only when all acceptance criteria are verified

### Flow

**Planning phase.** ARCH produces an implementation plan and PROD validates it against acceptance criteria.

```
ARCH — Implementation Plan: STORY-XXX

Files to create:
  - [path] — [purpose]
Files to modify:
  - [path] — [what changes]
Functions / components:
  - [name] — [responsibility]
Test plan:
  - [scenarios to cover]
Edge cases:
  - [case 1]
Risks:
  - [anything that could go wrong]
```

```
PROD — Plan Review:
[Does this plan deliver every acceptance criterion?
Any criterion ARCH's plan doesn't address?
Any scope in the plan not in the story?]
```

⚠️ **Human checkpoint:** Show both. Ask: *"Reply 'go' to start implementation."*

**Implementation phase.** Implement per the plan. Write each test before the code it covers — watch the test fail with a meaningful error, then make it pass.

**Verification phase.** PROD checks each acceptance criterion:

```
PROD — Acceptance Check:
- [ ] Criterion 1: met / not met — [evidence: file:line or test name]
- [ ] Criterion 2: met / not met — [evidence]
```

**Recording phase.** Update docs:
- Mark story `- [x]` in `STORIES.md`
- Append to `PROGRESS.md`:

```markdown
## STORY-XXX: [Title] — [date]
- Files changed: [list]
- Tests added: [what's covered]
- Notes: [anything notable]
```

Prompt: *"Story complete. Run `/ae-review` before moving to the next story."*

### Gotchas

- **Don't skip ARCH's plan "because the story is small."** Small stories still produce file lists and test plans. Skipping the plan means implementing from pattern-matching, which is how wrong-architecture code lands.
- **Don't write the test after the implementation and call it TDD.** If the test was written after and passes immediately, you haven't proven it catches anything. Write the test first, run it, see it fail with a clear error, then implement.
- **Don't touch files outside ARCH's "Files to modify" list.** If during implementation you realize another file needs changes, stop and update the plan first — don't silently widen scope.
- **Don't mark the story complete on "implementation done."** It's complete when: code works, tests pass, acceptance criteria verified, PROGRESS.md updated. Marking early means review happens on stale STORIES.md state.
- **Don't treat acceptance criteria as goals.** They're checks. If the code satisfies every criterion but feels wrong, that's a signal the PRD was incomplete — flag it, don't ship on a technicality.
- **Don't write pseudo-tests.** `assert result is not None` passes for correct and incorrect implementations. Every test needs to fail when the logic is wrong — mentally run the implementation with broken logic and check whether your test catches it.

---
