# {{ ticket }} — {{ title }}

{% if mode == "plan" %}**Pre-ticket plan** — scope is predicted, refine after creating the ticket.{% endif %}

## Scope by repo

{% for repo in scope_by_repo %}**{{ repo.name }}**
{% for area in repo.areas %}- {{ area }}
{% endfor %}
{% endfor %}

## Estimate: {{ estimate.low }}–{{ estimate.high }} {{ estimate.unit }}  ({{ estimate.confidence }} confidence)

References:
{% for ref in estimate.references %}- {{ ref.ticket }} ({{ ref.title }}): {{ ref.days }}d, {{ ref.loc }} LOC, {{ ref.files }} files     similarity {{ ref.similarity }}
{% endfor %}

## Edge cases (from {{ edge_cases.source_count }} related tickets)

{% for bullet in edge_cases.bullets %}- {{ bullet.text }}     [{{ bullet.frequency }}: {{ bullet.tickets|join(', ') }}]
{% endfor %}

## Risks

{% for risk in risks %}- {{ risk.area }}: {{ risk.evidence }}
{% endfor %}

## Suggested reviewers

{% for r in reviewers %}- {{ r.handle }} ({{ r.area }}, {{ r.commits }} commits in scope)
{% endfor %}

## Draft sub-tickets

{% for d in drafts %}- [ ] {{ d.repo }}: {{ d.summary }}
{% endfor %}
