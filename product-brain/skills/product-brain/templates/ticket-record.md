---
ticket: {{ ticket }}
title: {{ title }}
type: {{ type }}
status: {{ status }}
first_commit: {{ first_commit }}
last_commit: {{ last_commit }}
shas: {{ shas }}
prs: {{ prs }}
authors: {{ authors }}
files:
{% for f in files %}  - { path: {{ f.path }}, change: {{ f.change }}, loc_added: {{ f.loc_added }}, loc_removed: {{ f.loc_removed }} }
{% endfor %}symbols: {{ symbols }}
related_tickets: {{ related_tickets }}
loc_added: {{ loc_added }}
loc_removed: {{ loc_removed }}
duration_days: {{ duration_days }}
pr_open_to_merge_days: {{ pr_open_to_merge_days }}
---

## What shipped

{{ what_shipped }}

## Key decisions

{{ key_decisions }}

## Edge cases handled

{{ edge_cases_handled }}

## Known gaps

{{ known_gaps }}

<!-- manual: do not overwrite below this line -->
## Edge cases (manual)

<!-- Engineers may add hand-written edge cases here. Not LLM-managed. -->
