# Premortem Skill

A premortem is the opposite of a postmortem. Instead of figuring out what went wrong after something fails, you imagine it already failed and figure out why before you start.

Method: Gary Klein (HBR). Daniel Kahneman called it his single most valuable decision-making technique.

## What it does

`/premortem <target>` — assumes the target failed 6 months from now, dispatches one investigator agent per failure reason in parallel, returns a synthesis (most likely failure, hidden assumption, revised plan, pre-launch checklist).

Two markdown files land in your working directory: a synthesis report and a full reasoning transcript.

## Targets

Plans, launches, product/feature decisions, hires, pricing changes, strategy pivots, partnerships. Anything reversible where the cost of being wrong is high.

## Install

```bash
./install.sh
```

Then restart Claude Code.

## Usage

```
/premortem I'm about to launch a $297 live workshop on Cowork for marketing managers
/premortem this hire — senior eng, joining to lead our backend rewrite
/premortem
/premortem this pricing change --html
```

The third form (no argument) asks you to describe the target conversationally.

Add `--html` to also emit a self-contained styled HTML report alongside the markdown — useful when sharing with non-technical stakeholders or producing a one-shot artifact outside a repo. Markdown stays canonical and composes with the rest of your toolchain (`ae-analyze`, `pb-sync`, PR diffs).

## Layout

- `skills/premortem/` — entry skill + commands (context gate, run, save)
- `agents/premortem-investigator/` — deep-dive agent, one per assigned failure reason
