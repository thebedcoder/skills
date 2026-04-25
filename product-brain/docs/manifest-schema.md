# Manifest and ticket record schemas

Two artifacts live in the central brain repo, one set per bound source repo:

- `repos/<repo-name>/manifest.md` — one per bound repo
- `repos/<repo-name>/tickets/<TICKET_ID>.md` — one per ticket touched in that repo

Source repos are NOT modified. See [binding.md](binding.md) for the brain repo layout.

JSON-Schema files: `skills/product-brain/schemas/{manifest,ticket-record,config}.schema.json`.

---

## Manifest

Front-matter (YAML) drives behavior; prose body is human-authored guidance for the planning agent.

```yaml
---
repo: backend                     # short name, must match config.repos[].name
ticket_regex: 'AHA-\d+'           # how to extract ticket IDs from commits
workflow: squash                  # squash | merge | rebase
languages: [python, sql]
entry_points:
  - api/main.py
  - services/email/__init__.py
owners_file: CODEOWNERS
ignore_paths:
  - vendor/
  - generated/
  - migrations/legacy/
mega_file_threshold: 0.95         # exclude top-5% churn files from clusters
last_indexed_sha: a1b2c3d4...     # tool-managed; do not edit by hand
index_cutoff_date: 2023-01-15     # before this, "every commit has ticket" wasn't enforced
---

## What this repo is
One paragraph...

## Conventions worth knowing
- Routes in `routes/`, not `pages/`.
- All endpoints must have an OpenAPI entry.

## Out-of-scope areas
- `legacy/` — frozen, do not modify.
```

### Field reference

| Field | Required | Used by |
|---|---|---|
| `repo` | yes | All — must match orchestrator config |
| `ticket_regex` | yes | backfill, incremental, bot |
| `workflow` | yes | backfill (decides whether to keep merge commits) |
| `languages` | no | symbol extraction, prediction prompts |
| `entry_points` | no | `/pb-plan` tentative scope prediction |
| `owners_file` | no | reviewer suggestion |
| `ignore_paths` | no | excluded from file-list aggregation |
| `mega_file_threshold` | no | hotspot clustering noise filter |
| `last_indexed_sha` | tool-managed | `/pb-sync` incremental range |
| `index_cutoff_date` | no | planner displays "index blind before X" |

### Prose body

The body is read by the LLM during `/pb-plan` to predict tentative scope when no ticket exists yet. Keep it terse and high-signal.

---

## Ticket record

```yaml
---
ticket: AHA-1234
title: Add 2FA to login flow
type: feature
status: shipped
first_commit: 2025-03-10T09:14:00Z
last_commit:  2025-03-14T17:33:00Z
shas: [abc123, def456, 789ace1]
prs: [789]
authors: [alice, bob]
files:
  - { path: lib/auth/two_factor.dart,   change: added,    loc_added: 410, loc_removed: 0 }
  - { path: lib/auth/login_screen.dart, change: modified, loc_added: 88,  loc_removed: 22 }
  - { path: test/auth/two_factor_test.dart, change: added, loc_added: 220, loc_removed: 0 }
symbols: [TwoFactorService.verify, LoginScreen._handleSubmit]
related_tickets: [AHA-1100, AHA-1300]
loc_added: 718
loc_removed: 22
duration_days: 4.3
pr_open_to_merge_days: 2.1
manual_sections: ["Edge cases (manual)"]
---

## What shipped
2FA via TOTP for the login flow. Codes generated client-side, verified server-side.
Recovery flow not in scope (deferred to AHA-1400).

## Key decisions
- Used `otp` package vs rolling our own (pr#789 review by @charlie).
- Codes hashed at rest in secure storage (commit def456).

## Edge cases handled
- Rate-limit verification attempts to 5/minute per account
  source: pr#789 review comment by @bob
- Lockout after 5 failed attempts
  source: test/auth/two_factor_test.py::test_lockout_after_n_attempts
- Network failure during code submission falls back to ...
  source: commit 789ace1

## Known gaps
- No backup codes (deferred to AHA-1400)
  source: pr#789 description
- Rotation of TOTP secret not implemented
  source: TODO(AHA-?) added in lib/auth/two_factor.dart:142

<!-- manual: do not overwrite below this line -->
## Edge cases (manual)

- We discovered post-launch that older Android devices (<API 26)
  cannot generate TOTP codes; we silently fall back to SMS. This
  isn't in the PR/test history but matters for planning.
```

### Front-matter — mechanical

Everything in front-matter is derived from `git` + GitHub + the PM tool. Re-running backfill against the same SHAs produces identical front-matter. The structured fields are the trustworthy signal.

### Prose — LLM-generated, citation-validated

Each bullet in `## Edge cases handled` and `## Known gaps` cites a source artifact. The validation pass (run on every write) checks:

- Cited SHAs exist in `git`.
- Cited PRs and comments exist via the GitHub API.
- Cited test names appear in a real file.

Unverifiable bullets are dropped silently. The drop-rate is logged; if it exceeds 10%, the prompt or model is bad and you'll see it in the audit log.

### Manual sections

Anything below the `<!-- manual: do not overwrite below this line -->` sentinel is preserved verbatim across re-runs. This is the escape hatch for edge cases mining missed.

---

## Why front-matter and prose are both in one file

Two reasons:

1. **Reviewability.** A PR that ships `AHA-1234` can also update `AHA-1234.md` in the same diff. Reviewers can sanity-check the prose in line with the code.
2. **Single source of truth per ticket.** No risk of front-matter and prose drifting out of sync across files.

Tradeoff: large diffs in tickets touching many files generate large records. Acceptable.
