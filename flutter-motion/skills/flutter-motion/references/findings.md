# Finding catalog

Twenty rules. Each pairs a probe measured against real Dart with a confirm-by-reading
step that kills its false positives. Router identities are in `routing.md`, state
identities in `state-mgmt.md`, tokens/curves/bands in `motion-system.md` — cited here,
never restated.

## How to use this catalog

Grep finds candidates. Reading confirms them.

Every rule below has a `Probe` and a `Confirm`. The probe is a starting set, not a
finding list. Running the probe and reporting its hits produces an audit with a
false-positive rate high enough that the user stops reading — at which point the whole
skill is worthless.

**Never report a finding whose code you have not opened.**

Counts from a real 654-file project (Relaty, 2026-08-05) are given per rule as
`Raw hits`. Where raw hits are large and real findings are few — `state-6` is the
worst — the gap is the confirm step doing its job.

Mechanics that apply to every probe:

- Run from the project root. `--include='*.dart'` **must stay quoted** — unquoted it
  fails under zsh with "no matches found".
- Exclude generated trees everywhere: `lib/gen/`, `*.g.dart`, `*.gr.dart`,
  `*.freezed.dart`. Generated code is not developer-authored and is not in scope.
- Drop comment lines before counting: `| grep -vE ':[[:space:]]*//'`. On Relaty this
  changes the answer, not just the count, for `style-1` (15 of 92), `style-2`,
  `state-2`, and `state-6`.
- Three traps have bitten this project four times: **substring** matches
  (`Container(` ⊃ `LGContainer(`, `TickerProviderStateMixin` ⊂
  `SingleTickerProviderStateMixin`), **re-exports** (`bedcode_navigator` →
  `go_router`; `flutter_bloc` → `provider`), and **doc-comment examples**. Anchor with
  `\b`, verify identity per `routing.md` §5 / `state-mgmt.md` §0, filter comments.

## Severity

| Level | Means | How to report |
|---|---|---|
| high | a bug, a crash, an accessibility gap, or motion on a hot path that reads as broken | lead with these; one line each |
| medium | real, worth fixing, felt across the app rather than at one site | grouped by rule |
| low | polish, or a missed optimization | aggregate — never one line per site |

## Rule index

| Rule | What it finds | Severity | Relaty raw → real |
|---|---|---|---|
| `nav-1` | default page transition on a container tap | high | 2 → 1 (nuanced) + 17 routes on the platform default |
| `nav-2` | tab / nav body swap is an instant cut | medium | 0 → **false negative**, custom tab widget |
| `nav-3` | asymmetric motion inside a flow | medium | 2 flows → 1 |
| `nav-4` | dialog / sheet on the platform default | low | 2 → 2 |
| `nav-5` | shared-element transition missing (Hero) | low | 0 → 0 (real zero) |
| `state-1` | setState child swap with no transition | medium | 39 → 1 confirmed |
| `state-2` | bare loading indicator popped in and out | medium | 3 → 2 |
| `state-3` | empty case never branched | medium | manual → 0 |
| `state-4` | error case never branched | high | manual → **1 confirmed** |
| `state-5` | visibility toggled with no fade | low | 6 → **0 (6/6 false)** |
| `state-6` | Container whose visuals change, unanimated | low | 57 → **2** |
| `state-7` | cross-fade inventory and consistency | low | 10 → 0 (all correct) |
| `style-1` | inline durations instead of tokens | medium | 92 → 75 real literals |
| `style-2` | curve spread and cheap curves | medium (high for bounce/elastic/back) | 63 → 55; 7 → 5 cheap |
| `style-3` | duration outside the 100–500ms band | by band; >800ms on a common path is high | 31 outside of 75 |
| `hyg-1` | AnimationController never disposed | high | 50 → **0 leaks** |
| `hyg-2` | ticker mixin mismatch | high crashing / low reverse | 15 → 0 bugs, 3 style |
| `hyg-3` | missing RepaintBoundary | low | 5 → 3 real widgets, 2 generated |
| `hyg-4` | reduce-motion never checked | high | 0 → **1 app-wide finding** |
| `hyg-5` | AnimatedBuilder rebuilding a static subtree | low | 25 → 13 |

---

## Navigation

### nav-1 — default page transition on a container tap

Severity: high — primary list→detail is on every session's hot path.
Raw hits (Relaty): 2 on the Navigator 1.0 probe; 17 `GoRoute`s on the go_router probe —
13 resolved automatically, 4 read by hand — every one on the platform default.

**Router-dependent. Establish the identity from `routing.md` first, and never from a
bare `pubspec.yaml` grep.** Relaty's manifest names no `go_router` — it names
`bedcode_navigator`, which re-exports it (`bedcode_navigator/lib/bedcode_navigator.dart:3`,
its own `pubspec.yaml:35` → `go_router: ^17.0.1`). A pubspec grep routes this app down
the "unknown router" branch and finds nothing while every route runs the default.
`routing.md` §5 Step 1 is the re-export check.

Probe — Navigator 1.0 (`routing.md` §1):
```bash
grep -rEn 'MaterialPageRoute|CupertinoPageRoute|PageRouteBuilder' lib --include='*.dart'
```
Dropping `PageRouteBuilder` from that alternation takes Relaty from 2 hits to 0.

Probe — go_router (`routing.md` §2). **`builder:` vs `pageBuilder:` is not the
discriminator.** All 17 of Relaty's `GoRoute`s use `pageBuilder:`, and every page class
they return extends `MaterialPage` — platform default everywhere. Resolve what the
`pageBuilder` returns:
```bash
# Stage 1 — ARROW FORM ONLY, class name on the same physical line as `pageBuilder:`.
for c in $(grep -rEn 'pageBuilder:' lib --include='*.dart' \
    | grep -oE '=> (const )?[A-Za-z_][A-Za-z0-9_.]*' \
    | grep -oE '[A-Za-z_][A-Za-z0-9_]*$' | sort -u); do
  grep -rhn "class $c extends" lib --include='*.dart'
done

# Stage 2 — completeness cross-check. Compare its count against stage 1's.
grep -rEn 'extends (MaterialPage|CupertinoPage|CustomTransitionPage)' lib --include='*.dart'
```

**Stage 1 is a heuristic and it under-reports. The gap between the two stages is the
signal — never treat stage 1 as coverage.** It cannot see a `pageBuilder:` with a block
body or a line-wrapped arrow, because the class name is not on the matched line. Relaty:
stage 1 resolves **13 of the 17** routes; stage 2 returns **19**. The four it misses are
`core/navigation/router.dart:162` (block body → `AddEditReminderPage`), `:174` (→
`ContactLogPage`), `:183` (→ `ContactNotePage`), and `:192-193` (arrow wrapped to the
next line → `ContactDetailsPage`). Read those four by hand; all four also
`extends MaterialPage<void>`, so Relaty's verdict is unchanged — but
**`ContactDetailsPage` is the app's flagship list→detail destination, the single highest-value
container-transform candidate in the whole codebase, and stage 1 drops it silently.** On a
project that block-bodies its `pageBuilder`s, stage 1 alone returns nothing while every
route runs the platform default — a softer replay of the exact failure mode this rule
was rewritten to eliminate.

Anything other than `CustomTransitionPage` — or a `Page` subclass that itself supplies a
transition — is the finding.

Probe — auto_route (`routing.md` §3): route entries using `AutoRoute(page: …)` rather
than `CustomRoute(page: …, transitionsBuilder: …)`.

Confirm by reading:
1. Open the widget containing the push, or the route entry. Is the tap source a card,
   tile, or image — something with visible bounds? A push from an AppBar action or a
   text button is NOT a container-transform candidate. Skip it.
