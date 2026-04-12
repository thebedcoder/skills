## `/ae-implement` — Implement Next Story

**Agents active: ARCH (planning), PROD (validation)**

Read `./CLAUDE.md`, `./docs/INDEX.md` and the current feature folder `./docs/features/[feature-name]/STORIES.md` and `PROGRESS.md` before starting.

### Steps

1. **PROD** finds the next unchecked story. Confirms with the user (or offers to skip to a specific one).

2. **ARCH** generates an implementation plan:

```
ARCH — Implementation Plan: STORY-XXX

Files to create:
  - [path] — [purpose]

Files to modify:
  - [path] — [what changes]

Functions / components:
  - [name] — [what it does]

Test plan:
  - [scenarios to cover]

Edge cases:
  - [case 1]

Risks:
  - [anything that could go wrong]
```

**PROD** reviews the plan:
```
PROD — Plan Review:
[Does this plan deliver all acceptance criteria?
Any criterion ARCH's plan doesn't address?]
```

⚠️ **Human checkpoint:** Show both. Ask: *"Reply 'go' to start implementation."*

3. Implement following ARCH's plan. Write tests alongside code.

4. **PROD** validates against each acceptance criterion:
```
PROD — Acceptance Check:
- [ ] Criterion 1: met / not met — [evidence]
- [ ] Criterion 2: met / not met — [evidence]
```

5. Update docs:
   - Mark story `- [x]` in `STORIES.md`
   - Append to `PROGRESS.md`:

```markdown
## STORY-XXX: [Title] — [date]
- Files changed: [list]
- Tests added: [what's covered]
- Notes: [anything notable]
```

6. Prompt: *"Story complete. Run `/ae-review` before moving to the next story."*

---
