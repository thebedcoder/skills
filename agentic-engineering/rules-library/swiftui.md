---
paths:
  - "**/*.swift"
---

# SwiftUI Rules

## Views
- Views small — extract subviews when body gets long
- One View per file, file name matches type
- Use `@ViewBuilder` for conditional content inside custom views
- Previews for every view — `#Preview { ... }` or `PreviewProvider`

## State property wrappers
- `@State` — view-owned value types, private
- `@Binding` — passed from parent, two-way
- `@StateObject` — view creates and owns a reference type (once per lifetime)
- `@ObservedObject` — view receives reference type from outside
- `@EnvironmentObject` — shared across view tree
- Pick the right wrapper — wrong choice causes recreation bugs

## Observation (iOS 17+)
- `@Observable` macro over `ObservableObject` for new code
- `@State` on `@Observable` classes, `@Bindable` for passing by binding
- Don't use `@Published` with `@Observable` — incompatible

## Data flow
- Views derive UI from state — never mutate state during view computation
- Side effects in `.onAppear`, `.task`, `.onChange` — not inside `body`
- `.task` auto-cancels when view disappears — preferred over `.onAppear` for async work
- Error state represented in the model — not thrown from async tasks without handling

## Navigation
- `NavigationStack` + `NavigationPath` (iOS 16+) — not legacy `NavigationView`
- Typed destinations via `.navigationDestination(for:)`
- Sheet and popover state as `@State` booleans or optional identifiers

## Performance
- `@ViewBuilder` tuple limit — avoid deeply nested view hierarchies
- `LazyVStack` / `LazyHStack` for long lists — `VStack` materializes all children
- `id()` modifier to force recreation when needed
- Profile with Instruments before optimizing

## Accessibility
- Every interactive view: `.accessibilityLabel()` if not self-explanatory
- VoiceOver tested for every screen — flip the switch and actually use the app
- Dynamic type supported — no fixed font sizes in points
- Color contrast meets WCAG AA in both light and dark mode

## Concurrency
- `async/await` for all async work — no completion handlers in new code
- `@MainActor` on view models that update UI — not scattered `DispatchQueue.main.async`
- `Task {}` in `.task` modifier — auto-cancels on view disappear
- `async let` for parallel fetches

## Testing
- UI tests via `XCUITest` for critical flows
- Snapshot tests for pixel-level regression on key screens
- View model tests via unit tests — views themselves hard to unit test
