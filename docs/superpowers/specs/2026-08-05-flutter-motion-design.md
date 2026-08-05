# flutter-motion — design

Date: 2026-08-05
Status: approved, ready for implementation plan

## Problem

Flutter apps that work correctly still read as cheap. The usual instinct — "add animations" — makes it
worse. Sprinkled motion with three different durations, a bounce curve on one card and a linear fade on
the next, reads as amateur.

What reads as expensive is a small consistent motion system applied to the moments that earn it, plus
removal of the motion that fights it. This skill audits a Flutter project for that, then applies fixes in
approval-gated waves.

### Evidence the framing is right

Probe of `/Users/getman/DevWorkspaces/FlutterProjects/relaty` (654 Dart files), 2026-08-05:

| Signal | Count | Meaning |
|---|---|---|
| `AnimationController` | 50 | app is already heavily animated |
| Distinct `Curves.*` | 11, incl. `elasticOut`×4, `bounceOut`×1, `easeInBack`×2 | inconsistent, with cheap-tell curves |
| Inline `Duration(milliseconds:)` | 92 | no token system |
| `disableAnimations` respect | 0 | no reduce-motion compliance anywhere |
| `MaterialPageRoute` | 2 | navigation is via in-house `bedcode_navigator` |

A skill that only proposed *new* animations would report near-nothing on this project. A skill that audits
consistency, hygiene, and reduce-motion has ~200 real findings. The design targets the second.

## Non-goals

- General UI/UX critique (spacing rhythm, typography scale, contrast, elevation hierarchy). Not checkable
  from source; produces low-confidence advice.
- Running or screenshotting the app. The skill reads Dart source. It detects structural absence with high
  confidence; it cannot judge whether a transition *feels* wrong. The human checkpoint covers that.
- Golden tests for motion. Brittle, expensive, low signal.

## Deliverable

Standalone plugin `flutter-motion/`, following the `update-dependencies` shape.

```
flutter-motion/
  .claude-plugin/plugin.json
  README.md
  install.sh
  commands/flutter-motion.md              # thin wrapper, ~4 lines
  skills/flutter-motion/SKILL.md          # flow, gates, hard rules
  skills/flutter-motion/references/
      findings.md        # catalog: detection rule -> confirm -> fix -> why it matters
      motion-system.md   # token template, Material motion pattern mapping
      routing.md         # per-router fix sites, incl. unknown-router fallback
      state-mgmt.md      # where loading/empty/error branches live per state solution
```

Name `flutter-motion` over `flutter-polish`: "polish" collides conceptually with lint/format and is vaguer.
Discoverability comes from the `description` frontmatter, which covers "polish", "feels cheap",
"add animations", "transitions", "make the app feel expensive".

Registration required by repo convention:
- entry in top-level `.claude-plugin/marketplace.json`
- `--skill=` help text in top-level `install.sh`
- `adapters/AGENTS.md.template` is **not** required — like `squash-merge` and `update-dependencies`,
  this plugin is Claude-Code-only

## Flow

### Preconditions

1. It is a Flutter project — `pubspec.yaml` exists with `flutter:` under `dependencies`. Otherwise stop.
2. Working tree clean (`git status --porcelain` empty). Wave revert depends on a clean baseline.
3. **Capture baseline** — run `flutter analyze` and `flutter test`, record results *before* touching
   anything. Pre-existing failures are recorded so the skill is not blamed for them, and so "no worse than
   baseline" is a checkable gate rather than "clean", which many real projects never are.

### Step 1 — Read the motion contract

`.claude/motion.md` present -> read first. It holds:

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

Declined findings are not re-proposed. `Do not animate` paths are not touched. Absent -> the file is
created at the end of the run.

### Step 2 — Detect the stack

Four detections, each of which changes *how* a fix is written:

