# Kotlin / Android Security Guide

## Android-specific

**Exported components:**
```xml
<!-- AndroidManifest.xml -->
<!-- FLAG — exported Activity without permission check -->
<activity android:name=".SensitiveActivity" android:exported="true">
    <!-- No android:permission attribute = any app can launch it -->
</activity>

<!-- FLAG — exported BroadcastReceiver receiving sensitive intents -->
<receiver android:name=".PaymentReceiver" android:exported="true">
```

**Debuggable release build:**
```xml
<!-- FLAG — debuggable in release -->
<application android:debuggable="true">
```

**Backup enabled:**
```xml
<!-- Exposes SharedPreferences and databases to adb backup -->
<application android:allowBackup="true">   <!-- FLAG for sensitive apps -->
```

---

## Insecure Storage

```kotlin
// FLAG — SharedPreferences for sensitive data (unencrypted)
val prefs = getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
prefs.edit().putString("auth_token", token).apply()    // FLAG
prefs.edit().putString("password", password).apply()   // FLAG

// FLAG — MODE_WORLD_READABLE (deprecated but flag if seen)
getSharedPreferences("prefs", Context.MODE_WORLD_READABLE)

// Safe — EncryptedSharedPreferences
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()
val encryptedPrefs = EncryptedSharedPreferences.create(
    context, "secure_prefs", masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)
```

---

## SQL Injection (Room / SQLite)

```kotlin
// FLAG — raw query with string interpolation
@RawQuery
fun getUser(query: SimpleSQLiteQuery): User

// Usage:
val query = SimpleSQLiteQuery("SELECT * FROM users WHERE name = '$name'")  // FLAG

// Safe — Room with parameterized query
@Query("SELECT * FROM users WHERE name = :name")
fun getUserByName(name: String): User
```

---

## Network Security

```kotlin
// FLAG — TrustManager that accepts all certificates
val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
    override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
    override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}  // FLAG
    override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
})

// FLAG — OkHttp with disabled verification
OkHttpClient.Builder()
    .hostnameVerifier { _, _ -> true }   // FLAG
    .build()
```

---

## Deep Link / Intent Handling

```kotlin
// FLAG — executing actions from Intent extras without validation
val action = intent.getStringExtra("action")
performAction(action!!)    // unvalidated action from Intent

// FLAG — WebView loading URL from Intent
val url = intent.getStringExtra("url")
webView.loadUrl(url!!)     // FLAG — javascript: scheme possible

// Safe
val url = intent.getStringExtra("url") ?: return
if (!url.startsWith("https://myapp.com/")) return
webView.loadUrl(url)
```

---

## WebView Security

```kotlin
// FLAG — JavaScript enabled with local file access
webView.settings.javaScriptEnabled = true
webView.settings.allowFileAccess = true         // FLAG with JS enabled
webView.settings.allowUniversalAccessFromFileURLs = true  // FLAG

// FLAG — JavaScript interface without input validation
class JsInterface {
    @JavascriptInterface
    fun executeNativeAction(command: String) {
        // Attacker controls 'command' via XSS in WebView
        when(command) {
            "deleteAccount" -> deleteAccount()  // FLAG
        }
    }
}

// FLAG — addJavascriptInterface on older API levels
// Exploitable via reflection on API < 17
webView.addJavascriptInterface(jsInterface, "Android")
// Ensure minSdkVersion >= 17
```

---

## Cryptography

```kotlin
// FLAG — weak algorithms for security
MessageDigest.getInstance("MD5").digest(password.toByteArray())  // FLAG
MessageDigest.getInstance("SHA-1").digest(passwordBytes)          // FLAG

// FLAG — insecure random
val random = Random()
val token = random.nextInt(1000000)  // FLAG

// Safe
val bytes = ByteArray(32)
SecureRandom().nextBytes(bytes)

// Safe password hashing — use BCrypt (add bcrypt dependency)
BCrypt.hashpw(password, BCrypt.gensalt(12))
```
