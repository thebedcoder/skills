# Routing: where a transition is actually defined

`grep MaterialPageRoute` finds Navigator 1.0 and nothing else. A go_router
app has zero hits and a real bug. An in-house router has zero hits and
could go either way. This file: given a codebase's router identity, where
its transition hook lives and what the fix looks like there. The Material
motion patterns themselves (`SharedAxisTransition`, `PageRouteBuilder`,
`PageTransitionsBuilder`) are covered in `motion-system.md` (§3, §1 lines
~84/185) — not repeated here, only where to put them.

Five identities, checked in this order.

## 1. Navigator 1.0

**Detect:** `Navigator.push` / `pushNamed` constructing `MaterialPageRoute`,
`CupertinoPageRoute`, or a raw `PageRouteBuilder`. Grep for all three —
Relaty baseline: `MaterialPageRoute|CupertinoPageRoute` → 0 hits, adding
`PageRouteBuilder` → 2 hits. Stopping at `MaterialPageRoute` misses
hand-rolled routes entirely.

**Where the transition is defined:** the `Route` object, at the push call
site. `MaterialPageRoute`/`CupertinoPageRoute` hard-code the platform
default and take no transition parameter; `PageRouteBuilder` takes
`transitionsBuilder` directly.

**Fix shape:** tapped-element-to-detail-view → wrap the source widget in
`OpenContainer` (`motion-system.md` §3) instead of touching the route.
Otherwise replace `MaterialPageRoute` with a `PageRouteBuilder`:

```dart
Navigator.push(
  context,
  PageRouteBuilder(
    transitionDuration: Motion.of(context, Motion.standard),
    pageBuilder: (context, animation, secondaryAnimation) => const DetailPage(),
    transitionsBuilder: (context, animation, secondaryAnimation, child) =>
        FadeTransition(
          opacity: animation.drive(CurveTween(curve: Motion.enter)),
          child: child,
        ),
  ),
);
```

**Named smell — delegated transition, not missing:** a `PageRouteBuilder`
omitting `transitionsBuilder` isn't automatically "no transition." Check
whether the pushed widget consumes the route's `animation` downstream
(`AnimatedBuilder`, `.drive(`, a `Tween` fed by it). If it does, the
transition was delegated away from the conventional hook, not forgotten.
Real example, Relaty (`smart_overlay/smart_overlay_menu.dart:349-361`):
`_createOverlayRoute()` builds a `PageRouteBuilder<void>` with no
`transitionsBuilder`, but its `pageBuilder` passes `animation` into the
pushed `SmartOverlayDetails`, whose own `AnimatedBuilder`s drive
blur/fade/reposition off that clock, symmetric open/close. Flagging that
as "no transition" is a false positive — the real finding, if any, is
whether that internal duration/curve pass the 100–500ms band and the
no-bounce rule (`motion-system.md` §5). Name it as an architecture smell —
logic split from its conventional hook — not a missing transition, so the
fix isn't a redundant second `transitionsBuilder` stacked on top.

## 2. go_router

**Detect:** `go_router` in `pubspec.yaml`.

**A go_router project has no `MaterialPageRoute` to find — it genuinely
uses none, this isn't Navigator 1.0 in disguise.** The finding is a
`GoRoute` using `builder:` (bare `Widget`, platform-default transition)
where it should use `pageBuilder:` returning a `CustomTransitionPage`.

**Where the transition is defined:** `GoRoute.pageBuilder` (verified
against installed source, go_router 17.3.0, `lib/src/route.dart:271-302` —
`builder`/`pageBuilder` are the two content paths; `pageBuilder` must
return a `Page`). `CustomTransitionPage` supplies the hook
(`lib/src/pages/custom_transition_page.dart:11-108`): `transitionsBuilder`
is `Widget Function(BuildContext, Animation<double>, Animation<double>,
Widget child)`, `transitionDuration` defaults to 300ms.

**Fix shape:**
```dart
GoRoute(
  path: '/contact/:id',
  pageBuilder: (context, state) => CustomTransitionPage(
    key: state.pageKey,
    child: ContactDetailsPage(contactId: state.pathParameters['id']!),
    transitionDuration: Motion.of(context, Motion.standard),
    transitionsBuilder: (context, animation, secondaryAnimation, child) =>
        FadeTransition(
          opacity: animation.drive(CurveTween(curve: Motion.enter)),
          child: child,
        ),
  ),
)
```

**Second finding shape, not hypothetical:** `pageBuilder:` alone isn't
proof of a custom transition — it only rules out `builder:`. Relaty's own
router (`lib/src/core/navigation/router.dart:90-232`, all 18 routes) uses
`pageBuilder:` exclusively, but every route returns a page subclassing
`MaterialPage` directly (`pageBuilder: (context, state) => const
SplashPage()`, `SplashPage extends MaterialPage<void>`) — still the
platform default. `pageBuilder:` returning anything but
`CustomTransitionPage` is the same finding as `builder:`, just harder to
grep for — check what the returned `Page` subclass extends.

