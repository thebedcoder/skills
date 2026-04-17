---
paths:
  - "**/*.swift"
  - "**/*.m"
  - "**/*.h"
---

# iOS Native Development Rules

## Architecture
- Pick one: MVVM, VIPER, Clean Architecture — stick to it across the project
- ViewControllers are glue — no business logic, no network calls, no persistence
- Dependency injection via initializers — no `shared` singletons scattered
- One screen per ViewController — split into child VCs or views for complexity

## Concurrency
- `async/await` for new code — not completion handlers
- `@MainActor` on types that update UI — not `DispatchQueue.main.async` scattered
- `Task {}` lifecycle managed — cancel on view disappear
- No blocking the main thread — I/O always off-main

## Memory
- `[weak self]` in closures stored on self or passed to long-lived operations
- `[weak self]` not needed for short-lived operations (immediate callbacks, `.map` on publishers)
- Retain cycle audit: every closure captured by self, every delegate reference
- Instruments → Leaks check before release

## Storage
- Keychain for credentials, tokens, secrets — never `UserDefaults`
- `UserDefaults` for user preferences only — not sensitive data, not large data
- Core Data or SwiftData for structured persistence
- File system writes use `FileManager` — check iCloud exclusion for caches

## Networking
- `URLSession` with proper configuration — timeout, cache policy explicit
- Decode into `Codable` types — no manual JSON parsing
- Certificate pinning for sensitive apps — validate properly
- Retry logic explicit — not silent infinite retries

## UI (UIKit if not SwiftUI)
- Auto Layout only — no manual frames (except draw)
- Constraints activated via `isActive = true` or `NSLayoutConstraint.activate`
- Cell reuse via `dequeueReusableCell(withIdentifier:for:)` — never `init()`
- `prepareForReuse()` clears cell state — image, text, handlers

## Accessibility
- VoiceOver tested — actual rotor navigation, not just inspector
- Dynamic Type supported — no `.systemFont(ofSize: 14)` hardcoded
- Traits set on custom controls — `.button`, `.header`, `.adjustable`
- Contrast meets WCAG AA — use `UIColor` system colors

## Privacy and permissions
- Info.plist usage description for every permission — clear user-facing copy
- Request permissions contextually — when user needs the feature, not upfront
- Handle denial gracefully — don't crash, explain how to enable later
- ATT (App Tracking Transparency) for tracking — denial-safe flows

## Build and release
- Swift Package Manager for dependencies — CocoaPods only if SPM can't do it
- Build settings in xcconfig files — not buried in project settings
- App Thinning: bitcode off (deprecated), asset catalogs for images
- Version bumped manually before TestFlight — no automated version incrementing that's hard to trace
