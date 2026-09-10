## `/improve [description]` — Improvement Chain

**Chain:** plan → apply → review → docs → cleanup
**Agents:** ARCH (lead), RED + TEST + LEAN + one scoped specialist (reviewers)

For changes that are neither bug nor whole feature. Adding keyboard shortcut, supporting new file format, new export option, faster query, 400-line hook split in two. Existing thing gets better, or small new capability lands on existing feature.

Not `/fix` — nothing is broken. Not `/feature` — no research, no PRD, no epics, no `STORIES.md`. Nothing this command produces is persisted as planning doc.

**Inputs (read first):**
- `./CLAUDE.md` — conventions
- relevant feature docs in `./app-docs/features/`
- **Project memory** — run **§D** of `shared/preamble.md`: `MEMORY.md` in full, `DECISIONS.md` titles, `CONSTITUTION.md`. `/cleanup` writes these after every chain; a chain that never reads them is a write-only log

### Step 0a — Parse `--auto` flag

Run **§A** of `shared/preamble.md`. Auto-log header for this command: `/improve <improvement summary> --auto`.

### Step 0b — Resolve target (empty `$ARGUMENTS` only)

`$ARGUMENTS` non-empty → skip this step, that text is the improvement.

`$ARGUMENTS` empty → read `./docs/BACKLOG.md`. Collect items with `**Type:** improvement` and `**Status:** backlog`. Cap surfaced list at 5, highest priority first.

- None found → print `No improvement items in BACKLOG.md. Describe one: /improve <description>` and stop.
- One or more → ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"Which improvement should I take?"* → one option per item, labelled `NOTE-XXX: [short title]`. Selected item's description + investigation become the improvement input.

Mark the chosen item in `BACKLOG.md`: `**Status:** in-progress`. Set to `done` in Phase 5.

### Step 0c — Write the phase PLAN

Target resolved, so write PLAN now — never before Step 0b, which can stop the command with nothing to do.

Per "Progress Tracking" in SKILL.md, one PLAN line per phase in `.agentic/focus.md`. Mirror into a harness task list **if this session exposes one** — it is a convenience view, not the record. PLAN survives compaction and session end.



1. `Plan — precedent + scope + Done when`
2. `Apply + tests`
3. `Review — RED + TEST + 1 scoped`
4. `End-user docs + changelogs`
5. `Cleanup — decisions + memory`

Mark #1 `in_progress` at Phase 1. Advance one at a time. `Behavior change: none` → complete #4 with `changelogs only (not user-facing)`. Review blockers unresolved → leave the current task `in_progress`; do not complete #5, Phase 5 is skipped.

Step 0 below mirrors the same list into the `# PLAN` section of `.agentic/focus.md`. The harness task list dies with the session; PLAN survives it.

### Step 0 — Auto-write focus

Before planning, update `.agentic/focus.md`:

1. Run **§B step 1** of `shared/preamble.md` — creates `.agentic/` and gitignores it, idempotent.

2. Read existing CURRENT. Apply story-id-match heuristic:
   - Existing CURRENT.title already references the same improvement → update `note:` to `phase: improving` and `set_by:` to `/improve`. Leave `title:` + `since:` alone.
   - Otherwise → overwrite CURRENT: `title: improving: <improvement summary>`, `since: [now]`, `set_by: /improve`.

Under `--auto` (see "Auto Mode" in SKILL.md): append ` (auto)` suffix to `set_by:` value.

3. Write the chain into the `# PLAN` section of `.agentic/focus.md` (see `commands/focus.md`) — `plan`, `apply + tests`, `review`, `docs + changelogs`, `cleanup`. Tick each as its phase closes.

4. Continue with the command's real work below.

---

**GIT** confirms current branch. On `main`/`master`, print `⚠️ GIT: You're on main. /improve expects to run on a feature branch.` then gate — ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"Continue on main?"* → **Branch first (Recommended)** · **Continue on main** · **Abort**. Never proceed silently on `main`, even under `--auto`.

