# Flutter Testing (flutter_test)

## Three levels of tests

```
test/
  unit/
    user_service_test.dart    ← pure Dart, fast, no Flutter
  widget/
    login_screen_test.dart    ← widget rendering, no real device
  integration/
    app_test.dart             ← full app on device/emulator, slow
```

## Unit tests

```dart
// Pure Dart — no Flutter dependencies
void main() {
    group('UserService', () {
        late UserService sut;
        late MockUserRepository mockRepo;

        setUp(() {
            mockRepo = MockUserRepository();
            sut = UserService(mockRepo);
        });

        test('returns user on valid id', () async {
            when(mockRepo.findById(1))
                .thenAnswer((_) async => User(id: 1, name: 'Alice'));

            final user = await sut.getUser(1);

            expect(user.name, equals('Alice'));
        });

        test('throws UserNotFound on missing id', () async {
            when(mockRepo.findById(999))
                .thenThrow(UserNotFoundException());

            expect(() => sut.getUser(999), throwsA(isA<UserNotFoundException>()));
        });
    });
}
```

## Widget tests

```dart
void main() {
    testWidgets('login button submits credentials', (tester) async {
        final mockAuth = MockAuthService();
        when(mockAuth.login(any, any)).thenAnswer((_) async => AuthToken('token'));

        await tester.pumpWidget(
            MaterialApp(home: LoginScreen(auth: mockAuth))
        );

        await tester.enterText(find.byKey(const Key('email')), 'alice@test.com');
        await tester.enterText(find.byKey(const Key('password')), 'password123');
        await tester.tap(find.byType(ElevatedButton));
        await tester.pump();   // process tap
        await tester.pump();   // process async result

        verify(mockAuth.login('alice@test.com', 'password123')).called(1);
    });
}
```

**`pump()` vs `pumpAndSettle()`:**
- `pump()` — processes pending frames once. Use when you know what you're waiting for.
- `pumpAndSettle()` — keeps pumping until no more frames. Use for animations.
- `pump(Duration)` — advance by duration. Use for timers.

**Flag:** `pumpAndSettle()` in tests with infinite animations — hangs forever.

## Assertions

```dart
// Finding widgets
expect(find.text('Hello'), findsOneWidget)
expect(find.text('Error'), findsNothing)
expect(find.byType(CircularProgressIndicator), findsOneWidget)
expect(find.byKey(const Key('submit')), findsOneWidget)

// Widget state
final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
expect(button.enabled, isTrue)

// Text content
final text = tester.widget<Text>(find.byKey(const Key('status')));
expect(text.data, equals('Success'))
```

## Mocking with mockito / mocktail

```dart
// mockito — requires code generation
// mocktail — no code generation (preferred for new projects)

// mocktail
class MockAuthService extends Mock implements AuthService {}

void main() {
    test('...', () async {
        final mock = MockAuthService();
        when(() => mock.login(any(), any()))
            .thenAnswer((_) async => AuthToken('token'));

        await service.performLogin(mock);

        verify(() => mock.login('alice@test.com', 'password')).called(1);
    });
}
```

## Testing setState and async state

```dart
testWidgets('shows loading then content', (tester) async {
    final completer = Completer<List<Item>>();
    when(mockRepo.fetchItems()).thenAnswer((_) => completer.future);

    await tester.pumpWidget(MaterialApp(home: ItemListScreen(repo: mockRepo)));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byType(ListView), findsNothing);

    completer.complete([Item(id: 1, name: 'Test')]);
    await tester.pumpAndSettle();

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byType(ListView), findsOneWidget);
    expect(find.text('Test'), findsOneWidget);
});
```

## What to flag

- Widget tests missing `await tester.pump()` after user interactions
- `pumpAndSettle()` used where animation never settles — will hang
- No widget tests for screens with meaningful interaction logic
- Unit tests using `flutter_test` instead of plain `test` — slower, unnecessary
- Missing `setUp`/`tearDown` when mocks are reused across tests
- Tests calling real network or real SharedPreferences without mocking
