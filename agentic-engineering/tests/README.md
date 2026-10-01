# agentic-engineering tests

Two layers, one entry point.

```bash
agentic-engineering/tests/run-tests.sh              # static, then behavioral
agentic-engineering/tests/run-tests.sh --static     # no API key, runs in CI on every push
agentic-engineering/tests/run-tests.sh --behavioral # real claude -p sessions
agentic-engineering/tests/run-tests.sh --scenario 02 --model sonnet --keep
```

## Static — `static/`

Python 3 stdlib (PyYAML used when installed; `AE_TESTS_NO_YAML=1` forces the
built-in parser, which CI also runs). No network, no API key.

| Test | Catches |
|---|---|
| `test_frontmatter.py` | wrapper/agent/SKILL.md frontmatter that does not parse or lacks required keys; wrappers that don't point at their body or drop `$ARGUMENTS`; agent `name:` ≠ file stem; agent `model:` pinned to an id instead of a tier alias; an argument hint offering `--auto` to a body that never parses it (§A) or never prints its summary (§C); reviewers holding Bash or a write tool; SKILL.md description over 1,024 chars |
| `test_references.py` | `${CLAUDE_PLUGIN_ROOT}/…` paths, `agentic-engineering:<name>` dispatch/skill names, and `commands/` · `shared/` · `agents/` references that resolve to nothing; a `§` section of a `shared/` file that nothing calls |
| `test_home_paths.py` | `~/.claude` (or bare `$HOME/.claude`) literals in shipped content |
| `test_command_tables.py` | README command table, SKILL.md Command → File Map and `commands/` drifting apart; stale command counts in CLAUDE.md |
| `test_hooks.py` | invalid `hooks/hooks.json`; SessionStart output that is not exactly one valid JSON object with `hookSpecificOutput` under every project shape (plain repo, scaffolded, active focus, compact source, hostile focus titles, bad UTF-8, empty/garbage stdin, opt-out, linked worktree, relative `gitdir`, submodule `.git` file, main folder with worktrees) |
| `test_worktree.sh` | `scripts/worktree.sh` end to end: two `[P]` stories shipped in two worktrees and merged back with both `PROGRESS.md` entries intact; a code conflict or an edited (not appended) `PROGRESS.md` aborts with the tree unchanged; nothing is removed before it is asked for; a dirty worktree or unmerged branch refuses removal. Task kind: `pref` (default, explicit, invalid), `where` in main / task / hand-made worktree, `.claude/worktrees/` ignored via `.git/info/exclude` with `.gitignore` untouched, CURRENT + PLAN carried and NEXT left, `.agentic/` ignored in a worktree whose `.gitignore` lacks it, ignored `.env` listed not copied, `list` skips worktrees it did not make, `remove` carries the auto-log back |
| `test_evidence.sh` | `scripts/evidence.sh`: tree id changes on any code edit (tracked or new), never on `docs/`, `app-docs/`, `.agentic/` or ignored build output, and is identical before and after a commit; `run` prints the row and keeps the command's exit code; `check` returns fresh / stale / failing / missing and detects a story ticked in the diff |
| `test_diagnose.py` | `scripts/transcript-digest.py`: the one-reviewer-per-message fixture yields a `DEVIATION` citing L14…L26, batched fixtures yield none; bare `ae-*` names flagged; sidechain lines ignored; tool-result bodies never printed; a 2 MB line stays bounded; a `/fix` that commits with no `ae-red` dispatch is flagged, one that dispatched or stopped before its commit is not; `--find`/`--locate` honour `CLAUDE_CONFIG_DIR`; `--scrub-file` removes emails, home paths, keys, IPs and remotes but keeps ids and line refs |
| `test_review_diff.sh` | `scripts/review-diff.sh`: tracked, staged and new files in the diff; ignored files, `.agentic/` and nested worktrees out; the user's index untouched; nothing committed; empty change exits 3; works from a subdirectory and inside a linked worktree |
| `test_transcript_lib.py` | the harness's own assertions: `batch` passes on a seven-in-one-message fixture and **fails** on the one-per-message fixture, subagent-thread lines never count as main-thread dispatches, `routed-to` fails without evidence |
| `test_manifest.py` | invalid `plugin.json`, non-semver version, missing marketplace entry, CHANGELOG top entry out of step, `load-manifest.json` naming missing files |

## Behavioral — `behavioral/scenarios/`

Each scenario builds a throwaway fixture project (`lib/fixtures.sh` — a tiny Node
module tested with `node --test`), runs one headless session with the working tree
loaded as a plugin, and asserts on the stream-json transcript and the files left
behind:

```
claude -p --plugin-dir <this plugin> --output-format stream-json --verbose \
  --include-hook-events --permission-mode acceptEdits --allowedTools … \
  --append-system-prompt "<harness note>" --max-budget-usd N   < prompt
```