2. Is the destination a full screen, not a dialog? A dialog is `nav-4`.
3. `PageRouteBuilder` only — is `transitionsBuilder:` present and non-trivial? Present
   → no finding. **Absent → do not stop there.** Check whether the `animation` handed
   to `pageBuilder` is consumed downstream by the pushed widget (`AnimatedBuilder`,
   `.drive(`, a `Tween` fed by it). If it is, this is the *delegated-transition*
   architecture smell (`routing.md` §1), not a missing transition — lower severity, and
   the fix is not a second `transitionsBuilder` stacked on top. Relaty's only two hits
   are exactly this: `core/presentation/widgets/smart_overlay/smart_overlay_menu.dart:360-361`
   builds a `PageRouteBuilder` with no `transitionsBuilder`, and `SmartOverlayDetails`
   drives blur/fade/reposition off that same 200ms clock, symmetric open and close.
   Reporting it as "no transition" is a false positive.
4. `StatefulShellRoute.indexedStack` using `builder:` is expected shell usage, not a
   finding — Relaty `core/navigation/router.dart:110`, returning `ShellNavigation`.
   Its body swap belongs to `nav-2`.
5. Router surface exposes no transition parameter at all → the rule is inapplicable.
   Report the gap against the package and stop (`routing.md` §5 hard rule). Do not
   work around it at call sites.

Fix: container-transform candidate → `OpenContainer` from `package:animations`
(`motion-system.md` §3) — `closedBuilder` is the tap source, `openBuilder` the
destination, `transitionDuration: Motion.of(context, Motion.emphasized)`. Not a
candidate → the router's own hook: `CustomTransitionPage` (go_router),
`PageRouteBuilder.transitionsBuilder` (Navigator 1.0), the `Page.createRoute` override
(raw Navigator 2.0), `CustomRoute` (auto_route). Per-identity snippets are in
`routing.md` §§1–4. `package:animations` is not a dependency on every app —
`motion-system.md` §4 gives the built-in fallback and says when to raise adding the
package instead of silently hand-rolling a shared axis.

Why it matters: the container transform is the single strongest "expensive" signal
available. The tapped card visibly becomes the page, so the user never loses the object
they were looking at.

### nav-2 — tab / nav body swap is an instant cut

Severity: medium — every session, but a cut between unrelated top-level destinations
is a smaller sin than a cut on a detail push.
Raw hits (Relaty): 0 — **and that zero is a false negative.**

Probe:
```bash
grep -rEn 'BottomNavigationBar|NavigationBar\(|TabBarView' lib --include='*.dart'
```

**A 0 here means "run the second probe", never "this app has no tab surface".** Relaty's
bottom nav is `GlassBottomBar` / `GlassBottomBarTab` from `liquid_glass_widgets`, driven
by `StatefulShellRoute.indexedStack` + `navigationShell.goBranch`
(`features/main/presentation/shell_navigation.dart:47-64`). None of the three stock
widgets appears anywhere under `lib/`.

Second probe, on a 0 result — find the app's own tab surface, then grep its widget name
as if it were a stock one:
```bash
grep -rEn 'StatefulShellRoute|goBranch|IndexedStack|TabController' lib --include='*.dart'
```

Confirm by reading:
1. Locate the widget that renders the **body** for the selected index — an
   `IndexedStack`, a `switch` on the index, or `navigationShell` inside a shell route.
   The bar itself is not where the finding lives.
2. Is that body swapped with no animated wrapper? `IndexedStack` swaps instantly by
   design — it keeps every child alive and flips which one paints.
3. Already wrapped in `PageTransitionSwitcher` / `AnimatedSwitcher` /
   `FadeThroughTransition` → no finding.
4. Are the destinations peers with no spatial relationship (top-level tabs)? → fade
   through. Do they have an ordered or step relationship? → shared axis X.
   (`motion-system.md` §3.)

Fix: wrap the body in `PageTransitionSwitcher` + `FadeThroughTransition`
(`motion-system.md` §3), `duration: Motion.of(context, Motion.standard)`. Without
`package:animations`, `AnimatedSwitcher` approximates it — a plain fade, no
fade-through sequencing (`motion-system.md` §4). **Key the swap by branch index**, per
`state-mgmt.md` §5: two tab bodies that are both a `Scaffold` are `canUpdate`-identical
and the switcher silently does nothing.

Why it matters: an instant tab cut is the most common "this is a website in a wrapper"
tell, and it fires on the very first screen the user sees.

### nav-3 — asymmetric motion inside a flow

Severity: medium.
Raw hits (Relaty): manual; 2 flows read, 1 asymmetry found — on a different axis than
the rule name implies.

Probe: none — read. Locate flows first:
```bash
grep -rEn 'PageController|PageView|Stepper|StepperController' lib --include='*.dart'
```

Confirm by reading:
1. For each flow, find where the controller is driven — a bloc listener, an event
   handler, a callback.
2. Does the **same call site** handle both directions with the same duration and curve?
   Relaty's onboarding does: `features/onboarding/presentation/widgets/onboarding_content.dart:52-55`
   — `animateToPage(index, duration: const Duration(milliseconds: 200), curve:
   Curves.easeInOut)` for forward and back alike. No forward/back asymmetry.
3. **Then look for a bypass path**, which is where the real finding usually is.
   `onboarding_content.dart:46-49` — `if (isSkipped) { _pageController.jumpToPage(index);
   return; }`. Skip is an instant cut while every other step animates. Grep the flow for
   `jumpTo*`, `Duration.zero`, or a direct index assignment sitting beside an animated
   path.
4. Flow built on a third-party stepper/wizard whose internals are not under `lib/`?
   Report "opaque — not auditable from app source" and stop, do not guess. Relaty's
   `features/add_contact/presentation/widgets/add_contact_content.dart` is this case:
   a `Stepper` + `StepperController` (`_controller.jumpToStep(currentStep)`) driven by
   `AddContactNextStep` / `AddContactPreviousStep` events — whether forward differs
   from back lives inside the package.

Fix: route every direction through one animated call with
`Motion.of(context, Motion.standard)` and `Motion.enter` / `Motion.exit`. **Exception:**
if the bypass jumps several steps at once, animating it scrolls the user through every
intermediate page — that is worse. Say the skip is instant by design and leave it.

Why it matters: an inconsistent flow reads as unfinished. The user learns the
transition on step 1 and one path breaks the rule.

### nav-4 — dialog / sheet on the platform default

Severity: low — Flutter's default dialog transition is already a competent fade+scale.
This is polish. Never lead a report with it.
Raw hits (Relaty): 2, both real.

Probe:
```bash
grep -rEn 'showDialog|showModalBottomSheet' lib --include='*.dart'
```

Relaty: `core/presentation/widgets/dialogs/alert_dialog.dart:17` (`showAppAlertDialog`
wrapping `showDialog<DialogAction>`) and `core/presentation/widgets/lg_date_picker.dart:762`
(`showLGDatePickerDialog` wrapping `showDialog<DateTime>`). Both are shared wrappers —
the app's entire dialog motion is those two call sites. That is the good case: one fix
each, app-wide effect.

Confirm by reading:
1. Is the call site a shared wrapper or a one-off? Fifty one-off `showDialog` calls are
   a refactor finding first and a motion finding second.
2. Does it already pass `animationStyle:` (`showDialog`) or `sheetAnimationStyle:` /
   `transitionAnimationController:` (`showModalBottomSheet`)? Present → no finding.
3. Is the surface entering within the current screen bounds? Then fade-scale is the
   pattern (`motion-system.md` §3). A full-screen route pushed with
   `fullscreenDialog: true` belongs to `nav-1`.

