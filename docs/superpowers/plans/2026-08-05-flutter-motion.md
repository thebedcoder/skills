# flutter-motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `flutter-motion` plugin that audits a Flutter project's motion for consistency, hygiene, and missing transitions, then applies fixes in approval-gated, verified waves.

**Architecture:** Standalone Claude-Code-only plugin in the `update-dependencies` shape — thin wrapper command, real body in `skills/flutter-motion/SKILL.md`, four reference files, small installer. No agents, no `adapters/` template. The skill's intelligence lives entirely in markdown: a finding catalog where every rule pairs a grep probe with a mandatory confirm-by-reading step.

**Tech Stack:** Markdown + bash. No build system, no test suite. Verification is `.claude/hooks/check-integrity.sh` (fires on every Edit/Write), the `verify-install` skill (HOME-sandboxed installer run), and a dry run against a real 654-file Flutter project.

**Spec:** `docs/superpowers/specs/2026-08-05-flutter-motion-design.md`

## Global Constraints

- Plugin name is `flutter-motion` everywhere — directory, `plugin.json` `name`, skill dir, `SKILL.md` `name:`, command file, marketplace entry. A mismatch breaks `/flutter-motion`.
- **Never** put `user-invocable` in a source `SKILL.md`. Integrity check C fails the write. This plugin is same-name skill/command, so its installer must **not** patch it post-copy either — that shadows the command (see `verify-install` assertions 2 and 3).
- **Never run an installer without overriding `HOME`.** There is no `--prefix` flag. `HOME="$SANDBOX" bash flutter-motion/install.sh` is the only safe form.
- Validation project is `/Users/getman/DevWorkspaces/FlutterProjects/relaty` — 654 Dart files, `flutter_bloc` 9.1.1, in-house `bedcode_navigator`. **Read-only.** No task in this plan writes to it.
- Shell is zsh. `grep --include=*.dart` fails with "no matches found"; the glob **must** be quoted: `--include='*.dart'`.
- Commit convention: Conventional Commits with scope, e.g. `feat(flutter-motion):`.
- Durations band is 100–500ms. Over 800ms on a common path is high severity.
- Never propose bounce, elastic, or back curves. They are findings when found.

## File Structure

| File | Responsibility |
|---|---|
| `flutter-motion/.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `flutter-motion/commands/flutter-motion.md` | Thin wrapper, points at the skill |
| `flutter-motion/skills/flutter-motion/SKILL.md` | Flow, waves, gates, hard rules |
| `flutter-motion/skills/flutter-motion/references/findings.md` | Rule catalog: probe → confirm → fix → why |
| `flutter-motion/skills/flutter-motion/references/motion-system.md` | Token file template, Material motion mapping |
| `flutter-motion/skills/flutter-motion/references/routing.md` | Per-router fix sites + unknown-router fallback |
| `flutter-motion/skills/flutter-motion/references/state-mgmt.md` | Where loading/empty/error branches live per state solution |
| `flutter-motion/install.sh` | Copies skill + command into `~/.claude` |
| `flutter-motion/README.md` | User-facing docs |
| `.claude-plugin/marketplace.json` | Modify: add plugin entry |
| `.claude/skills/verify-install/SKILL.md` | Modify: add to installer loop |
| `CLAUDE.md`, `README.md` | Modify: add to plugin tables |

---

### Task 1: Plugin skeleton that installs and resolves

Ship the smallest thing that makes `/flutter-motion` a real, installable command. `SKILL.md` is a stub here — Task 7 fills it in. Doing skeleton-first means every later task edits a file that already passes the integrity hook.

**Files:**
- Create: `flutter-motion/.claude-plugin/plugin.json`
- Create: `flutter-motion/commands/flutter-motion.md`
- Create: `flutter-motion/skills/flutter-motion/SKILL.md`
- Create: `flutter-motion/install.sh`
- Create: `flutter-motion/README.md`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `.claude/skills/verify-install/SKILL.md:24`
- Modify: `CLAUDE.md`, `README.md` (plugin tables)

**Interfaces:**
- Consumes: nothing.
- Produces: the path `flutter-motion/skills/flutter-motion/SKILL.md`, whose frontmatter `name:` must stay `flutter-motion`. Tasks 3–6 create files under `flutter-motion/skills/flutter-motion/references/`. Task 7 rewrites `SKILL.md`'s body but never its `name:`.

- [ ] **Step 1: Create the plugin manifest**

`flutter-motion/.claude-plugin/plugin.json`:

```json
{
  "name": "flutter-motion",
  "version": "0.1.0",
  "description": "Audit and fix a Flutter app's motion — a consistent duration/curve token system, reduce-motion compliance, animation hygiene, and the transitions that actually earn their place. Applied in approval-gated, verified waves.",
  "author": {
    "name": "thebedcoder",
    "url": "https://github.com/thebedcoder"
  },
  "homepage": "https://github.com/thebedcoder/skills/tree/main/flutter-motion",
  "repository": "https://github.com/thebedcoder/skills",
  "license": "MIT",
  "keywords": [
    "flutter",
    "dart",
    "animation",
    "motion",
    "transitions",
    "ui",
    "ux",
    "polish"
  ]
}
```

- [ ] **Step 2: Create the wrapper command**

`flutter-motion/commands/flutter-motion.md`. Integrity check A accepts this because a same-name `skills/flutter-motion/SKILL.md` exists (Step 3):

```markdown
---
description: Audit a Flutter project's motion and apply polish in gated waves — token system, reduce-motion, hygiene, transitions that earn their place
---
Read SKILL.md from the flutter-motion skill, then follow those instructions.
```

- [ ] **Step 3: Create the stub SKILL.md**

`flutter-motion/skills/flutter-motion/SKILL.md`. Frontmatter is final; the body is replaced in Task 7. **No `user-invocable` field** — integrity check C rejects the write.

```markdown
---
name: flutter-motion
description: >
  Audit a Flutter project's UI motion and apply polish in approval-gated waves —
  a consistent duration/curve token system, reduce-motion compliance, animation
  hygiene, and page/state transitions that earn their place. Use when user says
  "make the app feel more polished", "the app feels cheap", "add animations",
  "improve transitions", "audit our animations", "make it feel expensive", or
  asks for Flutter UI/UX motion review.
