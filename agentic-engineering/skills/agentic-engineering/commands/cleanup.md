## `/cleanup [STORY-ID | feature-name]` — Promote Finished Work Into Durable Docs

**Agents:** ARCH (lead), PROD (validator)

Runs after work lands. Turns a finished task into two things worth keeping: **why** it was built that way (`./docs/DECISIONS.md`) and **what an agent must know next session** (`./docs/MEMORY.md`). Everything else is already in git.

Called automatically as the last phase of `/ship` and `/fix`. Standalone use covers work done outside those chains.

**Inputs (read first):** `./docs/INDEX.md` (for `mode:`), `.agentic/focus.md`, `./docs/DECISIONS.md`, `./docs/MEMORY.md`.

### Step 0 — Resolve scope

| `$ARGUMENTS` | Scope |
|---|---|
| `STORY-XXX` | that story |
| feature name | every story shipped since that feature's last cleanup |
| empty | whatever `.agentic/focus.md` CURRENT names |

CURRENT empty **and** no argument → print `Nothing to clean up — no current task. Pass a STORY-ID or feature name.` and exit. Never guess from git log.

Read `mode:` from `./docs/INDEX.md` frontmatter. Sets the `MEMORY.md` line cap: `full` → 150, `lite` → 50. Missing key → `full`.

### Step 1 — Read what happened

- `.agentic/focus.md` `# PLAN` — steps taken, which were skipped
- `./docs/features/<feature>/PROGRESS.md` — the story's entry, files changed, AC coverage
- `./docs/features/<feature>/reviews/` — review output for the story
- `./docs/CHANGELOG.md` — top entries, to detect what's already logged

Sources missing (story never ran through `/ship`) → work from the git diff for the story's commits. Say so in the summary; don't silently produce a thinner result.

### Step 2 — Changelog entry (skip if present)

`./docs/CHANGELOG.md` already carries an entry for this story → **skip**. `/ship` Phase 5 and `/fix` Phase 4 write it; a second write duplicates.

No entry (standalone `/cleanup` on work done by hand) → prepend, newest first, same terse form:
```markdown
## [date]
- [STORY-XXX] feat([feature]): [what was implemented] — [key files]
```

### Step 3 — Binding decisions → `./docs/DECISIONS.md`

**ARCH** extracts decisions that constrain code not yet written. **PROD** challenges each: *"would someone six months from now change this by accident if it weren't written down?"* No → drop it.

Qualifies:
- API or data contract fixed
- library / service chosen over a named alternative
- approach tried and rejected, with the reason
- data-model shape that other features must respect

Does **not** qualify: naming, file layout, anything re-derivable from reading the code, anything already in `CONSTITUTION.md`.

**Most stories produce zero decisions. Zero is the correct, common answer** — an invented `DEC-` entry is worse than none, because it trains the next agent to ignore the file.

Append to `./docs/DECISIONS.md`, newest first, ids sequential from the highest existing `DEC-NNN`:

```markdown
## DEC-007 — [decision, one line]
date: [YYYY-MM-DD] · story: [STORY-XXX] · status: active

**Chose:** [what]
**Because:** [why]
**Rules out:** [what this forecloses]
```

Contradicts an existing entry → do not delete the old one. Set its `status:` to `superseded by DEC-NNN` and say so in the summary. The reason a rejected approach was rejected is the value of the file.

### Step 4 — Rewrite `./docs/MEMORY.md`

**Rewrite the whole file. Never append.** This is the only project doc with a hard line cap — cap comes from Step 0.

Fixed sections, in order:

```markdown
# Project Memory
<!-- Rewritten by /cleanup. Durable knowledge only. Hard cap: [N] lines. -->

## What this is
## How it's built
## Non-obvious constraints
## Known rough edges
```

Rules:

- **Belongs here:** what an agent needs before touching anything, that it cannot get from one read of the code.
- **Does not belong:** dates, story ids, "changed X to Y" (→ `CHANGELOG.md`), rationale for a choice (→ `DECISIONS.md`), rules the project must not break (→ `CONSTITUTION.md`), anything in `CLAUDE.md`.
- Rewrite would exceed the cap → compress the lowest-value section, don't truncate the file mid-section. Report what was compressed.
- Section with nothing true to say → keep the heading, leave it empty. An empty `## Known rough edges` is information.
- New content contradicts an existing line → the new line wins, and the old claim is gone. Memory is current state, not history.

### Step 5 — Commit

**GIT** commits only what this command wrote:
```
docs: cleanup after [STORY-XXX] — decisions and memory
```

Nothing changed in Steps 2–4 → no commit, no empty entry. Report and exit.

### Output

```
━━━ CLEANUP — STORY-XXX ━━━
Changelog:  ✅ entry present (written by /ship) | ✅ added | —
Decisions:  DEC-007 recorded | no binding decision this story
Memory:     ✅ rewritten (N/150 lines)[ · compressed "Known rough edges"]
Git:        ✅ committed | — nothing to commit

Next: /ship for STORY-XXX+1
```

Then release focus — `/focus done` (or `/focus done auto` under `--auto`). Cleanup must run **before** this: `/focus done` clears PLAN, which Step 1 reads.

Called inline from `/ship` or `/fix` → the parent already owns focus release. Skip it here; print the block without the `Next:` line and return.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Supersede an existing `DEC-` entry | `[AUTO: always-ask]` `[ASK: confirm]` — reversing a recorded decision is not mechanical |
| Compress a `MEMORY.md` section to fit the cap | `[AUTO: ask-if-ambiguous]` `[ASK: single]` — skip when one section is clearly stalest |

No other gates. Cleanup is otherwise silent.

### Gotchas

- **Zero decisions is the normal outcome.** Manufacturing a `DEC-` entry per story makes the file unreadable inside a month.
- **MEMORY.md is rewritten, not appended.** Appending is how it becomes a second changelog.
- **Never runs on a blocker pause.** `/ship` and `/fix` skip Phase 7 / Phase 5 when the chain ended unresolved. Unfinished work has nothing durable to record.
- **Idempotent.** Re-running on a cleaned story finds the changelog entry present, the decision already recorded, and produces a `MEMORY.md` rewrite that is a no-op. Nothing to commit.
- **Cleanup does not delete anything.** Compacting a shipped feature's working docs is `/archive`.

---