Fix — parameters verified against the SDK on this machine:
```dart
showDialog<DialogAction>(
  context: context,
  animationStyle: AnimationStyle(
    duration: Motion.of(context, Motion.quick),
    reverseDuration: Motion.of(context, Motion.quick),
    curve: Motion.enter,
    reverseCurve: Motion.exit,
  ),
  builder: (context) => const AppAlertDialog(),
);
```

| Hook | Where | SDK citation |
|---|---|---|
| `AnimationStyle? animationStyle` | `showDialog` | `flutter/lib/src/material/dialog.dart:1635` |
| `AnimationStyle? sheetAnimationStyle` | `showModalBottomSheet` | `flutter/lib/src/material/bottom_sheet.dart:1309` |
| `const AnimationStyle({this.curve, this.duration, this.reverseCurve, this.reverseDuration})` | — | `flutter/lib/src/animation/animation_style.dart:32` |
| `transitionBuilder` / `transitionDuration` | `showGeneralDialog` | `flutter/lib/src/widgets/routes.dart:2765-2766` |

`showDialog` has **no** `transitionBuilder` parameter — a full custom transition (e.g.
`FadeScaleTransition` from `motion-system.md` §3) requires `showGeneralDialog`. Do not
propose `transitionBuilder:` on `showDialog`; it will not compile.

Why it matters: dialogs are where a default is most defensible. The finding is the
*inconsistency* when one dialog is custom and four are not.

### nav-5 — shared-element transition missing (Hero)

Severity: low — an absent `Hero` is a missed opportunity, not a bug. A **wrong** `Hero`
is a real regression, which is why the confirm step is mostly reasons not to propose one.
Raw hits (Relaty): 0 — a real zero. `Hero(` appears nowhere under `lib/`; the app has no
shared-element transitions at all.

Probe:
```bash
grep -rEn 'Hero\(' lib --include='*.dart'
```

**A 0 result is not a finding by itself.** Candidates come from `nav-1`'s list→detail
sites, not from this probe. The probe exists to find *existing* Heroes and check them.

Confirm by reading — all four:
1. **The same image or element source must appear on both sides.** Same URL, same
   asset, same `ImageProvider`. A `Hero` between a thumbnail and a *different* image
   lands the flight on content that does not match and reads as a rendering bug —
   strictly worse than no `Hero`.
2. The tag must be **unique per item and stable across both routes** —
   `Hero(tag: 'contact-${contact.id}')`, never `Hero(tag: 'avatar')` inside a list.
   Duplicate tags on one route throw at runtime.
3. Both sides must exist during the push. A `Hero` inside a lazily-built `ListView`
   item that has scrolled out of the viewport has no source to fly from.
4. If a container transform (`nav-1`) already applies to the same tap, use that
   **instead**. Do not stack both — the card morph already carries the image.

Fix: `Hero(tag: <stable unique tag>, child: <the image>)` on both routes. No duration
token applies — the flight is driven by the route's own transition animation, so
`nav-1`'s `Motion` token governs it. If the two sides render the image at different
aspect ratios, add a `flightShuttleBuilder` or do not propose the `Hero` at all.

Why it matters: shared element is the one transition users consciously notice, and the
one that most obviously breaks when the two sides do not actually match.

---

## State

### state-1 — setState child swap with no transition

Severity: medium.
Raw hits (Relaty): 39 lines across 16 files; 1 confirmed by hand-check.

Probe:
```bash
grep -rEn 'setState\(' lib --include='*.dart'
```
Far too broad alone — it matches every state mutation, not just visible swaps.

Confirm by reading:
1. What does the `setState` body reassign? Follow that field into `build()`.
2. Is it read **directly inside `build()` or a child builder to select between two
   different widget subtrees** — a ternary, a `switch`, an `if`/`else` returning
   different widgets, or an index into a list of widgets/strings rendered directly?
3. Reject fields that only feed layout metrics or bookkeeping into an animation
   elsewhere: `core/presentation/widgets/expanded_page_view.dart:326,337,352`
   (`_updatePage`, per-child size measurement).
4. Reject fields nothing visibly different consumes:
   `core/presentation/app/app.dart:30` flips `_currentThemeMode` at the app root — a
   theme swap, not a localized child swap.
5. Already wrapped in `AnimatedSwitcher` / `AnimatedCrossFade` / a custom `Animated*`
   → no finding.

Confirmed real on Relaty: `core/presentation/widgets/ai_loader.dart:31` — a
`Timer.periodic` calls `setState(() => _index++)` (`:27-34`) and `build()` renders
`Text(widget.messages[_index])` (`:58`). The loader's status message cuts instantly
every 5 seconds.

Where the branch lives, per state solution: `state-mgmt.md` §1 (setState/`FutureBuilder`),
§2 (Provider), §3 (Riverpod), §4 (BLoC). Detect the solution with §0's AND-gated table —
never a single grep.

Fix: `AnimatedSwitcher` around the conditional (`motion-system.md` §4),
`duration: Motion.of(context, Motion.standard)`, `switchInCurve: Motion.enter`,
`switchOutCurve: Motion.exit`.

**Fix-safety precondition — read `state-mgmt.md` §5 before writing it.** An
`AnimatedSwitcher` whose old and new children share a runtime type *and* key does
nothing at all (`Widget.canUpdate`; SDK `flutter/lib/src/widgets/animated_switcher.dart:78-84`,
`:130-131`, `:282`). `ai_loader.dart` is exactly that trap: both children are a `Text`
with no key, so the fix is a silent no-op unless the child carries
`key: ValueKey(_index)`.

Why it matters: instant content swaps are what "cheap" looks like at 60fps — the eye
catches the jump, not the change.

### state-2 — bare loading indicator popped in and out

Severity: medium.
Raw hits (Relaty): 3 → 1 is a doc-comment, 2 real.

Probe:
```bash
grep -rEn 'CircularProgressIndicator|LinearProgressIndicator' lib --include='*.dart' \
  | grep -vE ':[[:space:]]*//'
```
The filter is not optional:
`core/presentation/widgets/animations/delay.dart:23` is
`///   placeholder: CircularProgressIndicator(),` inside a dartdoc example.

Confirm by reading:
1. Is the indicator inside a conditional — `if (…)` in a `children:` list, a ternary at
   a branch point, a `switch` arm?
2. Is there an `AnimatedSwitcher` / `AnimatedOpacity` / `AnimatedCrossFade` around
   **the branch**, not around the indicator? A switcher placed inside one arm animates
   nothing (`state-mgmt.md` §5).
3. An indicator rendered unconditionally (always on screen while a stream runs) is not
   this rule.

Confirmed real on Relaty:
`features/smart_add/presentation/widgets/smart_add_voice_input.dart:72` —
`if (isRecording) SizedBox(… CircularProgressIndicator(…))` inside a `Stack.children`
list; the ring pops in and out with no fade. Same shape at
`features/timeline/presentation/widgets/contacts_progress.dart:43`.

Fix: `AnimatedSwitcher` around the branch (`motion-system.md` §4) with
`Motion.of(context, Motion.standard)` and distinct keys per branch. On BLoC or Riverpod
the branch lives in the `builder:` / `.when(…)` — `state-mgmt.md` §4 and §3. Same
`canUpdate` precondition as `state-1`.

Why it matters: a spinner that pops means every load has two visual jumps — one in, one
out — on a path the user hits constantly.

### state-3 — empty case never branched

Severity: medium.
Raw hits (Relaty): manual; 3 screens read, 0 unbranched-empty found. Only 1 of ~15
features defines a first-class `*Empty` state class — everywhere else "empty" is a
**guard on the loaded state**, which is a valid pattern and an easy one to mis-grep.

