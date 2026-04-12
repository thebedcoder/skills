# Swift / iOS Security Guide

## Data Storage

**Keychain vs UserDefaults:**
```swift
// FLAG — sensitive data in UserDefaults (unencrypted, backed up)
UserDefaults.standard.set(authToken, forKey: "auth_token")
UserDefaults.standard.set(password, forKey: "password")

// Safe — use Keychain for sensitive data
let query: [CFString: Any] = [
    kSecClass: kSecClassGenericPassword,
    kSecAttrAccount: "auth_token",
    kSecValueData: tokenData,
    kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
]
SecItemAdd(query as CFDictionary, nil)
```

**Sensitive data in plist or plain files:**
```swift
// FLAG — writing credentials to unencrypted file
let data = token.data(using: .utf8)
data?.write(to: documentsURL.appendingPathComponent("credentials.txt"))
```

---

## Network Security

**Disabled ATS (App Transport Security):**
```xml
<!-- FLAG in Info.plist — disables HTTPS requirement -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

**Disabled certificate pinning / verification:**
```swift
// FLAG — accepting any certificate
func urlSession(_ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    completionHandler(.useCredential, URLCredential(trust: challenge.protectionSpace.serverTrust!))
}
```

---

## Cryptography

```swift
// FLAG — MD5 or SHA1 for security purposes
let digest = Insecure.MD5.hash(data: passwordData)
let digest = Insecure.SHA1.hash(data: tokenData)

// Safe
import CryptoKit
let digest = SHA256.hash(data: data)

// Safe — password hashing (use a proper KDF)
// CommonCrypto PBKDF2
CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2), ...)
```

**Weak random:**
```swift
// FLAG for security use
let random = Int.random(in: 0..<1000000)   // Swift.random — OK for non-security
arc4random_uniform(1000000)                 // arc4random is actually cryptographically secure

// Safe for security tokens
var bytes = [UInt8](repeating: 0, count: 32)
SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
```

---

## SQL Injection (SQLite / CoreData)

```swift
// FLAG — string interpolation in SQL
let query = "SELECT * FROM users WHERE username = '\(username)'"
db.executeQuery(query, withArgumentsIn: [])

// Safe — parameterized
let query = "SELECT * FROM users WHERE username = ?"
db.executeQuery(query, withArgumentsIn: [username])
```

---

## Deeplink / URL Scheme Handling

```swift
// FLAG — executing action from deeplink without validation
func application(_ app: UIApplication, open url: URL, options: [...]) -> Bool {
    if url.scheme == "myapp" {
        let action = url.host   // attacker-controlled
        performAction(action)   // FLAG — unvalidated action from URL
    }
}

// FLAG — redirect to arbitrary URL from deeplink
let destination = url.queryParameters["redirect"]
UIApplication.shared.open(URL(string: destination!)!)
```

---

## WebView Security

```swift
// FLAG — JavaScript enabled with local file access
let config = WKWebViewConfiguration()
config.preferences.javaScriptEnabled = true
webView.loadFileURL(url, allowingReadAccessTo: baseURL)  // local file read

// FLAG — evaluating user input as JavaScript
webView.evaluateJavaScript(userInput) { result, error in ... }

// FLAG — allowing arbitrary navigation
func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    decisionHandler(.allow)   // allows any URL including file:// and javascript:
}
```

---

## Biometric Authentication Bypass

```swift
// FLAG — not verifying LAContext result properly
context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
    localizedReason: "Authenticate") { success, error in
    if success {
        self.unlockApp()   // OK
    }
    // Missing: else branch doesn't prevent access in some flow paths
}

// FLAG — using LocalAuthentication without also checking Keychain ACL
// Device passcode bypass: if device is jailbroken, LAContext can be bypassed
// Secure: store secrets in Keychain with biometric ACL, not just gate with LAContext
```
