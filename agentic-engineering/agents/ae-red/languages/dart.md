#  Dart / Flutter Bug Patterns

## setState after widget disposed

```dart
// Bug — async gap allows widget to be disposed before setState
void loadData() async {
    final data = await fetchData();
    setState(() {          // crash if widget disposed during await
        _data = data;
    });
}

// Fix
void loadData() async {
    final data = await fetchData();
    if (!mounted) return;   // check before setState
    setState(() { _data = data; });
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