Probe: none — read. Enumerate the consumers first, after detecting the solution with
`state-mgmt.md` §0's AND-gated table. **Never one grep:** `flutter_bloc` re-exports
`ReadContext`, `SelectContext`, `WatchContext` from `provider`
(`flutter_bloc-9.1.1/lib/flutter_bloc.dart:8-9`), so `context.watch` / `context.select`
false-positive Provider on every BLoC app — Relaty has 10 such files and zero Provider.
```bash
grep -rEn 'BlocBuilder|BlocSelector|BlocConsumer' lib --include='*.dart'
```

**Sealed states do not make this rule dead.** Exhaustiveness is compiler-enforced only
for a `switch` *expression* over the sealed type with **no wildcard arm**. Every state
class in Relaty is `sealed` and a confirmed `state-4` survived anyway. Four escape
hatches, all real (`state-mgmt.md` §4):

| Shape | Relaty site | Compiler catches a missing branch? |
|---|---|---|
| `switch (state)` expression, no `_ =>` | `contacts_screen_content.dart:42-56` | **Yes** — rules are dead here, do not report |
| same, with a `_ =>` wildcard | `smart_add_content.dart:37-46` | No — the wildcard absorbs it silently |
| `if (state case …)` chain + fallthrough `return` | `timeline_content.dart:104-124` | No — the fallthrough absorbs everything |
| `buildWhen` filters the state out | `profile_content.dart:34`, `:83` | No — the builder never runs |

Confirm by reading — `state-mgmt.md` §4's four clauses, **all of them**; skipping one
produces a false positive. (a)–(c) must hold for a finding to be real; (d) cuts both
ways:

- **(a)** the empty state exists in the hierarchy — **or** an `isEmpty` guard on the
  loaded state already does the job. "No `ContactsEmpty` class exists" is the wrong
  question: `contacts_screen_content.dart:45` is `ContactsLoaded() when state.isEmpty`,
  a perfectly good empty branch.
- **(b)** it is really reachable — `grep -rn '<StateClass>' lib --include='*.dart'`. A
  subclass nothing emits is dead code, not a missing branch.
- **(c)** no sibling listener handles it out of band.
- **(d)** is the builder reached for that state? Read `buildWhen`. **Reached with no arm
  for it, and not reached at all, are both findings.** Only a `buildWhen` that admits
  the state *plus* an arm that renders it clears this check.

Real finding shape: a `Loaded` arm that unconditionally renders a list widget with no
`isEmpty` guard anywhere — a zero-length list renders as blank space instead of an
explicit empty state.

Fix: add the branch **and** its transition in the same commit — `state-mgmt.md` §5. A
branch that appears with no transition flashes, which is worse than the blank it
replaced. Key on the **branch identity** (`'loading'` / `'empty'` / `'data'` /
`'error'`), **never `state.runtimeType`**: a `when` guard splits `ContactsLoaded` across
`:45` and `:46`, so a runtimeType key collapses empty and data into one and nothing
animates — and `:43-44` (`ContactsInitial() || ContactsLoading()`) render the same
widget, so the same key fires a spurious transition between two identical widgets.
`state-mgmt.md` §5 carries the full template with SDK citations; do not re-derive it.

Fix-safety precondition: if the `BlocBuilder`'s `buildWhen` excludes the branch the fix
adds, the fix silently never runs. Check it before proposing. (`buildWhen` is not a
finding on its own — 20 of Relaty's 24 `BlocBuilder` files pass one and it is a normal
performance optimization. It enters this catalog only as clause (d) and as this
precondition.)

Why it matters: an app that shows blank space where "no contacts yet" belongs looks
broken, not empty.

### state-4 — error case never branched

Severity: high — a user stuck on a skeleton forever is the worst outcome in this
catalog.
Raw hits (Relaty): manual; 3 screens read clean, **1 confirmed finding on the fourth**.
13 of ~15 bloc `*_state.dart` files define a distinct `*Error` class — error modelling
is a much more consistent convention here than empty modelling.

Probe: none — read. Same enumeration, same solution detection, and the same four escape
hatches as `state-3`.

Confirm by reading: `state-mgmt.md` §4's clauses (a)–(d), substituting the error state.
**Clause (c) does the most work here.** Relaty routes errors through
`bloc_presentation`: `timeline_content.dart:75-77` shows `TimelineErrorEvent` as a toast
from a `BlocPresentationListener`, not from the `BlocBuilder`. A builder with no error
arm sitting under such a listener is **not** a finding.

Worked example, adversarially checked (`state-mgmt.md` §4):
`features/profile/presentation/widgets/profile_content.dart:82` is a
`BlocBuilder<ProfileBloc, ProfileState>` with `buildWhen: (previous, current) => current
is ProfileLoaded` (`:83`); `:85` renders the card, `:95` falls back to
`_buildProfileCard(context, EmptyUser()).asSkeleton()`. `ProfileError` is declared
(`profile_state.dart:29`), really emitted (`profile_bloc.dart:71`, `:73`, `:78`), and
nothing between the provider and the builder renders it — `profile_screen.dart:27-45`
wraps `ProfileContent` in `BlocProvider`, `LifecycleHooksSubscriber` (`:31`) and
`AuthStateListener` (`:37`), none of which read bloc state. On a load failure the user
sees a skeleton forever. **Confirmed.**

Fix and fix-safety precondition: identical to `state-3`. Here the narrow `buildWhen` is
not merely a precondition — it *is* the bug, and widening it is part of the fix.

**Riverpod exception:** do not file this rule against `AsyncValue.when(data:, loading:,
error:)` — all three arms are required and the branch cannot be absent. The Riverpod
spellings of the same bug are in `state-mgmt.md` §3's table (`maybeWhen`'s `orElse`
absorbing `error`; `.valueOrNull` read with no `hasError` check).

Why it matters: the one finding in this catalog that is a straight bug with a motion fix
attached, rather than a polish item.

### state-5 — visibility toggled with no fade

Severity: low.
Raw hits (Relaty): 6 — **6 of 6 false.** Every hit on this codebase is already-correct
animation code. Read all six before believing any of them.

Probe:
```bash
grep -rEn 'Visibility\(|Opacity\(' lib --include='*.dart'
```

Confirm by reading:
1. Is the `visible:` / `opacity:` argument bound to `*.value` from an `Animation` or
   `AnimationController`? → **discard.** This is the implementation *of* an animation,
   not a static toggle. 5 of Relaty's 6:
   `core/presentation/widgets/smart_overlay/overlay_widget_builder.dart:97`,
   `…/overlay_widget_builders.dart:112`, `animations/fade_in.dart:92`,
   `animations/fade_out.dart:92`, `animations/listening_animation.dart:224`.
2. Is it bound to a variable computed specifically to **sequence** an existing animated
   wrapper? → discard. `features/timeline/presentation/widgets/timeline_screen.dart:240`
   — `Visibility(visible: _isVisible || animate, child: Animated(animate: animate,
   reversed: !_isVisible, …))` keeps the subtree mounted through the exit animation
   before hiding it. Deliberate and correct.
3. What survives — a `Visibility` / `Opacity` bound directly to a plain bool or state
   field with no animated wrapper anywhere near it — is the real target. Zero found on
   Relaty.

Note: on a codebase with a dedicated `presentation/widgets/animations/` folder this
probe surfaces almost nothing but that folder. Exclude it and re-read the remainder
before concluding.

Fix: `AnimatedOpacity` (`motion-system.md` §4) with
`duration: Motion.of(context, Motion.standard)` and `curve: Motion.enter`, or
`AnimatedSwitcher` if the child itself changes rather than just fading. `Opacity` still
costs a compositing layer — if the widget is hidden for long stretches, prefer not
building it at all over fading it.

Why it matters: low yield by design. This rule earns its place by *not* firing on a
well-animated codebase — and a rule that reported all 6 of Relaty's hits would have been
100% wrong.

### state-6 — Container whose visuals change with no AnimatedContainer

