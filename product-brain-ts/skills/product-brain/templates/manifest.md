---
repo: REPLACE_ME
ticket_regex: 'AHA-\d+'
workflow: squash
languages: []
entry_points: []
owners_file: CODEOWNERS
ignore_paths:
  - vendor/
  - node_modules/
  - .next/
  - build/
  - dist/
mega_file_threshold: 0.95
last_indexed_sha: ""
index_cutoff_date: ""
---

## What this repo is

One paragraph describing the repo's role. Read by the planning agent during /pb-plan to predict scope for new features.

## Conventions worth knowing

Any constraints, patterns, or surprises an engineer joining the team would need. Examples:
- "Routes live in `routes/`, not `pages/`."
- "All endpoints must have an OpenAPI spec entry."
- "We don't use ORM — raw SQL via the `db` module."

## Out-of-scope areas

Directories or features the agent should NOT propose touching (legacy, frozen, owned by another team):
- `legacy/` — frozen, do not modify
