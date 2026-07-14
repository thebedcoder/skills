# /smart-setup — SMART Project Setup

`$ARGUMENTS` contains `update` → jump to **Update mode** section at bottom.

## Mode detect

1. Meaningful source files present (any code beyond configs/README)? Yes → scan path. No → greenfield path.
2. `.claude/setup-manifest.md` exists + no `update` arg → ask user: re-run full setup, or run `/smart-setup update` instead? One question, then proceed per answer.

## Step 1 — Facts

**Scan path.** Collect, cite evidence (file paths) for each fact:

- Stack: languages, frameworks, package manifests
- Commands: run, test, build, deploy — from package.json scripts, Makefile, README, CI files
- Test framework + its non-watch invocation
- CI: `.github/workflows/`, `.gitlab-ci.yml`, etc.
- Deploy + tool configs — walk `references/tool-detection.md` map
- Conventions observed: naming, error handling, layer boundaries — read 3–5 representative source files
- Contributors: `git shortlog -sn | head -5`

**Greenfield path.** `references/interview-protocol.md` → Greenfield facts section. One question at a time.

## Step 2 — Tier

Read `references/sizing-rubric.md`. Propose tier + one-line reason citing signals. Ask user: confirm or override. Never proceed unconfirmed. Confirmed tier caps everything downstream.

## Step 3 — Interview gaps

`references/interview-protocol.md`:

- Tier 2 (or tier 1 + user explicitly asked): domain knowledge questions
- Tier > 0: preference questions
- Skip everything scan already answered

## Step 4 — Manifest

Read `exemplars/manifest.md`. Build manifest:

- Every artifact: type + path + one-line why
- **NOT generating** table mandatory — near-miss artifacts + reason each. Empty NOT-generating table = manifest rejected, rebuild it.
- Tier 2 + project needs phase-gated SDLC → row recommending agentic-engineering install. Do not reimplement its workflow.
- Manifest footer notes: `.claude/setup-manifest.md` written after approval as bookkeeping (exempt from tier caps).

Present manifest. Tier-default artifact skipped (review agent at tier ≥ 1, stack rules, guardrails) → explicit callout line above tables, one per skip: "No agents — /ae:review covers. Override?" Negative decisions never ride only inside NOT-generating table. User approves / edits rows / overrides tier.

**HARD GATE: nothing written to disk before approval.**

## Step 5 — Generate

Read `references/authoring-guidelines.md` first. Before generating first artifact of each type, read matching exemplar from `exemplars/`.

Order:

1. `CLAUDE.md` — create per `exemplars/claude-md.md`, or append sections wrapped in `<!-- smart-setup:start -->` / `<!-- smart-setup:end -->` markers. Never rewrite existing user content.
2. Memory scaffold per `references/memory-spec.md` + `exemplars/memory-scaffold.md` — includes `.gitignore` entry for `.claude/scratch.md`
3. Procedure skills → `.claude/skills/<name>/SKILL.md`
4. Domain skills → `.claude/skills/<name>/SKILL.md`
5. Rules — rules-library templates trimmed to project (dir: `rules-library/` alongside this skill's `references/` — bash install; not there → installed agentic-engineering plugin's `rules-library/`; first found wins), + observed-convention rules → `.claude/rules/<topic>.md` + pointer line per rule in `CLAUDE.md`. Rules-library not found → skip stack templates, observed-convention rules only. No template fits actual stack → NOT-generating row with evidence, never force-fit.
6. Agents → `.claude/agents/<name>.md` — role handle from palette (QA, SecOps, Lead, Frontend, Backend, Infra, Product, Designer), verification-shaped, four mandatory sections: Dispatch trigger / Context / Checks / Report format. `model` frontmatter by purpose (haiku mechanical / sonnet judgment / opus architecture — see authoring-guidelines). Review-after-implement DEFAULT at tier ≥ 1: one adversarial reviewer — assumes code broken, checks null/async/logic/edge — dispatch trigger "after non-trivial change, before commit". Counts against tier agent cap. Wire workflow line in `CLAUDE.md`. User declined in interview → skip + NOT-generating row.
7. Tools — `.mcp.json` (merge, never clobber existing keys) + `CLAUDE.md` "Required CLIs" section
8. Docs conventions per `references/docs-spec-rules.md` (tier-gated)
9. Guardrails (tier ≥ 1, DEFAULT ON unless declined in interview) → `.claude/settings.json` deny-read rules per authoring-guidelines Settings contract, trimmed to files project could contain. Merge, never clobber. Hooks only on concrete detected trigger — never speculative.