Severity: low.
Raw hits (Relaty): 57 → 22 anchored → 18 after the comment filter → **2 confirmed**
among 7 hand-checked. Do not report this rule's raw count to a user; it is meaningless.

Probe — anchored, and the anchor is not optional:
```bash
grep -rEn '\bContainer\(' lib --include='*.dart' | grep -vE ':[[:space:]]*//'
```
Unanchored, `Container\(` is a substring match: it also hits `AnimatedContainer(` (1 —
the *opposite* signal), `LGContainer(` (10), `OutlinedContainer(` (23) and
`AiSummaryContainer(` (1). Only 22 of 57 are the literal widget, and 4 of those 22 are
`///` dartdoc examples (`smart_overlay/smart_overlay_menu.dart:58,63`,
`animations/animated_linear_gradient.dart:34`, `animations/animated_radial_gradient.dart:34`).
18 real candidates.

Confirm by reading:
1. Do any of this `Container`'s visual arguments — `color`, `decoration`, `width`,
   `height`, `padding`, `margin`, `alignment`, `transform` — read from an expression
   that can change across rebuilds of the **same widget instance**? A `State` field, a
   `BlocBuilder`'s `state`, a ternary or switch keyed on one of those.
2. Is every argument a constant or purely theme-derived? → discard. It can never
   animate a *user-driven* transition. `core/presentation/widgets/app_timeline.dart:153,189`
   are static timeline dots off `theme.radius` / `theme.colorScheme`.
3. Does an ancestor already supply the transition — `AnimatedContainer`, an
   `AnimatedCrossFade`'s `firstChild`/`secondChild` slot, an `AnimatedBuilder`'s
   `builder:`, a custom `Animated*` or `Tween` wrapper? → discard, this `Container` is
   just the static end state. `core/presentation/widgets/step_variant.dart:123,124` are
   the two cross-fade children; `core/presentation/widgets/toggle_group.dart:133` sits
   inside `Animated(animate: _animate, child: Container(…))`.
4. (1) yes and (3) no → finding.

Confirmed real on Relaty: `features/paywall/presentation/widgets/paywall_content.dart:239`
and `:259` — `Container(decoration: BoxDecoration(color: backgroundColor))` where
`backgroundColor` / `badgeColor` are computed from `isSelected` (`:211-230`), flipped by
`PaywallCubit.selectProduct` (`:237`), with no animated wrapper anywhere. A genuine
abrupt colour swap on selection.

Fix: `Container` → `AnimatedContainer` with
`duration: Motion.of(context, Motion.standard)` and `curve: Motion.enter`
(`motion-system.md` §4). No key needed — `AnimatedContainer` interpolates its own
properties, so the `canUpdate` trap in `state-mgmt.md` §5 does not apply here.

Why it matters: selection state that snaps is the difference between a toggle that feels
like a control and one that feels like a page reload.

### state-7 — cross-fade inventory and consistency

Severity: low. **This rule confirms good practice; it is not a bug finder.** Its output
is an inventory and the cross-check for `style-1` / `style-3`.
Raw hits (Relaty): 10 — all correct, deliberate usage. 0 findings.

Probe:
```bash
grep -rEn 'AnimatedCrossFade|AnimatedSize' lib --include='*.dart'
```

Confirm by reading:
1. Record each site's `duration` and curves. Relaty: four `AnimatedCrossFade` in
   `features/add_contact/presentation/widgets/steps/frequency_step.dart:79,106,138,189`,
   all at 300ms (`:80,107,139,197`); four more in
   `features/contact_reminder/presentation/widgets/add_edit_reminder_content.dart:172,205,241,294`;
   `core/presentation/widgets/step_variant.dart:122` uses asymmetric `firstCurve` /
   `secondCurve` `Interval`s over `Curves.fastOutSlowIn` — well tuned;
   `core/presentation/widgets/expandable_section.dart:274` is an `AnimatedSize` guarded
   by `_animateTransitions ? duration : Duration.zero` to suppress the animation on
   first layout — a legitimate technique.
2. **The finding is inconsistency across siblings, not presence** — two cross-fades in
   one feature at different durations or curves. Relaty has none; every sampled duration
   is 300ms, the mode of its own histogram.
3. A `Duration.zero` used as a first-frame guard is correct. Do not report it as a
   sub-100ms `style-3` hit.

Fix: converge siblings on one token — `Motion.of(context, Motion.standard)` — and feed
the result into `style-1`'s migration.

**`AnimatedSize` is absent from `motion-system.md` §4's built-in table.** Verified
against the SDK directly instead: `flutter/lib/src/widgets/animated_size.dart:29-38` —
`const AnimatedSize({super.key, this.child, this.alignment = Alignment.center,
this.curve = Curves.linear, required this.duration, this.reverseDuration,
this.clipBehavior = Clip.hardEdge, this.onEnd})`. `duration` is required and `curve`
**defaults to `Curves.linear`** — a fix that sets `duration` and leaves `curve` alone
ships linear motion. Pass `Motion.enter` explicitly.

Why it matters: an audit that reports only problems is not trusted. Naming what is
already right is what makes the rest credible — and this rule is where the app's real,
working duration convention shows up.

---

## Style

### style-1 — inline durations instead of tokens

Severity: medium — no single site is wrong; the absence of a source of truth is.
Raw hits (Relaty): 92 → 77 non-comment lines → 75 parse to a bare integer. Zero token
files anywhere in the project.

Probe:
```bash
grep -rEn 'Duration\(milliseconds:' lib --include='*.dart' | grep -vE ':[[:space:]]*//'
```
15 of the 92 are comment lines — 14 `///` dartdoc examples plus one commented-out line,
`features/tutorial/presentation/tutorial_finished_dialog.dart:24`
(`//     await Future<void>.delayed(const Duration(milliseconds: 200));`). Also exclude
the token file itself once it exists. **Before proposing a `Motion` class, run
`motion-system.md` §2's detection — extend what already exists, never create a second
source of truth.**

Confirm by reading:
1. Is the literal an animation/transition `duration:`, or a **scheduling delay**?
   `Future.delayed(…)`, `Timer(…)`, `.debounceTime(…)`, a retry backoff — those belong
   to a different audit and must not be migrated to a motion token. Relaty examples:
   `core/data/services/notifications_service.dart:80` (`.debounceTime`),
   `smart_overlay/smart_overlay_details.dart:126,132` (`Future.delayed(16ms)`, a
   one-frame wait), `features/smart_add/.../smart_add_input_section.dart:93` (7ms, same
   pattern), `retry.dart`'s `retryDelay`.
2. **No grep separates the two reliably.** Measured on Relaty: a 3-line-window
   `Future\.delayed|Timer\(|debounceTime` scan finds 4 of the ~10 known scheduling
   sites; widening the window to catch the rest also matches every widget that merely
   has a `delay` *parameter*. Read the enclosing call.
3. Report the two categories separately. Migrating a retry backoff to `Motion.standard`
   is a defect the skill introduced.

Fix: replace each transition literal with a `Motion` token (`motion-system.md` §1).
**Two positions where `Motion.of(context, …)` is not usable — both measured, both must
be handled or the fix will not compile:**

