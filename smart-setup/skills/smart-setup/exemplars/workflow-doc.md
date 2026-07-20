<!-- EXEMPLAR: quality bar for generated .claude/workflow.md. Tier 2 shown — mixes routed, inline, and promoted phases. Tier 1 stops after Bugfix. Every Owner must resolve to something installed or generated. -->
# Workflow

Phases below are the loop for this repo. Owner column is authoritative — do not improvise a phase that has one.

## Plan

- **Trigger:** new feature, or change touching more than one package
- **Owner:** `/agentic-engineering:feature` (plugin enabled in `.claude/settings.json`)
- **Exit gate:** spec exists under `docs/specs/`, scope + out-of-scope both filled

## Implement

- **Owner:** `/agentic-engineering:ship` — runs implement → review → docs
- **Exit gate:** `pnpm -r test` green, `pnpm lint` clean, no `.only` left in specs

## Bugfix

- **Trigger:** reported defect or failing CI job
- **Owner:** `/agentic-engineering:fix`
- **Exit gate:** failing test written first and now passing, root cause noted in `docs/decisions.md` if it was a design flaw

## Audit

- **Trigger:** before merge to `main`, after any auth or billing change
- **Owner:** `/agentic-engineering:review` + dispatch `secops` agent
- **Exit gate:** zero blockers; deliberate exceptions recorded in `docs/decisions.md`

## Release

- **Trigger:** `main` green and version bumped
- **Owner:** `.claude/skills/release/SKILL.md` — promoted: 5 ordered steps, migration gate, staged rollout
- **Exit gate:** migrations applied on staging first, smoke suite green, tag pushed

## Maintain

- **Trigger:** weekly, or on a security advisory
- **Owner:** `update-dependencies` skill — reads `.claude/deps-constraints.md`
- **Exit gate:** no unaddressed high/critical advisories; deferred majors listed with reason

## Docs

- **Trigger:** public API or env var changed
- **Owner:** inline
- **Steps:** update `docs/api.md` → prepend one line to `docs/CHANGELOG.md` → same commit as the change
- **Exit gate:** no undocumented env var in `.env.example`
