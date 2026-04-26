# Edge-case mining

The quality bottleneck of the entire system. If `## Edge cases handled` is gold, Product Brain is useful. If it's hallucinated slop, the whole tool gets distrusted.

## Where edge cases actually live

Ranked by signal quality (highest first):

| Source | Why it's good | Captured by |
|---|---|---|
| **PR review comments** | Reviewers literally write "what about expired tokens?" verbatim. | `pr_enrichment` phase |
| **TestRail / test-mgmt cases** | QA's explicit catalog of cases — including manual/exploratory ones dev never wrote tests for. | `test_adapter.fetch_cases_for_ticket` (optional) |
| **TestRail run history** | "This case has failed 5× in 90d." Evidence-based risk — unique signal. | `test_adapter.fetch_run_history` (optional) |
| **Test names added in this ticket** | `test_password_reset_with_expired_token` is a labeled edge case. | `git log` + parse test files |
| **Commit messages with edge-case verbs** | "fix", "handle", "guard against", "race", "edge case" | regex over commit subjects/bodies |
| **Code comments added in the diff** | `// user disabled 2FA but still has session` | parse + lines starting with `//`/`#`/`/*` |
| **PM ticket description** | What the PM thought to ask for; usually misses what reviewers caught. | `pm_adapter.fetch_ticket` |
| **Bug tickets referencing this ticket later** | "regression from AHA-1234" — retroactive but high-fidelity | `repair` populates `linked_bugs` |

If a test adapter is configured (see [test-adapter.md](test-adapter.md)), records gain three additional sections — `## QA-verified edges`, `## Stability signals`, `## Coverage gaps` — backed by the test cases linked to each ticket and their run history.

## Two-pass extraction

### Pass 1 — per-ticket, at backfill (cached in the record)

Gather raw signals into a structured bundle:

```python
signals = {
    "pr_review_comments": [{"author", "body", "file", "line", "sha"}],
    "added_test_names":   [{"name", "file", "sha"}],
    "commit_verb_lines":  [{"line", "sha"}],
    "added_code_comments":[{"text", "file", "line", "sha"}],
    "pm_description":     str,
    "linked_bug_tickets": [ticket_id],
}
```

Then one LLM call per ticket with this prompt skeleton:

```
You are extracting edge cases that were considered or handled in this ticket.

Use ONLY the signals below. For each edge case:
  - Quote or closely paraphrase from a signal.
  - Cite the source (PR comment, test name, commit SHA, file:line).
  - Skip if you'd have to invent details.

If signals don't support N bullets, return fewer (or zero).
DO NOT extrapolate from the feature description.
Output JSON: { edge_cases_handled: [{text, source}], known_gaps: [{text, source}] }

[signals: {pr_review_comments...}]
```

The "return fewer or zero" instruction matters. Default LLM behavior is to fill any quota; this fights it.

### Pass 2 — cross-ticket dedup, at query time

When `/pb-groom` pulls 10 related records, run one dedup/cluster step:

```
Input: list of {text, source, source_ticket} bullets across all related records.
Output: themed list with frequency:
  - "Rate limiting: 4/7 records (AHA-1100, 1300, 900, 1450)"
```

This pass runs once per query, not per ticket. Cheap.

## Citation discipline (the only thing that keeps the tool honest)

Two enforced rules:

### Rule 1 — Cite-or-drop at extraction

The prompt requires every bullet to cite. Bullets without citations are removed before the LLM response is even parsed (regex-pre-filter on the JSON before save).

### Rule 2 — Validate-citations at write

Every cited source is checked against ground truth:

| Citation form | Validation |
|---|---|
| `pr#NNN review @user` | REST: `GET /repos/.../pulls/NNN/comments` and find body match by author |
| `test_name::test_foo` | `grep -r "def test_foo" <repo>` returns ≥1 |
| `commit abc1234` | `git cat-file -e abc1234` |
| `path:line TODO` | File exists, line N contains the TODO text |

Unverifiable bullets are dropped silently. **Drop rate is logged.** If >10% of bullets across a backfill fail validation, the audit log emits a warning. The prompt or model is bad and you'll see it.

## Output

```markdown
## Edge cases handled
- Rate-limit reset requests to 5/hour per email
  source: pr#789 review comment by @bob
- Reset tokens hashed at rest (sha256 + salt)
  source: pr#789 commit def456
- Expired token returns generic error (avoid enumeration)
  source: test/auth/reset_test.py::test_expired_token_generic_error

## Known gaps
- No backup codes (deferred to AHA-1400)
  source: pr#789 description
- Email delivery failure: logged but no UX
  source: api/auth/reset.py:142 — TODO(AHA-?)
```

Every line is clickable. PMs and engineers verify it. Trust accumulates over months.

## Failure modes

| Mode | Behavior |
|---|---|
| **No PR review culture** (small team) | Falls back to test names + commit verbs. Lower yield, still useful. |
| **PR not linked to ticket** | Parse `(#N)` from squash subjects as a fallback. |
| **Hallucinated citations** | Validation kills them. Drop rate visible in audit log. |
| **Stale gaps** | `repair` re-checks `Known gaps`. TODO removed from file? Linked follow-up ticket closed? Stale entries get `[stale]` tag, not silent removal. |
| **Multi-quote citations** | A bullet may cite multiple sources: `source: pr#789 + test_foo`. Validation requires ≥1 source verifies. |

## Manual override

`## Edge cases (manual)` (below the `<!-- manual -->` sentinel) is never overwritten by the LLM. Engineers add cases the mining missed. Backfill respects existing manual sections via the marker.

## Why this works

Citations turn an unverifiable LLM output into a verifiable one. A reader can click any bullet and see the source. Wrong bullets get caught by validation, not by humans. Right bullets accumulate trust.

The two rules — cite-or-drop and validate-citations — are non-negotiable. Every plausible-sounding-but-uncited bullet that ships erodes trust faster than any feature adds it.