| Position | Why `Motion.of` fails | What to write |
|---|---|---|
| Default constructor parameter — **18 of the 75** on Relaty (`animations/fade_in.dart:29`, `zoom_in.dart:30`, `zoom_out.dart:30`, `zoom_in_motor.dart:30`, `zoom_out_motor.dart:31`, `fade_out.dart:29`, `listening_animation.dart:26,28,29`, `pulsing_animation.dart:83`, `animated.dart:8`, `vertical_handshake.dart:33`, `animated_step_linear_gradient.dart:41`, `animated_two_state_switcher.dart:26`, `expanded_page_view.dart:13,38`, `scroll_after_build.dart:7`, `debounced_button.dart:27`) | a default value must be a compile-time constant, and there is no `BuildContext` | the **bare token** — `Motion.standard` is `static const`, so `this.duration = Motion.standard` is legal. Apply `Motion.of` at the consuming build site. |
| `static const` field — **9 more** on Relaty (`core/data/services/bootstrap_service.dart:50`, `smart_overlay/constants.dart:15,16`, `smart_overlay/overlay_widget_builders.dart:6,7`, `features/tutorial/presentation/utils/tutorial_constants.dart:4,5,6,7`) | same reason; `static const X = Motion.of(…)` is not a constant expression | same — the bare token. 27 of the 75 literals sit in one of these two positions. |
| `AnimationController(duration: …)` inside `initState` — Relaty builds controllers in `initState` in 14 of its 16 controller files | `Motion.of` reads `MediaQuery`, and `dependOnInheritedWidgetOfExactType` must not be called from `initState` (SDK `flutter/lib/src/widgets/framework.dart:999-1002`; `didChangeDependencies` is the earliest safe point) | construct with the bare token, then assign `controller.duration = Motion.of(context, …)` in `didChangeDependencies`, or read the value in `build` |

Why it matters: 92 literals is 92 independent decisions. One token file turns "the
app's animations feel inconsistent" into a diff.

### style-2 — curve spread and cheap curves

Severity: medium — **high for the bounce / elastic / back subset**, which is a finding,
not a preference.
Raw hits (Relaty): 63 mentions of 11 distinct curves → 55 mentions after the comment
filter, still 11 distinct. Cheap curves: 7 raw → **5 real**.

Probe:
```bash
grep -rEn 'Curves\.[A-Za-z]+' lib --include='*.dart' | grep -vE ':[[:space:]]*//' \
  | grep -oE 'Curves\.[A-Za-z]+' | sort | uniq -c | sort -rn
```
The comment filter changes the answer, not just the count:
`core/presentation/widgets/expanded_page_view.dart:93`
(`/// Defaults to [Curves.easeInOutCubic]`) inflates that curve's tally, and two of the
cheap-curve hits are dartdoc lines.

Relaty, filtered: `easeInOut` 25, `linear` 8, `easeOut` 6, `easeIn` 4, `fastOutSlowIn` 3,
`elasticOut` 3, `easeInOutCubic` 2, `easeInQuint` 1, `easeInBack` 1, `ease` 1,
`bounceOut` 1.

Two findings live in this one probe.

**(a) Cheap curves — high severity, flag on sight** (`motion-system.md` §5). The
bounce / elastic / back family reads as a toy on production UI: a settle-then-overshoot
is right for a game, wrong for a form save or a page transition.
```bash
grep -rEn 'Curves\.(bounce|elastic)[A-Za-z]*|Curves\.ease(In|Out|InOut)Back' \
  lib --include='*.dart' | grep -vE ':[[:space:]]*//'
```
Relaty: 7 raw, **5 after the filter** — `core/presentation/widgets/time_picker.dart:154`
(`bounceOut`), `animations/listening_animation.dart:115,119` (`elasticOut`),
`animations/zoom_in.dart:32` (`elasticOut` as a constructor default),
`animations/zoom_out.dart:32` (`easeInBack`). The other two (`zoom_in.dart:49`,
`zoom_out.dart:49`) are `///` lines documenting those same defaults — do not report them
as separate sites, but **do** update them with the default, or the doc starts lying.
Fix: `Motion.enter` / `Motion.exit`. Never "here is a nicer bounce."

**(b) Curve spread — medium.** 11 distinct curves in one app is ad-hoc, not a design
system: `easeInOut` + `linear` + `easeOut` alone are 39 of 55 (71%), and the remaining
eight curves appear ≤4 times each. The finding is the long tail, not any single site.

Confirm by reading:
1. Drop comment lines (above) before building the histogram.
2. For each distinct curve outside the top three, open its site. Deliberate and
   documented → leave it; `core/presentation/widgets/step_variant.dart:122`'s
   `Interval`s over `fastOutSlowIn` are exactly that. A one-off with no rationale →
   converge on `Motion.enter` / `Motion.exit`.
3. `Curves.linear` on a **transition** is a finding on its own — linear motion reads
   mechanical. `Curves.linear` on a looping or ambient animation (rotation, pulse) is
   correct. Do not converge those.

Fix: collapse the tail into the two tokens, in the same commit as `style-1` — a call
site usually carries both a duration and a curve.

Why it matters: curve is the half of motion design people cannot name but always feel.
A bounce on a form save is the loudest cheap tell in the catalog.

### style-3 — duration outside the 100–500ms band

Severity: by band, per the table. **>800ms on a common path is high.**
Raw hits (Relaty): 31 of 75 fall outside the band.

The band and its rationale are `motion-system.md` §5; the table is repeated here because
it is the rule's classification key, not because it is a second source of truth. §5
governs if the two ever drift.

| Duration | Reads as |
|---|---|
| < 100ms | glitch — the eye doesn't register motion, only a jump |
| 100–500ms | correct |
| 500–800ms | slow; acceptable only for a full-screen emphasized transition |
| > 800ms on a common path | **high severity.** The biggest cheap-app tell there is. A user hitting this ten times a session waits eight seconds on animation. |

**Boundary convention** — the table's edges are ambiguous, so fix them: 500ms belongs to
the **slow** band. "100–500ms correct" means `100 <= d < 500`; "500–800ms slow" means
`500 <= d <= 800`. Reading it the other way moves Relaty's 500ms bucket (8 sites) out of
the outside-band count entirely and drops 31 → 23. The two are not interchangeable; this
catalog uses the first, and any report must say which it used.

Probe — a reclassification of `style-1`'s literals, not a new search:
```bash
grep -rEn 'Duration\(milliseconds:' lib --include='*.dart' | grep -vE ':[[:space:]]*//' \
  | grep -oE 'Duration\(milliseconds: *[0-9]+' | grep -oE '[0-9]+$' | sort -n | uniq -c
```
Relaty, 75 literals: correct 44, slow 18, high-severity 7, glitch 6 → 31 outside.

**Known probe limitation — the histogram lies about compound expressions.** The regex
takes the leading integer.
`core/presentation/widgets/smart_overlay/smart_overlay_details.dart:360` is
`final delay = Duration(milliseconds: 50 + (_repositioningRetryCount * 25));` — it
parses *cleanly* and lands in the 50ms bucket while the real runtime values are 50, 75,
100, 125ms… A hit whose source line has anything other than a single bare integer
between `milliseconds:` and the closing `)` needs its real value read from source. Two
further literals on Relaty do not parse at all and are missing from the 75 entirely.
**The histogram is a triage tool, never an inventory.**

