# Dart / Flutter Security Guide

## Secure Storage

```dart
// FLAG — SharedPreferences stores data unencrypted in plaintext
final prefs = await SharedPreferences.getInstance();
prefs.setString('auth_token', token);    // FLAG — unencrypted
prefs.setString('password', password);   // FLAG — never store passwords

// Safe — use flutter_secure_storage (encrypted on both platforms)
const storage = FlutterSecureStorage();
await storage.write(key: 'auth_token', value: token);
```

**Hive without encryption:**
```dart
// FLAG — Hive box without encryption for sensitive data
final box = await Hive.openBox('credentials');
box.put('token', authToken);    // FLAG — unencrypted

// Safe — encrypted Hive box
final encryptedBox = await Hive.openBox(
    'credentials',
    encryptionCipher: HiveAesCipher(encryptionKey));
```

---

## Network Security

**Android cleartext traffic:**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<!-- FLAG — allows HTTP -->
<application android:usesCleartextTraffic="true">
```

**iOS ATS disabled:**
```xml
<!-- ios/Runner/Info.plist -->
<!-- FLAG -->
<key>NSAllowsArbitraryLoads</key>
<true/>
```

**Disabled certificate verification:**
```dart
// FLAG — accepting any certificate
HttpClient client = HttpClient()
    ..badCertificateCallback = (cert, host, port) => true;  // FLAG

// FLAG — in Dio
(dio.httpClientAdapter as DefaultHttpClientAdapter).onHttpClientCreate = (client) {
    client.badCertificateCallback = (cert, host, port) => true;  // FLAG
    return client;
};
```

---

## Cryptography

```dart
// FLAG — using dart:math Random for security
import 'dart:math';
final random = Random();
final token = random.nextInt(1000000).toString();   // FLAG — predictable

// Safe — cryptographically secure
import 'dart:math';
final secureRandom = Random.secure();
final bytes = List.generate(32, (_) => secureRandom.nextInt(256));
```

**Weak hash for passwords:**
```dart
import 'package:crypto/crypto.dart';
final digest = md5.convert(utf8.encode(password));  // FLAG
final digest = sha1.convert(utf8.encode(password)); // FLAG

// Safe — use bcrypt or argon2
import 'package:bcrypt/bcrypt.dart';
BCrypt.hashpw(password, BCrypt.gensalt());
```

---

## Deep Links / URL Handling

```dart
// FLAG — executing actions from deeplinks without validation
void handleDeepLink(Uri uri) {
    final action = uri.queryParameters['action'];
    performAction(action!);    // FLAG — unvalidated action
    
    final redirect = uri.queryParameters['next'];
    Navigator.pushNamed(context, redirect!);  // FLAG — arbitrary navigation
}
```

---

## SQL Injection (sqflite)

```dart
// FLAG — string interpolation in raw query
final result = await db.rawQuery(
    "SELECT * FROM users WHERE username = '$username'"  // FLAG
);

// Safe — parameterized
final result = await db.query(
    'users',
    where: 'username = ?',
    whereArgs: [username],
);
```

---

## WebView Security

```dart
// FLAG — JavaScript enabled, allowing arbitrary URLs
WebView(
    javascriptMode: JavascriptMode.unrestricted,  // note for context
    onWebViewCreated: (controller) {
        controller.loadUrl(userProvidedUrl);       // FLAG if unvalidated
    },
    navigationDelegate: (request) {
        return NavigationDecision.navigate;        // FLAG — allows any navigation
    },
)

// FLAG — running user-controlled JavaScript
webViewController.runJavascript(userInput);   // FLAG — XSS/code execution
```

---

## Platform Channel Security

```dart
// Validate data from platform channels — treat as untrusted if channel name is dynamic
const platform = MethodChannel('com.example/channel');

// FLAG — if channel name is user-controlled
final channelName = userInput;
MethodChannel(channelName).invokeMethod('doSomething');   // FLAG
```

---

## Android-specific (in Flutter projects)

Check `android/` directory for:
```xml
<!-- FLAG — exported activities accessible to other apps -->
<activity android:exported="true" android:name=".SensitiveActivity">

<!-- FLAG — debuggable in release build -->
<application android:debuggable="true">

<!-- FLAG — backup enabled (exposes SharedPreferences) -->
<application android:allowBackup="true">
```
