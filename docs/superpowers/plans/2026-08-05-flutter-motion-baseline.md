# flutter-motion detection rule baseline — Relaty probe (2026-08-05)

Read-only probe of `/Users/getman/DevWorkspaces/FlutterProjects/relaty` (654-file Flutter
app, flutter_bloc 9.1.1, in-house `bedcode_navigator` nav package wrapping go_router).
Probe script: scratchpad `probe-relaty.sh` (not committed). Raw output: scratchpad
`relaty-probe.txt` (not committed). This file is the committed record.

## Anchor check

Sanity anchors from the plan author's 2026-08-05 run, compared against this run:

| anchor | expected | measured | delta |
|---|---|---|---|
| style-1 (`Duration\(milliseconds:`) | ~92 | 92 | exact match |
| hyg-1 (`AnimationController`) | ~50 | 50 | exact match |
| hyg-4 (`disableAnimations`) | 0 | 0 | exact match |
| nav-1 (`MaterialPageRoute\|CupertinoPageRoute\|PageRouteBuilder`) | 2 | 2 | exact match (after correction — see below) |
| curve histogram | 11 distinct, easeInOut led at 28, elasticOut×4, easeInBack×2, bounceOut×1 | 11 distinct, easeInOut 28, elasticOut 4, easeInBack 2, bounceOut 1 | exact match |

**Correction (post-review):** my first pass measured nav-1 with the plan script's literal
pattern (`MaterialPageRoute|CupertinoPageRoute`, no `PageRouteBuilder`) and got 0, a 100%
disagreement with the anchor's 2 — I flagged that loudly as instructed. On review it turned
out the *probe*, not the project, was incomplete: the original anchor measurement included
`PageRouteBuilder` as a third alternative. Adding it back reproduces the anchor exactly (2
hits, both in one file — `smart_overlay_menu.dart:360-361`). See the corrected nav-1 section
below for the pattern, the hand-check, and the honest verdict on that site.

---

## nav-1 — default page route

Probe: `grep -rEn 'MaterialPageRoute|CupertinoPageRoute|PageRouteBuilder' lib --include='*.dart'`
Raw hits: 2 (both in one file — `smart_overlay_menu.dart:360` and `:361`). Matches the
anchor exactly once `PageRouteBuilder` is added as a third alternative — my first pass used
the plan script's literal two-alternative pattern and got 0, which I flagged loudly as a
100% anchor disagreement; the probe itself, not the project, was the gap.

**Verified fact for Task 4:** `pubspec.yaml` contains neither `go_router` nor `auto_route` as
a direct dependency — only `bedcode_navigator` (see lines 41-43). Navigation is entirely
routed through that in-house package. `lib/src/core/navigation/router.dart` does import a
class literally named `GoRouter` from `bedcode_navigator`'s own export surface
(`import 'package:bedcode_navigator/bedcode_navigator.dart' show GoRouter;`), so
`bedcode_navigator` re-exports or reimplements a `go_router`-shaped API under its own
package name — but Relaty's own manifest never depends on the `go_router` package directly.
Every route is a `GoRoute`/`StatefulShellRoute.indexedStack` whose `pageBuilder:` returns a
bare page widget (`const SplashPage()`, `TimelinePage()`, …), which is *why* this probe
finds almost nothing on the main route table: that push mechanism never spells
`MaterialPageRoute(`/`CupertinoPageRoute(`/`PageRouteBuilder(` anywhere. The only 2 hits in
the whole app are a hand-rolled `PageRouteBuilder` used for a one-off overlay, not for main
navigation.

Hand-check of `lib/src/core/presentation/widgets/smart_overlay/smart_overlay_menu.dart:360-372`:

```dart
PageRouteBuilder<void> _createOverlayRoute() {
  return PageRouteBuilder(
    transitionDuration: widget.duration ?? SmartOverlayConstants.defaultTransitionDuration, // 200ms
    pageBuilder: (context, animation, secondaryAnimation) => _buildOverlayPage(animation),
    fullscreenDialog: SmartOverlayConstants.defaultFullscreenDialog,
    opaque: SmartOverlayConstants.defaultOpaque, // false
    barrierDismissible: SmartOverlayConstants.defaultBarrierDismissible,
    barrierColor: Colors.transparent,
    maintainState: SmartOverlayConstants.defaultMaintainState,
  );
}
```

