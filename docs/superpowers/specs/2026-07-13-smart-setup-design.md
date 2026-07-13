# smart-setup — Design

**Date:** 2026-07-13
**Status:** Approved (user), pending implementation plan

## Problem

`agentic-engineering` is over-engineered for most projects: 141 markdown files, 16 commands, a 12-agent roster, and an `/init` that scaffolds PRD/EPICS/STORIES/PROGRESS per feature plus a parallel `app-docs/` tree. For small and mid-size projects the doc ceremony dominates the actual work, and there is no lightweight "quick fix" mode of working.

The better model: per-project setup. Each project gets skills, memory, agents, rules, and tools tailored to its scope, workflow, and stack — sized to what the project actually is, which for many projects is almost nothing.

## Decision summary

Build a new standalone plugin, **`smart-setup`**, that scans (or interviews, for greenfield) a project and generates a project-local Claude Code configuration across five dimensions — **S**kills, **M**emory, **A**gents, **R**ules, **T**ools.

Key decisions made during design:

| Decision | Choice | Why |
|---|---|---|
| Consumer | Personal use, **Claude Code only** | No portability constraints; can use subagents, `.claude/`, `.mcp.json`, hooks freely. No `adapters/AGENTS.md.template` path. |
| Approach | **Method-driven with thin exemplar library** (approach C) | Pure catalog (A) reproduces generic-per-stack output — the disease being cured. Pure generation (B) gives inconsistent output across projects. C: shapes + exemplars anchor quality; generation provides tailoring; sizing rubric enforces restraint. |
| Agent shape | **Hybrid** | Job-title handles (QA, SecOps, Lead, …) as familiar names, but verification/research-shaped prompts, and an agent is generated only when tier + stack justify it. Rationale: subagents earn existence through context isolation, distinct tools, or adversarial bias — not org-chart role-play. |
| Skills kind | **Procedure + domain** | Procedure skills from scan; domain skills from interview. |
| Formatting | **Caveman rules for all generated artifacts** | Same rules and carve-outs as agentic-engineering. |
| Relationship to agentic-engineering | **Sizing/dispatch layer, not competitor** | Reuses `rules-library/`; tier-2 manifest may recommend installing agentic-engineering instead of reimplementing SDLC ceremony. |

## 1. Name & invocation

Plugin: `smart-setup` — "Setup your project SMART: Skills, Memory, Agents, Rules, Tools."

One user-facing command, two modes:

- `/smart-setup` — first run: scan/interview → tier → manifest → generate
- `/smart-setup update` — re-audit: diff generated artifacts against current codebase reality, propose amendments

Not listed in `.claude-plugin/marketplace.json` initially (same status as `premortem-skill`). Promoting later is a one-line change.

## 2. Plugin layout

Follows the monorepo per-plugin shape exactly (wrapper/real-command split, per-plugin installer):

```
smart-setup/
  .claude-plugin/plugin.json
  README.md
  install.sh                          ← copies to ~/.claude/, incl. rules-library from sibling
  commands/smart-setup.md             ← thin wrapper
  skills/smart-setup/
    SKILL.md                          ← router + method core (kept thin)
    commands/smart-setup.md           ← real command logic
    references/
      sizing-rubric.md                ← tier classification signals + caps
      interview-protocol.md           ← greenfield + domain-knowledge questioning
      authoring-guidelines.md         ← caveman rules + frontmatter contracts per artifact type
      memory-spec.md                  ← 3-layer memory definition (§6)
      docs-spec-rules.md              ← docs/specs conventions per tier (§10)
      tool-detection.md               ← config-file → MCP/CLI mapping (§9)
    exemplars/
      claude-md.md                    ← exactly one excellent example per artifact type
      procedure-skill.md
      domain-skill.md
      agent.md
      memory-scaffold.md
      manifest.md
```

> **Amendment (2026-07-13, post smoke-test):** `claude-md.md` exemplar added. Smoke tests showed CLAUDE.md is artifact #1 at every tier but had no exemplar — two fresh sessions could produce differently-shaped files. Still one exemplar per artifact type.

