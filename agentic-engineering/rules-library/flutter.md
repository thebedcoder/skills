---
paths:
  - "**/*.dart"
  - "lib/**/*.dart"
---

# Flutter Rules

## Widgets
- `StatelessWidget` by default — `StatefulWidget` only when state is genuinely needed
- Break down large build methods — extract widgets, not functions
- `const` constructors everywhere possible — rebuilds are cheaper
- Named parameters for widget constructors — positional only for required, obvious cases

## State management
- Pick one approach per project: Riverpod, BLoC, Provider, or Redux — don't mix
- Global state is suspicious — prefer lifting state only as high as needed
- Never use `setState` from async callbacks without checking `mounted`
- `initState` for one-shot initialization, `didChangeDependencies` when it depends on inherited widgets

## Async / Futures
- Always handle errors in `Future` — no floating futures
- `FutureBuilder` inside `build()` is a bug — Future must be stable (created in `initState` or passed in)
- `StreamBuilder` — always handle `snapshot.connectionState` and `hasError`
- Cancel subscriptions in `dispose()` — memory leaks otherwise

## Navigation
- Pick Navigator 1.0 or 2.0 (go_router) per project — don't mix
- Typed route arguments — no raw `Map<String, dynamic>` passing
- Back button behavior tested on Android — iOS doesn't have one
- Deep links configured for both platforms

## Performance
- `ListView.builder` for variable-length lists — never `ListView(children: list.map(...))`
- `const` widgets wherever possible — avoids rebuild
- Images: `cached_network_image` for remote, `Image.asset` for bundled
- Profile with DevTools — never guess

## Platform-specific
- Platform checks via `Theme.of(context).platform` or `defaultTargetPlatform`. **`Platform.isIOS` / `Platform.isAndroid` throw on web** — `dart:io` has no web implementation. Guard with `kIsWeb` first if you must use them
- iOS: `CupertinoPageRoute` where iOS users expect native feel
- Android: back button handling — `PopScope`. `WillPopScope` is deprecated (Flutter 3.12) and does not work with predictive back
- Web considerations: don't use plugins that require native code unless needed

## Testing
- Widget tests for every screen — verify states: loading, loaded, error, empty
- `pumpAndSettle()` with timeout — avoid infinite hangs on animations
- Integration tests (`integration_test` package) for critical user flows
- Mock native plugins by setting a mock message handler on the plugin's `MethodChannel` (`TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler`), or by injecting the plugin's platform-interface implementation. `plugin_platform_interface` itself is the base class plugin authors extend, not a mocking mechanism

## Dependencies
- Apps: keep caret ranges in `pubspec.yaml` and commit `pubspec.lock` — the lockfile is what pins an app's builds. Packages: never commit the lockfile; the consuming app resolves. Pin an exact version only to work around a specific broken release, with a comment saying which
- `flutter pub outdated` before upgrades
- Check `pub.dev` score before adding packages — abandoned packages are risk