Off `main` → proceeds silently, no gate.

### Steps

**Phase 1 — Plan**

ARCH reads existing code first. Additive change built without reading what already exists is correct code in wrong shape — new shortcut that shadows an existing binding, new format handler that ignores the pattern the other handlers follow.

```
ARCH — Improvement Plan: [what]

Current behavior:
  [What it does today — works, but suboptimal. Or: capability absent.]

Why worth changing:
  [Friction, cost, or risk removed. One line.]

Change type:
  feat | perf | refactor        ← drives commit prefix

Fits existing pattern:
  [How sibling shortcuts / formats / options already do this — file:line.]
  [No precedent → say so. New pattern needs DEC- entry in Phase 5.]

Scope:
  [Files + functions that change]

Out of scope:
  [Explicit boundaries — what stays untouched]

Behavior change:
  none | user-visible: [what user notices]

Done when:
  - [ ] [condition]
  - [ ] [condition]
  - [ ] [negative case — malformed input, collision, unsupported variant]

Blast radius:
  [What consumes this. What re-tests.]

Verification:
  [Test | before/after benchmark | manual step]

Risk:
  [What could regress]
```

`Done when:` is 2–4 conditions, printed here only. **Never written to `STORIES.md`, `PRD.md`, or `docs/specs/`.** Exists so Phase 3 has criteria to review additive change against. Nothing else. More than 4 conditions → change is a feature, stop and route to `/feature` (lite mode: `/note` then `/ship`).

⚠️ **Human checkpoint** `[AUTO: ask-if-ambiguous]` `[ASK: single]`: Show plan, then ask *"Does this plan look right?"* → **Approve (Recommended)** · **Narrow the scope** · **Wrong approach**. Either non-first option → follow up `[ASK: prose]` and re-plan; never proceed to Phase 2 on a corrected plan without re-running ARCH. Under `--auto`: SKIP when `Fits existing pattern` cites a precedent, `Behavior change` is `none`, and scope is a single file; otherwise ASK.

**Phase 2 — Apply** *(automatic after approval)*

ARCH applies the planned change. Rules:
- Change only what plan listed
- No refactoring unrelated code
- No "while I'm here" improvements — spotted something else? → `./docs/improvements.md`
- Follow the precedent named in `Fits existing pattern`. Deviating from it is a plan change, not an implementation detail — re-gate.

Test obligation keyed to `Change type`:

| Type | Obligation |
|---|---|
| `feat` | One test per `Done when:` condition, negative case included. New shortcut → test it fires and test it does not shadow existing binding. New format → test it parses, test malformed input errors cleanly, test the old format path is unchanged. |
| `perf` | Record before/after measurement in the summary. Existing tests green, unmodified. No measurement → not a `perf` improvement, reclassify. |
| `refactor` | Existing tests green and **unchanged**. Nothing covers the touched code → write characterization test capturing current behavior **first**, watch it pass, then refactor. Refactoring untested code is how improvements become bugs. |

Test execution is non-watch mode only — see "Test Execution Rules" in SKILL.md.

**Phase 3 — Review** *(automatic)*

Dispatch reviewers in **single tool-call batch**, not sequentially. Each gets paths, not full file content.

| Agent | When | Receives | Looks for |
|---|---|---|---|
| `agentic-engineering:ae-red` | always | diff path + changed impl files | regression risk in changed code, null safety, async bugs |
| `agentic-engineering:ae-test` | always | diff path + changed files + tests + the `Done when:` list | its **Step 8** check: each condition covered by a test; tests that would not catch regression |
| `agentic-engineering:ae-lean` | always | diff path + changed impl files + `CLAUDE.md` + dependency manifest | reuse, simplification, efficiency, altitude. **Home ground for a `refactor`-type improvement** — the change is itself a simplification claim, and this is the reviewer that checks it landed |
| `agentic-engineering:ae-sec` | diff touches auth, input parsing, crypto, file I/O | diff path + changed impl files | high-confidence exploitable vulnerabilities |
| `agentic-engineering:ae-ux` | diff touches UI components | changed files + `CONSTITUTION.md`; **no design spec exists** — it runs in no-spec mode, where fidelity findings are POLISH, not blockers | empty/error/loading states, keyboard + focus behavior |
| `agentic-engineering:ae-edge` | diff touches data or async paths | diff path + changed impl files + tests + `Done when:` | boundary, null, race, malformed, resource, error-path gaps |

