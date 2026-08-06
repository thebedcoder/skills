# Motion system

Reference for the `Motion` token class this skill proposes, the Material motion
patterns from `package:animations`, and the built-in fallbacks when that
package isn't a dependency. Cite this file by relative path from `SKILL.md`.

## 1. The token file (proposal)

Baseline evidence (Relaty, 654 Dart files): 92 inline `Duration(milliseconds:)`
literals, zero token file anywhere. Every fix wave replaces a literal with a
`Motion.*` reference — this class is what they point at.

```dart
import 'package:flutter/material.dart';

/// Motion tokens. Durations below are the skill's PROPOSAL — confirm the
/// actual values with the user in Wave 0 before any fix references them.
/// Do not silently impose these numbers on a codebase.
class Motion {
  Motion._();

  static const Duration quick = Duration(milliseconds: 150);
  static const Duration standard = Duration(milliseconds: 300);
  static const Duration emphasized = Duration(milliseconds: 500);

  static const Curve enter = Curves.easeOut;
  static const Curve exit = Curves.easeIn;

  /// Reduce-motion-aware duration: collapses to zero when the platform
  /// requests reduced motion, otherwise returns [duration] unchanged.
  static Duration of(BuildContext context, Duration duration) {
    return MediaQuery.disableAnimationsOf(context) ? Duration.zero : duration;
  }
}
```

Reduce-motion API, verified against the Flutter SDK on this machine
(`/Users/getman/fvm/versions/stable/packages/flutter/lib/src/widgets/media_query.dart`,
lines 1942–1951 and 1482–1502 — ctx7 returned no match for this query):

- `MediaQuery.disableAnimationsOf(context)` is the correct call. Real, not
  deprecated.
- `MediaQuery.of(context).disableAnimations` also works, also not
  `@Deprecated` — but the SDK's own doc on every `*Of` aspect accessor says
  to prefer the aspect form: it rebuilds only on this attribute, not on
  *any* `MediaQuery` change. Flag the `.of(context).disableAnimations` form
  as a rebuild-scope smell, not a compile error.
- Baseline: 0 of 654 Dart files in Relaty check either form.

Every animation this skill proposes or fixes wraps its duration in
`Motion.of(context, Motion.standard)` (or whichever token applies), never a
bare token — **at the site where the duration is consumed.**

Reduce-motion is applied where a duration is *consumed*, not where it is
*declared*. A `const` site — a default constructor parameter, a `static const`
field, or a file-level `const` — takes the **bare token**: `Motion.standard` is
itself `const`, while `Motion.of(…)` is a function call and is not a constant
expression, so `this.duration = Motion.of(…)` does not compile. Wrap with
`Motion.of(context, …)` at the build site that reads it. Relaty precedent, this
exact shape already in the wild: `expandable_section.dart:11` declares
`const Duration _kExpandCollapseDuration = Duration(milliseconds: 250)` and
`:275` consumes it as
`duration: _animateTransitions ? _kExpandCollapseDuration : Duration.zero`. The
*structure* is what to copy — that literal is itself a `style-1` finding, and
the fix replaces it with `Motion.standard` in place.

Also never call `Motion.of` from `initState` — it reads `MediaQuery`, and
`dependOnInheritedWidgetOfExactType` is forbidden there (SDK
`widgets/framework.dart:999-1002`); `didChangeDependencies` is the earliest
safe point. `findings.md` `style-1` enumerates the affected positions with
counts.

**These two prohibitions fail differently, and only one of them is caught for you.**
Measured on a real project, 2026-08-06:

| Violation | How it fails | Caught by `flutter analyze`? |
|---|---|---|
| `Motion.of(…)` at a `const` site | compile error — `const_eval_method_invocation` ("Methods can't be invoked in constant expressions") plus `undefined_identifier` on `context` | **Yes**, immediately |
| `Motion.of(context, …)` in `initState` | runtime assertion when the widget first builds | **No — analyzes completely clean** |

So a green `flutter analyze` is not evidence the `initState` rule was respected. Only a
widget test that actually pumps the widget catches it, and a project whose tests do not
cover that screen catches it never. Grep the changed files for `Motion.of` and check the
enclosing method by eye.

## 2. Adopting an existing file

Detect before proposing a new one. Check, in order:

- `lib/theme/**/*.dart`
- `lib/constants/**/*.dart`
- `**/*_durations.dart`
- `**/*motion*.dart`
- `**/*_animations.dart`