Confirm by reading, in this order:
1. **Is it a motion duration at all?** `Future.delayed` / `Timer` / `.debounceTime` →
   drop it from this rule entirely (`style-1` clause 1). On Relaty this removes **100%
   of the glitch band**: `smart_overlay_details.dart:126,132` (16ms one-frame waits),
   `features/smart_add/.../smart_add_input_section.dart:93` (7ms, same),
   `core/presentation/widgets/scroll_on_focus.dart:40` and
   `features/ai_summary/.../ai_summary_button.dart:36` (50ms `Future.delayed`), plus
   `:360` above. **Zero real sub-100ms animations exist in this app.** It also removes
   roughly half the 500ms sample (`notifications_service.dart`'s stream debounce,
   `tutorial.dart`'s `Future.delayed`).
2. **Is the comment filter applied?** The 800ms bucket is 7 raw and **1 real** — six are
   `///   duration: Duration(milliseconds: 800),` dartdoc examples copied across
   `zoom_out_motor.dart` / `fade_in.dart` / `zoom_in.dart` / `zoom_in_motor.dart` /
   `fade_out.dart` / `zoom_out.dart`. The only real one is
   `animations/listening_animation.dart:28` (`soundWaveDuration`).
3. **In the >800ms band, is it one-shot or ambient?** The "on a common path" qualifier
   does real work. Relaty's 7: `animations/listening_animation.dart:26` (2000ms ripple),
   `:29` (1000ms bounce) and `animations/pulsing_animation.dart:83` (3000ms pulse) are
   looping decorative effects the user is never blocked on — low severity, often no
   finding. `animations/animated_step_linear_gradient.dart:41` and
   `animations/vertical_handshake.dart:33` (1500ms) and `smart_add_voice_input.dart`'s
   `bounceDuration` are animation defaults. `bootstrap_service.dart`'s `splashFloor`
   (1500ms) is the one plausibly on a common path — every cold start — and it is a
   business rule about minimum wait, not a transition. **A flat `>800ms` grep over-flags
   ambient animation every time.**
4. The 600ms bucket (9 on Relaty) is default `duration:` parameters on the app's own
   decorative animation widgets (`animated.dart:8`, `fade_in.dart:29`, `zoom_in.dart:30`,
   `zoom_out.dart:30`, `zoom_in_motor.dart:30`, `zoom_out_motor.dart:31`). Genuinely in
   the "slow, emphasized only" band and genuinely emphasized. Report as one pattern, not
   nine findings.

Fix: retarget onto the nearest token, wrapped —
`Motion.of(context, Motion.quick)` / `Motion.of(context, Motion.standard)` /
`Motion.of(context, Motion.emphasized)` (`motion-system.md` §1; never a bare token at a
build site). The two const-position constraints in `style-1`'s table apply, and they
bite harder here: **16 of Relaty's 27 const-position sites sit in the slow or high
bands** (13 of the 18 default parameters, 3 of the 9 `static const` fields), so most of
this rule's fixes land exactly where `Motion.of(context, …)` is unavailable and the bare
token is the correct thing to write.

Why it matters: this is the rule the user can feel before reading the report. It is also
the one most likely to over-fire, which is why clauses 1 and 3 exist.

---

## Hygiene

### hyg-1 — AnimationController never disposed

Severity: high — a leaked controller keeps a ticker alive and burns frames on a dead
screen.
Raw hits (Relaty): 50 across 16 files. **Zero real leaks.** Every clause below exists
because a naive check returned a confident wrong answer on one of these files.

Probe:
```bash
grep -rEn 'AnimationController' lib --include='*.dart'
```
Helper — cross-reference against local `dispose()` bodies (Relaty: 45):
```bash
grep -rEn 'void dispose\(\)' lib --include='*.dart'
```

Confirm by reading — **all five, in order.** Only after all five come back negative is
it a finding.

1. **Read the declared type.** Discard hits where the matched text is a substring of a
   different class name. `core/presentation/widgets/smart_overlay/smart_overlay_menu.dart:230`
   declares `late final PressFeedbackAnimationController _animationController` — an
   in-house wrapper (`press_feedback_animation.dart`), not `AnimationController`.
2. For each true `AnimationController` field, find its owning class and check whether
   the **same field name** is called with `.dispose()` inside that class's own
   `void dispose()` — **or inside a helper that `dispose()` calls.** A
   `void dispose() { _disposeControllers(); super.dispose(); }` is correct and a
   literal search of the `dispose()` body alone will not see it; open any method it
   calls. (Relaty has no such case — 45 `dispose()` bodies, zero dispose helpers — so
   this clause is untested there and is here for the next project.)
3. **Constructor-parameter fields are caller-owned.**
   `smart_overlay/smart_overlay_details.dart:55` declares
   `final AnimationController? pressFeedbackController;`, assigned via
   `this.pressFeedbackController` — absence of a local dispose call is *correct*.
   Whoever created it disposes it. A "declared but not locally disposed" check flags
   this as a leak; it is not one.
4. **Custom wrapper types delegate.** If the static type is a wrapper (clause 1), open
   the wrapper's own `dispose()` and confirm it forwards to the real controller before
   calling anything a leak. `smart_overlay_menu.dart`'s does.
5. **Collection-typed fields are disposed by a loop, never by `<field>.dispose()`.**
   `core/presentation/widgets/animations/listening_animation.dart:70` declares
   `List<AnimationController>? _rippleControllers;`, disposed at `:183-185` by
   `for (final controller in _rippleControllers!) { controller.dispose(); }`. The string
   `_rippleControllers.dispose()` never appears anywhere in that file, so clause 2 alone
   mechanically concludes "leak" — **wrong**. Before concluding a leak on a
   `List<…>` / `Iterable<…>` field, look for a `for (… in <field>…) { <var>.dispose(); }`
   or `.forEach` inside the same `dispose()`.

Also open the base class and any lifecycle mixin (`with LifecycleMixin`, a shared base
`State`) — a controller registered with a lifecycle hook is disposed out of sight of
both greps. Relaty happens to have no such case; the next project may.

Fix: dispose the controller in the owning `State`'s `dispose()`, before
`super.dispose()`. No duration token is involved — this is a leak, not a motion decision.

Why it matters: the one rule here whose finding is a resource bug rather than a taste
call, and the one most likely to produce a wrong answer in a confident tone.

### hyg-2 — ticker mixin mismatch

Severity: **high** for the crashing direction — `SingleTickerProviderStateMixin` on a
class owning two or more tickers throws a runtime assertion. **Low** for the reverse
(plural mixin, one controller): a style note, not a bug.
Raw hits (Relaty): 15 → **10 `Single…` + 5 plural**. 0 crash risks, 3 style notes.

Probe:
```bash
grep -rEn 'SingleTickerProviderStateMixin|TickerProviderStateMixin' lib --include='*.dart'
```

**`SingleTickerProviderStateMixin` contains `TickerProviderStateMixin` as a substring**,
so the plural pattern matches both. Separate them with a word boundary before counting:
```bash
grep -rEn '\bTickerProviderStateMixin' lib --include='*.dart'    # plural only — Relaty: 5
grep -rEn 'SingleTickerProviderStateMixin' lib --include='*.dart' # Relaty: 10
```
(The baseline's own 9 + 6 split for this rule is a miscount of the same 15 lines; 10 + 5
is re-derived here from source.)

Confirm by reading:
1. For each ticker-mixin class, count the distinct `AnimationController`-typed fields it
   **owns** — plus `vsync:` consumers reached through a wrapper class (`hyg-1` clause 4)
   and every element of a controller *collection* (`hyg-1` clause 5). A caller-owned
   parameter field (`hyg-1` clause 3) does not count: it was created with someone else's
   vsync.
2. `Single…` + two or more owned tickers → **real bug**, throws at runtime. Relaty: none;
   all 10 `Single…` classes own exactly one.
3. Plural + exactly one owned controller → style note. Relaty's 3:
   `core/presentation/widgets/expandable_section.dart:41` (one, `:46`),
   `smart_overlay/smart_overlay_menu.dart:227` (one wrapper, `:230`),
   `animations/pulsing_animation.dart:35` (one, `:36`). Works fine;
   `SingleTickerProviderStateMixin` is the tighter choice.
4. Plural with a genuine multi-ticker need → correct, no finding.
   `smart_overlay/smart_overlay_details.dart:65` owns three (`:66`, `:68`, `:70`);
   `animations/listening_animation.dart:69` owns two named plus a list (`:70`, `:72`,
   `:74`).

Fix: match the mixin to the count. No motion token involved.

Why it matters: the crashing direction is a real crash; the style direction is exactly
the kind of finding that, over-reported, teaches the user to skim the report.

### hyg-3 — missing RepaintBoundary

Severity: low.
Raw hits (Relaty): 5 → **2 are generated code**, 3 are real widgets.

Probe — anchored and scoped:
```bash
grep -rEn '\bRepaintBoundary\(' lib --include='*.dart' | grep -v '^lib/gen/'
```
Unanchored, `RepaintBoundary` matches the *parameter name* `addRepaintBoundary` in
flutter_gen output (`lib/gen/assets.gen.dart:315,342`) — not a widget, and not
developer-authored. The `\b…\(` anchor drops it on its own (a declaration
`bool? addRepaintBoundary,` has no trailing `(`); the `lib/gen/` exclusion is belt and
braces, and applies to every rule in this catalog.

**This probe finds what already exists; the finding is what is absent.** Confirm by
reading:
1. From `hyg-5`'s list and the app's animation folder, find each continuously animating
   subtree — an `AnimatedBuilder`, a repeating controller, a Lottie, a shader.
2. Does that subtree sit alongside expensive **static** siblings that repaint with it?
3. Is a `RepaintBoundary` already at that seam? Relaty's three real ones are exactly
   right: `core/navigation/dialogs_ext.dart:175`,
   `core/presentation/widgets/animated_background.dart:48`,
   `animations/animated_surface_blur.dart:134` — a dialog, a full-screen animated
   background, a blur.
4. Only propose one where the animating subtree is a small part of a large static page.
   A `RepaintBoundary` around everything costs a layer and buys nothing.

Fix: `RepaintBoundary(child: <the animating subtree>)`. Never propose one without naming
the specific static sibling it protects — this is the easiest rule in the catalog to
cargo-cult.

Why it matters: the only rule here about frame cost rather than appearance, and the only
one where the wrong fix makes things slower.

### hyg-4 — reduce-motion never checked

Severity: high — an accessibility gap, and a platform setting the user explicitly asked
for.
Raw hits (Relaty): 0. **Report once, app-wide, with a count. Never once per animation
site.**

Probe:
```bash
grep -rEn 'disableAnimations' lib --include='*.dart'
```
Covers `MediaQuery.disableAnimationsOf(context)`,
`MediaQuery.of(context).disableAnimations`, and
`AccessibilityFeatures.disableAnimations` in one pattern.

Confirm:
1. 0 hits → the whole app ignores reduce-motion. **One** finding: "no reduce-motion
   support anywhere; N animated sites affected", where N is `hyg-1`'s controller count
   plus the implicit `Animated*` count. Relaty: 0 of 654 Dart files check any form.
2. Non-zero → read each. Is it centralised (a token helper like `Motion.of`, a
   theme-level `pageTransitionsTheme`), or one widget that happens to check? Scattered
   per-site checks with no shared helper is its own finding.
3. `MediaQuery.of(context).disableAnimations` works and is not deprecated, but rebuilds
   on **any** `MediaQuery` change. Flag it as a rebuild-scope smell and move it to the
   aspect accessor (`motion-system.md` §1).

Fix: `Motion.of(context, …)` (`motion-system.md` §1) — one helper, wrapped around every
duration the skill proposes or touches. Verified API:
`MediaQuery.disableAnimationsOf(context)`, SDK
`flutter/lib/src/widgets/media_query.dart:1942-1951`, not deprecated. Note the two
const-position constraints in `style-1`'s table: at a `const` declaration site and
inside `initState`, `Motion.of` cannot be called — the reduce-motion check moves to the
consuming `build` or to `didChangeDependencies`.

Why it matters: the only accessibility finding in the catalog, and the fix is one
function every other fix already routes through.

### hyg-5 — AnimatedBuilder rebuilding a static subtree

Severity: low — a missed optimization, not a defect.
Raw hits (Relaty): 25 → **13 after the refined probe**, and high precision from there
(5 of 5 hand-checked were real).

Probe — two stages. A plain grep cannot express "absence of a token nearby", so stage 2
walks each hit's own context window:
```bash
grep -rEn 'AnimatedBuilder\(' lib --include='*.dart' \
  | while IFS=: read -r file line _; do
      sed -n "${line},$((line + 6))p" "$file" | grep -q 'child:' \
        || echo "$file:$line"
    done
```
Relaty: 13 of 25 — `core/presentation/widgets/step_variant.dart:22,92,144`,
`core/presentation/widgets/expandable_section.dart:151`,
`smart_overlay/smart_overlay_details.dart:451,496,530`,
`smart_overlay/overlay_widget_builder.dart:79`,
`animations/animated_step_linear_gradient.dart:209`,
`animations/listening_animation.dart:215,244,282`,
`animations/vertical_handshake.dart:121`. Re-run and confirmed to reproduce exactly.

The 6-line window is a heuristic in both directions: a widely-spaced call can put
`child:` on line 8 and slip through as a false positive, and widening the window costs
recall on tightly packed builders. Read every hit.

Confirm by reading:
1. Does the `builder:` callback reference anything that does **not** depend on the
   animation's value — a `widget.*` field, an outer method parameter, a stored instance
   field — inside a subtree rebuilt every tick?
2. Yes → finding; hoist it. Relaty: `expandable_section.dart:151` rebuilds
   `ClipRRect(… widget.child …)` every tick; `smart_overlay_details.dart:451,496,530`
   each wrap a stable reference (`widget.child` via `Material(…)`, `widget.topWidget!`,
   `widget.childSize`); `overlay_widget_builder.dart:79` rebuilds
   `_wrapWithPadding(widget, padding)` inside `Transform.scale` / `Opacity`.
3. Is the entire subtree built from the animation's value with nothing stable to hoist?
   → **not a finding**, even with no `child:`.
4. An `AnimatedBuilder` that *has* a `child:` and still rebuilds a static subtree inside
   `builder:` is the same finding — stage 2 will not surface it. Spot-check the other 12.

Fix: hoist the static subtree into `AnimatedBuilder(child: …)` and take it back through
the `builder:` callback's `child` parameter. No duration token involved.

Why it matters: the one rule that makes the app faster rather than prettier — and the
counterweight to a catalog that otherwise only adds work per frame.

---

## Never proposed

Restraint is the product. Adding motion from this list makes the app feel cheaper, not
more expensive.

| Never propose | Why |
|---|---|
| `bounceOut`, `elasticOut`, `easeInBack` and friends | Reads as a toy. **Flag these as findings when found** — Relaty has 7 raw hits, 5 real code sites after `style-2`'s comment filter. Never write one. |
| Animation on a realtime / high-frequency surface | Motion on data that updates every frame reads as lag, not polish. |
| Per-frame animation inside a `ListView.builder` item body | Multiplies cost by the number of visible rows. This is where added motion actually drops frames. |
| More than 3 animated properties on one element | Becomes noise; the eye can't track it. |
| Splash-screen animation | Delays first paint to show off. The opposite of expensive. |
| Staggered entrance on a list the user scrolls back to | Charming once, irritating the fourth time. Low severity at best, and only for a list seen once per session. |

Four more that are process, not curves or widgets:

| Never do | Why |
|---|---|
| Report a rule's raw hit count as a finding count | `state-6` is 57 raw and 2 real. One such line destroys the report's credibility. |
| Report `hyg-4` per site | It is one app-wide gap. Fifty lines saying "this animation ignores reduce-motion" is the same finding fifty times. |
| Add a branch (`state-3` / `state-4`) without its transition in the same commit | A branch that appears with no transition flashes — worse than the blank it replaced (`state-mgmt.md` §5). |
| Propose an `AnimatedSwitcher` without checking `canUpdate` and `buildWhen` | Same runtime type + same key → the switcher does nothing. A narrow `buildWhen` → the fix never runs. Both are silent (`state-mgmt.md` §5). |
