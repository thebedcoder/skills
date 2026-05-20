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

### Step 0a — Parse `--auto` flag

Detect whether `$ARGUMENTS` contains the `--auto` token.

- Strip `--auto` from `$ARGUMENTS` before passing the rest to downstream agents.
- Set internal flag `AUTO=true` for this run.
- If `AUTO`: Step 0 (below) appends ` (auto)` suffix to `set_by:` when writing CURRENT.
- If `AUTO`: ensure `.agentic/auto-log.md` exists and append a dated header:
  ```markdown
  ## [now YYYY-MM-DD HH:MM] — /implement <STORY-ID> --auto
  ```

See "Auto Mode" in SKILL.md for the tag taxonomy, hard-override list, and ambiguity heuristic. Apply checkpoint tags from the table at the bottom of this file.

### Step 0 — Auto-write focus

Before planning, update `.agentic/focus.md`:

1. Ensure `.agentic/` exists + gitignored (idempotent):
```bash
mkdir -p .agentic
if [[ ! -f .gitignore ]]; then echo ".agentic/" > .gitignore; fi
grep -qxF ".agentic/" .gitignore || echo ".agentic/" >> .gitignore
```

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references this STORY-ID (likely because `/ship` or `/ship-all` set it as parent) → update `note:` to `phase: implementing` and `set_by:` to `/implement`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: <STORY-ID> — <story title>`, `feature: <feature-name>`, `since: [now]`, `set_by: /implement`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Continue with the flow below.

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

⚠️ **Human checkpoint** `[AUTO: skip]`: Show both. Ask: *"Reply 'go' to start implementation."* Under `--auto`: SKIP — emit `SKIPPED: plan approval (clear story, no ambiguous decisions in plan) [auto]` and proceed. Exception per hard-override #4: if plan introduces a new dependency or alters a public interface, treat as `[AUTO: always-ask]` instead.

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

### Step N — Release focus

If this `/implement` is **not** nested under `/ship` or `/ship-all` (detect by inspecting `set_by:` on CURRENT — if it contains `/ship` or `/ship-all`, the parent owns release):

- If invoked with `--auto` → run `/focus done auto` (auto-promotes NEXT silently per `commands/focus.md` Phase 3).
- Else → run `/focus done` (interactive prompt y/n/b).

If nested under `/ship` / `/ship-all` → skip; the parent handles release.

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Plan-approval ('go' to start) | `[AUTO: skip]` — proceed silently when plan has no new deps / interface changes |
| Plan introduces new library or alters public API | `[AUTO: always-ask]` — escalates from skip to ask |
| Tests passing → commit | `[AUTO: skip]` — tests verify correctness; no user judgment needed |

### Gotchas

- **No plan skip for small stories.** File list + test plan required. Skip → pattern-match → wrong arch.
- **No test-after-implementation.** Test → watch fail → implement → watch pass. Test after proves nothing.
- **No files outside ARCH's plan.** Need new file? Update plan first. Never silently widen scope.
- **Complete ≠ implementation done.** Code works + tests pass + criteria verified + PROGRESS.md updated. Early mark = review on stale state.
- **Criteria are checks, not goals.** Satisfies all but feels wrong → PRD incomplete. Flag it, don't ship on technicality.
- **No pseudo-tests.** `assert result is not None` proves nothing. Every test must fail when logic broken.

---
