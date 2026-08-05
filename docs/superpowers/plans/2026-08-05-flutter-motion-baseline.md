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
| nav-1 (`MaterialPageRoute\|CupertinoPageRoute`) | 2 | **0** | **-100%, flagged** |
| curve histogram | 11 distinct, easeInOut led at 28, elasticOut×4, easeInBack×2, bounceOut×1 | 11 distinct, easeInOut 28, elasticOut 4, easeInBack 2, bounceOut 1 | exact match |

Everything matches exactly except nav-1, which disagrees by more than the ~10% threshold
(2 → 0, a 100% relative change). Per the flagging instruction this means the project
changed, not that the probe is broken. Confirmed by direct reading (not just re-grepping):
`lib/src/core/navigation/router.dart` builds its entire route table with
`GoRoute`/`StatefulShellRoute.indexedStack` from `bedcode_navigator`'s re-exported
`GoRouter`, using `pageBuilder: (context, state) => SomePage()` everywhere — there is no
`MaterialPageRoute(` or `CupertinoPageRoute(` literal anywhere under `lib/`, confirmed with
both the shell's `grep` and the real system `grep` binary (`command grep`, bypassing any
shell wrapper) searching the whole repo, not just `lib/`. Either the anchor was measured
before a routing migration, or was measured with a different search scope. On today's
Relaty, nav-1 as written is dead — 0 candidates, and route-level transitions are entirely
invisible to a `MaterialPageRoute`/`CupertinoPageRoute` grep because go_router's
`pageBuilder:` returns a bare page widget, never wraps it in a matched literal. See nav-1
below for the rewrite recommendation.

---

## nav-1 — default page route

Probe: `grep -rEn 'MaterialPageRoute|CupertinoPageRoute' lib --include='*.dart'`
Raw hits: 0
Verdict: false negative (coverage gap, not a false positive). Confirmed by reading
`lib/src/core/navigation/router.dart` and `lib/main.dart`: every route is a `GoRoute` /
`StatefulShellRoute.indexedStack` whose `pageBuilder:` returns a bare page widget
(`const SplashPage()`, `TimelinePage()`, …). go_router wraps that return value in its own
page/route class internally — the app never spells `MaterialPageRoute(` or
`CupertinoPageRoute(` anywhere. Disagrees with the anchor (2) by 100% — see Anchor check
above; re-measured with both the shell grep and the real system grep binary, same result.
Confirm step: for a go_router codebase, the equivalent rule is not this literal pattern.
Grep `pageBuilder:\s*\(context, state\)` inside `GoRoute(`/`GoRoute\.` blocks and check
whether the returned expression is `CustomTransitionPage(` (custom transition — fine) or a
bare page constructor (default OS transition — the actual thing worth flagging). Task 6
should treat `nav-1` as go_router-specific and rewrite the probe around `pageBuilder:` /
`CustomTransitionPage`, not `MaterialPageRoute`.

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
Confirm step (the reading procedure Task 6 should copy verbatim): (1) re-anchor the pattern
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

## style-3

Probe: none — manual (no grep pattern or rule definition was supplied to me anywhere — not
in the brief's probe script, not in the task's ambiguity-resolution ruling that added hyg-2/
hyg-5. I derived a working definition from reading style-1/style-2's own histogram data
rather than inventing one from memory, per this task's stated point, and flagging this
gap explicitly rather than silently guessing).
Raw hits: 5 outlier sites found by reading the duration histogram's tail (16ms×2, 7ms×1,
50ms×2) against its mode (300ms, 27 hits).
Verdict: needs confirm-step / open question for whoever writes the Task 6 catalog. Working
definition I used: "a `Duration(milliseconds:` literal that is not actually a motion/
transition duration at all, because it's the argument to `Future.delayed`/`Timer` (scheduling)
rather than to an animation-related parameter (`AnimationController(duration:`,
`AnimatedContainer(duration:`, `.animateToPage(duration:`, etc.), or that is small enough
(<50ms, based on the two 16ms `Future.delayed` sites in `smart_overlay_details.dart:126,132`
and the 7ms site in `smart_add_input_section.dart:93`) to read as a frame-wait/microtask hack
rather than a perceptible eased transition." I could not verify this is what the plan author
intended for style-3 — it's an inference, not a measurement of a given rule. **Flag for the
person who wrote task-2-brief.md / the Task 6 catalog: style-3 needs an explicit definition
before Task 6 copies anything from this section.**
Confirm step: if this definition is accepted — grep `Duration\(milliseconds:` sites (already
gathered by style-1) and classify each by its enclosing call (`Future.delayed`/`Timer` vs. an
animation-parameter position); flag the `Future.delayed`/`Timer` ones as "not a motion
duration, exclude from style-1's token migration" rather than as a style-3 bug per se.

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
in the same file's `dispose()`. Zero real leaks found. Two things I *did* find that map onto
the brief's stated concern, both confirmed by reading, both turning out correct rather than
buggy:
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
Confirm step (the reading procedure Task 6 should copy verbatim): (1) don't trust the raw
grep's file list — for each match, read the actual declared type; discard hits where the
matched text is a substring of a different class name (e.g. `PressFeedbackAnimationController`)
rather than the literal `AnimationController`; (2) for each true `AnimationController` field,
find its owning class and check whether the SAME field name is called with `.dispose()`
inside that class's own `void dispose()`; (3) if the field is assigned via a constructor
parameter (`this.fieldName` in the constructor, no `= AnimationController(...)` initializer
and no assignment in `initState`), it is caller-owned — absence of a local dispose call is
*correct*, not a leak; (4) if the field's static type is a custom wrapper class rather than
`AnimationController` itself, follow the wrapper's own `dispose()` to confirm it forwards to
the real controller before calling it a leak. On this codebase, applying steps 1-4 finds
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
context window with `sed`). Refined raw hits: 13 of 25 have no `child:` within that window.
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