- **Router** — Navigator 1.0 (`Navigator.push`), go_router (`pageBuilder` + `CustomTransitionPage`),
  auto_route, raw Navigator 2.0, or **unknown/in-house**. go_router projects have no `MaterialPageRoute`
  to grep; their transitions live in `pageBuilder`. An in-house router (Relaty's `bedcode_navigator`)
  requires reading the router package's own transition seam before proposing anything. Unknown router ->
  read it, do not assume.
- **State management** — setState / Provider / Riverpod / BLoC. Determines where the loading/empty/error
  branch lives. A BLoC `state is Loading` switch is a different fix site than an `if (_loading)`.
- **Existing animation dependencies** — `animations`, `flutter_animate`, `lottie`, `rive`. Adopt what is
  already the house style. Do not add `animations` on top of a project already standardized on
  `flutter_animate`.
- **Design system** — Material 3 (`useMaterial3`) vs Cupertino vs custom. M3 ships motion defaults worth
  inheriting rather than reinventing.

### Step 3 — Scan, report before any edit

```
## Motion system
Tokens: absent | <path> | scattered literals (N distinct durations, M distinct curves)

## Findings
| # | Sev | Kind | Site | What's missing | Fix |

## Hygiene
(correctness and performance — bugs, not taste)

## Inconsistencies
(N durations across the app; which files disagree)
```

Severity ranks by cost to the "expensive" feeling:

- **high** — every user hits it every session: root page transitions, primary list->detail, main loading
  state, any duration over 800ms on a common path
- **medium** — on a real path but not the hot path
- **low** — staggered list entrance, micro press feedback

### Step 4 — Wave 0: motion tokens

Create or adopt `lib/theme/motion.dart`. Values are taste, so the user approves the actual numbers.

```dart
class Motion {
  static const quick      = Duration(milliseconds: 150);
  static const standard   = Duration(milliseconds: 300);
  static const emphasized = Duration(milliseconds: 500);

  static const enter = Curves.easeOutCubic;
  static const exit  = Curves.easeInCubic;

  static Duration of(BuildContext c, Duration d) =>
    MediaQuery.disableAnimationsOf(c) ? Duration.zero : d;
}
```

The exact API for reduce-motion (`MediaQuery.disableAnimationsOf` vs `MediaQuery.of(c).disableAnimations`)
is verified against current Flutter docs at implementation time, not assumed from this sketch.

If the project already has a motion or theme constants file, adopt it instead of creating a second one.

Verify, commit alone.

### Step 5 — Wave 1: hygiene

Undisposed `AnimationController`s, missing reduce-motion respect, missing `RepaintBoundary`. These are bugs,
not taste — batched into one commit, shown to the user before applying but not gated per item.

### Step 6 — Wave 2: high severity, one screen at a time, gated

Per item: show the diff -> apply -> `flutter analyze` + `flutter test` -> **stop, user looks** -> commit or
revert.

### Step 7 — Wave 3: medium and low as a menu

Presented as a list. The user picks which to apply. Unpicked items are recorded as declined.

### Step 8 — Write the contract, final report

Update `.claude/motion.md` with declines and any `Do not animate` paths learned during the run.

```
## Applied
<finding>  (commit <sha>)

## Declined
<finding>  why

## Blocked
<finding>  what blocks it, what would unblock it

## Suggested manual checks
<what to profile, what to watch>
```

Empty section keeps its heading and reads `none`. Silent omission reads as "handled".

## Detection discipline

**Grep finds candidates. Reading the surrounding widget confirms them.** `Navigator.push(MaterialPageRoute(...))`
is a finding only if the destination is a full screen with a visual anchor in the source. A `Container` whose
properties change is a finding only if they change in response to state, not on every build.

Hard rule: never report a finding whose code has not been read. An audit with a 40% false-positive rate gets
ignored after one run, and the whole skill is then worthless.

## Finding catalog

### Navigation

| # | Candidate pattern | Confirm by reading | Fix |
|---|---|---|---|
| nav-1 | `MaterialPageRoute` / `CupertinoPageRoute`, default transition | source is a card/tile/image tap | `OpenContainer` (container transform) |
| nav-2 | tab or bottom-nav body swap | no transition widget wrapping the body | `PageTransitionSwitcher` + `FadeThroughTransition` |
| nav-3 | forward/back within a flow | wizard, stepper, sibling detail | `SharedAxisTransition` — x lateral, z drill-in |
| nav-4 | `showDialog` / `showModalBottomSheet` | default scale-in | `FadeScaleTransition` |
| nav-5 | list item -> detail | same image source on both sides, no `Hero` | `Hero` with matching tag |

nav-1 is the single highest-value change in most apps.

`OpenContainer`, `PageTransitionSwitcher`, `SharedAxisTransition`, `FadeThroughTransition`, and
`FadeScaleTransition` come from `package:animations` (source: `flutter/packages`, verified via ctx7
2026-08-05). Exact constructor signatures are re-verified at implementation time.

### State

| # | Candidate | Fix |
|---|---|---|
| state-1 | `setState` swapping child by conditional | `AnimatedSwitcher` |
| state-2 | `if (loading) CircularProgressIndicator() else Content()` | cross-fade; skeleton **only** if the layout is known-shape |
| state-3 | async surface, empty case never branched | add empty state |
| state-4 | async surface, error case never branched | add error state |
| state-5 | `Visibility` / `Opacity` toggled by state | `AnimatedOpacity` / `AnimatedSize` |
| state-6 | `Container` whose properties change with state | `AnimatedContainer` |
| state-7 | expand/collapse via conditional child | `AnimatedSize` / `AnimatedCrossFade` |

### Style

| # | Rule |
|---|---|
| style-1 | inline `Duration(...)` in widget code not sourced from the token file |
| style-2 | more than 2 distinct curves app-wide |
| style-3 | duration outside the 100–500ms band. Below 100ms is invisible; above 500ms drags. **Over 800ms on a common path is high severity** — slow transitions are a bigger cheap-app tell than missing ones |

### Hygiene

| # | Rule |
|---|---|
| hyg-1 | `AnimationController` in a `State` with no `dispose()` |
| hyg-2 | ticker mixin present without a controller, or controller without the mixin |
| hyg-3 | animated subtree with expensive siblings, no `RepaintBoundary` |
| hyg-4 | nothing in the app respects reduce-motion |
| hyg-5 | `AnimatedBuilder` rebuilding a subtree that should be passed as `child` |

### Anti-findings — never proposed

Restraint is the product.

- Bounce, elastic, and back curves (`bounceOut`, `elasticOut`, `easeInBack`). These are **flagged as
  findings when found**, never proposed.
- Animation on realtime or high-frequency-updating surfaces — motion there reads as lag.
- Per-frame animation inside `ListView.builder` item bodies.
- More than three animated properties on a single element.
- Splash-screen animation.

## Verification

After every wave:

1. `flutter analyze` — **no worse than baseline**, not "clean".
2. `flutter test` — no worse than baseline. Motion breaks widget tests routinely: `pumpAndSettle` timing
   out against an infinite animation, finders that ran mid-frame now missing their target. The skill fixes
   the tests its own motion broke. It never deletes or `skip`s one.
3. **Human checkpoint.** The skill states exactly what to open and what to watch, e.g. *"Open Home, tap the
   second card, watch whether the card grows into the detail page or the page slides in from the right."*
   User approves, or the wave reverts via `git reset --hard` — safe because the baseline was clean.
4. Commit. `feat(ui):` for motion, `fix(ui):` or `perf(ui):` for hygiene. One wave per commit; wave 2 is one
   screen per commit.

**Jank check.** `flutter run --profile` plus a DevTools timeline trace is the only real one, and it is heavy.
Required only for findings that touch a scrolling list — the one place added motion actually drops frames.
Elsewhere it is listed as a suggested manual check in the final report.

## Hard rules

- Never propose an animation on a code path that has not been read.
- Never add a package silently. `package:animations` absent -> ask. Prefer built-in widgets if the project
  already uses `flutter_animate` or `rive`.
- Never write a bounce, elastic, or back curve.
- Every duration the skill writes comes from the token file. Zero inline literals in skill-authored code.
- Every animation the skill writes respects reduce-motion.
- Never touch a path listed under `Do not animate` in `.claude/motion.md`.
- Never re-propose a finding listed under `Declined`.
- Never carry a failed wave forward. Revert it, report why, move on.
- One wave per verification. No batching because "they're all small".

## Validation

Detection rules are dry-run against `/Users/getman/DevWorkspaces/FlutterProjects/relaty` before the skill is
considered done. Rules written blind have false positives on first contact.

Expected signal on that project, from the 2026-08-05 probe:

- style-1 fires on ~92 sites
- style-2 fires app-wide: 11 distinct curves
- anti-finding flag fires on 7 sites: `elasticOut`×4, `easeInBack`×2, `bounceOut`×1
- hyg-4 fires app-wide: zero reduce-motion respect
- hyg-1 must be checked against 50 `AnimationController` sites; the false-positive rate here is the main
  thing the dry run measures
- nav-1 through nav-5 fire on ~2 sites at most; the in-house `bedcode_navigator` seam must be read first

Success criterion for the dry run: every reported finding, when its code is opened, is real. False positives
are fixed by tightening the confirm-by-reading step, not by dropping the rule.

## Open questions

None. All design decisions are settled above.
