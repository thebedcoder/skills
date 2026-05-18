# Rules Library

Path-scoped rules that auto-load when Claude Code works with matching files in a project. During `/init`, you can select which rules to include for your project. Selected rules are copied to `./.claude/rules/` in the target project.

## Stack / framework rules

| Rule file | When to pick | Paths |
|---|---|---|
| `react-typescript.md` | React + TypeScript frontends | `**/*.tsx`, `**/*.jsx`, `src/**/*.ts` |
| `nextjs-app-router.md` | Next.js 13+ with app directory | `app/**/*.tsx`, `src/app/**/*.tsx` |
| `react-native.md` | React Native (Expo or bare) | `**/*.tsx`, `**/*.ts`, `**/*.jsx` |
| `python-fastapi.md` | Python API with FastAPI | `**/*.py`, `app/**/*.py` |
| `python-django.md` | Python web app with Django | `**/*.py`, `**/models.py`, `**/views.py` |
| `node-express.md` | Node.js API with Express | `**/*.ts`, `**/*.js`, `src/**/*.ts` |
| `go.md` | Go projects | `**/*.go` |
| `rust.md` | Rust projects | `**/*.rs`, `Cargo.toml` |
| `flutter.md` | Flutter cross-platform apps | `**/*.dart`, `lib/**/*.dart` |
| `swiftui.md` | iOS/macOS apps with SwiftUI | `**/*.swift` |
| `ios-native.md` | iOS with UIKit or mixed | `**/*.swift`, `**/*.m`, `**/*.h` |
| `android-native.md` | Android with Kotlin or Java | `**/*.kt`, `**/*.java` |

## Cross-cutting rules

| Rule file | Scope | Paths |
|---|---|---|
| `testing-conventions.md` | Test file standards | `**/*.test.*`, `**/*.spec.*`, `**/test_*.py`, `**/tests/**` |
| `git-conventions.md` | Commit format, branch names, PR flow | unconditional |
| `api-design.md` | REST API conventions | `**/api/**`, `**/routes/**`, `**/controllers/**` |
| `secrets-management.md` | Secret handling, env vars, rotation | unconditional |

## Notes

- Rules without a `paths` field load on every session — use sparingly, mainly for cross-cutting concerns
- Rules with `paths` only load when Claude opens matching files — preferred for stack-specific rules
- Rule files copied to `./.claude/rules/` can be edited, renamed, or deleted per project — they're just starting points
- Don't enable rules that contradict each other — e.g., `swiftui.md` + `ios-native.md` may overlap; pick the one that matches the project's actual approach

## Adding your own rules

Drop a markdown file with YAML frontmatter into `./.claude/rules/` in any project. File name is descriptive, not functional. Keep under 500 tokens (~2000 characters) to stay within context budget.