Grep each hit for `Duration(` and `Curve` / `Curves.` to confirm it's actually
a motion token file and not an unrelated constants file with a matching name.

**Hard rule: extend what exists, never create a second source of truth.** If
`lib/theme/durations.dart` already defines `kFastDuration = 200ms`, the fix
wave adds missing tokens to that file and renames call sites to match its
existing naming convention — it does not introduce `Motion` alongside it. The
`Motion` class in Section 1 is what to propose only when detection finds
nothing.

### Adopting: two things you must do that the fix snippets will not do for you

Every fix snippet in `findings.md`, `routing.md`, and `state-mgmt.md` is written
against the Section 1 names — `Motion.standard`, `Motion.of(context, …)`, `Motion.enter`.
**On an adopting project those names are placeholders, not code.** Translate each one to
the host project's own vocabulary as you apply it (`Motion.standard` → `AppDurations.medium`,
and so on). Pasting a snippet verbatim onto a project that has its own scale does not
compile, and there are enough of them across the four reference files that doing this by
habit rather than by rule will miss some.

**And the adopted class almost certainly has no reduce-motion helper.** `Motion.of` is the
entire mechanism behind `hyg-4` and behind the hard rule that every animation respects
reduce-motion; a hand-rolled `AppDurations` will have durations and no `of()`. Adding it is
part of adopting, not a separate finding:

```dart
// added to the project's existing token class, matching its naming
static Duration of(BuildContext context, Duration duration) =>
    MediaQuery.disableAnimationsOf(context) ? Duration.zero : duration;
```

Propose it in Wave 0 alongside the missing duration tokens. Skipping it leaves every later
wave unable to satisfy the reduce-motion rule.

## 3. The four Material motion patterns

All four ship in `package:animations` (verified against the installed source,
`animations` 2.1.2, `~/.pub-cache/hosted/pub.dev/animations-2.1.2/lib/src/`).
Three of the four (`SharedAxisTransition`, `FadeThroughTransition`,
`FadeScaleTransition`) are `StatelessWidget`s that consume `animation` /
`secondaryAnimation` from a driver — normally `PageTransitionSwitcher`
(verified: `const PageTransitionSwitcher({ super.key, this.duration = const
Duration(milliseconds: 300), this.reverse = false, required
this.transitionBuilder, this.layoutBuilder = defaultLayoutBuilder, this.child
})`) or a `PageRouteBuilder`/`PageTransitionsBuilder`.

### Container transform
When it applies: a tapped element (card, list tile, FAB) morphs into the
detail view it opens — the "connect this to what it becomes" pattern.

Widget: `OpenContainer<T>`. Verified constructor:
```dart
const OpenContainer({
  super.key,
  this.closedColor = Colors.white,
  this.openColor = Colors.white,
  this.middleColor,
  this.closedElevation = 1.0,
  this.openElevation = 4.0,
  this.closedShape = const RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(4.0)),
  ),
  this.openShape = const RoundedRectangleBorder(),
  this.onClosed,
  required this.closedBuilder,
  required this.openBuilder,
  this.tappable = true,
  this.transitionDuration = const Duration(milliseconds: 300),
  this.transitionType = ContainerTransitionType.fade,
  this.useRootNavigator = false,
  this.routeSettings,
  this.clipBehavior = Clip.antiAlias,
});
```
`transitionDuration` defaults to 300ms — inside the band, but still a literal;
route it through `Motion.of(context, Motion.standard)` when proposing a fix.

### Shared axis (x / y / z)
When it applies: navigation between peer screens with a spatial or step
relationship — onboarding steps, tab-like forward/back, wizard flows. X =
horizontal (forward/back), Y = vertical (up/down hierarchy), Z = scaled
(zoom in/out, e.g. modal-like reveal).

Widget: `SharedAxisTransition`, driven by `SharedAxisTransitionType.horizontal
/ .vertical / .scaled`. Verified constructor:
```dart
const SharedAxisTransition({
  super.key,
  required this.animation,
  required this.secondaryAnimation,
  required this.transitionType,
  this.fillColor,
  this.child,
});
```

### Fade through
When it applies: content that has no strong spatial relationship — bottom-nav
tab switches, unrelated top-level destinations. Outgoing fades out fully
before incoming fades in (not a crossfade).

Widget: `FadeThroughTransition`. Verified constructor:
```dart
const FadeThroughTransition({
  super.key,
  required this.animation,
  required this.secondaryAnimation,
  this.fillColor,
  this.child,
});
```

