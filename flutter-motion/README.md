# flutter-motion

Audit a Flutter app's motion and fix it in gated waves. The premise: apps don't feel cheap because they lack animation — they feel cheap because their animation is inconsistent. Eleven curves and ninety-two hand-typed durations read as amateur no matter how many transitions you add. This finds that, fixes it behind a token system, then adds only the transitions that earn their place.

## Command

```
/flutter-motion
```

Also fires on natural phrasing: "make the app feel more polished", "the app feels cheap", "add animations", "improve transitions", "audit our animations", "make it feel expensive".

## What it does

1. **Reads the motion contract** — the project's existing motion conventions (or the absence of one), so the audit has a baseline to check against and update.
2. **Detects the stack** — routing, state management, and animation libraries in use, so fixes match the project's own patterns instead of a generic template.
3. **Scans and reports** — inventories every duration, curve, and animated widget, flags inconsistency and reduce-motion gaps, and presents findings before touching anything.
4. **Wave 0: tokens** — introduces the duration/curve token system. Values are taste, so they are proposed and approved before anything references them. Migrating existing hand-typed values onto the tokens is a later, optional wave.
5. **Wave 1: hygiene** — bugs, not taste: leaked animation controllers, ticker mixin mismatches, missing repaint boundaries. Two commits — the small localized fixes, then reduce-motion compliance on its own, because that one touches every animation site.
6. **Wave 2: high-severity, gated** — applies higher-impact fixes one screen at a time, each shown, applied, verified, and eyeballed before it is committed.
7. **Wave 3: menu** — offers the remaining medium and low findings (missing transitions, curve and duration consistency, polish) as a menu to pick from. Anything unpicked is recorded as declined and never re-proposed.
8. **Updates the contract and reports** — writes the new conventions back to the motion contract and summarizes what changed.

## Safety

- **Verified waves.** Each wave runs against a captured `flutter analyze` + `flutter test` baseline before being considered done.
- **Approval-gated.** High-severity fixes and optional polish are never applied without an explicit go-ahead.
- **Nothing speculative.** Only the transitions and fixes the audit actually finds are proposed — no template animations added for their own sake.

## Install

### Claude Code (plugin marketplace)

```
/plugin marketplace add thebedcoder/skills
/plugin install flutter-motion@thebedcoder
```

### From a local checkout

```bash
bash flutter-motion/install.sh
```

Copies the skill to `~/.claude/skills/flutter-motion/` and the `/flutter-motion` command to `~/.claude/commands/`. Restart Claude Code afterward.