ae-red, ae-test and ae-lean always run. Exactly one of ae-sec / ae-ux / ae-edge joins them — pick by what the diff touches. Ambiguous → ae-edge.

Reviewers have no Bash: capture the diff first exactly as `/review` Step 0c does (`.agentic/review/<slug>.diff`) and pass the path.

`ae-req` does not run: no persisted acceptance criteria for it to check. `ae-test` carries the `Done when:` check instead — its Step 8, which needs the `Done when:` list in the prompt and emits per-condition ✅/❌. `ae-doc` does not run either — convention drift on a scoped diff is ARCH's `Fits existing pattern` job.

Before consolidating, read `./docs/improvements.md` (missing → skip). Finding matches prior won't-fix entry → report as "previously logged [date]", never re-litigate.

```
━━━ IMPROVEMENT REVIEW ━━━

Done when:
  ✅ [condition] — [test that proves it]
  ❌ [condition] — not covered

Blockers:
1. [issue] — [source agent] — [fix plan]

Should-fix:
1. [issue] — [source agent]

Won't-fix (logged to improvements.md):
1. [issue] — [reason]
```

Blocker raised, or any `Done when:` condition uncovered → pause. Print `⚠️ IMPROVEMENT PAUSED — review found blockers` + findings, then ⚠️ **Human checkpoint** `[AUTO: always-ask]` `[ASK: single]`: *"How do you want to proceed?"* → **Revise the change (Recommended)** · **Accept it anyway** · **Revert the change**.

Clean → continue.

**Phase 4 — End-user docs + Changelogs** *(automatic — final step before commit)*

Dispatch `agentic-engineering:ae-scribe` when Phase 1 said `Behavior change: user-visible`. **SCRIBE writes app-docs pages only — this command writes both changelogs, below.** Most `feat` improvements are: new shortcut, new format, new option all change what user can do → update `./app-docs/features/[name].md`. `Behavior change: none` (typical `perf` / `refactor`) → skip ae-scribe entirely.

`./app-docs/` absent → **the parent creates the tree, not SCRIBE**: `index.md`, `CHANGELOG.md`, `features/`, `guides/`, seeded from the templates in `commands/init.md`. Do it before dispatching. Existence check, not mode check — lite projects skip the tree at init and grow it on first user-facing change. SCRIBE writes pages into a tree that already exists; it has no create-tree rule.

Prepend to both changelogs (newest first):

`./docs/CHANGELOG.md` (after header, terse):
```markdown
## [date]
- [IMP] [type]([scope]): [what changed] — [file:line]
- [IMP] test([scope]): [what the new tests cover]
```

`./app-docs/CHANGELOG.md` (after frontmatter + title, **product release note to end users**) — only when user-visible:
```md
## [Month YYYY]

### Improved
- [Plain-English, user-perspective — what they can now do, or what got faster. No file paths / stack traces.]
```

`### Improved` = this command's section. `### Fixed` = `/fix`'s. Internal-only improvements stay in `docs/CHANGELOG.md`, never surface in `app-docs/CHANGELOG.md`.

**GIT** commits with the Phase 1 `Change type` as prefix:
```
feat([scope]): [what capability was added]        ← Change type: feat
perf([scope]): [what got faster, with the number] ← Change type: perf
refactor([scope]): [what was restructured]        ← Change type: refactor
test([scope]): [what the new tests cover]
docs([scope]): [what docs changed]               ← only if docs changed
```

