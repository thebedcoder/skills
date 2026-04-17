---
paths:
  - "**/*.kt"
  - "**/*.java"
  - "**/AndroidManifest.xml"
---

# Android Native Development Rules

## Architecture
- MVVM with ViewModel + LiveData/StateFlow — or Clean Architecture with Use Cases
- No business logic in Activities or Fragments
- Repository pattern for data — ViewModels depend on repositories, not directly on Room or Retrofit
- Dependency injection with Hilt — not manual factories at scale

## UI (Jetpack Compose preferred)
- Compose for new code — XML layouts only in legacy modules
- Stateless composables receive state + callbacks, no ViewModel access inside
- `remember` for UI state, `rememberSaveable` for state to survive config change
- `derivedStateOf` for computed state that doesn't need to trigger recomposition

## Coroutines
- `viewModelScope` / `lifecycleScope` — never `GlobalScope`
- Dispatchers explicit: `Dispatchers.IO` for disk/network, `Dispatchers.Default` for CPU
- `withContext` for switching, `launch`/`async` for concurrency
- StructuredConcurrency — child jobs cancel with parent

## State and side effects
- `StateFlow` for observable state — not `LiveData` in new code
- `SharedFlow` for one-shot events (navigation, snackbars)
- Side effects in `LaunchedEffect`, `DisposableEffect`, `SideEffect` — not in composition
- Keys on effects correct — rerun when keys change, not on every recomposition

## Navigation
- Jetpack Compose Navigation with typed routes (kotlinx.serialization)
- Deep links declared in navigation graph
- Back stack handled predictably — test system back button behavior

## Storage
- Room for structured data — never raw SQLite
- DataStore for preferences — not SharedPreferences in new code
- EncryptedSharedPreferences / Keystore for sensitive data
- Scoped storage for files (Android 10+) — no external storage without permission

## Networking
- Retrofit + OkHttp + Moshi/kotlinx.serialization
- Interceptors for auth headers — not adding to every request manually
- Certificate pinning for sensitive apps
- Offline-first: cache + conditional requests

## Manifest and permissions
- Minimum SDK justified — don't bump up without reason
- Exported components audited — every `android:exported="true"` has clear reason
- Permissions requested runtime (API 23+) — explain rationale before the dialog
- Background location only if needed — Play Store scrutinizes this

## Resources
- Strings in `strings.xml` always — no hardcoded UI text
- Dimensions in `dimens.xml` — or Compose `Modifier` values via constants
- Vector drawables for icons — not multiple PNG densities
- Dark mode via `values-night` — test both themes

## Build
- Gradle with KTS (Kotlin DSL) — not Groovy in new projects
- Version catalog (`libs.versions.toml`) for dependencies
- Proguard/R8 rules maintained for release builds
- Crashlytics or similar — crashes visible without waiting for user reports