Verdict: **real hit, honest verdict is nuanced — not a clean "bug" and not "out of scope".**
`transitionsBuilder:` is omitted, so Flutter's own default applies
(`(context, animation, secondaryAnimation, child) => child` — the route itself contributes
no visual transition). Taken at face value that's exactly the "reached for a custom route
and didn't give it a real transition" pattern. But reading further shows the `animation`
object is threaded into `_buildOverlayPage(animation)` → `SmartOverlayDetails(pageAnimation:
animation, ...)`, and that widget's own `AnimatedBuilder`s (`_buildBlurBackground`,
`_buildAnimatedChild`, `_buildTopWidget`, `_buildBottomWidget`, all read earlier for
hyg-5) drive blur/fade/reposition directly off that same clock over the same 200ms — and
there's a distinct `_isClosing` flag plus separate open/close positioning logic, meaning
the entrance and exit are deliberately choreographed, symmetrically, by the destination
widget. So the *user-visible* result is properly animated over a reasonable duration (200ms
is inside the 100-500ms "correct" band); what's actually missing is only the conventional
placement of that logic — the route's own `transitionsBuilder` hook is unused, with all
transition responsibility silently delegated to the pushed widget instead. That's a real,
worth-a-human's-eyes finding (surprising to a future maintainer expecting
`PageRouteBuilder.transitionsBuilder` to be where the page's enter/exit lives; fragile if
someone later reuses `_createOverlayRoute`'s page builder without also carrying over the
child's internal animation wiring) — but it is not the "static/abrupt, forgot to animate"
failure mode the rule name suggests, and calling it a plain false positive would ignore
that it's a real architectural smell.
Confirm step: for each `PageRouteBuilder` hit, check whether `transitionsBuilder:` is
present. If present and non-trivial, real good practice, no finding. If absent (as here),
don't stop at "no transitionsBuilder = bug" — trace whether the `animation` parameter
passed into `pageBuilder` is consumed downstream by the pushed widget's own
`AnimatedBuilder`/`Animation`-driven code. If it is, and duration/curve are reasonable, this
is a "transition exists but lives in the wrong place" finding (architectural, not a missing-
motion bug) — worth flagging with a different severity than a route with no transition
signal anywhere. If the `animation` is dropped entirely (never read downstream), that's the
real "default/abrupt, no transition at all" bug this rule is actually hunting for.

## nav-2 — tab/nav body swap

Probe: `grep -rEn 'BottomNavigationBar|NavigationBar\(|TabBarView' lib --include='*.dart'`
Raw hits: 0
Verdict: false negative. Confirmed by reading `lib/src/features/main/presentation/shell_navigation.dart`:
the app's bottom nav is `GlassBottomBar`/`GlassBottomBarTab` from the `liquid_glass_widgets`
package, driven by go_router's `StatefulShellRoute.indexedStack` + `navigationShell.goBranch`.
Stock Flutter's `BottomNavigationBar`/`NavigationBar`/`TabBarView` are not used anywhere in
this codebase; the tab-swap surface exists but is invisible to this pattern.
Confirm step: this rule needs a project-specific escape hatch — grep for the actual custom
tab-bar widget name(s) in use (`GlassBottomBar` here) in addition to the stock widgets, or
document in the rule text that a 0-hit result for nav-2 must be followed by a manual check
for "does this app have a custom bottom-nav/tab widget instead."

## nav-3 — forward/back within a flow

Probe: none — manual.
Raw hits: 2 flows read; 1 asymmetry found (not a strict forward/back asymmetry — see below).
Verdict: needs confirm-step; real finding found by a different axis than the rule name
implies. Read two candidate flows:
- `lib/src/features/onboarding/presentation/widgets/onboarding_content.dart`: a `PageView`
  driven by a single `BlocListener` branch — `await _pageController.animateToPage(index,
  duration: const Duration(milliseconds: 200), curve: Curves.easeInOut)` for ordinary
  forward/back stepping (symmetric — same duration/curve either direction), but
  `if (isSkipped) _pageController.jumpToPage(index)` for the "Skip" button — an instant cut,
  zero animation. So forward vs. back is symmetric (no bug on that axis), but skip vs. step
  is asymmetric (a real motion-hygiene gap, just not the one nav-3's name describes).
- `lib/src/features/add_contact/presentation/widgets/add_contact_content.dart`: a `Stepper`
  + `StepperController` (`_controller.jumpToStep(currentStep)`), driven by
  `AddContactNextStep`/`AddContactPreviousStep` bloc events. Whether forward differs from
  back is delegated entirely to the third-party `Stepper` widget's internals — invisible
  from Relaty's own source, so this flow can't be judged by reading app code alone.
Confirm step: reading procedure — (1) grep for `PageController` and `Stepper`/
`StepperController` usages as the two flow-implementation patterns seen on this codebase;
(2) for each, find where the controller is driven (bloc listener / event handler) and check
if the SAME call site handles both directions with the same duration/curve, or if there's a
separate "skip"/"jump" path that bypasses animation entirely; (3) if the flow is built on a
third-party stepper/wizard widget, note that as "opaque — not auditable from app code" rather
than guessing.

## nav-4 — dialog/sheet

Probe: `grep -rEn 'showDialog|showModalBottomSheet' lib --include='*.dart'`
Raw hits: 2
Verdict: real. Both hits are genuine call sites: `lib/src/core/presentation/widgets/dialogs/alert_dialog.dart:17`
(`showAppAlertDialog` wrapping `showDialog<DialogAction>`) and
`lib/src/core/presentation/widgets/lg_date_picker.dart:762` (`showLGDatePickerDialog`
wrapping `showDialog<DateTime>`). Both use Flutter's default dialog transition (no
`transitionBuilder`/duration/curve override) — legitimate audit targets.
Confirm step: none needed to locate the sites; the audit judgment (default vs. custom
transition) is a separate downstream question for Task 6/8, not a probe-precision problem.

## nav-5 — hero candidates

Probe: `grep -rEn 'Hero\(' lib --include='*.dart'`
Raw hits: 0
Verdict: real zero. `Hero(` does not appear anywhere under `lib/`; Relaty has no shared-element
transitions at all. Not a probe defect — genuinely unused capability on this codebase.
Confirm step: none — 0 is the correct answer; nothing to hand-check.

## state-1 — conditional child swap