## 3. auto_route

**Detect:** `auto_route` in `pubspec.yaml`.

**Where the transition is defined:** on the route entry, in the
hand-written router config (the `@AutoRouterConfig` class, e.g.
`app_router.dart` — not the generated `.gr.dart`, not at
`context.router.push(...)` call sites). Verified via ctx7
(`/milad-akarie/auto_route_library`, High reputation, from the package's
README/autodocs — no local install found to read directly, so this section
is docs-verified, not source-verified):

```dart
CustomRoute(
  page: ContactDetailsRoute.page,
  transitionsBuilder: (context, animation, secondaryAnimation, child) =>
      FadeTransition(
        opacity: animation.drive(CurveTween(curve: Motion.enter)),
        child: child,
      ),
  duration: Motion.standard,
)
```

No `BuildContext` exists at this declaration site, so `Motion.of(context,
...)` can't be used for `duration:` — pass the bare `Motion.standard`
token. For reduce-motion awareness, apply `Motion.of` inside the
`transitionsBuilder` body instead, where `context` is a parameter.

**Fix shape:** a route entry using plain `AutoRoute(page: ...)` instead of
`CustomRoute(page: ..., transitionsBuilder: ...)` is the finding — same
shape as go_router's `builder:`/`pageBuilder:` gap, different file.

## 4. Raw Navigator 2.0

**Detect:** a `RouterDelegate` subclass (Flutter SDK,
`widgets/router.dart:1340`) driving a `Navigator` directly, no
go_router/auto_route dependency.

**Where the transition is defined:** the `Page` subclass's `createRoute`
override (`Page<T>` at `widgets/navigator.dart:685`, `Route<T>
createRoute(BuildContext context)` at line 748 — `context` is a parameter,
so `Motion.of` is usable).

**Fix shape:** the same `PageRouteBuilder` as section 1, wrapped in the
override:
```dart
@override
Route<void> createRoute(BuildContext context) => PageRouteBuilder<void>(
  settings: this,
  transitionDuration: Motion.of(context, Motion.standard),
  pageBuilder: (context, animation, secondaryAnimation) =>
      ContactDetailsScreen(contactId: contactId),
  transitionsBuilder: (context, animation, secondaryAnimation, child) =>
      FadeTransition(
        opacity: animation.drive(CurveTween(curve: Motion.enter)),
        child: child,
      ),
);
```
A `createRoute` returning a bare `MaterialPageRoute`/`CupertinoPageRoute` is
the same finding as sections 1 and 2 — check what it constructs.

## 5. Unknown / in-house

The fallback, and the one most likely to be hand-waved — so here's the
procedure that worked on a real package, not a hypothetical one.

**Step 1 — before assuming it's genuinely custom, check whether it's a
re-export.** Find the package (`~/.pub-cache/hosted/<host>/<pkg>-<ver>/`,
or its own `pubspec.yaml`) and check whether it depends on
`go_router`/`auto_route` and re-exports one wholesale. If its entrypoint
does `export 'package:go_router/go_router.dart';` (or the auto_route
equivalent), it isn't unknown — sections 2 or 3 apply directly, unmodified.

Real example: Relaty depends on `bedcode_navigator` (hosted off pub.dev at
`dart.cloudsmith.io/bedcode/bedcode/` — host-awareness matters when
locating it on disk), not `go_router`/`auto_route` directly — Relaty's own
`pubspec.yaml` has neither. But `bedcode_navigator`'s own `pubspec.yaml`
depends on `go_router: ^17.0.1`, and its entrypoint
(`lib/bedcode_navigator.dart:3`) opens with `export
'package:go_router/go_router.dart';`. Its other source files add a
path/name convention (`AppRoute`/`AppRoutes`) and error-boundary wrappers
around builder functions (`.orError()`) — none touch `GoRoute`, `Page`, or
`CustomTransitionPage`. Confirmed at the call site too: Relaty's
`lib/src/core/navigation/router.dart:83-234` constructs `GoRoute` and
`StatefulShellRoute` directly through `bedcode_navigator.dart`. Conclusion:
section 2's territory, verbatim — the "in-house navigator" was go_router
the whole time, and the finding is the one already named there
(`pageBuilder` returning bare `MaterialPage` subclasses).

**Step 2 — if it is genuinely custom** (defines its own `Page`/`Route`
subclass instead of re-exporting one), read that class's constructor for a
transition-shaped parameter (`transitionsBuilder`, a `Duration`, an
`Animation` exposed to callers).

**Hard rule:** if that surface exposes no transition parameter at all, the
absence *is* the finding. Report "router does not support custom
transitions; fixing this requires a change to `<package>`" and stop — do
not attempt a workaround at call sites, and do not guess at API the
package doesn't expose in code you can read.
