# Ecosystems

Lockfile decides the package manager. Manifest alone is ambiguous — `package.json` says nothing about npm vs pnpm vs yarn vs bun.

## Command map

| Ecosystem | Manifest / lock | Outdated | Audit | Wave 1 (patch+minor) | Wave 2 (single major) |
|---|---|---|---|---|---|
| npm | `package.json` / `package-lock.json` | `npm outdated` | `npm audit` | `npm update` | `npm install <pkg>@latest` |
| pnpm | `package.json` / `pnpm-lock.yaml` | `pnpm outdated -r` | `pnpm audit` | `pnpm update -r` | `pnpm update -r <pkg> --latest` |
| yarn 1 | `package.json` / `yarn.lock` (no `.yarnrc.yml`) | `yarn outdated` | `yarn audit` | `yarn upgrade` | `yarn upgrade <pkg>@latest` |
| yarn berry | `package.json` / `yarn.lock` + `.yarnrc.yml` | `yarn upgrade-interactive` | `yarn npm audit` | `yarn up '*'` | `yarn up <pkg>@latest` |
| bun | `package.json` / `bun.lock*` | `bun outdated` | `bun audit` | `bun update` | `bun update <pkg> --latest` |
| pip | `requirements*.txt` | `pip list --outdated` | `pip-audit` | edit pins → `pip install -r` | edit pin → `pip install -r` |
| poetry | `pyproject.toml` / `poetry.lock` | `poetry show --outdated` | `poetry audit` or `pip-audit` | `poetry update` | `poetry add <pkg>@latest` |
| uv | `pyproject.toml` / `uv.lock` | `uv pip list --outdated` | `pip-audit` | `uv lock --upgrade` | `uv lock --upgrade-package <pkg>` |
| cargo | `Cargo.toml` / `Cargo.lock` | `cargo outdated` | `cargo audit` | `cargo update` | `cargo upgrade -p <pkg>` |
| go | `go.mod` / `go.sum` | `go list -u -m all` | `govulncheck ./...` | `go get -u=patch ./... && go mod tidy` | `go get <mod>@<ver> && go mod tidy` |
| maven | `pom.xml` | `mvn versions:display-dependency-updates` | `mvn dependency-check:check` | `mvn versions:use-latest-releases -DallowMajorUpdates=false` | edit `pom.xml` version |
| gradle | `build.gradle(.kts)` | `gradle dependencyUpdates` | `gradle dependencyCheckAnalyze` | edit version catalog | edit version catalog |
| bundler | `Gemfile` / `Gemfile.lock` | `bundle outdated` | `bundle audit check --update` | `bundle update --minor` | `bundle update <gem>` |
| composer | `composer.json` / `composer.lock` | `composer outdated` | `composer audit` | `composer update` | edit constraint → `composer update <pkg> --with-dependencies` |
| pub / Flutter | `pubspec.yaml` / `pubspec.lock` | `flutter pub outdated` | `flutter pub outdated` | `flutter pub upgrade` | `flutter pub upgrade --major-versions <pkg>` |
| SwiftPM | `Package.swift` / `Package.resolved` | `swift package show-dependencies` | — | `swift package update` | edit `Package.swift` range |
| NuGet | `*.csproj` / `packages.lock.json` | `dotnet list package --outdated` | `dotnet list package --vulnerable` | `dotnet add package <pkg>` per package | `dotnet add package <pkg> -v <ver>` |

Tool missing (`cargo-outdated`, `pip-audit`, `bundler-audit`, ben-manes plugin, `govulncheck`) → report the gap, do not auto-install a global tool. Offer the install command, let user decide.

## Quirks that break naive updates

- **npm/pnpm/yarn**: `update` respects the semver range in `package.json`. A dep pinned `"react": "18.2.0"` never moves under wave 1 — it needs a manifest edit and belongs in wave 2 even for a patch.
- **pnpm/yarn workspaces**: `-r` is not optional. Without it only the root package updates and the workspace lockfile goes inconsistent.
- **peerDependencies**: a resolution conflict is real information. Never `--force` / `--legacy-peer-deps` past it — report which packages disagree.
- **go**: a major version is a new import path (`example.com/m/v2`). `go get -u` will never cross it. Wave 2 for go means rewriting import statements.
- **go**: `go mod tidy` after every change or `go.sum` drifts.
- **cargo**: `cargo update` only moves within `Cargo.toml` ranges. Crossing a major needs `cargo upgrade` (cargo-edit) or a manifest edit.
- **poetry / uv**: lock and install are separate steps. Locking without syncing the venv means the verify run tests the old versions.
- **gradle**: no built-in update command. Version catalogs (`gradle/libs.versions.toml`) are edited by hand.
- **Flutter / React Native / any native dep**: after a bump, native side needs a rebuild (`pod install`, `gradlew clean`). Verify passes on stale native artifacts otherwise. Constraints file should record the exact step.
- **Monorepos**: internal workspace packages are not third-party deps. Never "update" them to a registry version.
- **Transitive-only advisories**: the vulnerable package may not be a direct dep. Fix is an override / resolution / constraint on the parent, not a direct install.
