# agentic-engineering — audit, 2026-09-10

Scope: `agentic-engineering/` at commit `04c5c53` (plugin.json 1.4.0). 15,308 lines across SKILL.md, 21 command bodies, 8 agents with 59 reference/language files, rules-library, capture-tools, adapters template, installer, README, CHANGELOG, plugin-level CLAUDE.md.

Method: full read of SKILL.md, every command body, the three flat agents and every AGENT.md frontmatter; grep-based cross-checks; both installers run into a throwaway `HOME`; six parallel audits (specialist agents, docs and libraries, trigger collisions, plugin structure, SKILL.md quality, harness facts); and four empirical tests against Claude Code 2.1.267 (agent registration under `--plugin-dir`, agent `tools:` semantics, directory-form discovery under `.claude/agents/`, dispatch by name). Verified items are marked. Opinions are marked.

---

## 1. Verdict

The plugin is a coherent, well-reasoned process with unusually honest gotcha sections. On the install path actually in use (marketplace plugin, README Option A), the flagship mechanism does not work as written:

- the six-agent review dispatches subagent names that do not resolve, and 59 reference files register as phantom subagents;
- three reviewers hold an unrestricted Bash tool despite the read-only design;
- `/init`, `/bootstrap`, and `ae-edge` read paths that only the bash installer creates.

Everything was written for the manual installer layout and never re-verified against the plugin cache. Fix section 2 before anything cosmetic.

---

## 2. Broken on the plugin install path (all verified)

### 2.1 Agent dispatch names do not resolve; references become phantom agents

Loaded with `claude --plugin-dir agentic-engineering` in a scratch project and enumerated the Agent tool's types. The plugin contributes **67** entries:

| Shape | File | Registers as |
|---|---|---|
| flat | `agents/ae-doc.md` | `agentic-engineering:ae-doc` |
| flat | `agents/ae-req.md`, `agents/ae-scribe.md` | `agentic-engineering:ae-req`, `:ae-scribe` |
| dir | `agents/ae-red/AGENT.md` | `agentic-engineering:ae-red:ae-red` |
| dir | `ae-sec`, `ae-test`, `ae-ux`, `ae-edge` | `agentic-engineering:<n>:<n>` |
| phantom | every `.md` under `agents/*/references/` and `agents/*/languages/` | `agentic-engineering:ae-sec:references:xss`, `agentic-engineering:ae-test:languages:jest`, … (59 total) |

Dispatch test results:

| `subagent_type` tried | Result |
|---|---|
| `ae-red` | Agent type not found |
| `agentic-engineering:ae-red` | Agent type not found |
| `agentic-engineering:ae-red:ae-red` | launched |
| `ae-doc` | Agent type not found |
| `agentic-engineering:ae-doc` | launched |

Every dispatch site uses bare names: `skills/agentic-engineering/commands/review.md:40-45`, `implement.md:124`, `frontend.md:83`, `ship.md:162`, `fix.md:121`, `improve.md:189`. Under a plugin install this works only if the orchestrating model reads the available-agents list and infers the double-namespaced form. When it does not, the review degrades to the main model role-playing six reviewers inline, with no error, the exact failure recorded in memory on 2026-08-04.

The 59 phantoms sit in the Agent tool description of every turn of every session where the plugin is enabled, and the model can "dispatch" a reference doc as a subagent.

Note: directory-form agents under project-level `.claude/agents/<n>/AGENT.md` register as plain `<n>` (verified). The earlier conclusion "directory nesting loads fine" was true only for that path.

**Fix.** Flatten to `agents/ae-red.md` etc.; move `references/` and `languages/` out of `agents/` (e.g. `skills/agentic-engineering/references/<agent>/`); dispatch by the namespaced name and pass `${CLAUDE_PLUGIN_ROOT}` in the prompt so agents can find their references. Update `install.sh:47-55`, integrity check F, and `CLAUDE.md:21`.

### 2.2 Reviewers have unrestricted Bash

`ae-red/AGENT.md:5`, `ae-sec/AGENT.md:5`, `ae-edge/AGENT.md:5`:

```yaml
tools: Read, Glob, Grep, Bash(git diff:*)
```

Test: a project agent with `tools: Read, Glob, Bash(git diff:*)` reported its tools as `Read, Glob, Bash` and ran `git status --short` and `git diff --stat`. The permission-rule pattern is not honored in the `tools:` field; the agent gets a general Bash tool. The docs (sub-agents page) say `tools:` accepts tool names and MCP patterns "but not permission-rule syntax".

Consequences: the write ban at `review.md:31` and the gotchas at `review.md:80-81` (a reviewer clobbered a test another agent had just written; a second left debug lines in a committed file) are prose, not a tool boundary. Commit `04c5c53` "stop reviewers writing to the repo" strengthened the prose only.

**Fix.** Remove `Bash` from all three. Have `/review` run `git diff <base>...HEAD` once, write it to `.agentic/review/<story>.diff`, and pass that path. This also removes the per-agent base-branch guessing (`ae-sec/AGENT.md:25` falls back to `git diff HEAD~1`, which reviews one commit of a multi-commit branch; `ae-red:22` and `ae-edge:22` have no fallback).

### 2.3 Hard-coded paths that only the bash installer creates

Zero uses of `${CLAUDE_PLUGIN_ROOT}` anywhere in the plugin. Under a marketplace install the plugin lives at `~/.claude/plugins/cache/thebedcoder/agentic-engineering/<version>/` (confirmed present locally for 1.1.0 through 1.4.0).

