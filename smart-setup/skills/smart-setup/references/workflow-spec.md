# Workflow Spec

Defines `.claude/workflow.md` — the project's phase map. One place that answers "what do I run to plan / build / check / fix / release this project".

Principle: **route before you generate**. Workflow tooling already installed owns its phases. smart-setup never reimplements it.

## Phases per tier

| Tier | Phases |
|---|---|
| 0 | none — no `.claude/workflow.md` |
| 1 | plan, implement, bugfix |
| 2 | tier 1 + audit, release, maintain, docs |

## Step A — Detect installed tooling

Probe, cite evidence per hit:

| Look in | Means |
|---|---|
| `.claude/settings.json` → `enabledPlugins` | plugin installed, commands namespaced `/<plugin>:<cmd>` |
| `~/.claude/plugins/` | plugin cache — cross-check with settings |
| `~/.claude/commands/*.md`, `~/.claude/skills/*/SKILL.md` | bash-installed, commands bare `/<cmd>` |
| `.claude/commands/`, `.claude/skills/` | project-local, already present |
| `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE*`, CI required checks | repo-native process the workflow must respect |

**Record the exact invocation form observed.** Plugin install gives `/agentic-engineering:ship`; bash install gives `/ship`. Guessing the prefix produces a dangling reference.

## Step B — Map phase → owner

Known tooling:

| Phase | agentic-engineering | superpowers |
|---|---|---|
| plan | `/feature`, `/design`, `/plan-all` | `brainstorming` → `writing-plans` |
| implement | `/ship` (implement → review → docs) | `test-driven-development`, `executing-plans` |
| audit | `/review` (6-agent parallel), `/analyze` | `requesting-code-review` |
| bugfix | `/fix` | `systematic-debugging` |
| docs | `/doc`, `/doc-all` | — |
| maintain | — | — |
| release | — | — |

`maintain` → `update-dependencies` skill when the smart-setup plugin is installed (it ships alongside). Otherwise inline.

Unknown tooling found → ask user which phases it owns. Never assume from the name.

## Step C — Phase with no owner: inline, promote only on evidence

Default: write the phase **inline in `.claude/workflow.md`** — trigger, steps, exit gate. No separate file.

Promote to `.claude/skills/<phase>/SKILL.md` only when the phase clears the `authoring-guidelines.md` bar:

- more than one command, **or**
- ordering constraints between steps, **or**
- gotchas / failure modes worth recording, **or**
- environment prerequisites (secrets, signing, tunnels)

"Plan the feature, then write it" is obvious. It stays inline. `flutter test` → version bump → `build ipa` → altool upload → tag, with a pod-install gotcha, is not obvious. That gets promoted.

Manifest states which phases were promoted and why. Promoted phase skills count against the tier's skill budget like any other procedure skill.

## Step D — workflow.md structure

Fixed section order: header line, then one `##` per phase in tier order.

Each phase carries exactly:

- **Trigger** — what starts this phase
- **Owner** — the command / skill / agent that runs it, or `inline`
- **Steps** — inline phases only; owner phases skip this
- **Exit gate** — what must be true before leaving. Concrete and checkable ("tests pass, no new lint errors"), never "looks good".

See `exemplars/workflow-doc.md`.

## Wiring

- `CLAUDE.md` `## Workflow` → pointer line: `Read .claude/workflow.md before any feature, bugfix, or release.` Existing agent-dispatch lines stay.
- Every phase owner must resolve to something that exists — installed command, generated skill file, or inline steps. Dangling reference = broken doc, rebuild it.
- Agents generated in Step 6 appear as owners or inside exit gates, not as a separate phase.

## Banned

- Duplicating a phase that installed tooling already owns.
- A phase whose owner is a command that is not installed.
- Exit gates that cannot be checked.
- Phases above the confirmed tier's list.
