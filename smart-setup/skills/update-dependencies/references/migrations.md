# Migrations

Applies to wave 2 only. One dep, one commit, one approval.

## Find the breaking changes

In order, stop at first that answers it:

1. `CHANGELOG.md` / `HISTORY.md` in the installed package (`node_modules/<pkg>/`, `site-packages/<pkg>/`, vendored source) — already on disk, no network.
2. Release notes for the target tag — `gh release view <tag> --repo <owner>/<repo>`, or the project's releases page.
3. Dedicated migration guide — most large frameworks ship one (`/docs/upgrading`, `UPGRADING.md`, "migrating to v<N>").
4. Diff of the package's own public API between tags if nothing else exists.

Read every intermediate major, not just the target. v2 → v5 means three sets of breaking changes.

## Scope it to this repo

Do not paste the changelog at the user. Turn it into blast radius:

1. Extract removed / renamed / behavior-changed symbols from the notes.
2. Grep the repo for each one.
3. Report: `N call sites across M files` + the file list. Zero hits on every breaking change → say so, that's the strongest signal the bump is safe.

Behavior changes with no API change (default value flipped, timezone handling, error thrown instead of returned) are the ones grep misses. Call them out explicitly — they are found by reading, not searching.

## Codemods

Many ecosystems ship official ones:

| Ecosystem | Typical codemod |
|---|---|
| JS/TS | `npx jscodeshift`, `npx @next/codemod@latest`, `npx @angular/cli update`, package-provided `<pkg>-codemod` |
| Python | `django-upgrade`, `pyupgrade`, package-provided `2to3`-style scripts |
| PHP | `rector` with the package's rule set |
| Rust | `cargo fix --edition` |
| Go | `go fix`, plus import-path rewrite for `/vN` |
| Dart / Flutter | `dart fix --apply` |

Rules:

- Show what the codemod rewrites before running it — dry-run flag where one exists, otherwise run it and show `git diff` before committing.
- Codemod output is a starting point, not a finished migration. Review the diff. Codemods routinely miss dynamic call sites, string-keyed access, and test fixtures.
- No official codemod → hand-edit. Do not write a bespoke codemod for a handful of call sites.

## Rollback

- Baseline is the last commit. Verify fails → `git reset --hard HEAD`, report, move on.
- Never carry a failed major into the next dep's attempt. Failures compound and become unattributable.
- Migration that genuinely needs multiple sessions → do not start it. Report it as `Blocked — needs dedicated work`, with the guide link and the blast radius, and let the user schedule it.