| File:line | Path used | Exists under plugin install? |
|---|---|---|
| `commands/init.md:342,350` | `~/.claude/skills/agentic-engineering/rules-library/…` | no (`<plugin>/rules-library/`) |
| `commands/init.md:354,378`, `bootstrap.md:142,166` | `~/.claude/skills/agentic-engineering/capture-tools/…` | no (`<plugin>/capture-tools/`) |
| `commands/init.md:179`, `bootstrap.md:135` | writes `"command": "bash ~/.claude/agentic-statusline.sh"` into `.claude/settings.local.json` | no (`<plugin>/agentic-statusline.sh`; only `install.sh:83` copies it) |
| `agents/ae-edge/AGENT.md:50,56-58,64-70,139-142` | `~/.claude/agents/ae-test/references/*.md`, `languages/*.md` | no; line 72 says skip silently |

Effects: `/init` steps 6-7 and `/bootstrap`'s capture picker read a missing file; every statusline render fails; `ae-edge` runs with no race, coverage, test-quality, or language-idiom material and never says so. `README.md:512` ("The installer ships `~/.claude/agentic-statusline.sh` … nothing to do on new projects") is false for the recommended install.

**Fix.** `${CLAUDE_PLUGIN_ROOT}/rules-library/…` etc. For the statusline, have `/init` copy the script into the project's `.claude/` and reference it relatively, which also survives plugin version bumps.

### 2.4 Reference loading by relative path (unverified, likely broken)

All five directory agents load material as `references/<x>.md` (`ae-red/AGENT.md:35-53`, `ae-sec:37-61`, `ae-test:32-47`, `ae-ux:31-36`, `ae-edge:45-49`). The subagent's working directory is the project; no dispatch prompt supplies the plugin root (`review.md:47`: "Each reviewer loads own reference files on demand"). Under the plugin cache, a relative Read or Glob from the project cannot reach `~/.claude/plugins/cache/…`. Worst-case load sizes are ae-red ≈1,300 lines, ae-sec ≈1,000, ae-edge ≈1,000, ae-ux ≈545, so size is fine; reachability is the question.

**Verify** by running one `/review` and checking the tool log for a successful Read of any `references/` file. If it fails, pass `${CLAUDE_PLUGIN_ROOT}/agents/<name>/` in each dispatch prompt (or apply the 2.1 restructure, which makes the path explicit).

### 2.5 Description exceeds the caps

`skills/agentic-engineering/SKILL.md:3-27` is 1,716 characters folded (247 words). The Agent Skills spec caps `description` at 1,024; the Claude Code frontmatter reference (as cited by the plugin validator, not independently re-fetched) caps description plus `when_to_use` at 1,536. The tail is what gets cut: lines 26-27, the "Always use this skill … 'let's start coding' or 'what's next'" sentence. About 60 of the 247 words are 13 slash-command names that never route through the description (the CLI dispatches slash commands before the model reads any description, and under the marketplace they are `/agentic-engineering:<n>` anyway).

**Fix.** See Appendix C for a ~150-word replacement that keeps every disambiguation.

---

## 3. Instructions the model cannot follow

### 3.1 `/compact` is user-only

