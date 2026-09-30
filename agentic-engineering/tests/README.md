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
| `test_frontmatter.py` | wrapper/agent/SKILL.md frontmatter that does not parse or lacks required keys; wrappers that don't point at their body or drop `$ARGUMENTS`; agent `name:` ≠ file stem; reviewers holding Bash or a write tool; SKILL.md description over 1,024 chars |
| `test_references.py` | `${CLAUDE_PLUGIN_ROOT}/…` paths, `agentic-engineering:<name>` dispatch/skill names, and `commands/` · `shared/` · `agents/` references that resolve to nothing |
| `test_home_paths.py` | `~/.claude` (or bare `$HOME/.claude`) literals in shipped content |
| `test_command_tables.py` | README command table, SKILL.md Command → File Map and `commands/` drifting apart; stale command counts in CLAUDE.md |
| `test_hooks.py` | invalid `hooks/hooks.json`; SessionStart output that is not exactly one valid JSON object with `hookSpecificOutput` under every project shape (plain repo, scaffolded, active focus, compact source, hostile focus titles, bad UTF-8, empty/garbage stdin, opt-out) |
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
| `01-route-fix` | "fix this failing test" enters `/fix` (Skill `agentic-engineering:fix` or a read of its body) |
| `02-ship-parallel-review` | `/ship` Phase 2 dispatches all seven reviewers in **one** assistant message (grouped by `message.id`) |
| `03-ship-auto-migration-pause` | `/ship --auto` logs a `HARD-PAUSE` for a table-creating migration and writes no migration before the human answers |
| `04-converge-false-completion` | `/converge` reports a checked story with no matching code as a Blocker, the delivered FR as converged, and touches no code |
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
- `AskUserQuestion` does not exist in `-p` mode. Gates print their question and end
  the turn, which is where most scenarios stop.

## Token report — `token-report.py`

```bash
python3 tests/token-report.py static ship feature        # what a command loads
python3 tests/token-report.py transcript out/…/*.jsonl    # what a run spent
```

`static` estimates (bytes/4) what each command pulls into the main conversation:
wrapper + SKILL.md + body + shared blocks + nested command bodies, per
`load-manifest.json`. Keep that file in step with what the command text tells the
model to read — context-diet numbers are only as honest as it is. `transcript`
reports cost, turns, per-model tokens and per-subagent usage from stream-json.

## Adding a scenario

1. `behavioral/scenarios/NN-name.sh`, sourcing `lib/claude.sh` and `lib/fixtures.sh`.
2. Build the fixture under `$AE_OUT/project`, call `ae_run_claude DIR OUT PROMPT BUDGET [APPEND]`.
3. Assert with `ae_check "description" command…`; query the transcript with
   `lib/transcript.py` (`routed-to`, `batch`, `dispatches`, `text`, `hook-events`).
4. End with `ae_done`. Add a row to the table above.
