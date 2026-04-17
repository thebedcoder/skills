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
- Platform checks via `Platform.isIOS` / `Platform.isAndroid`
- iOS: `CupertinoPageRoute` where iOS users expect native feel
- Android: back button handling — `WillPopScope` or PopScope
- Web considerations: don't use plugins that require native code unless needed

## Testing
- Widget tests for every screen — verify states: loading, loaded, error, empty
- `pumpAndSettle()` with timeout — avoid infinite hangs on animations
- Integration tests (`integration_test` package) for critical user flows
- Mock native plugins with `package:plugin_platform_interface`

## Dependencies
- Lock versions in `pubspec.yaml` — no `^` for production apps
- `flutter pub outdated` before upgrades
- Check `pub.dev` score before adding packages — abandoned packages are risk
