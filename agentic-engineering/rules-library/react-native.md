---
paths:
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.jsx"
---

# React Native Rules

## Project choice
- Expo managed workflow for most apps — bare only if you need native modules not in Expo
- Expo Router or React Navigation — pick one and stay consistent
- TypeScript required — not optional for production apps

## Components
- Functional components only
- Platform-specific files: `Component.ios.tsx`, `Component.android.tsx` — picked automatically
- Or `Platform.select` for small differences inline
- Avoid `Platform.OS === 'ios'` conditionals deep in render — extract into platform files

## Styling
- `StyleSheet.create` — not inline style objects (performance + validation)
- Flexbox layout — understand that React Native flex defaults differ from web
- `SafeAreaView` from `react-native-safe-area-context` — not the RN one
- Never use web-only CSS features — no shadows without platform-specific values

## Lists
- `FlatList` / `SectionList` — never `ScrollView` + `.map` for long lists
- `keyExtractor` explicit — don't use index as key for dynamic lists
- `getItemLayout` when item heights are fixed — massive scroll perf win
- `removeClippedSubviews` for very long lists on Android

## Navigation
- Typed navigation — `NavigationProp<RootStackParamList>` on every screen
- Deep links configured via linking config — test with `npx uri-scheme`
- Reset stack before certain navigation (logout) — don't just push

## Images
- `expo-image` over built-in `Image` — better caching and placeholder support
- Remote images: explicit width/height to prevent layout shift
- Bundled images: `require('./image.png')` — never dynamic `require` with variables

## Native modules
- Check Expo's library list before writing custom native code
- If custom native module needed, config plugin approach — not ejecting
- Version-lock native dependencies carefully — upgrades break iOS/Android separately

## Performance
- Avoid re-renders — `React.memo`, `useMemo`, `useCallback` where they help
- Hermes engine on — default in newer RN, verify in build
- Don't block JS thread with heavy work — use `InteractionManager.runAfterInteractions`
- Profile with Flipper or React DevTools Profiler

## Platform quirks to test
- iOS: safe areas on all devices, back gesture, haptic feedback
- Android: hardware back button, status bar color, various screen sizes
- Both: keyboard avoidance, orientation changes, deep link from cold start

## Async and errors
- Async everywhere, errors caught — no floating promises
- Error boundaries for screens — crashes don't kill whole app
- Network: always handle offline state — users go through tunnels

## Storage
- AsyncStorage for simple key-value
- SecureStore (Expo) or Keychain/Keystore for sensitive data — never AsyncStorage for tokens
- SQLite via `expo-sqlite` for structured data

## Build and release
- EAS Build (Expo) — local builds only when debugging native issues
- Over-the-air updates via EAS Update — test in staging before production channel
- Version bumps synchronized across iOS and Android