Constraints:

- `SKILL.md` stays a thin router; command body lives in `skills/smart-setup/commands/smart-setup.md` (repo convention).
- `rules-library/` remains in `agentic-engineering/` as single source of truth; `smart-setup/install.sh` copies it from the sibling directory at install time.
- Exemplar set is capped at one file per artifact type. Growth into a catalog is a design violation.
- Source `SKILL.md` must not contain `user-invocable: false` (installer patches it in, per repo convention).

## 3. Sizing tiers

Three tiers. The tier caps output **structurally** — the generator cannot exceed its tier's budget. This is the core anti-over-engineering mechanism and runs before anything is proposed.

| Tier | Signals | Max output |
|---|---|---|
| **0 — scratch** | Throwaway script, experiment, no tests/CI, single-session intent | `CLAUDE.md` ≤ 20 lines. Nothing else. |
| **1 — solo product** | Real users possible, tests exist or should, one developer | `CLAUDE.md`, procedure skills, stack rules, memory scaffold, ≤ 2 agents, `.mcp.json` |
| **2 — production system** | Team, CI, deploys, external users | Tier 1 + domain skills (via interview), agents as justified, docs/specs conventions. Manifest may recommend installing agentic-engineering for full SDLC. |

Classification: scan signals + one confirming question. User can always override the tier.

## 4. Flow (`/smart-setup`)

1. Detect greenfield vs. existing (meaningful source files present?).
2. **Scan** (existing): stack, run/test/build/deploy commands, CI, test frameworks, MCP-relevant configs, observed conventions. **Interview** (greenfield): same facts, asked one question at a time.
3. Propose tier → user confirms or overrides.
4. Interview gaps: domain concepts (tier 2), preferences.
5. Present **manifest**: every artifact to be created, plus an explicit **"not generating"** list with reasons — the whole footprint on one screen. User edits/approves. Nothing is written before this gate.
6. Generate per shapes + exemplars + caveman rules.
7. Verify: read back every generated file, check frontmatter validity, confirm skills load.
8. Write `.claude/setup-manifest.md` (tier, date, artifact list) — the anchor for `update` mode. Written at every tier; as bookkeeping it is exempt from tier output caps.

The manifest gate (step 5) is load-bearing: it is the single defense against the generator recreating agentic-engineering's over-scaffolding.

## 5. S — Skills

Two kinds, both written to project-local `.claude/skills/<name>/SKILL.md`, caveman-formatted, each with an explicit trigger description in frontmatter:

- **Procedure skills** — from scan: run, test, deploy, release, regenerate-client, etc. Only for procedures with non-obvious steps; `npm test` alone does not earn a skill — that is a `CLAUDE.md` line.
- **Domain skills** — from interview: product concepts, invariants, gotchas (e.g. "sync engine rules", "pricing model"). Tier 2 default; tier 1 on request.

## 6. M — Memory layers

Every layer defines four things: **location, write-trigger, read-trigger, lifecycle.** A layer without a read-trigger is write-only noise — that is the rule.

| Layer | Location | Written when | Read when | Lifecycle |
|---|---|---|---|---|
| **Permanent** | `CLAUDE.md` | setup + "remember this" moments | auto-loaded every session | git, evolves slowly |
| **Decisions** | `docs/decisions.md` — append-only, newest first; ADR-lite entries: date, decision, why, alternatives rejected | when an architectural/tooling/scope decision is made | instruction in `CLAUDE.md`: "before architectural changes or questioning existing patterns, read `docs/decisions.md`" | git, never rewritten |
| **Disposable** | `.claude/scratch.md` (gitignored) | task state, next steps, working notes | instruction in `CLAUDE.md`: read at session start | pruned freely, deletable anytime |

Generation includes the matching `.gitignore` entry for `.claude/scratch.md`.

Deliberately does **not** compete with Claude Code's harness-level auto-memory (`~/.claude/projects/.../memory/`) — that is personal-per-machine; these layers are project-shared via git (except disposable).

## 7. A — Agents