All artifacts caveman-formatted. Tier caps already enforced at manifest — do not exceed during generation.

## Step 6 — Verify

- Read back every generated file. Frontmatter parses — `name` + `description` present where contract requires.
- Every skill description contains trigger conditions.
- Every rule has `CLAUDE.md` pointer line. Every memory layer read-trigger wired in `CLAUDE.md`.
- Every agent → dispatch wiring present in `CLAUDE.md` Workflow section. Agent without wiring = never dispatched = dead file.
- Every agent → Context section names its memory reads (`docs/decisions.md` for reviewers) + bans memory writes. Generated `CLAUDE.md` Memory section carries subagent scoping line.
- Docs artifacts (specs, CHANGELOG) → read-trigger line present in `CLAUDE.md`.
- `.mcp.json` touched → validate: `python3 -c "import json; json.load(open('.mcp.json'))"`
- `.claude/settings.json` touched → validate same way. Deny rules present when guardrails accepted.
- Report to user: files written, one line each.

## Step 7 — Record

Write `.claude/setup-manifest.md`:

```markdown
# setup-manifest
<!-- Written by smart-setup. Anchor for /smart-setup update. -->

- tier: <N — name>
- date: <YYYY-MM-DD>
- smart-setup version: <x.y.z — read `../../.claude-plugin/plugin.json` relative to skill dir; missing (bash install) → omit line>

## Artifacts

| Type | Path | Why |
|---|---|---|
| ... | ... | ... |

## NOT generated

| Artifact | Why not |
|---|---|
| ... | ... |
```

NOT generated table copies rows from approved manifest — table format mandatory, never collapse to prose line. Exempt from tier caps — written at every tier. Skills generated → tell user: restart Claude Code session to load them. No skills generated → no restart needed.

## Update mode

1. Read `.claude/setup-manifest.md`. Missing → tell user: run `/smart-setup` first. Stop.
2. Re-scan — Step 1 scan path.
3. Diff current codebase vs manifest:
   - **New:** deps, deploy targets, stacks, CI appearing since setup
   - **Changed:** commands that moved (test script renamed, build tool swapped)
   - **Dead:** generated skills / rules / agents / `.mcp.json` entries / CLAUDE.md CLI lines referencing removed code, configs, or procedures
   - **Tier drift:** signals now point to different tier
4. Scan non-manifest artifacts — `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, `.mcp.json` entries absent from manifest. Apparent orphan (references removed code/config) → suggestion row `[suggestion — not managed by smart-setup]` in amendment manifest. Never delete rows for artifacts smart-setup did not generate — user removes those by hand.
5. Build amendment manifest: add / update / delete per artifact + why. Same mandatory NOT-generating discipline. Same HARD GATE.
6. User approves → apply → rewrite `.claude/setup-manifest.md` with new date + artifact list + NOT generated table (Step 7 format).

## Hard rules

- One question per message during interviews.
- No file written before manifest approval. No exceptions.
- Tier caps structural — exceed only via explicit user tier override.
- Existing user files: append marked sections, merge JSON — never rewrite (`CLAUDE.md`, `.gitignore`, `.mcp.json`, `.claude/settings.json`).
- Test commands in generated content: non-watch only (`vitest run`, `jest`, `pytest`, `go test ./...`).
