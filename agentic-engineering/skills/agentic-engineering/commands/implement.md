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

- **No plan skip for small stories.** File list + test plan required. Skip → pattern-match → wrong arch.
- **No test-after-implementation.** Write test → watch fail → implement → watch pass. Test written after proves nothing.
- **No files outside ARCH's plan.** New file needed? Update plan first. Never silently widen scope.
- **Complete ≠ implementation done.** Code works + tests pass + criteria verified + PROGRESS.md updated. Early mark = review on stale state.
- **Criteria are checks, not goals.** Satisfies all but feels wrong → PRD was incomplete. Flag it, don't ship on technicality.
- **No pseudo-tests.** `assert result is not None` proves nothing. Every test must fail when logic is broken.

---
