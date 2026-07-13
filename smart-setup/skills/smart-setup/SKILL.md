---
name: smart-setup
description: >
  Project-tailored Claude Code setup. Use when user wants to set up a project
  for agentic work, generate project-specific skills, agents, rules, memory,
  or MCP config. Triggers on: "/smart-setup", "/smart-setup update",
  "setup this project", "tailor Claude to this project", "configure this repo
  for Claude", or re-auditing an existing generated setup.
---

# smart-setup

Generate right-sized project config across five dimensions: **S**kills, **M**emory, **A**gents, **R**ules, **T**ools.

## How to use

Command invoked → read `commands/smart-setup.md`. Full instructions there.

## Command → File Map

| Command | File | Does |
|---|---|---|
| `/smart-setup` | `commands/smart-setup.md` | Scan/interview → tier → manifest → generate |
| `/smart-setup update` | `commands/smart-setup.md` (Update mode section) | Re-audit setup, diff vs codebase, amend |

## Core principle

Tier caps output — structural limit, not suggestion. Most projects need almost nothing. Manifest gate before any file written. "NOT generating" list mandatory in every manifest.

## References

| File | Holds |
|---|---|
| `references/sizing-rubric.md` | tier signals + output caps |
| `references/interview-protocol.md` | greenfield + domain-knowledge questioning |
| `references/authoring-guidelines.md` | caveman rules + frontmatter contracts + quality bar |
| `references/memory-spec.md` | 3-layer memory definition |
| `references/docs-spec-rules.md` | docs/specs conventions per tier |
| `references/tool-detection.md` | config file → MCP/CLI map |

## Exemplars

`exemplars/` — exactly one per artifact type: `claude-md.md`, `procedure-skill.md`, `domain-skill.md`, `agent.md`, `memory-scaffold.md`, `manifest.md`. Read matching exemplar before generating first artifact of that type. Exemplar = quality bar, not padding template.