`SKILL.md:245-246`, `ship-all.md:105-116,179,186`, `plan-all.md:41-45,78` print a `/compact …` block and call it "mandatory" and "non-negotiable". The model cannot invoke `/compact` (docs list only `/verify` and `/deep-research` as model-invocable). Subagents cannot call `AskUserQuestion` (removed from every subagent's tool pool per docs), so running each story's `/ship` in a fresh subagent is not a substitute. The wrapper `commands/ship-all.md:2` claims "compacts context automatically".

**Fix.** Turn the compaction point into `⚠️ Human checkpoint [AUTO: always-ask] [ASK: confirm]`: message says "Context is full for this story. Run `/compact …` now, then choose Continue." Remove "automatically" from the wrapper. Consider `context: fork` only for read-only sub-steps.

### 3.2 "The harness task tool" is not always present

`SKILL.md:222` and Step 0b in `ship.md:22`, `ship-all.md:24`, `fix.md:22`, `improve.md:37`, `implement.md:33` assume a live task list but name no tool. The docs name `TaskCreate`/`TaskUpdate`/`TodoWrite` and say they are not available by default on Opus 4.8+ / Sonnet 5+ without `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`. This audit session exposed none of them. The `# PLAN` section of `.agentic/focus.md` is the only durable tracker.

**Fix.** Make PLAN primary; open the harness list "if a task tool is available", otherwise skip silently.

---

## 4. Contracts that disagree (commands vs agents vs docs)

### 4.1 Changelogs written twice
`agents/ae-scribe.md:91-92` self-check: "docs/CHANGELOG.md appended (terse): yes / app-docs/CHANGELOG.md prepended (release note): yes". `ship.md:166`, `fix.md:126`, `improve.md:193`: "After SCRIBE returns, prepend to both changelogs". `cleanup.md:34` names only the parent as writer. Scribe says append; parent says prepend newest-first. Fix: delete `ae-scribe.md:91-92`; SCRIBE owns app-docs pages only.

### 4.2 SCRIBE cannot edit
`ae-scribe.md:5` tools are `Read, Write, Glob, Grep` (no Edit) while the body says "Exists → update" (line 28) and "Update ./app-docs/index.md" (line 29). Write-only means Haiku rewrites whole files to change one section. Fix: add `Edit`.

### 4.3 Pre-review mode exists in no agent
`implement.md:124-141` dispatches `ae-red` and `ae-sec` against a PLAN (Contract claims + Failure states table), not code. Grep for `plan|contract claim|failure state|pre-review` across `agents/` returns zero hits. Both prompts open with `git diff main...HEAD` (`ae-red:13,19-23`, `ae-sec:13,19-25`) and golden rules about tracing execution to a sink. On a plan they diff unrelated branch state or return "nothing found". Fix: add "Mode B: plan pre-review" to both (skip Step 1; verify each cited `file:line`; test each claim's converse; audit Failure-states rows).

### 4.4 ae-ux runs git without a Bash tool
`ae-ux/AGENT.md:74` "Scan the diff (`git diff main...HEAD`)" with `tools: Read, Glob, Grep` (line 5). Substeps 2-4 hang off it. Fix: use the changed-file list `frontend.md:85` already passes.

### 4.5 ae-test lacks two modes it is credited with
- `improve.md:155,162` says ae-test "carries the `Done when:` check" and `improve.md:169-171` expects per-condition ✅/❌; ae-test has neither input nor output for it.
- `implement.md:174-177` defines an `### Edge probes` table; `ae-test/AGENT.md:99-142` validates the AC matrix (4-column detection, `<br>` split, ≥1 row per AC, pyramid rule all match) but never the Edge probes table.
- `ae-test/AGENT.md:101-110` needs `STORIES.md`, `PROGRESS.md`, feature name; `review.md:42` passes "changed files + test files" only.

### 4.6 ae-ux dispatch and inputs
- `implement.md:213` says "`ae-ux` validates references during `/review`"; ae-ux is not in `/review` (`review.md:36-45`, `CLAUDE.md:16`). `frontend.md:88-98`'s report template has no Visual Artifacts block that `ae-ux/AGENT.md:135-155` appends. Pick one dispatch point.
- `ae-ux/AGENT.md:22` hard-requires `./docs/specs/<feature>-design.md`; `improve.md:157` dispatches it with "changed files + design context" and no spec. Define no-spec behavior.
- `ae-ux/AGENT.md:86,110` needs `PROGRESS.md` and `CONSTITUTION.md`; `frontend.md:83-85` passes spec + changed files.

### 4.7 Memory docs are written, never read
`/cleanup` runs as the last phase of every `/ship`, `/fix`, `/improve` and commits `docs/DECISIONS.md` and `docs/MEMORY.md`. Grep across `commands/*.md`: only `cleanup.md`, `init.md`, `archive.md` mention either; the three chain commands mention them only in their completion banners (`ship.md:211`, `fix.md:180`, `improve.md:255`). `SKILL.md:247` asks for a session-start read of both that no command's "Inputs (read first)" list implements. Fix: add both to the inputs of `implement`, `ship`, `fix`, `improve`, `feature` (MEMORY in full, DECISIONS titles), or stop writing them.

### 4.8 Nested gates and lists
- `/ship` inlines `/implement`: both `ship.md:98` and `implement.md:143` fire a "Start?" gate with the same `[AUTO: skip]` tag; `ship.md:244` implies one gate but never says "parent's gate wins".
- Blocker gate options differ: `review.md:74` (Fix now / Show full report / Log and move on) vs `ship.md:117` (Fix now / I'll fix them / Abort chain). No rule for which applies when nested.
- `ship.md:22-36` opens a seven-task list unconditionally; `ship-all.md:26` says the per-story `/ship` "does not open a nested list". `implement.md:35` has the nested clause; `ship.md` does not.
- `focus.md:27,128,135` list chain commands as `/ship`, `/fix`, `/ship-all` and auto-write commands without `/improve` or `/cleanup`; `improve.md:53,70` writes PLAN and `SKILL.md:222` lists it.

### 4.9 `/ship` has no main-branch guard
`fix.md:59` and `improve.md:76` gate on `main`/`master` with `[AUTO: always-ask]`. `ship.md` has no branch step at all (grep for branch/main/master: only line 74's lite-mode note). `SKILL.md:108` says lite's shipping path is `/note` → `/ship`, so lite stories land on whatever branch is current, typically main. `feature.md:56-58` creates `feat/<name>` for full mode only.

### 4.10 "Phase 4" capture dispatch is Phase 3
`ship.md:124-147`: visual capture dispatch runs inside **Phase 3 — Frontend** and then "Proceed to Phase 4 review". 23 files say Phase 4 dispatches it: `README.md:125`, `capture-tools/README.md:3,32,35`, every `capture-tools/*.md` "## /ship Phase 4 integration" section, `implement.md:214`, `init.md:382`, `bootstrap.md:170`, `agents/ae-ux/AGENT.md:104`, `adapters/AGENTS.md.template:74`. Also "Phase 1/2" in `ship.md:135`, `implement.md:214`, `ae-ux/AGENT.md:102,112`, `visual-consistency.md:98,124,136` means a rollout stage of the visual-artifacts feature and collides with ship-chain phase numbers.

### 4.11 Smaller breaks
- `commands/archive.md` wrapper has no `$ARGUMENTS` and no `argument-hint`; the body branches on `--all` (`archive.md:7,62`). Unverified whether the harness appends unreferenced args. Same shape on `commands/implement.md` and `commands/frontend.md` vs `--auto` detection.
- `bootstrap.md:31` "Ask for choice (A/B/C or enter for default)" is the typed-reply gate `SKILL.md:158` bans; `bootstrap.md:14,23` and `init.md:7,9` are untagged asks.
- Peers lists omit `ae-edge`: `ae-red/AGENT.md:15`, `ae-req.md:11`, `ae-doc.md:11`, `ae-sec/AGENT.md:15`.
- `ae-edge/AGENT.md:35` frontend detection lists `.swiftui` (not an extension); `ae-ux/AGENT.md:77` correctly uses `.swift` in `Views/`. A SwiftUI-only diff is probed as backend, contradicting `review.md:86`.
- `ae-sec/AGENT.md:89-112` is the only reviewer using markdown headings and lacking the `SEC —` prefix `SKILL.md:66` requires. `ae-red:81,87` and `ae-edge:103-117` emit no summary count while `review.md:68-69` expects one; nothing maps CRITICAL→Blocker / WARNING→Should-fix.
- `ae-test/AGENT.md:109` uses `should-cover` (ae-edge vocabulary) vs `should-fix` at `:128-129`; consolidator buckets are Blockers/Should-fix/Won't-fix.
- `ae-red/AGENT.md:69` routes to BACKLOG; the consolidator logs to `docs/improvements.md` (`review.md:34,60`).
- `ae-scribe.md:3,11`, `cleanup.md:7,116`, `commands/cleanup.md:2` omit `/improve`, which runs both.
- `fix.md:124` / `improve.md:191` say SCRIBE creates the app-docs tree "seeded per commands/init.md"; ae-scribe has no create-tree rule and no path to init.md; `init.md:94` says lite creates it "when `/doc` first builds app-docs". Three claimed owners.
- `ae-doc.md:16-20`: `implement.md:106-114` credits ae-doc with catching a missing persisted Contract-claims table, but no agent prompt checks for it.
- `SKILL.md:147` "Every checkpoint carries an `[AUTO:]` tag" is false for 12 checkpoints in `note`, `plan-all`, `bootstrap`, `focus`, `init`, `doc-all`; by design they take the untagged default at `SKILL.md:186`. Say so.
- `SKILL.md:177` `--auto` list omits `/doc` though `doc.md:26` handles it.
- `SKILL.md:170` "`/analyze` and `/review` currently under-do this — fix on sight" is an authoring TODO in runtime text; half stale (`analyze.md:82` complies), half true (`review.md:49-74` ends on a gate with no `Next:` line). `SKILL.md:104,112` are the same class.
- `SKILL.md:173` "Ultra mode (below)" → defined above at line 143. `SKILL.md:169` example says "Phase 4 of 6"; `/ship` has 7 phases. `SKILL.md:183`'s `[AUTO: skip]` example is "Reply 'go' to start", the form `:158` bans.
- `SKILL.md:216-218` duplicates `focus.md:39,137`; "parent passes `auto` as `$ARGUMENTS`" describes a mechanism inline-read bodies do not have.

### 4.12 Command-name collisions (manual installer only)
Under `install.sh`, `USER_COMMANDS` lands bare wrappers in `~/.claude/commands/`. Verified against the 2.1.267 binary: `init`, `status`, `design`, `focus` collide with built-in commands; `review` is an alias of the bundled `code-review` skill (not shipped bare, description-only collision). Under the marketplace all 21 are namespaced; zero collisions. `SKILL.md:21-25` cedes bare `/init` to the built-in while `install.sh:62` still ships it; `README.md:415,559,568` present the command as bare `/init`.

---

## 5. Docs, changelog, libraries

### 5.1 CHANGELOG and version
- `04c5c53` (after 1.4.0's own commit `d95293a`) added `implement.md:106-113` (persist Contract claims / Failure states into PROGRESS.md), three gotchas at `implement.md:261-263`, and the reviewer write-ban at `review.md:31,80-81`. No CHANGELOG entry, no version bump.
- Whole feature sets have zero entries: `/archive`, won't-fix re-read of `improvements.md`, `/focus` + `/next`, `--auto`, AC Coverage matrix + pyramid, Visual Artifacts + `capture-tools/`, `ae-edge` as a new agent, statusline, lite/full mode, `/cleanup` + `DECISIONS.md`/`MEMORY.md`. Grep counts for `/cleanup`, `DECISIONS`, `MEMORY`, `/archive`, `AC Coverage`, `capture-tools` in CHANGELOG.md are all 0.
- Footer: only `[Unreleased]`/`[1.0.0]` link refs, no git tags, `[0.1.0]` has no date.

### 5.2 Plugin-level CLAUDE.md
- `:74-77` instructs `bash install.sh` then `ls ~/.claude/…`, writing to the real home dir; the parent CLAUDE.md says never do that. `:80` hard-codes `/Users/getman/…`.
- `:15` "SKILL.md only holds the command → file table, the agent roster, the caveman rules, and the test-watch ban": it also holds Project Mode (`:83-108`), Memory Docs (`:110-122`), Core Principles, `[ASK:]` taxonomy (`:145-163`), Human-Facing Output Rules (`:165-173`), Auto Mode (`:175-218`), Progress Tracking (`:220-241`), Context Management (`:243-249`). ~60% of the body is policy.
- `:16`, `README.md:40`, `CHANGELOG.md:143`: "simultaneous Haiku subagents"; `ae-sec/AGENT.md:4` is `claude-sonnet-5`.
- `:84` calls the installer "idempotent"; `cp -r` onto existing targets never removes deleted/renamed files.

### 5.3 README
- No statement that Option A ships no rules-library/capture-tools/statusline to `~/.claude`; no warning that Option A plus B/C yields duplicate skills, agents, and commands; no uninstall recipe for B/C.
- `:249-254` "never auto-proceeds past Implementation plan / PRD approval" vs `implement.md:143` `[AUTO: skip]`, `ship.md:98` `[AUTO: skip]`, `feature.md:152` `[AUTO: ask-if-ambiguous]`; `:258` contradicts `:249`.
- No mention of Contract claims, Failure states, pre-review, plan persistence; `:125` and `:601-603` still show "ARCH: Plan → go".
- `:125` `/ship` row omits PR description and Cleanup phases the diagram at `:99` shows.
- `:322` "Each rule is under 2KB": 12 of 16 exceed 2,000 bytes.
- `:465` shows markers without the `v1` suffix the template actually carries.
- `:477-498` "What's inside" omits `capture-tools/`, `agentic-statusline.sh`, `adapters/`, `CHANGELOG.md`, `CLAUDE.md`.
- `:504-510` promises a two-line statusline with `note:`; `agentic-statusline.sh:11-24` prints `title:` only.
- Opinion: at 628 lines it is ~40% reference material. Move the review-agent file listings (`:328-390`), manual statusline setup (`:514-551`), and Option E to secondary docs; target ~350 lines.

### 5.4 adapters/AGENTS.md.template
- Markers intact (`:1`, `:156`).
- No `/improve` section (name-dropped at `:15` only); Plan step at `:58` is one line with none of Contract claims / Failure states / pre-review.
- `:123` "Conventional commit pushed" in the done definition; `ship.md:191` is "not pushed" and no chain pushes.
- `:102-110` checkpoint list says plan/PRD gates never auto-proceed; see 5.3.
- `:78-84` fix flow "focused review (bugs / tests / conventions)"; `fix.md:100-111` is a RED-only pass; omits the on-`main` gate and cleanup phase.
- Claude-Code-only content in a template for Cursor/Codex/Copilot: `ae-edge`/`ae-test`/`ae-ux` names (`:67,72,74`), `/init`, `/review`, `/ship`, `/focus`, `/next`, `/implement`, `.claude/visual-capture.md`, `.claude/settings.local.json`, "Claude Code statusline" (`:130-155`), while `:4` says "regardless of which AI assistant you are".
- `:135`, `implement.md:228`, `ship.md:223` describe `/focus done` as a "y/n/b" prompt; `focus.md:104-110` is an `[ASK: single]` widget.

### 5.5 rules-library
- `README.md:9-29` Paths column drifts from frontmatter in 7 rules (android-native, api-design, nextjs-app-router, node-express, python-django, python-fastapi, testing-conventions).
- `flutter.md:42` `WillPopScope` deprecated since Flutter 3.12; `:40` `Platform.isIOS/isAndroid` throws on web, contradicting `:43`; `:49` `plugin_platform_interface` is not a test-mocking mechanism; `:52` "no `^` for production apps" contradicts Dart guidance that `pubspec.lock` pins apps.
- `nextjs-app-router.md`: no async `params`/`searchParams`/`cookies()`/`headers()` rule (Next 15's main break); `:25` does not state the current fetch default; `:33` `robots.txt` should be `robots.ts`.
- `react-typescript.md:27` "(registered here)" dangling; `:26` "React Query" is TanStack Query.
- All 16 rule files have `paths:` frontmatter (a subagent claim that two lacked it was checked and is wrong).

### 5.6 capture-tools
- `maestro.md:58` `--record-video` does not exist (`maestro record` or `startRecording:`); `:43` per-step auto screenshots under `--debug-output` unverified; `:9` `output_dir` points at the debug dir; `:23` `brew install maestro` needs the tap.
- `adb-screencap.md:7` `output_dir: project-specific` and `vhs.md:7` `output_dir: declared per tape file` give `ship.md:142` nothing to scan.
- `detection:` has no defined grammar; `maestro.md:7` (dir as `file:`), `xcuitest.md:7` (bundle), `cypress.md:9` (misses `.ts` config), `espresso.md:7` (misses `.kts`).
- `playwright.md:59` cites `tests/foo.spec.ts::test_name` "per the QA Traceability convention": `::` is pytest syntax; Playwright emits `file:line:col › title`.

### 5.7 Agent references (spot checks)
- `ae-test/languages/pytest.md:15` "camelCase not collected by default" is false (`python_functions` default is prefix `test`). `:131-134` async fixture needs `@pytest_asyncio.fixture` in strict mode. `:133` httpx `AsyncClient(app=…)` removed; use `ASGITransport`. `:145` freezegun does not fake `time.sleep`.
- `ae-sec/languages/swift.md:72-74` flags `Int.random(in:)` as non-secure; the default generator is cryptographically secure per Apple docs, so this manufactures false positives against `ae-sec/AGENT.md:74`'s own rule. `:120` `javaScriptEnabled` deprecated since iOS 14.
- `ae-test/languages/jest.md` titled "Jest / Vitest" but every API is `jest.*`; a reviewer will flag correct `vi.*` code.
- `ae-test/references/async-testing.md:55-61` hedges on Jest handling a returned rejecting promise (it always fails); `:41-48` says an unmarked `async def` test silently passes (pytest skips with `PytestUnhandledCoroutineWarning`; fails outright from 8.4, version unverified).
- `ae-test/languages/xctest.md:68` "waitForExpectations with no timeout" has no such form; `rust-test.md:76` attributes `#[timeout]` to crates that lack it; `coverage-principles.md:131` invents a `::`-named Flutter test.
- `ae-red/languages/dart.md:7,15` `void loadData() async` should be `Future<void>`; omits `use_build_context_synchronously`.
- `ae-red/references/error-handling.md:108` fence tagged `c_like` around Go.

### 5.8 Duplication inside references
- `ae-red/references/null-safety.md:3-32,92-111` vs `ae-edge/references/boundary-null.md:5-19,58-66`: ≈35% identical triggers. `items[0]` on `[]` yields a RED CRITICAL and an EDGE Blocker from the same diff.
- `ae-sec/references/`: deserialization (`api-security.md:96-108` ↔ `deserialization.md:3-22`), mass assignment, IDOR, JWT, CORS, SSTI, dependency confusion, error disclosure each appear in two files; ~150 lines removable.
- `ae-ux/references/visual-consistency.md:78-158`: 80 lines of workflow policy duplicating `ae-ux/AGENT.md:68-155` inside a spacing/typography checklist; `AGENT.md:38` loads it twice.
- `ae-red/references/state-bugs.md:59-76` ↔ `async-concurrency.md:176-190` same bug; `state-bugs.md:154-164` is ae-test's beat.
- Every directory agent restates its load table as a bottom "Reference files" list (`ae-red:100-120`, `ae-sec:156-186`, `ae-test:153-170`, `ae-ux:159-166`, `ae-edge:130-144`).
- `ae-edge` advertises "race" but has no local reference; the real race material is in `ae-red/references/async-concurrency.md:74-154` and is never pointed at.

### 5.9 Shipped strays
`agentic-engineering/.claude/settings.json` (a graphify PreToolUse hook for developing this repo) is tracked and present in the installed 1.4.0 cache. Inert for consumers. `graphify-out/`, `agents/.DS_Store`, `.claude/settings.local.json`, `agentic-engineering.skill` are gitignored and absent from the cache.

---

## 6. Structure and register

- Step 0a (parse `--auto`), Step 0 (auto-write focus), and the auto-mode summary are duplicated near-verbatim across 8, 10, and 8 command files; the `.agentic/` gitignore block appears in 12. A `/ship` chain loads SKILL.md plus ship, implement, review, frontend, cleanup, focus bodies: ~1,290 lines of instructions before any project doc.
- Description spends ~60 words on slash names that cannot route; see 2.5.
- `SKILL.md:26-27` "Always use this skill … 'what's next'" is unbounded and contradicts the `./docs/INDEX.md` gate at `:15-17`; `:13-14` "any request to follow a structured step-by-step development process" overlaps built-in `/plan`, `/batch`, and superpowers plan skills.
- `SKILL.md:66-81` roster lists 12 personas; 8 exist as subagents. ARCH, PROD, FIXER, GIT are inline. `README.md:19-38` shows all 12 undifferentiated.
- `SKILL.md:83-122` Project Mode and Memory Docs are read by ≤4 commands but load for all 21.
- Register drift (article count per prompt): `ae-ux/AGENT.md` 28, `ae-test` 20, `ae-edge` 18 vs 1-7 for the rest; prose blocks `ae-ux:68-155`, `ae-test:112-131`. All-caps density is low everywhere.
- `SKILL.md:137` applies caveman to "plans", yet plans are what the human approves at the gate and `:173` bans caveman in human-facing text.

---

## 7. Opinions (marked as such)

- **Model tier.** `ae-red` ("trace execution path") and `ae-edge` ("mentally execute test against current implementation") are the two agents whose entire value is multi-file reasoning with no ability to run anything, and `review.md:80-81` already records a fabricated reproduction. Haiku 4.5 is the wrong tier for those two; move them to Sonnet 5 as `ae-sec` already is. Keep `ae-req`, `ae-doc`, `ae-test` (checklist/parsing work) on Haiku.
- **Overlap.** `review.md:82` "keep both voices" is right for red+sec (correctness vs exploitability) and wrong for red+edge on null (same lens, different output format). Carve: ae-red owns "crashes on current path", ae-edge owns "no test proves the guard".
- **Process layers.** Mode marker, focus/PLAN, auto tags, harness task list, cleanup/memory: five tracking layers, and two of them (task list, memory docs) have no consumer. Cut before adding.
- **Two distribution paths** with divergent layouts is the root cause of section 2. The memory note says you are already plugin-only; deprecate `install.sh` or make it mirror the plugin layout exactly.

---

## 8. Proposed changes, in order

1. **Pick one distribution path.** Deprecate the bash installer, or make it mirror the plugin layout byte-for-byte. Update README install section accordingly, with a "pick exactly one" warning and an uninstall recipe.
2. **Fix agent registration and dispatch.** Flatten agents; move references out of `agents/`; dispatch by namespaced name with `${CLAUDE_PLUGIN_ROOT}` in the prompt. Update `install.sh:47-55`, integrity check F, `CLAUDE.md:21`. Add an integrity check: no `.md` under `agents/` other than agent files.
3. **Remove Bash from reviewers.** Parent writes `.agentic/review/<story>.diff` and passes the path. Add an integrity check: no `Bash` in any reviewer's `tools:`.
4. **Replace every `~/.claude/…` literal** with `${CLAUDE_PLUGIN_ROOT}`. Statusline: `/init` copies the script into `./.claude/` and references it relatively. Add an integrity check: no `~/.claude` literal in shipped content.
5. **Replace `/compact` with a real gate**; fix the `ship-all` wrapper description. Make PLAN the primary progress tracker; harness list opportunistic.
6. **Fix changelog ownership** (SCRIBE = app-docs pages only; add `Edit`). Add plan pre-review mode to `ae-red`/`ae-sec`; `Done when:` mode and Edge-probes check to `ae-test`; remove git from `ae-ux`; fix peers lists; align output summaries with `review.md:64-69`.
7. **Wire MEMORY.md and DECISIONS.md into inputs** of implement/ship/fix/improve/feature, or drop `/cleanup`'s memory write.
8. **Nesting rules.** "Parent's gate wins" for `/implement` and `/review` under `/ship`; nested clause in `ship.md` Step 0b; main-branch gate in `/ship`; `/improve` in `focus.md` lists.
9. **Trim the description** to ≤1,024 chars (Appendix C).
10. **Extract the shared preamble** (Step 0a / Step 0 / auto summary / gitignore block) into one file each command references.
11. **Docs.** CHANGELOG backfill + `[Unreleased]` for `04c5c53`; CLAUDE.md `:15-16,74-80`; Phase 4 → Phase 3 rename across 23 files; adapters template (`/improve`, Contract claims, "pushed" → "committed", strip Claude-Code-only content); README items in 5.3; reference fixes in 5.5-5.7.
12. **Evals.** Three cases runnable under `--plugin-dir` (skill-creator loop or `claude plugin eval`): all six reviewers resolve by name; `/init` finds the rules library; a reviewer cannot modify a file. Add "no `~/.claude` literal", "no Bash in reviewer tools", "description ≤1,024 chars" to `check-integrity.sh`.

---

## Appendix A. Harness facts used (with how each was established)

| Claim | How established |
|---|---|
| `/compact` is user-only; model cannot invoke it | docs (commands page lists only `/verify`, `/deep-research` as model-invocable) |
| All `commands/*.md` in a plugin are registered; no frontmatter hides one | docs (plugins reference); `user-invocable`/`disable-model-invocation` are skill-only |
| `tools:` does not accept permission-rule syntax; `Bash(git diff:*)` yields full Bash | docs (sub-agents page) + **test**: agent ran `git status` |
| Project-level `agents/<n>/AGENT.md` registers as `<n>` | **test** (`.claude/agents/zzdirform/AGENT.md` listed as `zzdirform`) |
| Plugin `agents/<n>/AGENT.md` registers as `plugin:<n>:<n>`; references become agents; bare names fail | **test** (`--plugin-dir`, 67 entries, dispatch table in 2.1) |
| `model: claude-haiku-4-5` / `claude-sonnet-5` accepted | docs (full IDs allowed); both strings present in the 2.1.267 binary |
| `${CLAUDE_PLUGIN_ROOT}` = plugin install dir, available in commands/skills/agents/hooks | docs (plugins reference) |
| `context: fork` runs the command in an isolated subagent | docs (skills page) |
| Task tools are `TaskCreate`/`TaskUpdate`/`TodoWrite`, env-gated on newer models | docs (agent-sdk todo-tracking); none exposed in this session |
| Subagents cannot call `AskUserQuestion` | docs (sub-agents page) |
| Description cap 1,536 (Claude Code) / 1,024 (spec) | docs as cited by plugin validator; spec from memory; not independently re-fetched |

Repro for the two agent tests:

```bash
# 1. tools: syntax — expect the subagent to run git status (i.e. full Bash)
T=$(mktemp -d) && cd "$T" && git init -q && mkdir -p .claude/agents
cat > .claude/agents/zztoolsyntax.md <<'EOF'
---
name: zztoolsyntax
description: diagnostic
tools: Read, Glob, Bash(git diff:*)
---
Do exactly what the prompt asks and report literally.
EOF
printf '%s' "Use the Agent tool once to launch subagent_type 'zztoolsyntax' with prompt: 'List your tools, then run: git status --short, then: git diff --stat. Report RAN / DENIED / NO-BASH-TOOL for each.' Output its reply verbatim." \
  | claude -p --model haiku --allowedTools "Agent,Bash,Read,Glob"

# 2. plugin registration — expect namespaced/double-namespaced names and 59 phantoms
cd $(mktemp -d) && git init -q
claude -p --model haiku --plugin-dir /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering \
  "List the exact names of every agent type available to the Agent tool, one per line." < /dev/null
```

---

## Appendix B. Plugin validator report (verbatim findings, corrected where this audit's tests disagreed)

Critical: agent dispatch names do not resolve under plugin install; dir-form agents double-namespaced; 59 phantom agents (see 2.1).

Major: hard-coded bash-installer paths (see 2.3); description 1,708-1,716 chars vs 1,536 listing cap (see 2.5).

Minor: `commands/archive.md` wrapper drops `$ARGUMENTS` (see 4.11); `color: purple`/`orange` may be outside the enum the binary knows (`red, green, yellow, blue, magenta, cyan`; agents still load); `agentic-engineering/.claude/settings.json` tracked and shipped; `agentic-engineering.skill` stale (expected, build output).

Verified fine: plugin.json and marketplace.json valid; 21 wrappers with descriptions, 14 with `argument-hint`, `context: fork` on `analyze.md` and `status.md`; all 21 bodies exist and appear in the router table; `USER_COMMANDS` (18) matches README; all 8 agents declare matching `name:`; SKILL.md `name` matches dir; no `user-invocable` leak; no hooks dir, no `.mcp.json`; strays gitignored; no secrets.

Correction: the validator's "`tools:` values are accepted rule syntax" is contradicted by the execution test in 2.2; the syntax is accepted by the parser but not enforced.

---

## Appendix C. Trigger audit and replacement description

Collisions found (ranked): `/review`/"code review" vs built-in `code-review` (alias `review`) and the `code-review` plugin; "what's next"/"let's start coding" land-grab at `SKILL.md:26-27`; `/status` (built-in, and bare under `install.sh:75`); `/design` (built-in "Make a new Design artifact", bare under `install.sh:64`); "start a new project"/"set up docs" vs `smart-setup` (`smart-setup/skills/smart-setup/SKILL.md:3-8`), which is by design the sizing layer that decides whether agentic-engineering is warranted; "any request to follow a structured step-by-step development process" vs `/plan`, `/batch`, superpowers plan skills; "implement feature"/"fix bug" vs superpowers `brainstorming`/`test-driven-development`/`systematic-debugging` (repo-local exposure only); "fix vulnerabilities" vs `update-dependencies`; `/init` and `/focus` bare under `install.sh:62,71`; `/improve` phrases at `:11-13` not covered by the `./docs/INDEX.md` gate at `:15-17`; "animation timing, transition polish" exclusion at `:19-20` not Flutter-scoped.

21 command names vs 2.1.267 built-ins: collide `init`, `status`, `design`, `focus`, `review` (alias). Clean: `analyze`, `archive`, `bootstrap`, `cleanup`, `doc`, `doc-all`, `feature`, `fix`, `frontend`, `implement`, `improve`, `next`, `note`, `plan-all`, `ship`, `ship-all`.

Proposed description (~150 words, keeps every disambiguation, drops the slash list):

```yaml
description: >
  Full SDLC workflow (research → PRD → stories → implement → 6-agent review →
  end-user docs) with named specialist agents. Fires only in a project that
  already has ./docs/INDEX.md; elsewhere feature, bug, and refactor requests
  are ordinary implementation work. In a scaffolded project use for: new
  feature, ship or implement a story, fix a bug, improve an existing feature
  (new format, shortcut, faster path, module split), document a feature, plan
  all epics, "what's next" / "let's start coding" (route to /status). Also:
  "bootstrap a greenfield project", "scaffold agentic docs", "set up docs and
  constitution" — NOT bare /init or "initialize CLAUDE.md" (built-in /init).
  Do NOT trigger on: /review, /code-review, "review my diff/PR" (built-in
  /code-review); "simplify this", "clean up the diff" (built-in /simplify);
  bare /design or "design me a X" with no current story (built-in /design);
  "set up / configure this project for Claude" (smart-setup); "update
  dependencies", "bump packages", "fix vulnerabilities" from an advisory
  (update-dependencies); UI motion in a Flutter project (flutter-motion).
```

Also add to `smart-setup`: "NOT on 'bootstrap a new app' or 'scaffold a new <stack> project' (agentic-engineering /bootstrap)". Add to `update-dependencies`: "NOT on a vulnerability in application code". Add to `flutter-motion`: "Only in a Flutter project".

---

## Appendix D. SKILL.md quality review (ranked, condensed)

1. Wrappers give no base directory; under plugin install `<plugin-root>/commands/<n>.md` is the wrapper itself, so a literal relative read is self-recursion; wrapper never loads SKILL.md's policy layer. Fix: "Invoke the agentic-engineering skill via the Skill tool, then read `commands/<n>.md` under the base directory it reports."
2. Hard-coded `~/.claude/skills/…` (see 2.3).
3. Description over cap (see 2.5).
4. `:26-27` unbounded trigger contradicting the INDEX.md gate.
5. `:7-9` slash list is dead weight; names internal commands; omits 8 real ones.
6. `init.md` wrapper collides with built-in `/init` under manual install.
7. `:128` "Never skip human checkpoint" vs `[AUTO: skip]` on the only plan gate in `/ship` (`ship.md:98`); `:183` defines skip as "pure ceremony" and `:133` says "Plan before code". Reword principle 1 or retag.
8. `/compact` (see 3.1).
9. `:222` unnamed task tool (see 3.2).
10. `:170` authoring TODO in runtime text.
11. `:66-81` 12-name roster vs 8 subagents; no plugin-namespace note.
12. `:34-36` router maps slash commands only; NL triggers have no intent→command rule.
13. `:224-233` "phase count is the test" but `/feature`, `/design`, `/init`, `/bootstrap`, `/doc-all` are multi-phase and open no list.
14. `:261` "applies to every subagent" but subagents never see SKILL.md and `review.md:31`'s mandatory prompt content omits the non-watch rule.
15. `:137` vs `:173` caveman on plans shown at gates.
16. `:147` "every checkpoint carries `[AUTO:]`" false for 12 checkpoints.
17-25. `:173` "(below)"; `:183` banned example; `:177` omits `/doc`; `:247` reads unbounded CHANGELOG/DECISIONS in full; `:104,112` authoring guidance in runtime text; `:83-122` policy loaded for all 21 commands; `:216-218` duplicates focus.md; `:218` `$ARGUMENTS` mechanism; `:160` "(Recommended)" stated as absolute but omitted at `ship.md:91,98`, `init.md:340`.

Verdict: not a thin router; a router plus policy layer that the wrapper path bypasses unless the model follows pointers.

---

## Appendix E. Installer sandbox run

Both installers were run with `HOME` pointed at a temp dir. Per-plugin `install.sh`: exit 0; skill copied with `rules-library/` and `capture-tools/` inside it; `user-invocable: false` patched at SKILL.md line 28; 8 agents present in the expected mixed shape; 18 commands (no `implement`, `review`, `frontend`); statusline script copied and executable. Top-level `install.sh --tool=cursor`: exit 0; `AGENTS.md` written; 16 `.cursor/rules/*.mdc` written; re-run leaves exactly one `agentic-engineering:start` marker (idempotent).

Installer defects: `cp -r` onto an existing dir never removes deleted files; no uninstall; "Available commands" banner (`install.sh:93-110`) omits `/archive` though it is in `USER_COMMANDS:77`; top-level `install.sh:11,62` help says "5-agent review".