Probe: `grep -rEn "setState\(" lib --include='*.dart'`
Raw hits: 39
Verdict: needs confirm-step (mixed). Of the first 5: `lib/src/core/presentation/app/app.dart:30`
is a false positive — the `setState` only flips the app-root `_currentThemeMode`, not a
localized visible child swap. `lib/src/core/presentation/widgets/ai_loader.dart:31` is a
confirmed real finding — a `Timer.periodic` calls `setState(() => _index++)` and `build()`
renders `Text(widget.messages[_index])` directly, so the loader's status message cuts
instantly every 5s with no `AnimatedSwitcher`/cross-fade. The other three (all in
`lib/src/core/presentation/widgets/expanded_page_view.dart:326/337/352`) are internal
size/page bookkeeping (`_updatePage`, per-child size measurement) — plausible motion
candidates (they likely feed a height/position animation elsewhere in the same file) but I
could not confirm from the sampled lines alone whether the resulting layout change is
already wrapped in an animated widget.
Confirm step: `setState(` alone is far too broad (matches any state mutation, not just
visible content swaps). Real-finding filter: the setState body must reassign a value that is
read directly inside `build()`/a child builder to select between two different widget
subtrees (ternary, switch, if/else building different widgets) — reject hits where the
mutated field only affects layout metrics/bookkeeping fed into an animation controller
elsewhere, and reject hits where the field is consumed by nothing visibly different (e.g.
theme mode, counters used only for logic).

## state-2 — bare loading spinner

Probe: `grep -rEn 'CircularProgressIndicator|LinearProgressIndicator' lib --include='*.dart'`
Raw hits: 3
Verdict: real (with one comment false positive). `lib/src/core/presentation/widgets/animations/delay.dart:23`
is inside a `///` doc-comment example (`///   placeholder: CircularProgressIndicator(),`) —
false positive, not real code. The other two are real:
`lib/src/features/smart_add/presentation/widgets/smart_add_voice_input.dart:72` — confirmed,
`if (isRecording) SizedBox(... CircularProgressIndicator(...))` inside a `Stack.children`
list pops the progress ring in/out instantly with no fade; and
`lib/src/features/timeline/presentation/widgets/contacts_progress.dart:43` — a
`LinearProgressIndicator` in a bare-progress context, not individually re-verified beyond the
grep line but structurally the same shape.
Confirm step: exclude `///`/`//` comment lines before counting. Real-finding filter: the
indicator must be wrapped in a conditional (`if (...)` inside a children list, or a ternary at
a widget-tree branch point) with no `AnimatedSwitcher`/`AnimatedOpacity` around the branch.

## state-3 — empty case never branched

Probe: none — manual.
Raw hits: 3 screens read; 0 unbranched-empty found.
Verdict: needs confirm-step (probably low-yield on this codebase, not exhaustively checked).
Read three `BlocBuilder`-driven screens with a `switch (state)`:
`contacts_screen_content.dart`, `contact_select_screen_content.dart`,
`timeline_content.dart` (via its `_Empty` widget, keyed off `TimelineLoaded.isEmpty`). All
three explicitly branch an empty case (`ContactsEmpty`/`_Empty`) — none of the three silently
falls through. Only 1 of ~15 features (`ai_summary`) even defines a first-class `Empty` state
class at the bloc-state level; everywhere else "empty" is a computed `when`/`case` guard on
the loaded state (`ContactsLoaded() when state.isEmpty`), which is a valid pattern, just an
easy one to miss when grepping for a literal `Empty` state class.
Confirm step: reading procedure — (1) find bloc state files with a `switch (state)` consumer;
(2) for each, check the switch/if-case chain for either a distinct `*Empty` state class OR a
computed `isEmpty`/`.isEmpty` guard on the loaded state; (3) if neither exists and a
`Loaded` case unconditionally renders a list-type widget, that's the real "never branched"
finding — a bare empty list would render silently rather than showing an explicit empty
state. I sampled 3 of ~15 screens with `switch (state)`; a full sweep is Task 8's job, not
this baseline's.

## state-4 — error case never branched

Probe: none — manual.
Raw hits: 3 screens read; 0 unbranched-error found.
Verdict: needs confirm-step (same caveat as state-3 — small sample). Same three screens as
state-3 all explicitly branch an error case (`ContactsError`/`_Error`/`AppErrorWidget`), and
a broader grep shows 13 of ~15 bloc `*_state.dart` files define a distinct `*Error` state
class (vs. only 1 defining `*Empty`) — error-case handling is a much more consistently
modeled convention here than empty-case handling.
Confirm step: same reading procedure as state-3, substituting `*Error` state class /
error-guard for `*Empty`. Real finding = a `Loaded`/success case that unconditionally renders
success UI with no distinct branch for a state class representing failure (would surface as
a raw exception or blank screen instead of a UI-level error state).

## state-5 — visibility toggle

Probe: `grep -rEn 'Visibility\(|Opacity\(' lib --include='*.dart'`
Raw hits: 6
Verdict: false positive (all 6, on this codebase). Read all 6, not just the first 5.
`overlay_widget_builder.dart:97` and `overlay_widget_builders.dart:112` — `Opacity(opacity:
fadeAnimation.value, ...)`, driven live by an `AnimatedBuilder`'s animation. `fade_in.dart:92`
and `fade_out.dart:92` — `Opacity(opacity: _animation.value, ...)`, same pattern; these files
*are* the implementation of the app's own fade primitives. `listening_animation.dart:224` —
same shape. `timeline_screen.dart:240` — `Visibility(visible: _isVisible || animate,
child: Animated(animate: animate, reversed: !_isVisible, ...))`, a deliberately-constructed
pattern that keeps the subtree mounted during the exit animation before hiding it — already
correctly handled, not a bug. Every hit found is a well-implemented animation, not a static
toggle.
Confirm step: the naked pattern surfaces almost exclusively "already-animated" sites on a
codebase that has a dedicated `presentation/widgets/animations/` folder — it needs to
exclude hits where the visibility/opacity argument is bound to `*.value` from an
Animation/AnimationController, or to a variable computed specifically to sequence an
existing animated wrapper (as in `timeline_screen.dart`). What's left after that
exclusion — a `Visibility`/`Opacity` argument bound directly to a plain bool/state field with
no animated wrapper anywhere nearby — is the real target, and I did not find one on this
codebase.

