# State management: where loading / empty / error branches live

A missing empty or error branch is a motion finding, not only a UX one — the branch that
does not exist cannot be animated, and the branch that appears without a transition
flashes. Per solution: where the branch lives, what "missing" looks like there, where the
animation wraps. Durations, curves and `AnimatedSwitcher` mechanics live in
`motion-system.md` — cited, not restated. Four identities: `setstate`, `provider`,
`riverpod`, `bloc`. Detect first.

## 0. Detecting the solution — three greps that lie

Verified against Relaty (654 Dart files, `flutter_bloc` 9.1.1, no Provider/Riverpod). Per
`routing.md` §5 a direct-dependency check is no proof of absence either (a wrapper can
re-export the real package) — confirm with a widget grep as well as a manifest one.

| Naive detector | Relaty result | Why it lies |
|---|---|---|
| `context.watch` / `context.read` / `context.select` → "Provider" | 10 files hit `context.select` | `flutter_bloc` **re-exports them from `provider`**: `~/.pub-cache/hosted/pub.dev/flutter_bloc-9.1.1/lib/flutter_bloc.dart:8-9` — `export 'package:provider/provider.dart' show ProviderNotFoundException, ReadContext, SelectContext, WatchContext;`. Every flutter_bloc app false-positives. |
| `Consumer<` → "Provider" | 2 files | Both are `BlocConsumer<` — substring match. `\bConsumer<` → 0 (verified). Same trap for `Provider(`: `(^\|[^A-Za-z])Provider\(` → 0, while 21 files match `BlocProvider\|RepositoryProvider`. |
| `provider` in `pubspec.lock` | present | `dependency: transitive` (`pubspec.lock:1632-1633`), pulled in by flutter_bloc. Read that `dependency:` field, or the direct `dependencies:` block of `pubspec.yaml` — 0 hits there. |

## 1. setState

**Detect:** `setState(` inside a `State<…>` (Relaty: 16 files) branching on a plain field
(`bool _isLoading`, `Object? _error`), or a `FutureBuilder`/`StreamBuilder` snapshot
(3 files). **The branch lives** in an `if`/ternary/`switch` inside `build`, or in the
`builder:` of those two.

**What "missing branch" looks like** — the last two are what a grep gets wrong:

- no `else` arm;
- `snapshot.hasError` never read;
- `hasError` read, but the branch **returns the loading widget**. Real:
  `core/presentation/widgets/boot_loader.dart:42-46` — the comment on `:43` says "you might
  want to show an error widget here", the code returns `widget.loadingWidget ?? const
  SizedBox.shrink()`. A `hasError` grep clears this file wrongly; confirm what it *returns*;
- `!snapshot.hasData` as the only branch (`sticky_infinite_list/widget.dart:166`) — error
  collapses into loading, and `hasError` never appears to grep at all.

**Where an animation wraps:** the conditional, in `AnimatedSwitcher` (`motion-system.md` §4).
Correct real example: `ai_greeting/…/loaded.dart:240-247` and `:292-299` wrap a setState-driven
bool in `AnimatedSwitcher` + `SizeTransition`/`FadeTransition`. Its two inline durations
(300ms, 200ms) are a token finding (`motion-system.md` §1), not a state finding.

## 2. Provider — docs-verified, not source-verified

Not found in any project read for this skill (Relaty: `provider` transitive only, `\bConsumer<`
and `ChangeNotifierProvider` both 0). **Documented API, not walked against real source.**

**Detect:** `provider` as a *direct* dep **and** a widget hit — `MultiProvider`,
`ChangeNotifierProvider`, `ProxyProvider`, bare `(^|[^A-Za-z])Provider[(<]`, `\bConsumer<`,
`\bSelector<`. A modern Provider app is `MultiProvider` + `context.watch<T>()` and may never
write `Consumer` at all. Word boundaries stay load-bearing: plain `Selector<` matches all 7
`BlocSelector<` files in Relaty, `\bSelector<` matches 0. `context.*` proves nothing (§0).

**Branch / missing / animation:** the §1 shapes one level in — **the branch lives** inside
`Consumer`'s `builder:` or after a `context.watch<T>()`, on the notifier's own `isLoading` /
`error` fields, with `AnimatedSwitcher` around that conditional. One Provider-specific shape:
a `ChangeNotifier` owning an `error` field no widget reads — the Provider spelling of the
confirmed BLoC bug in §4, confirmed the same way (assigned anywhere? rendered?).

## 3. Riverpod — docs-verified, not source-verified

Relaty: 0 hits for `ConsumerWidget`, `ref.watch`, `AsyncValue`, `.when(data:`, `maybeWhen`
— not walked against real source. **Detect:** `riverpod`/`flutter_riverpod`/`hooks_riverpod`
as a direct dep + `ConsumerWidget`/`ref.watch`. **The branch lives** in the `.when(…)`/`.map(…)`
call on the `AsyncValue` from `ref.watch(…)`, inside `build` — not in the provider definition.

**Do not file "missing branch" against Riverpod.** `AsyncValue.when(data:, loading:,
error:)` requires all three arms — the branch cannot be absent. Different findings:

| Shape | Finding |
|---|---|
| `.when(loading: () => const CircularProgressIndicator())` | bare spinner; loading↔data swap is an instant cut — §5 |
| `.maybeWhen(…, orElse: …)` / `.maybeMap` where `orElse` absorbs `error` | error swallowed into a neutral fallback — the Riverpod spelling of "no error branch" |
| `.when(…)` not wrapped in a switcher | all three branches cut instantly |
| `.valueOrNull` / `.value` read with no `isLoading` / `hasError` check | the branch mechanism is bypassed entirely |

**Where an animation wraps:** `AnimatedSwitcher` around the `.when(…)` call — but read §5
first: `data`/`loading`/`error` often return the same widget type, which kills the swap.

## 4. BLoC — source-verified against Relaty

**Detect:** `flutter_bloc` as a direct dep plus `BlocBuilder`/`BlocSelector`/`BlocConsumer`.
Relaty: 24 files with `BlocBuilder`, 13 `BlocListener`, 8 `BlocPresentationListener`,
7 `BlocSelector`, 2 `BlocConsumer`. **The branch lives** in the `builder:` callback.

**Sealed states do NOT make `state-3` / `state-4` dead rules.** Every state class read in
Relaty is `sealed` (`contacts_state.dart:3`, `timeline_state.dart:5`, `profile_state.dart:3`,
`offline_mode_state.dart:3`) and a real missing error branch survived anyway. Exhaustiveness
is compiler-enforced only for a `switch` **expression** over the sealed type **with no
wildcard arm**. Four escape hatches, all real here:

| Shape | Real site | Missing branch is a compile error? |
|---|---|---|
| `switch (state)` expression, no `_ =>` | `contacts_screen_content.dart:42-56` — 4 arms over 4 subclasses | **Yes.** `state-3`/`state-4` are dead here. Do not report. |
| same, with a `_ =>` wildcard | `smart_add_content.dart:37-46` (`_ => const SizedBox.shrink()`) | No — the wildcard absorbs unhandled states silently |
| `if (state case X())` chain with a fallthrough `return` | `timeline_content.dart:104-124` (falls through to `return const _Loading()`) | No — the fallthrough absorbs everything |
| `buildWhen` that filters the state out | `profile_content.dart:34` and `:83` (`current is ProfileLoaded`) | No — the builder never runs, so even an exhaustive switch is dead code |

`buildWhen` is the hatch that hides — 20 of Relaty's 24 `BlocBuilder` files pass one, and it
is what made the following real. **Walked end to end (`profile`):** `profile_content.dart:82`
is a `BlocBuilder<ProfileBloc, ProfileState>` with `buildWhen: … current is ProfileLoaded`
(`:83`); `:85` renders the card, `:95` falls back to a skeleton. `ProfileState` is sealed with
a `ProfileError` subclass (`profile_state.dart:3`, `:29`); `ProfileError` really is emitted
(`profile_bloc.dart:78` emits directly; `:71`/`:73` return it from an `onError` transformer);
and no widget between the provider and the builder
listens to `ProfileBloc` state — `profile_screen.dart:27-45` wraps `ProfileContent` in
`BlocProvider`, `LifecycleHooksSubscriber` (`:31`) and `AuthStateListener` (`:37`), none
reading it. Verdict: **`state-4` confirmed** — the user sees a skeleton forever.

**Confirm step — run all four before reporting;** skipping any one produces a false
positive. (a)–(c) must hold true for a finding to be real; (d) cuts both ways.

- **(a)** the state subclass exists in the sealed hierarchy;
- **(b)** the bloc really emits it — `grep -rn '<StateClass>' lib --include='*.dart'`. A
  subclass nothing emits is dead code, not a missing branch;
- **(c)** no sibling listener handles it out of band. Relaty routes errors through
  `bloc_presentation`: `timeline_content.dart:75-77` shows `TimelineErrorEvent` as a toast
  from a `BlocPresentationListener`, not from `BlocBuilder` — a builder with no error arm
  under such a listener is **not** a finding;
- **(d)** whether the builder is reached for that state — read `buildWhen`. Reached with
  no arm for it, **or not reached at all**: both are the finding. Only a `buildWhen`
  admitting the state *and* an arm rendering it clears this check.

**Counter-examples that must not be reported** (all real, all clean):

- `contacts_screen_content.dart:42-56` — exhaustive switch; loading, empty, error all present.
  `:45` `ContactsLoaded() when state.isEmpty` is the empty branch: empty is a **guard on
  loaded**, not its own state class, so "no `ContactsEmpty` state exists" is the wrong
  question. Only finding is the absent transition — and see §5, where this same file shows
  the obvious key choice breaking the fix.
- `timeline_content.dart` — `_Loading` (`:131`), `_Error` (`:146`), `_Empty` (`:166`) all
  present despite the non-exhaustive `if case` shape.
- `smart_add_content.dart:45` — the `_ =>` wildcard covers `SmartAddInitial` and
  `SmartAddSuccess`, both transient, and `buildWhen` (`:30-34`) already excludes them.

**Where an animation wraps:** the `builder:` return value — `AnimatedSwitcher`
(`motion-system.md` §4) around the `switch`/`case` expression. Relaty does this in 2 of 24
(`smart_add_content.dart:36`, `offline_banner.dart:21`); 11 of 24 contain any such token.

## 5. The rule for all four

**An empty or error state that appears with no transition is worse than none at all — it
flashes.** Any branch a fix wave adds gets the loading branch's treatment, same commit. Same
shape across all four identities:

```dart
AnimatedSwitcher(
  duration: Motion.of(context, Motion.standard),
  switchInCurve: Motion.enter,
  switchOutCurve: Motion.exit,
  // Key the BRANCH, never the state type. Real arms, contacts_screen_content.dart:42-56:
  child: KeyedSubtree(
    key: ValueKey(switch (state) {
      ContactsInitial() || ContactsLoading() => 'loading',
      ContactsLoaded() when state.isEmpty => 'empty',
      ContactsLoaded() => 'data',
      ContactsError() => 'error',
    }),
    child: switch (state) { /* branch widgets unchanged */ },
  ),
)
```

**The `KeyedSubtree` is not optional.** `AnimatedSwitcher` decides "is this a new child" via
`Widget.canUpdate` — same runtime type *and* same key means no transition, the existing element
is just updated in place (Flutter SDK `widgets/animated_switcher.dart:78-84`, `:130-131`,
`:282`). Loading and empty branches that both return a `Padding`, or both a `Center`, swap
with zero animation; `AnimatedTwoStateSwitcher:80` keys on `ValueKey(widget.showFirst)` for
exactly this reason.

**But `state.runtimeType` is the wrong key** whenever a `when` guard splits one state class
across branches. `contacts_screen_content.dart:45` and `:46` are both `ContactsLoaded`, so a
runtimeType key makes empty and data indistinguishable and the swap goes silent — while
*omitting* the key would have worked there, `ContactsEmpty` and `ContactsLoaded` being different
widget types. The obvious key actively breaks the showcase case. One string per branch, as
above; never a value varying *within* a branch, or it re-animates on every update. Two more
silent deaths: a switcher placed *inside* each branch animates nothing (wrap once, at the
branch point); and a `buildWhen` narrower than the branches the builder renders means nothing
rebuilds, so nothing transitions (`profile_content.dart:83`).