Hybrid shape: **job-title handles, verification/research-shaped prompts, tier-gated existence.**

- Generated to `.claude/agents/<name>.md`.
- Each agent file must state: dispatch trigger (when the main conversation should call it), what it checks/researches, report format (caveman).
- Role palette: QA, SecOps, Lead, Frontend, Backend, Infra, Product, Designer. The generator picks from the palette only when the project gives that role something concrete to verify — a Flutter app with no backend gets no Backend agent.
- Tier caps: tier 0 → no agents; tier 1 → ≤ 2; tier 2 → as justified by the manifest.

## 8. R — Rules

Two sources:

1. `rules-library/` template for each detected stack, trimmed to what applies to this project.
2. Project-specific rules generated from **observed** conventions in the scan (naming, error handling, layer boundaries).

Claude Code has no native path-scoped rules mechanism, so: short rules go inline in `CLAUDE.md`; longer ones live at `.claude/rules/<topic>.md` with a `CLAUDE.md` pointer (e.g. "editing `*.dart` → read `.claude/rules/flutter.md`").

## 9. T — Tools

Detection-based only; no curated catalog. `references/tool-detection.md` maps config files → suggestions:

- `playwright.config.*` → Playwright MCP
- `vercel.json` → Vercel CLI
- `supabase/` → Supabase MCP
- (map extended over time, but only detection entries — never a browsable catalog)

Output: `.mcp.json` entries + a "required CLIs" section in `CLAUDE.md`. Never installs anything; config and documentation only.

## 10. Docs/specs rules

The lightweight replacement for agentic-engineering's PRD/EPICS/STORIES ceremony. Principle: **a doc exists only if it changes future work; every doc type has a read-trigger.**

- **Tier 0:** no docs.
- **Tier 1:** `docs/decisions.md` (§6). Specs only for features that are multi-session or cross-cutting: one file, `docs/specs/<feature>.md`, four sections — problem, decision, scope, out-of-scope. No feature directories, no story checklists.
- **Tier 2:** tier 1 + `docs/CHANGELOG.md` (agent-facing, prepend after significant changes). If the project genuinely needs phase-gated SDLC, the manifest says "install agentic-engineering" instead of half-reimplementing it.

## 11. Caveman formatting

`references/authoring-guidelines.md` embeds the caveman rules (same as agentic-engineering's: drop articles/filler/hedging, keep technical terms and file paths exact, fragments OK).

Applies to **all generated artifacts**: skills, rules, agent prompts, memory scaffolds, manifest.

Carve-outs (normal prose): README-type content, end-user docs, anything shown to humans as a checkpoint.

## 12. Update mode (`/smart-setup update`)

1. Read `.claude/setup-manifest.md`.
2. Re-scan the codebase.
3. Diff: new deps, changed commands, dead artifacts (skills, rules, agents, `.mcp.json` entries, CLAUDE.md CLI lines), un-covered stacks, tier drift.
4. Scan non-manifest artifacts (`.claude/skills|agents|rules/`, `.mcp.json`): apparent orphans become suggestion-only rows — never delete rows for artifacts smart-setup did not generate.
5. Propose amendment manifest → user approves → apply → rewrite `.claude/setup-manifest.md`.

Keeps the setup from rotting; also the natural place to bump tiers as a project grows.

## 13. Explicit non-goals

- No code generation.
- No CI setup.
- No installing MCP servers or CLIs (config/docs only).
- No multi-tool portability (Claude Code only; no `adapters/` dir).
- Not a replacement for agentic-engineering — smart-setup is the sizing/dispatch layer in front of it.

## Testing / verification

No test suite exists in this repo (convention). Verification:

1. Run `bash smart-setup/install.sh`; inspect `~/.claude/skills/smart-setup/`, `~/.claude/commands/`.
2. Run `/smart-setup` against (a) a scratch directory with a single script (expect tier 0: CLAUDE.md only), (b) a real existing project (expect tier 1/2 manifest with a non-empty "not generating" list).
3. Confirm generated skills load in a fresh Claude Code session.