## state-6 — static Container

Probe: `grep -rEn 'Container\(' lib --include='*.dart'`
Raw hits: 57
Verdict: false positive (majority), by two compounding causes.
**Cause 1 — the pattern isn't anchored to the widget name.** `Container\(` is a substring
match, so it also matches `AnimatedContainer(` (1 hit — already-animated, the *opposite*
signal), `LGContainer(` (10 hits), `OutlinedContainer(` (23 hits), and `AiSummaryContainer(`
(1 hit) — all in-house/UI-kit widgets unrelated to Flutter's `Container`. Only 22/57 (39%)
are the literal widget. Verified: `grep -rEn '\bContainer\(' lib --include='*.dart'` gives
exactly 22, on both the shell's grep and the real system grep binary.
**Cause 2 — even the true 22 are mostly not findings.** 2 of the 22 are inside `///`
doc-comment examples (`smart_overlay_menu.dart:58,63`), not real code. Of the remaining 20 I
hand-checked 7: `app_timeline.dart:153,189` are static timeline-dot markers (color depends
only on `theme.radius`/`theme.colorScheme` — theme-derived, not interaction-state-driven);
`step_variant.dart:123,124` are the `firstChild`/`secondChild` of an `AnimatedCrossFade`
(the transition is already handled one level up, this `Container` is just the static end
state); `toggle_group.dart:133` is wrapped by a custom `Animated(animate: _animate, child:
Container(...))` — also already handled one level up. Only `paywall_content.dart:239` and
`:259` are confirmed real: `Container(decoration: BoxDecoration(color: backgroundColor))`
where `backgroundColor`/`badgeColor` are computed from `isSelected` (flips on
`PaywallCubit.selectProduct`), with no `AnimatedContainer`/wrapper anywhere — a genuine
abrupt color-swap-on-selection bug.
Confirm step: (1) re-anchor the pattern
to `\bContainer\(` to drop `Animated/LG/Outlined/*Container` false matches; (2) drop hits
inside `///`/`//` comment lines; (3) for each remaining hit, check whether any of its
constructor arguments (`color`, `decoration`, `width`, `height`, `padding`, `margin`,
`alignment`, `transform`) reference an expression that can change across rebuilds of the
*same* widget instance — a `State` field, a `BlocBuilder`'s `state`, a ternary/switch keyed
on one of those, as opposed to a `context.theme`/constant that only changes on a full
provider rebuild; if every argument is a compile-time constant or purely theme-derived,
discard — it can never animate a *user-driven* transition; (4) if it does reference
changing state, walk up a few lines and check whether an ancestor already provides the
transition — `AnimatedContainer`, `AnimatedCrossFade`/`AnimatedSize`'s `first/secondChild`
slots, `AnimatedBuilder`'s `builder:`, or a custom `Animated*`/`Tween` wrapper — if so,
discard, the transition is already handled one level up and this `Container` is just the
static end-state child; (5) what survives all four filters — a bare, unwrapped `Container`
whose own visual property is recomputed from state that changes at runtime — is the real
finding. On my 7-site sample this filter takes 57 raw hits down to 2 real findings (~4%
survival rate), consistent with the brief's "near-total false-positive" prediction.

## state-7 — cross fade

Probe: `grep -rEn 'AnimatedCrossFade|AnimatedSize' lib --include='*.dart'`
Raw hits: 10
Verdict: real (positive-confirmation rule, not a bug-finder on this codebase). All 5 sampled
sites are correct, deliberate usages: `expandable_section.dart`'s `AnimatedSize` (with a
`_animateTransitions ? duration : Duration.zero` trick to suppress animation on first
layout — a legitimate technique, not a bug); `step_variant.dart`'s `AnimatedCrossFade` (with
asymmetric `firstCurve`/`secondCurve` `Interval`s over `Curves.fastOutSlowIn` — well-tuned);
and 3 `AnimatedCrossFade` sites in `frequency_step.dart`, all consistently 300ms. This rule
finds well-implemented motion, not hygiene bugs — useful as an inventory of "what's already
good" and as a cross-check for style-1/style-2 duration/curve consistency (all 4 durations
sampled here were 300ms, matching the mode of the duration histogram).
Confirm step: none needed to locate real sites. If Task 6 wants this rule to catch bugs
rather than confirm good practice, it would need to check for *inconsistent* duration/curve
values across sibling cross-fade sites in the same feature, not just presence.

## style-1 — inline durations not from tokens