### Fade scale
When it applies: elements entering/exiting within the same screen bounds —
dialogs, menus, snackbar-like overlays, FAB reveal. Not a page transition.

Widget: `FadeScaleTransition`. Verified constructor:
```dart
const FadeScaleTransition({super.key, required this.animation, this.child});
```
Single-animation only — no `secondaryAnimation` — because it's built for
overlay enter/exit, not a two-way page swap.

All four constructor signatures above were confirmed by reading the installed
package source directly (`~/.pub-cache/hosted/pub.dev/animations-2.1.2/lib/src/`),
not guessed — ctx7 (`/flutter/packages`) only surfaced README section headers,
no parameter lists. No signature in this section is unverified.

## 4. Built-in vs package

Relaty has no `package:animations` dependency — a real target app may need every
fix done with built-in `Animated*` widgets and zero new dependencies. Don't reach
for the package column by default; check whether a built-in widget already covers
the case.

(It *does* have go_router, via `bedcode_navigator`'s re-export — establish the
router from `routing.md` §5, never from a `pubspec.yaml` grep.)

| Case | Built-in widget | Covers it alone? |
|---|---|---|
| Size/color/decoration/margin change on one element | `AnimatedContainer` | Yes |
| Show/hide via opacity | `AnimatedOpacity` | Yes |
| Reposition within a `Stack` | `AnimatedAlign` or `AnimatedPositioned` | Yes |
| Padding change | `AnimatedPadding` | Yes |
| Text style change (size/weight/color) | `AnimatedDefaultTextStyle` | Yes |
| Toggle between two fixed children | `AnimatedCrossFade` | Yes |
| Swap a child for a fade transition, no dependency available | `AnimatedSwitcher` (verified: `const AnimatedSwitcher({ super.key, this.child, required this.duration, this.reverseDuration, this.switchInCurve, this.switchOutCurve, this.transitionBuilder, this.layoutBuilder })`, all with defaults except `duration`) | Approximates fade through/fade scale — no shared-axis slide, no container morph |
| Card/tile morphs into detail screen | none | No — container transform's shape/elevation/color morph has no built-in equivalent; needs `package:animations` (`OpenContainer`) |
| Spatial step navigation (shared axis) | `SlideTransition` + `FadeTransition` inside a hand-rolled `PageRouteBuilder` | Approximates it, more code, no built-in single widget |

Rule of thumb: the implicit `Animated*` widgets above cover single-property,
single-widget changes. The moment a fix needs to coordinate two animations
(outgoing + incoming) with a named Material choreography — container
transform or shared axis — that's the signal to raise adding
`package:animations` as an option, not silently hand-roll it.

Where the hand-rolled fallback goes depends on the router, so settle that from
`routing.md` first. On a go_router app — which Relaty is — it belongs in
`CustomTransitionPage`'s `transitionsBuilder`, not a `PageRouteBuilder`, because
a go_router app never constructs one. Say which fallback you mean in the
proposal instead of presenting `package:animations` as the only path.

## 5. The band: 100–500ms

Sub-100ms reads as a glitch — the eye registers a flash, not a transition, and
on higher refresh-rate displays it can complete in under 10 frames. 800ms+ on
a common path reads as lag, not polish; treat 800ms+ as high severity. The
100–500ms range is where the change reads as intentional motion: fast enough
to not block the next interaction, slow enough to be perceived.

Relaty evidence: of 75 real duration literals measured, 31 fall outside
100–500ms — worth flagging as a pattern, not noise from one outlier call site.

**Cheap tells — flag, never propose:** `Curves.bounceOut`, `Curves.elasticOut`,
`Curves.easeInBack` (and the `...In`/`...InOut` variants of the same family).
These read as novelty, not polish, on production UI — a settle-then-overshoot
motion is correct for a game or a toy interaction, wrong for a form save or a
page transition. Relaty's 11 distinct curves in use include `elasticOut`×4,
`easeInBack`×2, `bounceOut`×1 raw (against `easeInOut`×28 as the dominant
curve) — but 2 of those 7 raw hits are `///` doc lines describing a default
declared elsewhere in the same file (`animations/zoom_in.dart:49` documents the
default at `:32`; `zoom_out.dart:49` documents `:32`), so the real count is
**5 code sites, 7 raw**. Always filter comment lines before
reporting a curve tally; `findings.md` `style-2` carries the filtered probe.
These are not a hypothetical anti-pattern, they were found in a real, shipped
app. When found, the finding is "replace with `Motion.enter` /
`Motion.exit`" — never "here's a nicer bounce curve."
