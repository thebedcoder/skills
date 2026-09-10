#  Dart / Flutter Bug Patterns

## setState after widget disposed

```dart
// Bug — two of them. `void ... async` swallows the returned Future, so a throw
// inside becomes an unhandled async error nothing can catch. And the async gap
// lets the widget be disposed before setState runs.
void loadData() async {
    final data = await fetchData();
    setState(() {          // crash if widget disposed during await
        _data = data;
    });
}

// Fix — Future<void>, and re-check mounted after every await
Future<void> loadData() async {
    final data = await fetchData();
    if (!mounted) return;   // check before setState
    setState(() { _data = data; });
}
```

**Also flag `use_build_context_synchronously`:** any `BuildContext` used after an
`await` — `Navigator.of(context)`, `ScaffoldMessenger.of(context)`,
`Theme.of(context)` — without a `mounted` check between. It is a lint in the
standard `flutter_lints` set, and the crash it prevents is the same one above
wearing a different hat.

```dart
// Bug
Future<void> save() async {
    await repo.save(item);
    Navigator.of(context).pop();          // context may be dead
}

// Fix
Future<void> save() async {
    await repo.save(item);
    if (!context.mounted) return;
    Navigator.of(context).pop();
}
```

## FutureBuilder/StreamBuilder rebuild loops

```dart
// Bug — Future created inside build() — rebuilds on every rebuild
FutureBuilder(
    future: fetchData(),   // new Future every build — infinite rebuilds
    builder: (ctx, snap) => ...
)

// Fix — create Future in initState
late final Future<Data> _future;

@override
void initState() {
    super.initState();
    _future = fetchData();   // created once
}
```

## Null in non-nullable position after upgrade

```dart
// After null safety migration — late variable used before init
late String _name;

@override
Widget build(BuildContext context) {
    return Text(_name);   // LateInitializationError if _name not set yet
}
```