| Scenario | Asserts |
|---|---|
| `01-route-fix` | "fix this failing test" enters `/fix` (Skill `agentic-engineering:fix` or a read of its body), runs the tests before diagnosing, and shows the reproduction output and a tested hypothesis |
| `02-ship-parallel-review` | `/ship` Phase 2 dispatches all seven reviewers in **one** assistant message (grouped by `message.id`) |
| `03-ship-auto-migration-pause` | `/ship --auto` logs a `HARD-PAUSE` for a table-creating migration and writes no migration before the human answers |
| `04-converge-false-completion` | `/converge` reports a checked story with no matching code as a Blocker, the delivered FR as converged, and touches no code |
| `06-req-evidence-gate` | `ae-req` (dispatched directly with the inputs `/review` hands it) blocks a story ticked in the diff whose evidence row is stale, and clears it after a real run on the current code |
| `07-diagnose-sequential` | `/diagnose` on the one-reviewer-per-message transcript names the sequential dispatch, quotes the transcript lines, and writes nothing without `--bundle` |
| `08-feature-intent-check` | full-mode `/feature` with a vague request asks one intent question and proposes no approaches or PRD yet; with user, outcome and constraint all stated it asks nothing and goes straight to the approach options |
| `09-fix-in-worktree` | `/fix` on `main`: with no preference set the branch question offers a new worktree and nothing is created; with `agentic.worktree=always` and `--auto` the session enters a `.claude/worktrees/` worktree with `EnterWorktree`, the fix is committed on its branch, the main folder's HEAD and files are untouched, the task's focus left main, the RED review is a real `agentic-engineering:ae-red` dispatch in fix-review mode on the captured uncommitted diff, and the worktree is kept |
| `10-improve-review-uncommitted` | `/improve --auto` on a fresh branch with no commits of its own: the uncommitted change is captured into a non-empty diff, `ae-red` + `ae-test` + `ae-lean` are dispatched in one message, no review aborts, and the change is committed after review |
| `11-worktree-finish` | `/worktree` with one finished task worktree and one holding uncommitted work: it lists both and changes nothing before the answer; answering merge lands the commit on `main`, runs the tests on the merged result, removes that folder and branch through `worktree.sh`, and leaves the dirty one and its file untouched |
| `12-archive-two-phase` | `/archive notes` proposes `SUMMARY.md` plus an extract holding a decision and an open obligation that live only in `PROGRESS.md`, deleting nothing and writing neither `DECISIONS.md` nor `BACKLOG.md`; `/archive --apply` appends both, deletes the originals, keeps `SUMMARY.md` and `data-model.md`, marks the feature archived in one commit and never touches the unshipped feature |
| `05-session-focus` | the SessionStart hook makes a fresh session — and the first turn after `/compact` — name the active focus task; a plain repo gets the router only |

Assertions target mechanism — dispatch grouping, files on disk, logged lines —
not wording, so a rephrased reply does not flip a result.

**Skipped cleanly** (exit 0, `[SKIP]` line) when `claude` is not on `PATH`, or when
neither `ANTHROPIC_API_KEY` / `CLAUDE_CODE_OAUTH_TOKEN` is set nor `claude auth
status` reports a login.

**Cost.** Each scenario carries a `--max-budget-usd` cap. A full run on Sonnet costs
a few dollars; `02` (seven reviewers) is most of it. Transcripts, per-scenario token
reports and (with `--keep`) the fixture projects land in `behavioral/out/<stamp>/`,
which is gitignored.

Environment gotchas the harness already handles:
- `--permission-mode bypassPermissions` is refused when running as root, so tools are
  allowed explicitly instead.
- `--allowedTools` is variadic and swallows a trailing prompt argument, so prompts go
  on stdin.
- A nested `claude` inherits `CLAUDECODE` / `CLAUDE_CODE_SESSION_ID` from a parent
  Claude Code session and writes into the parent's transcript; the harness unsets them.
- Claude Code loads every `CLAUDE.md` from the working directory upward. Fixture
  projects therefore live in a temp dir outside the repo (`$AE_WORK`), never under
  `tests/` — otherwise this repo's developer notes leak into the session under test.
  `ae_run_claude` refuses a fixture with a `CLAUDE.md` above it.
- `AskUserQuestion` does not exist in `-p` mode. Gates print their question and end
  the turn, which is where most scenarios stop.

## Token report — `token-report.py`

```bash
python3 tests/token-report.py static ship feature        # what a command loads
python3 tests/token-report.py static --auto ship         # … plus shared/auto-mode.md
python3 tests/token-report.py transcript out/…/*.jsonl    # what a run spent
```

`static` estimates (bytes/4) what each command pulls into the main conversation:
wrapper + SKILL.md + body + shared blocks + nested command bodies, per
`load-manifest.json`. Branch-only files (`auto-mode.md`, `worktree.md`, `visual-capture.md`) are left out of the default load; `--auto` adds `auto-mode.md`. Keep that file in step with what the command text tells the
model to read — context-diet numbers are only as honest as it is. `transcript`
reports cost, turns, per-model tokens and per-subagent usage from stream-json.

## Adding a scenario

1. `behavioral/scenarios/NN-name.sh`, sourcing `lib/claude.sh` and `lib/fixtures.sh`.
2. Build the fixture under `$AE_WORK/project` (temp dir, outside the repo); transcripts go to `$AE_OUT`, call `ae_run_claude DIR OUT PROMPT BUDGET [APPEND]`.
3. Assert with `ae_check "description" command…`; query the transcript with
   `lib/transcript.py` (`routed-to`, `batch`, `dispatches`, `text`, `hook-events`, `tools`).
4. End with `ae_done`. Add a row to the table above.
