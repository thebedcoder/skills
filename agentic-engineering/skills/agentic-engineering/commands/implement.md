## `/implement` — Implement Next Story

**Goal:** Ship one story end-to-end — plan approved, code + tests written, acceptance criteria verified, progress recorded.

**Agents:** ARCH (plan), PROD (validation)

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- `./docs/INDEX.md` — current feature
- `./docs/features/[feature-name]/STORIES.md` + `PROGRESS.md` — find next unchecked story

**Constraints:**
- No code before plan approved
- Tests drive implementation (red → green) — never written after
- No files outside ARCH's explicit plan — scope creep forbidden
- Story marked complete only when all acceptance criteria verified

### Flow

**Plan.** ARCH produces plan. PROD validates vs acceptance criteria.

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
[Does plan deliver every acceptance criterion?
Any criterion ARCH's plan doesn't address?
Any scope in plan not in story?]
```

⚠️ **Human checkpoint:** Show both. Ask: *"Reply 'go' to start implementation."*

**Implement.** Per plan. Write each test before code it covers — watch fail with meaningful error, then pass.

**Verify.** PROD checks each acceptance criterion:

```
PROD — Acceptance Check:
- [ ] Criterion 1: met / not met — [evidence: file:line or test name]
- [ ] Criterion 2: met / not met — [evidence]
```

**Record.** Update docs:
- Mark story `- [x]` in `STORIES.md`
- Append to `PROGRESS.md`:

```markdown
## STORY-XXX: [Title] — [date]
- Files changed: [list]
- Tests added: [what's covered]
- Notes: [anything notable]
```

Prompt: *"Story complete. Run `/review` before next story."*

### Gotchas

- **No plan skip for small stories.** File list + test plan required. Skip → pattern-match → wrong arch.
- **No test-after-implementation.** Test → watch fail → implement → watch pass. Test after proves nothing.
- **No files outside ARCH's plan.** Need new file? Update plan first. Never silently widen scope.
- **Complete ≠ implementation done.** Code works + tests pass + criteria verified + PROGRESS.md updated. Early mark = review on stale state.
- **Criteria are checks, not goals.** Satisfies all but feels wrong → PRD incomplete. Flag it, don't ship on technicality.
- **No pseudo-tests.** `assert result is not None` proves nothing. Every test must fail when logic broken.

---
