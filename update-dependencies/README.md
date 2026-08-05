# update-dependencies

Audit and upgrade project dependencies on any stack — npm/pnpm/yarn/bun, pip/poetry/uv, cargo, go, maven/gradle, bundler, composer, pub, SwiftPM, NuGet. Security advisories first, then patch/minor applied in a verified wave, then majors one at a time behind approval with changelog and migration steps.

## Command

```
/update-dependencies
```

Also fires on natural phrasing: "update dependencies", "upgrade deps", "bump packages", "check for outdated packages", "audit dependencies", "fix vulnerabilities", or after a security advisory lands.

## What it does

It reads project-specific constraints from `.claude/deps-constraints.md` when present — pinned dependencies and why, workspace update order, native rebuild steps, the verify command.

1. **Security first.** Ecosystem audit, reported before anything is applied.
2. **Wave 1 — patch and minor.** Applied as one batch, verified, committed. A failing batch is bisected; the culprit is demoted to wave 2 rather than blocking the rest.
3. **Wave 2 — majors, one at a time.** For each: changelog and migration guide fetched, breaking changes scoped to *this* repo by grepping for the affected symbols, then it stops and asks. Only after approval does it apply the bump, run the official codemod if one exists, and verify. A failure resets that single dep and moves on.
4. **Report.** Updated / deferred / blocked / still-vulnerable, each with a reason.

## Safety

- Never applies a major without explicit per-dep approval.
- Never runs a codemod without showing what it rewrites first.
- Never hand-edits a lockfile — the package manager owns it.
- Never bumps a dep listed as pinned in `.claude/deps-constraints.md`.
- Never `--force`s or `--legacy-peer-deps`s past a peer-dependency conflict — reports it instead.
- Verify command runs after every wave, no exceptions.

## Install

### Claude Code (plugin marketplace)

```
/plugin marketplace add thebedcoder/skills
/plugin install update-dependencies@thebedcoder
```

### From a local checkout

```bash
bash update-dependencies/install.sh
```

Copies the skill to `~/.claude/skills/update-dependencies/` and the `/update-dependencies` command to `~/.claude/commands/`. Restart Claude Code afterward.
