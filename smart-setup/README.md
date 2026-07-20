# smart-setup

Project-tailored Claude Code setup. Scans your codebase (or interviews you, for a brand-new project), sizes the project into a tier, then generates only the configuration that project actually needs across five dimensions:

| Letter | Dimension | What gets generated |
|---|---|---|
| **S** | Skills | Procedure skills (run, test, release…) and domain skills (invariants, gotchas) in `.claude/skills/` |
| **M** | Memory | Three layers: permanent (`CLAUDE.md`), decisions (`docs/decisions.md`), disposable (`.claude/scratch.md`, gitignored) |
| **A** | Agents | Role-named, verification-shaped subagents in `.claude/agents/` — only where the project gives them something to check |
| **R** | Rules | Stack rules from the shared rules-library plus conventions observed in your code, in `.claude/rules/` |
| **T** | Tools | `.mcp.json` entries and required-CLI documentation, detected from config files |

On top of the five dimensions it writes `.claude/workflow.md` — the project's phase map (plan, implement, bugfix; plus audit, release, maintain and docs at tier 2). Each phase gets one owner. If a workflow plugin is already installed, smart-setup **routes** to it rather than reinventing it: with `agentic-engineering` present, the plan phase points at `/feature`, implement at `/ship`, bugfix at `/fix`. Phases nothing owns are written inline in the doc, and only promoted to their own skill file when the procedure is genuinely non-obvious. Every phase carries a checkable exit gate, and generation fails verification if any phase points at a command that isn't actually installed.

Generated agents are stateless by contract — each carries an explicit Context section naming what it reads before its checks (reviewers read `docs/decisions.md`, so deliberate decisions aren't flagged as bugs) and never writes memory files. Memory triggers in the generated `CLAUDE.md` are scoped to the main conversation, so dispatched subagents don't inherit them.

## Why

Full SDLC workflows are overkill for most projects. smart-setup sizes first: a throwaway script gets a 20-line `CLAUDE.md` and nothing else; a production system gets domain skills, agents, and doc conventions. Before writing a single file it shows you a manifest — including an explicit list of what it is *not* generating and why — and waits for your approval.

## Install

Via the plugin marketplace (recommended):

```
/plugin marketplace add thebedcoder/skills
/plugin install smart-setup@thebedcoder
```

Or from a repo checkout:

```bash
bash smart-setup/install.sh
```

Restart Claude Code afterwards. Note: the marketplace install ships the plugin as-is; the bash installer additionally copies `rules-library/` from the sibling `agentic-engineering/` plugin. Without it, smart-setup falls back to the agentic-engineering plugin's copy (if installed) or generates rules from observed conventions only.

## Usage

- `/smart-setup` — scan or interview → tier proposal → manifest → generate
- `/smart-setup update` — re-audit an existing setup against the current codebase and propose amendments
- "update dependencies" — invokes the `update-dependencies` skill (see below)

## The `update-dependencies` skill

The plugin ships a second, standalone skill that works on any stack — npm/pnpm/yarn/bun, pip/poetry/uv, cargo, go, maven/gradle, bundler, composer, pub, SwiftPM, NuGet. It is not generated per project; it is the same skill everywhere, and it reads project-specific constraints from `.claude/deps-constraints.md` when smart-setup found any worth recording (pinned dependencies and why, workspace update order, native rebuild steps, the verify command).

It runs in waves:

1. **Security first.** Ecosystem audit, reported before anything is applied.
2. **Wave 1 — patch and minor.** Applied as one batch, verified, committed. A failing batch is bisected; the culprit is demoted to wave 2 rather than blocking the rest.
3. **Wave 2 — majors, one at a time.** For each: changelog and migration guide fetched, breaking changes scoped to *this* repo by grepping for the affected symbols, then it stops and asks. Only after approval does it apply the bump, run the official codemod if one exists, and verify. A failure resets that single dep and moves on.
4. **Report.** Updated / deferred / blocked / still-vulnerable, each with a reason.

It never applies a major unasked, never runs a codemod without showing the diff, never hand-edits a lockfile, and never forces past a peer-dependency conflict.

## Tiers

| Tier | Meaning | Ceiling |
|---|---|---|
| 0 — scratch | throwaway, experiment | `CLAUDE.md` ≤ 20 lines |
| 1 — solo product | real project, one dev | + `.claude/workflow.md`, procedure skills, stack rules, memory, ≤ 2 agents, `.mcp.json` |
| 2 — production system | team, CI, users | + audit/release/maintain/docs phases, domain skills, agents as justified, docs/specs conventions |

If a project genuinely needs a phase-gated SDLC, smart-setup recommends installing the `agentic-engineering` plugin instead of reimplementing it.