Prefix comes from the plan, never improvised. `feat(` on an additive improvement is correct — it signals the minor-version bump that `refactor(` would hide.

**GIT** outputs note for existing PR (not new PR description):
```markdown
### Improvement applied to this PR

**What changed:** [plain-English description]
**Type:** feat | perf | refactor
**Changed:** [files]
**Proven by:** [tests, or before/after numbers]
```

**Phase 5 — Cleanup** *(automatic — last phase)*

Run the `/cleanup` flow inline for this improvement (`commands/cleanup.md`). Phase 4 already wrote the CHANGELOG entry — cleanup skips that step and does the remaining two: binding decisions → `./docs/DECISIONS.md`, rewrite `./docs/MEMORY.md`.

Improvements earn `DEC-` entries more often than fixes do. Record one when the change sets a pattern later work must follow — `Fits existing pattern: no precedent` in Phase 1 is the reliable signal. First format handler, first shortcut registry, first caching layer: all binding. A faster query that changes nothing structural: not binding, record nothing.

Came from a BACKLOG item (Step 0b) → set that item's `**Status:** done`.

Chain ended with review blockers unresolved ("Accept it anyway" is resolved; an abandoned change is not) → skip Phase 5.

**Improvement complete:**
```
━━━ IMPROVEMENT COMPLETE ━━━
What:       [description]
Type:       feat | perf | refactor
Changed:    [files]
Done when:  ✅ all [N] conditions covered
Tests:      ✅ added / updated — [count]
Measured:   [before → after]  ← perf only
Docs:       ✅ app-docs updated / not user-facing
Changelog:  ✅ both updated / docs only
Git:        ✅ committed on [branch name]
Cleanup:    ✅ MEMORY.md refreshed · [DEC-XXX recorded | no binding decision]

Next: /improve for the next BACKLOG item, or /status to review the board.
```

### Step N — Auto-mode summary

If `AUTO=true`:

1. Count `DECISION:`, `SKIPPED:`, and `HARD-PAUSE:` lines appended to `.agentic/auto-log.md` during this run.
2. Print: `🤖 Auto mode: <D> decisions, <S> skips, <H> hard-pauses. See .agentic/auto-log.md`

If `AUTO=false`: skip.

### Checkpoint tag reference (this file)

| Checkpoint | Tag |
|---|---|
| Pick BACKLOG improvement (empty `$ARGUMENTS`) | `[AUTO: always-ask]` — target selection is never inferred |
| Branch warning when on `main` | `[AUTO: always-ask]` — never proceed silently on `main` |
| Show plan, ask approval | `[AUTO: ask-if-ambiguous]` — skip when precedent cited + no behavior change + single file |
| Review post-change `IMPROVEMENT PAUSED` | `[AUTO: always-ask]` (also hard-override #1) |

### Gotchas

- **Not a bug.** Something is broken → `/fix`. `/improve` on broken code hides the defect behind an enhancement and the commit prefix lies.
- **Not a feature.** Needs research, a PRD, or more than 4 `Done when:` conditions → `/feature` (or `/note` → `/ship` in lite mode). One command, one weight class.
- **`Change type` is decided in Phase 1, not at commit time.** Deciding the prefix after the diff exists is how `feat` work lands as `refactor` and skips a version bump.
- **`Done when:` never persists.** No `STORIES.md`, no `PRD.md`, no `docs/specs/` entry. Persisting it turns `/improve` into a second, worse `/feature`.
- **Read the precedent before adding to it.** Third format handler that ignores how the first two work is technical debt shipped as an improvement.
- **Untested code gets a characterization test before refactoring, not after.** After-the-fact test proves the new behavior, not that behavior is unchanged.
- **No `/improve` on `main`.** Override GIT check → no PR, no review, no trail.

---
