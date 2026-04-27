# Test adapter

Optional integration with a test-management tool (TestRail, Zephyr, Xray, qTest). When configured, ticket records gain four extra dimensions:

| Field | Origin | Purpose |
|---|---|---|
| `test_cases` | per-ticket lookup via `refs` field | What QA explicitly verifies for this ticket |
| `qa_edges` (prose) | LLM extraction over case titles | Edge cases QA caught (often beyond what dev tested) |
| `stability_signals` | run history aggregation | Which scenarios have actually broken — evidence-based risk |
| `coverage_gaps` | code-edge × case-title diff | Behaviors handled in code but not formalized as QA cases |

Without a test adapter, the system runs as before; these fields stay empty.

## Why this matters for grooming

Code mining captures what dev wrote tests for. PR review captures what reviewers raised. Neither captures:

- **Manual / exploratory cases** — UX flows, accessibility, cross-device. QA writes these; dev usually doesn't.
- **Failure history** — "this scenario has failed 5× in the last 90 days" is risk evidence the bot can't fabricate.
- **Coverage shape** — the gap between "we handled this in code" and "QA has a test for this."

## Interface

`src/adapters/test-base.ts`:

```typescript
export interface TestAdapter {
  fetchCase(caseId: string): Promise<TestCase | null>;
  fetchCasesForTicket(ticketId: string): Promise<TestCase[]>;
  fetchCasesForFiles(paths: string[]): Promise<TestCase[]>;
  fetchRunHistory(caseId: string, since?: Date): Promise<RunResult[]>;
  searchCases(keywords: string, limit?: number): Promise<TestCase[]>;
}
```

`TestCase`:

```typescript
export interface TestCase {
  id: string;                  // adapter-prefixed: "TR-C-4521"
  title: string;
  preconditions: string;
  steps: string[];
  expected: string;
  automation: "manual" | "automated" | "semi" | "unknown";
  type: string;                // functional | security | performance | accessibility
  suite: string;
  linkedTickets: string[];     // tickets this case is linked to
  lastStatus?: "passed" | "failed" | "blocked" | "retest" | "untested" | "unknown";
  lastRun?: Date;
  recentFailures: number;      // within run-history window
  url: string;
}
```

## TestRail implementation

Out of the box. Configure:

```yaml
test_adapter: testrail
testrail:
  base_url: https://yourco.testrail.io
  user_email: bot@yourcompany.com
  api_key_env: TESTRAIL_API_KEY
  project_id: 7
  refs_field: refs                # custom field on cases holding ticket IDs
  run_history_window_days: 90
```

Auth: HTTP Basic with `user_email:api_key`. Generate the API key in TestRail under My Settings → API Keys.

**Linkage assumption.** TestRail cases must reference ticket IDs in the `refs` field (or whatever you configure). If your team doesn't link reliably, `fetch_cases_for_ticket` returns sparse results — the adapter falls back to `fetch_cases_for_files` (search by area), which is lower precision.

## How the index changes

Front-matter:

```yaml
test_cases:
  - id: TR-C-4521
    title: "Login with locked account shows 'account locked' message"
    automation: manual
    type: functional
    suite: "1"
    linked_tickets: [AHA-1100]
    last_status: passed
    last_run: 2026-04-10T12:00:00Z
    recent_failures: 0
    url: https://yourco.testrail.io/index.php?/cases/view/4521
  - id: TR-C-4527
    title: "TOTP retains validity through network disconnect"
    automation: automated
    last_status: failed
    recent_failures: 5
coverage_gaps:
  - edge: "Rate-limit reset requests"
    edge_source: "pr#789 review @bob (from AHA-1100)"
    rationale: "no QA case title matched this behavior"
```

New prose sections:

```markdown
## QA-verified edges
- Login with locked account shows specific error
  source: TR-C-4521 (manual, passed)

## Stability signals
- TR-C-4527 (TOTP through network disconnect): 5 failures in 90d window — structurally fragile

## Coverage gaps
- Rate-limit reset requests
  source: pr#789 review @bob
  rationale: no matching QA case found
```

## How `/brain groom` output changes

Three new sections appear after the existing "Edge cases":

```markdown
## Edge cases (from related tickets)            (existing — code-mined)
...

## QA-verified edges (from related tickets)     (NEW)
- ...     [TR-C-4521, manual, passed]

## Stability signals                             (NEW — unique signal)
- TR-C-4527: 5 fails / 90d (TOTP network disconnect)

## Coverage gaps                                 (NEW)
- Rate-limit reset requests — no QA case found
  source: pr#789 review @bob
```

The "Stability signals" section is the unique value — nothing else in the system can produce evidence-based risk like this.

## Citation discipline (same rule, extended)

Every `qa_edges` bullet must cite a real `TR-C-NNNN`. Validation at write time:

- Bullet cites `TR-C-4521` → must appear in this record's `test_cases`. Otherwise dropped.
- Generic case titles ("test login works") fail extraction at the prompt level; the prompt rejects vague titles.

Drop rate is logged. If it exceeds 10% of bullets across a backfill, your TestRail hygiene is the issue (vague titles, broken refs) — and you'll see it in the audit log.

## Coverage-gap detection

Two-stage:

1. **Heuristic prefilter** — token-set Jaccard between code-edge text and case titles. Edges with a match above threshold are skipped. Cheap.
2. **Optional LLM refinement** — for the remaining edges, an LLM judges semantic match. Higher precision, ~one cheap call per ticket at backfill time.

Fully heuristic mode (no LLM) is available — produces more false positives but costs nothing. Toggle via `--no-llm` on backfill.

## Failure modes

| Mode | Behavior |
|---|---|
| Cases not linked to tickets | `fetch_cases_for_ticket` returns empty → no QA-edges, no gaps. Falls back to file-area search if you call `fetch_cases_for_files`. |
| Vague case titles ("test login") | Prompt rejects them; `qa_edges` is sparse. Fix by improving titles. |
| TestRail rate limits | Adapter retries with backoff. Backfill resumable. |
| Dead cases (deprecated suite) | `fetch_run_history` returns empty; case still appears in `test_cases` with `recent_failures: 0`. |
| TestRail outage | Adapter raises; backfill skips test data for that ticket but proceeds. Repair retries on next run. |

## Adding a new test adapter (Zephyr, Xray, qTest)

1. Create `src/adapters/zephyr.ts`.
2. Implement the `TestAdapter` interface.
3. Register in `src/adapters/index.ts`:
   ```typescript
   import { ZephyrAdapter } from "./zephyr.js";
   TEST_ADAPTERS["zephyr"] = ZephyrAdapter;
   ```
4. Set `test_adapter: zephyr` in `config.yaml` and add a `zephyr:` config block.

The orchestrator never touches tool-native concepts; everything goes through the abstract interface.

## Decisions worth pinning

1. **Linkage hygiene.** This integration's value scales with how reliably your team links cases to tickets. Audit `refs` coverage before turning on stability signals; if <50% of cases have refs, you're in fall-back-mode (file-area search), which works but loses precision.
2. **LLM cost on coverage-gap detection.** Heuristic-only is free and fine for first pass. Only enable LLM refinement after validating heuristic produces too many false positives in your data.
3. **Run history window.** 90d is the default. Shorter (30d) = noisier, longer (180d) = stale. Tune per release cadence.