Probe: `grep -rEn 'Duration\(milliseconds:' lib --include='*.dart'`
Raw hits: 92
Verdict: real, matches anchor exactly. Every sampled hit is a literal `Duration(milliseconds:
N)` in real (non-comment) code. One nuance beyond the brief's own worked example: not every
hit is a *widget transition* duration — some are `Future.delayed`/scheduling delays
(`retry.dart`'s `retryDelay`, `notifications_service.dart`'s `debounceTime`,
`confetti_overlay.dart`'s pre-confetti delay, and the 7ms/16ms outliers in
`smart_add_input_section.dart`/`smart_overlay_details.dart`, which read as frame-wait/
microtask hacks, not animation durations). These are still real `Duration(milliseconds:`
literals (so the raw count is correct) but they are a structurally different concern from a
transition-duration token audit.
Confirm step: exclude the eventual `lib/theme/motion.dart`-equivalent token file itself once
it exists (per the brief's own example). Additionally, for token-migration purposes, a hit
whose surrounding call is `Future.delayed(...)`/`Timer(...)` rather than a widget/animation
`duration:` parameter is a different category (scheduling, not motion) — Task 6 may want to
split this into "widget transition duration" vs. "async scheduling delay" so the token
migration doesn't lump retry backoff constants in with animation durations.

## style-2 — curves

Probe: `grep -rEho 'Curves\.[A-Za-z]+' lib --include='*.dart' | sort | uniq -c | sort -rn`
Raw hits: 63 total mentions, 11 distinct curves (`easeInOut` 28, `linear` 10, `easeOut` 6,
`elasticOut` 4, `easeIn` 4, `fastOutSlowIn` 3, `easeInOutCubic` 3, `easeInBack` 2,
`easeInQuint` 1, `ease` 1, `bounceOut` 1). Matches the anchor's headline numbers exactly.
Verdict: real, with one small noise source. Of the first 5 raw lines, one
(`expanded_page_view.dart:93`, `/// Defaults to [Curves.easeInOutCubic]`) is inside a
dartdoc comment, not a real curve usage — it inflates the histogram tally by 1 for
`easeInOutCubic`. The rest are genuine `curve:`/default-parameter usages.
Confirm step: exclude `///`/`//` comment lines before building the histogram (same fix as
style-1/state-2's doc-comment noise). 11 distinct curves for one app is a wide spread — a
real finding for Task 6's catalog text is "curve variety" itself: whether that many distinct
curves reflects deliberate design-system diversity (unlikely) or ad-hoc per-site choices
(more likely, given `easeInOut`/`linear`/`easeOut` alone cover 44/63 = 70% of usage and the
remaining 8 curves each appear ≤4 times).

## style-3 — duration outside the correct band

Definition (authoritative, from Task 6 of the plan — my first pass had derived a different,
wrong working definition from the histogram tail alone because this table hadn't reached me;
replaced below):

| Duration | Reads as |
|---|---|
| < 100ms | glitch — the eye doesn't register motion, only a jump |
| 100–500ms | correct |
| 500–800ms | slow; acceptable only for a full-screen emphasized transition |
| > 800ms on a common path | **high severity.** The biggest cheap-app tell there is. A user hitting this ten times a session waits eight seconds on animation. |

Probe: `grep -rEho 'Duration\(milliseconds: *[0-9]+' lib --include='*.dart' | grep -oE '[0-9]+$' | sort -n | uniq -c | sort -rn`
(this is style-1's own duration-histogram command — style-3 is greppable because it's a
reclassification of the same literals, not a new search)

**Boundary convention (stated explicitly since the band table's edges are ambiguous and this
text is copied verbatim into Task 6):** the 500ms value itself is treated as owned by the
**slow** band, not the correct band — i.e. "100–500ms correct" means `100 <= d < 500`, and
"500–800ms slow" means `500 <= d <= 800`. All figures below follow that convention. If the
boundary is instead read the other way (500 owned by "correct"), the 500ms bucket (8 sites)
moves out of the outside-band count entirely and outside-band drops from 31 to 23 — pick
whichever convention Task 6 wants, but the two are not interchangeable and this document
uses the first.

Raw hits: 31 literals fall outside the 100–500ms band, out of 75 non-comment
`Duration(milliseconds:` literals that parsed to a bare integer. Caveat on that denominator:
of the 92 raw style-1 hits, **15** are inside comment lines (excluded before counting — 14
are `///` doc-comment examples, plus 1 more that's a `//`-commented-out line,
`tutorial_finished_dialog.dart:24` — `//     await Future<void>.delayed(const Duration(
milliseconds: 200));` — found on review; my first pass only excluded `///` and undercounted
this denominator by 1), and 2 more didn't parse to a plain integer (a variable or arithmetic
expression, not caught by this histogram command as a clean value — see the noise-class note
below on why "didn't parse" isn't the only way an expression sneaks in). So 75, not 76, not
92, is the real base. Band breakdown of the 75: correct (100–500ms) 44, slow (500–800ms) 18,
high-severity (>800ms) 7, glitch (<100ms) 6 → 44+18+7+6 = 75 ✓. Outside-band count =
18+7+6 = **31, unchanged** — the corrected denominator only moves the in-band figure (45→44),
the load-bearing outside-band number reproduces exactly.
Verdict: needs confirm-step — a large share of the 31 "outside band" literals are not
motion durations at all, confirmed by reading every site in the glitch band and a sample of
the slow/high-severity bands:
- **Glitch band (6, all 3 sites hand-checked — my first pass wrote "the two 50ms sites,"
  which undercounted; the 50ms bucket has three, not two):** the two 16ms
  sites (`smart_overlay_details.dart:126,132`) are `Future.delayed(const Duration(
  milliseconds: 16), ...)` — a one-frame scheduling wait, not an animation. The 7ms site
  (`smart_add_input_section.dart:93`) is the same pattern. Of the three 50ms sites: one
  (`scroll_on_focus.dart:40`) is `Future.delayed` (scheduling); a second
  (`ai_summary_button.dart:36`) is a `Future.delayed(50ms)` immediately followed by a real
  motion duration two lines later (`Scrollable.ensureVisible(duration: Duration(
  milliseconds: 200), curve: Curves.easeInOut)`) — so this call site has one real
  100–500ms-band motion duration and one unrelated glitch-band scheduling delay that
  happens to match the same grep pattern; and a third
  (`smart_overlay_details.dart:360` — `final delay = Duration(milliseconds: 50 +
  (_repositioningRetryCount * 25)); ... Timer(delay, ...)` at :362) is a **distinct noise
  class from the "didn't parse to a plain integer" case already noted above**: this literal
  *does* parse cleanly to the histogram command (the regex greedily grabs the leading digits
  of `50 + (...)` and reports "50"), but the number reported is not the actual duration used
  at runtime — the real value is `50 + 25*retryCount`, i.e. 75ms, 100ms, 125ms… on
  successive retries, truncated by the regex to just its leading literal. It is also a
  `Timer`, i.e. scheduling, not motion, on top of that. **All 6 glitch-band hits are
  scheduling delays, zero are actual sub-100ms animations** — none of these are the "glitch"
  failure mode the band describes (a real transition too fast to perceive); they were never
  animations to begin with.
- **Slow band (18, sampled):** the 800ms bucket is almost entirely doc-comment noise — 6 of
  its 7 *raw* (pre-comment-filter) occurrences are `///   duration: Duration(milliseconds:
  800),` dartdoc examples across `zoom_out_motor.dart`/`fade_in.dart`/`zoom_in.dart`/
  `zoom_in_motor.dart`/`fade_out.dart`/`zoom_out.dart`; only `listening_animation.dart:28`
  (`soundWaveDuration = const Duration(milliseconds: 800)`) is real. The 600ms bucket (9,
  sampled 5) is real in every sample — default `duration:` constructor parameters on the
  app's own `animated.dart`/`zoom_out_motor.dart`/`fade_in.dart`/`zoom_out.dart`/
  `zoom_in_motor.dart` animation-widget classes — genuinely in the "slow, acceptable only for
  emphasized transitions" band, and these widgets do read as emphasized/decorative effects.
  The 500ms bucket (8, sampled 5) is mixed: 1 real animation-duration default
  (`tutorial_constants.dart`'s `focusAnimationDuration`), 1 scheduling delay
  (`notifications_service.dart`'s `.debounceTime(500ms)` — a stream debounce, not a widget
  transition), 1 more scheduling delay (`tutorial.dart`'s `Future.delayed(500ms)`), and the
  rest already excluded as doc-comments in the clean histogram.
- **High-severity band (7, all 4 distinct values checked):** `1500ms`×4 is mixed —
  `bootstrap_service.dart`'s `splashFloor` (a minimum splash-screen display floor, a business
  rule about wait time rather than an animated transition, though still user-facing wait
  time) alongside 3 genuine animation-duration defaults
  (`animated_step_linear_gradient.dart`, `vertical_handshake.dart`,
  `smart_add_voice_input.dart`'s `bounceDuration`). `2000ms`×1 and `1000ms`×1
  (`listening_animation.dart`'s `rippleDuration`/`bounceDuration`) and `3000ms`×1
  (`pulsing_animation.dart`'s `pulseDuration`) are all real animation defaults for
  ambient/looping effects (ripple, pulse, bounce), not one-shot page/interaction
  transitions. This matters for the band table's own qualifier — "> 800ms **on a common
  path**" — because a decorative loop a user isn't blocked on is a different severity than
  an 1000ms+ duration gating an interaction a user repeats every session; `splashFloor` is
  the one site here that plausibly *is* on a common path (every cold start).
Confirm step: for every literal outside the 100–500ms band, first check whether its
enclosing call is `Future.delayed(...)`/`Timer(...)`/a stream operator (`.debounceTime(...)`)
— if so, it is not a motion duration at all and should be dropped from style-3 entirely (it
belongs to a scheduling/debounce audit, not a motion one; on this codebase that's true of
100% of the glitch-band hits and roughly half the 500ms slow-band sample). Separately, watch
for a distinct noise class the histogram command can't catch by itself: an arithmetic
expression inside `Duration(milliseconds: ...)` (e.g. `50 + (retryCount * 25)`) parses
*successfully* to the histogram — the regex just reports its leading literal — but that
literal is not the actual duration used at runtime, which varies. A hit whose source line
has anything other than a single bare integer between `milliseconds:` and the closing `)`
needs its real value (or range) read from source, not taken from the histogram bucket it
landed in. If the literal genuinely is
an animation/transition `duration:` parameter, then classify by band as given, and for the
high-severity band specifically weigh whether the animation is a one-shot transition on an
interaction path (worth flagging at "high severity" per the table) or an ambient/looping
decorative effect (pulse/ripple/bounce) that a user is not blocked waiting on — the table's
"on a common path" qualifier is doing real work here and a flat >800ms grep will over-flag
ambient animations otherwise.

## hyg-1 — controllers

Probe: `grep -rEn 'AnimationController' lib --include='*.dart'`
Raw hits: 50 (matches anchor exactly)
Helper (not a rule, folded in here per the task ruling): `grep -rEn 'void dispose\(\)' lib
--include='*.dart'` → 45 `dispose()` bodies, used below to cross-reference.
Verdict: **surprising result relative to the brief's stated risk — flagging loudly.** The
brief and this task's instructions specifically warn that "a controller disposed in a base
class, mixin, or owned by a widget that received it as a parameter" would be invisible to a
naive check. On Relaty, that hard case essentially does not occur: I cross-referenced all 16
distinct files that match the raw `AnimationController` pattern against their own local
`void dispose()` body (script: for each file containing the pattern, check whether it also
contains `void dispose()`) — **all 16 do**, and reading each of those 16 dispose() bodies
individually confirms each locally-declared `AnimationController` field is disposed by name
in the same file's `dispose()`. Zero real leaks found. Three things I *did* find that map onto
the brief's stated concern, all confirmed by reading, all turning out correct rather than
buggy:
- `listening_animation.dart` declares `List<AnimationController>? _rippleControllers;` — a
  **collection-typed** controller field, disposed by iterating it (`for (final controller in
  _rippleControllers!) { controller.dispose(); }`) rather than by a direct
  `_rippleControllers.dispose()` call. A check that only greps for `<fieldName>.dispose()`
  would never find this and would mechanically conclude "leak" — wrong. See Confirm step
  clause (5).
- `smart_overlay_details.dart` declares `final AnimationController? pressFeedbackController;`
  as a **constructor parameter** (`this.pressFeedbackController` in the constructor) — this
  field is correctly *not* disposed in this widget's `dispose()`, because it's caller-owned
  (created and therefore owned by whoever passed it in). A naive "declared but not locally
  disposed" check would flag this as a leak; reading the constructor signature shows it
  isn't one. This is the exact "owned by a widget that received it as a parameter" case
  the brief warned about, confirmed present and confirmed *not* a bug.
- `smart_overlay_menu.dart`'s `_animationController` field is typed `PressFeedbackAnimationController`
  (an in-house wrapper class defined in `press_feedback_animation.dart`), not literally
  `AnimationController` — it only matched the raw grep because the type name *contains* the
  substring "AnimationController". Its `dispose()` calls `_animationController.dispose()`,
  which internally calls the wrapped `AnimationController`'s own `.dispose()` — correctly
  disposed via delegation, but invisible to a check that expects to see the literal type.
Also found in passing (not a hyg-1 finding, but adjacent): `press_feedback_animation.dart`'s
`dispose()` doesn't call `super.dispose()` — harmless here because `PressFeedbackAnimationController`
is a plain class, not a `State`/`ChangeNotifier`, so there's no superclass `dispose()` to
chain to.
Confirm step: (1) don't trust the raw
grep's file list — for each match, read the actual declared type; discard hits where the
matched text is a substring of a different class name (e.g. `PressFeedbackAnimationController`)
rather than the literal `AnimationController`; (2) for each true `AnimationController` field,
find its owning class and check whether the SAME field name is called with `.dispose()`
inside that class's own `void dispose()`; (3) if the field is assigned via a constructor
parameter (`this.fieldName` in the constructor, no `= AnimationController(...)` initializer
and no assignment in `initState`), it is caller-owned — absence of a local dispose call is
*correct*, not a leak; (4) if the field's static type is a custom wrapper class rather than
`AnimationController` itself, follow the wrapper's own `dispose()` to confirm it forwards to
the real controller before calling it a leak; (5) **if the field's static type is a
collection of controllers** (`List<AnimationController>`/`Iterable<AnimationController>`/
similar — as opposed to a single `AnimationController?`), step 2's literal
`<fieldName>.dispose()` search will never match, because the correct disposal pattern is a
loop, not a direct call on the field. Before concluding a leak, check for a `for (... in
<fieldName>...) { <loopVar>.dispose(); }` (or `.forEach`) construct inside the same
`dispose()` that iterates the collection and disposes each element. Verified against
`lib/src/core/presentation/widgets/animations/listening_animation.dart`: `_rippleControllers`
is declared `List<AnimationController>? _rippleControllers;` (line 70) and disposed at
`dispose()` lines 183-185 via `for (final controller in _rippleControllers!) {
controller.dispose(); }` — the string `_rippleControllers.dispose()` never appears anywhere
in the file, so step 2 alone would mechanically conclude "leak," which is wrong; step 5
correctly reclassifies it as disposed. This exact file was already cited under hyg-2 ("2
named controllers plus a controller list") but the collection-field case wasn't folded back
into hyg-1's own procedure until this correction. On this codebase, applying steps 1-5 finds
zero real leaks among 50 raw hits / 16 distinct files.

## hyg-2 — ticker mixin

Probe: `grep -rEn 'SingleTickerProviderStateMixin|TickerProviderStateMixin' lib --include='*.dart'`
Raw hits: 15
Verdict: real (as a code-quality check), zero crash-risk bugs found, 3 minor style findings.
Read all 15 sites and cross-referenced each against how many `AnimationController` fields
that same class declares. `SingleTickerProviderStateMixin` is only valid when the class owns
exactly one controller/ticker — using it with 2+ would throw a runtime assertion. None of the
9 `SingleTickerProviderStateMixin` classes here (`animated_radial_gradient.dart`,
`vertical_handshake.dart`, `zoom_in.dart`, `animated_step_linear_gradient.dart`,
`animated_surface_blur.dart`, `fade_in.dart`, `infinite_rotation.dart`, `zoom_out.dart`,
`fade_out.dart`) actually has more than one controller — no crash-risk mismatch found. Of the
6 `TickerProviderStateMixin` (plural) classes, 2 genuinely need multi-ticker support
(`smart_overlay_details.dart` — 3 controllers; `listening_animation.dart` — 2 named
controllers plus a controller list) — correct choice. The other 3
(`expandable_section.dart`, `smart_overlay_menu.dart`, `pulsing_animation.dart`) each own
only one controller/ticker-consumer but use the heavier plural mixin anyway — not a bug
(works fine), just unnecessary; `SingleTickerProviderStateMixin` would be the tighter choice.
Confirm step: for each ticker-mixin class, count distinct `AnimationController`-typed fields
(and `vsync:` consumers reached via wrapper classes, as in hyg-1's `PressFeedbackAnimationController`)
it directly owns. `Single*` + 2 or more owned controllers = a real bug (would crash at
runtime, worth a high-severity finding). `TickerProviderStateMixin` (plural) + exactly 1
owned controller = a minor/optional style note, not a bug.

## hyg-3 — repaint boundary

Probe: `grep -rEn 'RepaintBoundary' lib --include='*.dart'`
Raw hits: 5
Verdict: false positive (2/5), real (3/5). `lib/gen/assets.gen.dart:315,342` are
generated code (flutter_gen asset generator output) with a boolean parameter literally named
`addRepaintBoundary` — the pattern matches the substring inside that parameter name, not an
actual `RepaintBoundary` widget, and it's generated code besides (not developer-authored,
shouldn't be in scope for a motion-hygiene audit at all). The other 3 —
`dialogs_ext.dart:175`, `animated_background.dart:48`, `animated_surface_blur.dart:134` — are
real `RepaintBoundary(child: ...)` widget usages.
Confirm step: exclude anything under `lib/gen/` (generated code, not developer-authored) and
anchor the pattern so it doesn't match parameter/variable names that merely contain the
substring (`\bRepaintBoundary\(` catches the real widget usages specifically, since a
parameter declaration like `bool? addRepaintBoundary,` has no trailing `(`).

## hyg-4 — reduce motion

Probe: `grep -rEn 'disableAnimations' lib --include='*.dart'`
Raw hits: 0 (matches anchor exactly)
Verdict: real zero — a genuine, substantive finding, not a probe defect. Relaty has no code
path anywhere under `lib/` that reads `MediaQuery.disableAnimationsOf`/
`AccessibilityFeatures.disableAnimations`; there is no "respect reduce-motion" support at all
in this app.
Confirm step: none needed for the probe. Worth carrying into Task 6's findings as a
codebase-wide gap (not a single-site finding) rather than a per-site hygiene bug.

## hyg-5 — animated builder

Probe: `grep -rEn 'AnimatedBuilder' lib --include='*.dart'`
Raw hits: 25 (all real `AnimatedBuilder(` call sites — no comment/substring noise found in
this set, unlike state-6/hyg-1/hyg-3).
Refined probe (per this task's ambiguity-resolution ruling — added, not in the brief):
for each `AnimatedBuilder\(` hit, check whether `child:` appears within the next 6 lines
(a plain grep can't express "absence of a token nearby", so this walks each hit's own
context window with `sed`). Exact runnable command (my first pass reported the "13" figure
without recording this — it reproduces exactly when run):

```bash
grep -rEn 'AnimatedBuilder\(' lib --include='*.dart' \
  | while IFS=: read -r file line _; do
      sed -n "${line},$((line + 6))p" "$file" | grep -q 'child:' \
        || echo "$file:$line"
    done | wc -l
```

Refined raw hits: 13 of 25 have no `child:` within that window (command above, re-run and
confirmed to reproduce 13 exactly). Full 13-site list: `expandable_section.dart:151`,
`step_variant.dart:22/92/144`, `smart_overlay_details.dart:451/496/530`,
`overlay_widget_builder.dart:79`, `vertical_handshake.dart:121`,
`animated_step_linear_gradient.dart:209`, `listening_animation.dart:215/244/282`. (Note: this
is the deterministic order the command above produces; the 5 sites I hand-checked below were
sampled rather than taken as literally "the first 5 in this order," but all 5 are confirmed
members of this 13-site list.)
Verdict: real, high precision. Hand-checked all 5 of the refined "missing child:" sample
sites: `expandable_section.dart:151` (rebuilds a `ClipRRect(... widget.child ...)` subtree
every animation tick even though `widget.child` doesn't change frame-to-frame);
`smart_overlay_details.dart:451,496,530` (three separate `AnimatedBuilder`s, each rebuilding
a subtree that wraps a stable reference — `widget.child` via `Material(...)`, or
`widget.topWidget!`/`widget.childSize` passed into a builder function — on every frame); and
`overlay_widget_builder.dart:79` (`_wrapWithPadding(widget, padding)` — a stable parameter,
rebuilt every tick inside `Transform.scale`/`Opacity`). All 5 are genuine missed
optimizations: a static subtree that could be hoisted into `AnimatedBuilder`'s `child:` and
referenced via the builder's `child` parameter, but isn't.
Confirm step: for each `AnimatedBuilder(...)` without a `child:` argument, check whether the
`builder:` callback references anything that does *not* depend on the animation's own value
(a `widget.*` field, an outer method parameter, a stored instance field) inside a subtree
that gets rebuilt every tick regardless. If such a reference exists, it's a real finding
(the static subtree should be hoisted to `child:`); if the entire subtree is built purely
from the animation's value with nothing stable to hoist, it's not a finding even without
`child:` present.