---

# flutter-motion

Stub. Body lands in Task 7.
```

- [ ] **Step 4: Create the installer**

`flutter-motion/install.sh`, copied from `update-dependencies/install.sh` with names swapped. **No `user-invocable` patch** — this is a same-name skill/command plugin.

```bash
#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 Installing flutter-motion..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/commands

echo "  → Copying skill..."
rm -rf ~/.claude/skills/flutter-motion
cp -r "$SCRIPT_DIR/skills/flutter-motion" ~/.claude/skills/

echo "  → Copying command..."
cp "$SCRIPT_DIR/commands/flutter-motion.md" ~/.claude/commands/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /flutter-motion   audit + polish Flutter app motion (also fires on \"the app feels cheap\")"
```

Then: `chmod +x flutter-motion/install.sh`

- [ ] **Step 5: Register in the marketplace manifest**

In `.claude-plugin/marketplace.json`, add to the `plugins` array, after the `agentic-engineering` entry (array is alphabetical by name):

```json
    {
      "name": "flutter-motion",
      "source": "./flutter-motion",
      "description": "Audit and fix a Flutter app's motion — a consistent duration/curve token system, reduce-motion compliance, animation hygiene, and the transitions that actually earn their place. Applied in approval-gated, verified waves."
    },
```

Integrity check D validates the JSON parses and that `./flutter-motion` resolves to a real directory.

- [ ] **Step 6: Add to the verify-install loop**

In `.claude/skills/verify-install/SKILL.md`, change line 24 from:

```bash
for p in agentic-engineering jtbd premortem-skill smart-setup squash-merge update-dependencies; do
```

to:

```bash
for p in agentic-engineering flutter-motion jtbd premortem-skill smart-setup squash-merge update-dependencies; do
```

Also add a row to the Assert table after row 3:

```markdown
| 3b | `$SANDBOX/.claude/skills/flutter-motion/SKILL.md` does **not** contain `user-invocable` | same collision rule — patching it shadows `/flutter-motion` |
```

And update the prose on line 12 — "all seven of them write to `~/.claude`" becomes "all eight of them".

- [ ] **Step 7: Write the README**

`flutter-motion/README.md`, matching `squash-merge/README.md`'s structure: title, one-paragraph pitch, `## Command`, `## What it does` (numbered, mirroring SKILL.md's eight steps), `## Safety` (the hard rules, in user-facing language), `## Install` (marketplace block + local-checkout block). Write the pitch as:

> Audit a Flutter app's motion and fix it in gated waves. The premise: apps don't feel cheap because they lack animation — they feel cheap because their animation is inconsistent. Eleven curves and ninety-two hand-typed durations read as amateur no matter how many transitions you add. This finds that, fixes it behind a token system, then adds only the transitions that earn their place.

- [ ] **Step 8: Add to the repo plugin tables**

In `CLAUDE.md`, add a row to the six-plugin table (it becomes seven — update the "Six plugins live here" sentence to "Seven"):

```markdown
| `flutter-motion/` | `/flutter-motion` — audits a Flutter project's motion (token consistency, reduce-motion, animation hygiene, missing transitions) and applies fixes in approval-gated waves, each verified against a captured `flutter analyze` + `flutter test` baseline. Single skill, exposed as `/flutter-motion` via a same-name command wrapper | listed in `.claude-plugin/marketplace.json`; Claude-Code-only (no `adapters/`); simple per-plugin installer (one skill + one command, no `rules-library`) |
```

Add the equivalent row to the plugin table in `README.md`.

- [ ] **Step 9: Verify the installer in a sandbox**

```bash
SANDBOX=$(mktemp -d)
HOME="$SANDBOX" bash flutter-motion/install.sh
ls "$SANDBOX/.claude/skills/flutter-motion/SKILL.md" \
   "$SANDBOX/.claude/commands/flutter-motion.md"
grep -c user-invocable "$SANDBOX/.claude/skills/flutter-motion/SKILL.md" || echo "OK: no user-invocable"
python3 -m json.tool .claude-plugin/marketplace.json >/dev/null && echo "OK: marketplace parses"
rm -rf "$SANDBOX"
```

Expected: both files listed, `OK: no user-invocable`, `OK: marketplace parses`.

- [ ] **Step 10: Commit**

```bash
git add flutter-motion .claude-plugin/marketplace.json .claude/skills/verify-install/SKILL.md CLAUDE.md README.md
git commit -m "feat(flutter-motion): plugin skeleton, installer, and registration"
```

---

### Task 2: Probe harness and Relaty baseline

This repo has no tests, so this is the substitute: **every detection rule's grep is written and run against real Dart before the rule text is written.** Rules authored from memory have false positives on first contact. The harness output is the input to Tasks 4, 5, and 6.

**Files:**
- Create: `/private/tmp/claude-502/-Users-getman-DevWorkspaces-bedcode-skills/7cbfd236-e9ad-4034-a788-da0bfe98c1bf/scratchpad/probe-relaty.sh` (scratchpad, never committed)
- Create: `docs/superpowers/plans/2026-08-05-flutter-motion-baseline.md` (committed — the record later tasks check against)

**Interfaces:**
- Consumes: Task 1's plugin directory (not strictly, but keeps commit order clean).
- Produces: `docs/superpowers/plans/2026-08-05-flutter-motion-baseline.md` with one section per rule id (`nav-1`…`nav-5`, `state-1`…`state-7`, `style-1`…`style-3`, `hyg-1`…`hyg-5`), each recording the exact probe command, the raw hit count, and a hand-checked verdict on the first five hits. Task 6 copies the validated probe commands out of this file verbatim.

- [ ] **Step 1: Write the probe script**

`probe-relaty.sh` in the scratchpad. Note the quoted `--include='*.dart'` — unquoted fails under zsh.

```bash
#!/usr/bin/env bash
# Read-only probe of the validation project. Writes nothing to it.
set -uo pipefail
P="${1:-/Users/getman/DevWorkspaces/FlutterProjects/relaty}"
cd "$P" || exit 1

probe() {  # probe <rule-id> <description> <pattern>
  printf '\n## %s — %s\n' "$1" "$2"
  printf 'pattern: %s\n' "$3"
  local n
  n="$(grep -rEn "$3" lib --include='*.dart' 2>/dev/null | wc -l | tr -d ' ')"
  printf 'hits: %s\n' "$n"
  printf 'first 5:\n'
  grep -rEn "$3" lib --include='*.dart' 2>/dev/null | head -5
}

probe nav-1  "default page route"        'MaterialPageRoute|CupertinoPageRoute'
probe nav-2  "tab/nav body swap"         'BottomNavigationBar|NavigationBar\(|TabBarView'
probe nav-4  "dialog/sheet"              'showDialog|showModalBottomSheet'
probe nav-5  "hero candidates"           'Hero\('
probe state-1 "conditional child swap"   'setState\('
probe state-2 "bare loading spinner"     'CircularProgressIndicator|LinearProgressIndicator'
probe state-5 "visibility toggle"        'Visibility\(|Opacity\('
probe state-6 "static Container"         'Container\('
probe state-7 "cross fade"               'AnimatedCrossFade|AnimatedSize'
probe style-1 "inline durations"         'Duration\(milliseconds:'
probe style-2 "curves"                   'Curves\.[A-Za-z]+'
probe hyg-1  "controllers"               'AnimationController'
probe hyg-1b "dispose bodies"            'void dispose\(\)'
probe hyg-3  "repaint boundary"          'RepaintBoundary'
probe hyg-4  "reduce motion"             'disableAnimations'
probe hyg-5  "animated builder"          'AnimatedBuilder'

printf '\n## curve histogram\n'
grep -rEho 'Curves\.[A-Za-z]+' lib --include='*.dart' | sort | uniq -c | sort -rn

printf '\n## duration histogram\n'
grep -rEho 'Duration\(milliseconds: *[0-9]+' lib --include='*.dart' \
  | grep -oE '[0-9]+$' | sort -n | uniq -c | sort -rn

printf '\n## router seam\n'
grep -rn 'bedcode_navigator' lib --include='*.dart' | head -5

printf '\n## state management\n'
grep -rEc 'BlocBuilder|BlocConsumer|BlocProvider' lib --include='*.dart' 2>/dev/null \
  | grep -v ':0$' | wc -l
```

- [ ] **Step 2: Run it and capture output**

```bash
SP=/private/tmp/claude-502/-Users-getman-DevWorkspaces-bedcode-skills/7cbfd236-e9ad-4034-a788-da0bfe98c1bf/scratchpad
bash "$SP/probe-relaty.sh" > "$SP/relaty-probe.txt" 2>&1
wc -l "$SP/relaty-probe.txt"
```

Expected: non-empty output. Sanity anchors already measured on 2026-08-05 — `style-1` ≈ 92 hits, `hyg-1` ≈ 50, `hyg-4` = 0, `nav-1` = 2, curve histogram shows 11 distinct curves led by `easeInOut` (28). **If these disagree by more than ~10%, the project changed** — re-baseline before continuing rather than assuming the probe is broken.

- [ ] **Step 3: Hand-check the first five hits of each rule**

For each rule id, open the five sample sites in `relaty-probe.txt` and decide: would this rule, *as written*, produce a real finding here? Record `real` / `false positive` / `needs confirm-step`.

This is the whole point of the task. `state-6` (`Container(`) will have a huge raw count and a near-total false-positive rate — most `Container`s never change. `hyg-1` is the other known risk: a controller disposed in a base class or mixin has no `dispose()` near its declaration.

- [ ] **Step 4: Write the baseline record**

`docs/superpowers/plans/2026-08-05-flutter-motion-baseline.md`. One section per rule:

```markdown
## style-1 — inline durations not from tokens

Probe: `grep -rEn 'Duration\(milliseconds:' lib --include='*.dart'`
Raw hits: 92
Verdict: real. Every hit is a literal in widget code. No confirm step needed
beyond excluding the token file itself once it exists.
Confirm step: exclude `lib/theme/motion.dart`.
```

Write one of these for every rule id. A rule whose hand-check came back mostly false-positive gets its `Confirm step` written as the *specific reading* that separates real from noise — that text is copied into `findings.md` in Task 6.

**Two bookkeeping rules, so Task 6 Step 7's id diff passes:**

- `hyg-1b` in the probe script is a *helper* (it locates `dispose()` bodies to cross-reference against `hyg-1`). It is not a rule and gets **no section of its own** — fold its output into the `hyg-1` section.
- `nav-3`, `state-3`, and `state-4` have **no single-line probe** — "is this a flow?", "is the empty case handled?" and "is the error case handled?" are read, not grepped. They still get a section each, with `Probe: none — manual` and the procedure written out, plus a hit count from reading. Every rule id in the catalog must appear here or the diff fails.

- [ ] **Step 5: Commit the baseline**

```bash
git add docs/superpowers/plans/2026-08-05-flutter-motion-baseline.md
git commit -m "docs(flutter-motion): probe baseline from Relaty for detection rules"
```

---

### Task 3: references/motion-system.md

**Files:**
- Create: `flutter-motion/skills/flutter-motion/references/motion-system.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the token class name `Motion` and its member names (`quick`, `standard`, `emphasized`, `enter`, `exit`, `of`). `findings.md` (Task 6) and `SKILL.md` (Task 7) reference these exact names. Change them here and both must change.

- [ ] **Step 1: Verify the reduce-motion API against current Flutter docs**

The spec's sketch uses `MediaQuery.disableAnimationsOf(context)`. Confirm it, and confirm whether `MediaQuery.of(context).disableAnimations` is deprecated:

```bash
npx ctx7@latest docs /websites/api_flutter_dev "MediaQuery disableAnimationsOf accessibility reduce motion disableAnimations property"
```

Use whatever the docs return. Do **not** ship the sketch unverified.

- [ ] **Step 2: Verify package:animations constructor signatures**

```bash
npx ctx7@latest docs /flutter/packages "animations OpenContainer closedBuilder openBuilder transitionDuration PageTransitionSwitcher SharedAxisTransition FadeThroughTransition FadeScaleTransition constructor example"
```

Record the real parameter names. `findings.md` (Task 6) shows fix snippets that must compile.

- [ ] **Step 3: Write the reference**

Sections, in order:

1. **The token file.** The `Motion` class, with the reduce-motion helper written using the API confirmed in Step 1. State that `quick`/`standard`/`emphasized` values are the *proposal* and the user approves the actual numbers in Wave 0.
2. **Adopting an existing file.** How to detect a project that already has `lib/theme/`, `lib/constants/`, or a `*_durations.dart`. Rule: extend it, never create a second source of truth.
3. **The four Material motion patterns** — container transform, shared axis (x/y/z), fade through, fade scale — each with when it applies, and the `package:animations` widget with the signature confirmed in Step 2.
4. **Built-in vs package.** A decision table: which of the seven `Animated*` implicit widgets covers a case without adding a dependency, and which cases genuinely need `package:animations`.
5. **The band.** Why 100–500ms; why sub-100ms reads as a glitch and 800ms+ reads as lag. Note that `elasticOut`/`bounceOut`/`easeInBack` are cheap tells and are flagged, never proposed.

- [ ] **Step 4: Verify the hook accepted the write**

The integrity hook runs on Write. It exits 2 with an explanation on failure. If the write succeeded with no hook error, this file class is clean (`references/` files are not one of the checked classes, so this is a formality).

```bash
test -s flutter-motion/skills/flutter-motion/references/motion-system.md && echo OK
```

- [ ] **Step 5: Commit**

```bash
git add flutter-motion/skills/flutter-motion/references/motion-system.md
git commit -m "feat(flutter-motion): motion token system and Material motion reference"
```

---

### Task 4: references/routing.md

**Files:**
- Create: `flutter-motion/skills/flutter-motion/references/routing.md`

**Interfaces:**
- Consumes: `motion-system.md`'s `Motion` token names (fix snippets use `Motion.standard`).
- Produces: the five router identities — `navigator-1`, `go-router`, `auto-route`, `navigator-2-raw`, `unknown` — referenced by `SKILL.md` Step 2 (Task 7) and by `findings.md` nav rules (Task 6).

- [ ] **Step 1: Read the in-house router seam in Relaty**

The unknown-router fallback is the section most likely to be hand-waved, so write it from a real example:

```bash
grep -rn 'bedcode_navigator' /Users/getman/DevWorkspaces/FlutterProjects/relaty/lib --include='*.dart' | head -20
find ~/.pub-cache/hosted -maxdepth 2 -name 'bedcode_navigator*' -type d 2>/dev/null
```

Read the package's route-construction surface. Note where a transition would be injected. That concrete observation becomes the worked example in Step 2's section 5.

- [ ] **Step 2: Write the reference**

One section per router. Each states: **how to detect it**, **where a transition is defined**, **the fix shape**.

1. **Navigator 1.0** — detect: `Navigator.push`/`pushNamed` with `MaterialPageRoute`. Fix site: replace the route, or wrap the source widget in `OpenContainer`.
2. **go_router** — detect: `go_router` in `pubspec.yaml`. **A go_router project has no `MaterialPageRoute` to find.** Transitions live in `GoRoute.pageBuilder` returning `CustomTransitionPage(transitionsBuilder: ...)`. A route using the default `builder:` instead of `pageBuilder:` is the finding. Include the `CustomTransitionPage` snippet.
3. **auto_route** — detect: `auto_route` in `pubspec.yaml`. Transitions are declared on the route definition (`CustomRoute(transitionsBuilder: ...)`), in the generated router file's source, not at call sites.
4. **Raw Navigator 2.0** — detect: a `RouterDelegate` subclass. Transitions live in the `Page` subclass's `createRoute`.
5. **Unknown / in-house** — the fallback, written from Step 1. Procedure: locate the package, read its route-construction call, find whether it exposes a transition parameter. **If it does not expose one, that is the finding** — report "router does not support custom transitions; fixing this needs a change to `<package>`" and do not attempt a workaround at call sites. Do not guess at an API.

- [ ] **Step 3: Check the fallback against reality**

Re-read the section 5 text against what Step 1 actually found in `bedcode_navigator`. If the written procedure would not have produced the right answer on that package, rewrite it until it would.

- [ ] **Step 4: Commit**

```bash
git add flutter-motion/skills/flutter-motion/references/routing.md
git commit -m "feat(flutter-motion): per-router transition fix sites with unknown-router fallback"
```

---

### Task 5: references/state-mgmt.md

**Files:**
- Create: `flutter-motion/skills/flutter-motion/references/state-mgmt.md`

**Interfaces:**
- Consumes: `motion-system.md`'s `Motion` token names.
- Produces: the four state-solution identities — `setstate`, `provider`, `riverpod`, `bloc` — referenced by `SKILL.md` Step 2 (Task 7) and by `findings.md` rules `state-1` through `state-4` (Task 6).

- [ ] **Step 1: Read a real BLoC surface in Relaty**

`state-3` and `state-4` ("no empty branch", "no error branch") are the loosest rules in the catalog — confirming them means understanding a state machine, not pattern-matching. Ground them in real code:

```bash
cd /Users/getman/DevWorkspaces/FlutterProjects/relaty
grep -rln 'BlocBuilder' lib --include='*.dart' | head -5
```

Open three of those files. Answer concretely: **what does an exhaustive state switch look like here, and what does a non-exhaustive one look like?** If the state classes are sealed, a missing branch is a compile error and `state-3`/`state-4` are dead rules for this project — which is itself worth writing down.

- [ ] **Step 2: Write the reference**

One section per solution. Each states: **how to detect it**, **where the loading/empty/error branch lives**, **what "missing branch" looks like**, **where an animation wraps**.

1. **setState** — branch lives in an `if`/ternary in `build`. Missing branch: no `else` arm, or `snapshot.hasError` never read. Animation wraps the conditional in `AnimatedSwitcher`.
2. **Provider** — `Consumer`/`context.watch`. Same shape as setState, one level in.
3. **Riverpod** — `AsyncValue`. `.when(data:, loading:, error:)` is exhaustive by construction; the finding is `.when` used with a bare spinner, or `maybeWhen` with an `orElse` that swallows error. **Not** "missing branch".
4. **BLoC** — `BlocBuilder`. Written from Step 1. State the sealed-class caveat: **if states are sealed and the switch is exhaustive, `state-3`/`state-4` cannot fire — say so rather than reporting a false finding.**

Close with a rule that applies to all four: **an empty or error state that appears with no transition is worse than none at all** — it flashes. Any newly added branch gets the same `AnimatedSwitcher` treatment as the loading branch.

- [ ] **Step 3: Verify the BLoC section against the files from Step 1**

Walk the written procedure against one real `BlocBuilder` file. It must reach the correct verdict. If it reports a finding that isn't real, tighten the confirm step before committing.

- [ ] **Step 4: Commit**

```bash
git add flutter-motion/skills/flutter-motion/references/state-mgmt.md
git commit -m "feat(flutter-motion): state-management reference for loading/empty/error branches"
```

---

### Task 6: references/findings.md

The heart of the plugin. Every rule pairs a probe validated in Task 2 with a confirm-by-reading step that kills its false positives.

**Files:**
- Create: `flutter-motion/skills/flutter-motion/references/findings.md`
- Read: `docs/superpowers/plans/2026-08-05-flutter-motion-baseline.md`

**Interfaces:**
- Consumes: rule ids and validated probe commands from the Task 2 baseline; `Motion` token names from `motion-system.md`; router identities from `routing.md`; state identities from `state-mgmt.md`.
- Produces: rule ids `nav-1`…`nav-5`, `state-1`…`state-7`, `style-1`…`style-3`, `hyg-1`…`hyg-5`, and the three severity levels `high`/`medium`/`low`. `SKILL.md` (Task 7) cites these ids in its report format and wave assignment.

- [ ] **Step 1: Write the detection-discipline preamble**

Open the file with the rule that makes the rest trustworthy:

```markdown
## How to use this catalog

Grep finds candidates. Reading confirms them.

Every rule below has a `Probe` and a `Confirm`. The probe is a starting set,
not a finding list. Running the probe and reporting its hits produces an audit
with a false-positive rate high enough that the user stops reading — at which
point the whole skill is worthless.

**Never report a finding whose code you have not opened.**

Counts from a real 654-file project (Relaty, 2026-08-05) are given per rule as
`Raw hits`. Where raw hits are large and real findings are few — `state-6` is
the worst — the gap is the confirm step doing its job.
```

- [ ] **Step 2: Write the navigation rules**

Five rules, each in this shape (worked example for `nav-1`):

````markdown
### nav-1 — default page transition on a container tap

Severity: high — primary list→detail is on every session's hot path.
Raw hits (Relaty): 2

Probe:
```bash
grep -rEn 'MaterialPageRoute|CupertinoPageRoute' lib --include='*.dart'
```

Router-dependent: on go_router, probe `GoRoute` entries using `builder:`
rather than `pageBuilder:` instead — see `routing.md`. On an unknown router,
read the router seam first; a router with no transition parameter makes this
rule inapplicable, not a finding.

Confirm by reading:
1. Open the widget containing the push. Is the tap source a card, tile, or
   image — something with visible bounds? A push from an AppBar action or a
   text button is NOT a container transform candidate. Skip it.
2. Is the destination a full screen, not a dialog?
3. Both yes → finding.

Fix: `OpenContainer` from `package:animations` — `closedBuilder` is the tap
source, `openBuilder` is the destination, `transitionDuration: Motion.emphasized`.

Why it matters: the container transform is the single strongest "expensive"
signal available. The tapped card visibly becomes the page, so the user never
loses the object they were looking at.
````

Write `nav-2` through `nav-5` in the same shape. `nav-5` (Hero) needs a strict confirm: **the same image source must appear on both sides** — a `Hero` between different images is worse than none.

- [ ] **Step 3: Write the state rules**

Seven rules, same shape, citing `state-mgmt.md` for where the branch lives.

`state-6` gets the harshest confirm step, because its probe (`Container(`) matches nearly every file:

```markdown
Confirm by reading:
1. Do any of this Container's visual properties (color, decoration, padding,
   width, height, alignment) read from a field that changes?
2. Does that field change outside of initState — i.e. via setState, a bloc
   state, or a notifier?
3. Both yes → finding. Otherwise skip. Most Containers are static; the raw
   hit count for this probe is meaningless on its own.
```

`state-3` and `state-4` carry the sealed-class caveat from `state-mgmt.md`: if the state union is sealed and the switch is exhaustive, the rule cannot fire.

- [ ] **Step 4: Write the style rules**

Three rules. `style-1` and `style-2` are the highest-yield rules in the catalog on a mature app — Relaty shows 92 and 11 respectively. `style-3` includes the band table:

```markdown
| Duration | Reads as |
|---|---|
| < 100ms | glitch — the eye doesn't register motion, only a jump |
| 100–500ms | correct |
| 500–800ms | slow; acceptable only for a full-screen emphasized transition |
| > 800ms on a common path | **high severity.** The biggest cheap-app tell there is. A user hitting this ten times a session waits eight seconds on animation. |
```

- [ ] **Step 5: Write the hygiene rules**

Five rules. `hyg-1` gets the most careful confirm step — it is the rule most likely to embarrass the skill, per the Task 2 hand-check:

```markdown
### hyg-1 — AnimationController never disposed

Severity: high — a leaked controller keeps a ticker alive and burns frames on
a dead screen.
Raw hits (Relaty): ~50 controllers

Probe:
```bash
grep -rEn 'AnimationController' lib --include='*.dart'
```

Confirm by reading — **all four, in order.** A controller can be disposed
somewhere the grep cannot see:
1. Does this State class have a `dispose()` that calls `.dispose()` on this
   controller? → not a finding.
2. Does it extend a base State class? Open the base. Does the base dispose it,
   or expose a registration hook this controller uses? → not a finding.
3. Does the class use a mixin that manages controller lifecycle? Open the
   mixin. → not a finding.
4. Is the controller owned by a package widget rather than this State
   (e.g. passed in as a parameter)? Ownership means the creator disposes.
   → not a finding.

Only after all four come back negative is it a finding.
```

Write `hyg-2` through `hyg-5`. `hyg-4` (reduce-motion) is app-wide, not per-site: report it once with a count, not fifty times.

- [ ] **Step 6: Write the anti-findings section**

```markdown
## Never proposed

Restraint is the product. Adding motion from this list makes the app feel
cheaper, not more expensive.

| Never propose | Why |
|---|---|
| `bounceOut`, `elasticOut`, `easeInBack` and friends | Reads as a toy. **Flag these as findings when found** — Relaty has 7 such sites. Never write one. |
| Animation on a realtime / high-frequency surface | Motion on data that updates every frame reads as lag, not polish. |
| Per-frame animation inside a `ListView.builder` item body | Multiplies cost by the number of visible rows. This is where added motion actually drops frames. |
| More than 3 animated properties on one element | Becomes noise; the eye can't track it. |
| Splash-screen animation | Delays first paint to show off. The opposite of expensive. |
| Staggered entrance on a list the user scrolls back to | Charming once, irritating the fourth time. Low severity at best, and only for a list seen once per session. |
```

- [ ] **Step 7: Cross-check every rule id against the baseline**

```bash
grep -oE '^### (nav|state|style|hyg)-[0-9a-z]+' \
  flutter-motion/skills/flutter-motion/references/findings.md | sort > /tmp/fm-rules.txt
grep -oE '^## (nav|state|style|hyg)-[0-9a-z]+' \
  docs/superpowers/plans/2026-08-05-flutter-motion-baseline.md | sort > /tmp/fm-base.txt
diff <(sed 's/^### //' /tmp/fm-rules.txt) <(sed 's/^## //' /tmp/fm-base.txt) && echo "OK: rule ids match baseline"
```

Expected: `OK: rule ids match baseline`. A rule in the catalog with no baseline entry was written from memory — go measure it.

- [ ] **Step 8: Commit**

```bash
git add flutter-motion/skills/flutter-motion/references/findings.md
git commit -m "feat(flutter-motion): finding catalog with probe and confirm steps per rule"
```

---

### Task 7: SKILL.md body

**Files:**
- Modify: `flutter-motion/skills/flutter-motion/SKILL.md` (replace the Task 1 stub body; keep frontmatter)

**Interfaces:**
- Consumes: all four reference files, cited by relative path (`references/findings.md`, etc.) exactly as `update-dependencies/skills/update-dependencies/SKILL.md:23` does it.
- Produces: the user-facing contract — the `.claude/motion.md` format and the final report format.

- [ ] **Step 1: Write preconditions**

Three, in order. Mirror the terse register of `update-dependencies/skills/update-dependencies/SKILL.md:16-19`:

```markdown
## Preconditions — check before anything

1. Flutter project. `pubspec.yaml` exists with `flutter:` under `dependencies`. No → stop.
2. Working tree clean (`git status --porcelain` empty). Dirty → stop. Wave revert depends on clean baseline.
3. **Capture baseline.** Run `flutter analyze` and `flutter test`, record both results BEFORE touching
   anything. Pre-existing failures get recorded, not fixed and not blamed on this skill. The gate is
   "no worse than baseline", never "clean" — most real projects are not clean.
```

- [ ] **Step 2: Write Steps 1–3 (read contract, detect stack, scan)**

Step 1 reads `.claude/motion.md` and shows the format:

```markdown
# .claude/motion.md

## Tokens
Source: lib/theme/motion.dart

## Declined
lib/screens/settings.dart:88
  no AnimatedSwitcher on theme toggle
  — intentional, instant feedback wanted

## Do not animate
lib/widgets/chart/**  — perf-critical
```

Step 2 is four detections, each pointing at its reference: router → `references/routing.md`; state management → `references/state-mgmt.md`; existing animation deps (`animations`, `flutter_animate`, `lottie`, `rive`) → adopt the house style, never stack a second library; design system (M3 / Cupertino / custom) → `references/motion-system.md`.

Step 3 is the report, emitted **before any edit**:

```markdown
## Motion system
Tokens: absent | <path> | scattered literals (N distinct durations, M distinct curves)

## Findings
| # | Sev | Kind | Site | What's missing | Fix |

## Hygiene
(correctness and performance — bugs, not taste)

## Inconsistencies
(N durations across the app; which files disagree)
```

Include the severity definitions: **high** = every user, every session (root transitions, primary list→detail, main loading state, any duration over 800ms on a common path); **medium** = real path, not hot path; **low** = staggered entrance, micro press feedback.

- [ ] **Step 3: Write the four waves (Steps 4–7)**

- **Wave 0 — tokens.** Create or adopt the token file per `references/motion-system.md`. Values are taste → **ASK, wait** for approval of the actual numbers. Verify, commit alone.
- **Wave 1 — hygiene.** `hyg-1`…`hyg-5`. Bugs, not taste → one batched commit. Shown before applying, not gated per item.
- **Wave 2 — high severity, one screen at a time, gated.** Per item: show diff → apply → verify → **stop, user looks** → commit or revert.
- **Wave 3 — medium and low as a menu.** User picks. Unpicked → recorded as declined.

- [ ] **Step 4: Write the verification block**

Applies after every wave. This is the section that must not be softened:

```markdown
## Verify — after every wave, no exceptions

1. `flutter analyze` — no worse than baseline.
2. `flutter test` — no worse than baseline. Motion breaks widget tests routinely:
   `pumpAndSettle` times out against an infinite animation; finders that ran
   mid-frame stop matching. **Fix the tests your motion broke. Never delete one,
   never add `skip`.**
3. **Human checkpoint.** State exactly what to open and what to watch. Not
   "check the animations" — "Open Home, tap the second card, watch whether the
   card grows into the detail page or the page slides in from the right."
   User approves, or the wave reverts: `git reset --hard HEAD`.
4. Commit. `feat(ui):` for motion, `fix(ui):` or `perf(ui):` for hygiene.
   One wave per commit. Wave 2 is one screen per commit.

**Jank check.** `flutter run --profile` plus a DevTools timeline trace is the only
real one, and it is heavy. Required ONLY for findings touching a scrolling list —
the one place added motion actually drops frames. Elsewhere, list it under
suggested manual checks in the final report.
```

- [ ] **Step 5: Write Step 8 (contract update and final report)**

```markdown
## Applied
<finding>  (commit <sha>)

## Declined
<finding>  why

## Blocked
<finding>  what blocks it, what would unblock it

## Suggested manual checks
<what to profile, what to watch>
```

Add: empty section keeps its heading and reads `none`. Silent omission reads as "handled".

- [ ] **Step 6: Write the hard rules**

```markdown
## Hard rules

- Never propose an animation on a code path you have not read.
- Never add a package silently. `package:animations` absent → ask. Prefer built-in
  widgets if the project already uses `flutter_animate` or `rive`.
- Never write a bounce, elastic, or back curve. Flag existing ones as findings.
- Every duration you write comes from the token file. Zero inline literals.
- Every animation you write respects reduce-motion.
- Never touch a path under `Do not animate` in `.claude/motion.md`.
- Never re-propose a finding under `Declined`.
- Never carry a failed wave forward. Revert it, report why, move on.
- One wave per verification. No batching because "they're all small".
- Never delete or skip a test that new motion broke. Fix it.
```

- [ ] **Step 7: Verify the frontmatter survived and references resolve**

```bash
head -20 flutter-motion/skills/flutter-motion/SKILL.md | grep -q 'name: flutter-motion' && echo "OK: name intact"
grep -c 'user-invocable' flutter-motion/skills/flutter-motion/SKILL.md || echo "OK: no user-invocable"
for f in findings motion-system routing state-mgmt; do
  test -f "flutter-motion/skills/flutter-motion/references/$f.md" \
    && grep -q "references/$f.md" flutter-motion/skills/flutter-motion/SKILL.md \
    && echo "OK: $f cited and present" || echo "FAIL: $f"
done
```

Expected: `OK: name intact`, `OK: no user-invocable`, and four `OK: ... cited and present`.

- [ ] **Step 8: Commit**

```bash
git add flutter-motion/skills/flutter-motion/SKILL.md
git commit -m "feat(flutter-motion): skill body — waves, gates, verification, hard rules"
```

---

### Task 8: Relaty dry run and false-positive pass

The real test. Everything before this is the skill asserting it works; this measures whether it does.

**Files:**
- Modify: `flutter-motion/skills/flutter-motion/references/findings.md` (tighten confirm steps)
- Modify: `flutter-motion/skills/flutter-motion/SKILL.md` (only if the flow itself proved wrong)
- Create: `docs/superpowers/plans/2026-08-05-flutter-motion-dryrun.md`

**Interfaces:**
- Consumes: the complete plugin from Tasks 1–7.
- Produces: a measured false-positive rate per rule, and the tightened confirm steps that fix it.

- [ ] **Step 1: Install into a sandbox and confirm the command resolves**

```bash
SANDBOX=$(mktemp -d)
HOME="$SANDBOX" bash flutter-motion/install.sh
test -f "$SANDBOX/.claude/skills/flutter-motion/SKILL.md" && echo "OK: skill installed"
test -f "$SANDBOX/.claude/commands/flutter-motion.md" && echo "OK: command installed"
```

- [ ] **Step 2: Run the audit against Relaty in report-only mode**

Read `SKILL.md` and execute Preconditions through Step 3 **only** — stop before Wave 0. Relaty is read-only for this plan; no wave is applied. Baseline capture:

```bash
cd /Users/getman/DevWorkspaces/FlutterProjects/relaty
git status --porcelain | head   # must be empty, else stop
flutter analyze 2>&1 | tail -20
flutter test 2>&1 | tail -20
```

If `flutter analyze` or `flutter test` fails to run at all (missing SDK, missing codegen), record that and continue with the scan — the scan itself needs neither.

- [ ] **Step 3: Produce the full findings report**

Run every rule's probe, then its confirm step. Emit the Step 3 report format. Expected shape from the 2026-08-05 baseline:

- `style-1` — ~92 sites
- `style-2` — app-wide, 11 distinct curves
- anti-finding flag — 7 sites (`elasticOut`×4, `easeInBack`×2, `bounceOut`×1)
- `hyg-4` — app-wide, single finding, zero reduce-motion respect
- `hyg-1` — checked against ~50 controllers
- `nav-1`…`nav-5` — at most ~2, gated on reading the `bedcode_navigator` seam first

- [ ] **Step 4: Measure the false-positive rate**

For each reported finding, open the cited file at the cited line. Record `real` or `false positive`. Do not sample — check every finding for rules reporting under 20, and 20 randomly chosen for rules reporting more.

**Success criterion: every reported finding, when opened, is real.** Not "mostly real". A rule that cannot reach that gets a tighter confirm step — never a lowered bar, never quiet removal.

- [ ] **Step 5: Fix the rules that missed**

Edit the `Confirm by reading` block of each rule that produced a false positive. Fix the confirm step, not the probe — a probe that over-matches is fine, that is what confirm is for.

If a rule cannot be made precise by reading (the likely candidate is `state-6`, `Container`), state that in the rule: mark it `Severity: low` and add a line saying it is reported only when the state link is unambiguous.

- [ ] **Step 6: Re-run the failed rules only**

Re-execute the probe and confirm for every rule edited in Step 5. Expected: zero false positives on the sites that previously produced them.

- [ ] **Step 7: Record the dry run**

`docs/superpowers/plans/2026-08-05-flutter-motion-dryrun.md`: findings reported per rule, false positives found, what was tightened, final rate. Include the sites that were false positives — the next person changing a rule needs to know what it used to get wrong.

- [ ] **Step 8: Confirm Relaty is untouched**

```bash
cd /Users/getman/DevWorkspaces/FlutterProjects/relaty && git status --porcelain
```

Expected: empty. The dry run is read-only. **Any output here is a bug in the run, not a change to keep.**

- [ ] **Step 9: Run the full install verification**

```bash
SANDBOX=$(mktemp -d)
REPO="$(git rev-parse --show-toplevel)"
for p in agentic-engineering flutter-motion jtbd premortem-skill smart-setup squash-merge update-dependencies; do
  echo "--- $p"
  HOME="$SANDBOX" bash "$REPO/$p/install.sh" >/dev/null || echo "  !! installer FAILED: $p"
done
grep -L user-invocable "$SANDBOX"/.claude/skills/{flutter-motion,smart-setup,jtbd}/SKILL.md
grep -l user-invocable "$SANDBOX"/.claude/skills/agentic-engineering/SKILL.md
rm -rf "$SANDBOX"
```

Expected: no installer failures; the three same-name skills listed by `grep -L` (they lack the field); agentic-engineering listed by `grep -l` (it has it).

- [ ] **Step 10: Commit**

```bash
git add flutter-motion docs/superpowers/plans/2026-08-05-flutter-motion-dryrun.md
git commit -m "fix(flutter-motion): tighten detection confirm steps from Relaty dry run"
```

---

## Self-review notes

**Spec coverage.** Every spec section maps to a task: deliverable/registration → Task 1; preconditions and the eight-step flow → Task 7; stack detection → Tasks 4, 5, 7; the finding catalog → Task 6; motion tokens → Task 3; anti-findings → Task 6 Step 6; verification and hard rules → Task 7 Steps 4, 6; validation → Tasks 2 and 8.

**Known weak points, carried forward from the spec review.** `hyg-1` (controller disposal) has a four-branch confirm step because disposal in a base class or mixin is invisible to grep — Task 8 Step 4 measures whether that is enough. `state-3`/`state-4` (missing empty/error branch) may prove dead on sealed-state projects; Task 5 Step 1 checks that against real BLoC code before the rules are written, and Task 6 Step 3 carries the caveat.

**Repo drift found while planning, not fixed here.** `CLAUDE.md`'s "Add a new plugin" checklist requires an `adapters/AGENTS.md.template` and a top-level `install.sh` help entry. Neither `squash-merge` nor `update-dependencies` has either, and commit `778b075` (the most recent plugin addition) touched neither file. This plan follows the actual precedent. The checklist should be corrected separately.
