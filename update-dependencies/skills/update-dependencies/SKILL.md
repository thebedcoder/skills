---
name: update-dependencies
description: >
  Audit and upgrade project dependencies on any stack — npm/pnpm/yarn, pip/poetry/uv,
  cargo, go, maven/gradle, bundler, composer, pub. Security advisories first, then
  patch/minor applied in a verified wave, then majors one at a time behind approval
  with changelog and migration steps. Use when user says "update dependencies",
  "upgrade deps", "bump packages", "check for outdated packages", "audit
  dependencies", "fix vulnerabilities", or after a security advisory lands.
---

# update-dependencies

Upgrade deps without breaking the project. Verified waves, git-backed rollback, majors never applied unasked.

## Preconditions — check before anything

1. Working tree clean (`git status --porcelain` empty). Dirty → stop, tell user to commit or stash. Rollback depends on clean baseline.
2. Verify command known (see Step 2). No verify command → tell user, offer report-only run. Never apply blind.

## Step 1 — Detect ecosystem

Read `references/ecosystems.md`. Match manifest + lockfile in repo root and any workspace dirs.

- Multiple ecosystems (polyglot repo) → handle one at a time, ask user which first.
- Lockfile present → package manager is decided by the lockfile, not by preference. `pnpm-lock.yaml` → pnpm, never npm.
- No lockfile where ecosystem expects one → flag it in report. Unpinned deps make "update" meaningless.

## Step 2 — Read constraints

`.claude/deps-constraints.md` present → read it first. It overrides defaults. Holds:

- verify command
- deps that must not move + reason
- workspace / package update order
- native or codegen rebuild steps
- version floors or ceilings imposed by platform

Absent → derive verify command from `CLAUDE.md` Commands section, else the manifest's test script. Non-watch invocation only (`vitest run`, `pytest`, `go test ./...`) — never a watcher.

## Step 3 — Audit first, report before touching anything

Run ecosystem audit command (`references/ecosystems.md`). Report to user BEFORE any update:

```
## Security
| Package | Severity | Advisory | Fixed in | Reachable? |

## Outdated
| Package | Current | Wanted | Latest | Jump | Constraint |
```

`Jump` = patch / minor / major. `Constraint` = row from constraints file blocking it, or blank.

Advisory whose fix needs a major → it goes in the wave 2 queue, flagged `security`, ordered first. Never silently swallowed into "deferred".

## Step 4 — Wave 1: patch + minor

One batch, all patch and minor bumps not blocked by constraints.

1. Apply per ecosystem update command.
2. Run verify command.
3. Pass → commit: `chore(deps): patch + minor updates`. Body lists package@old→new lines.
4. Fail → bisect. Re-apply half the batch, verify, repeat until culprit isolated. Culprit moves to wave 2 queue with the failure output attached. Rest of batch commits.

Never leave the tree in a failed state. Verify fails and bisect stalls → `git checkout -- .` the lockfile + manifest, report, stop.

## Step 5 — Wave 2: majors, one at a time, gated

For each major in queue (security-flagged first):

1. Fetch changelog / release notes / migration guide — `references/migrations.md` for where to look.
2. Present to user: breaking changes that touch THIS repo (grep for the removed/renamed APIs — do not paste the whole changelog), codemod available or not, blast radius (files touched).
3. **ASK. Wait.** User approves this one dep, or defers it, or skips it.
4. Approved → apply the single dep. Run codemod if one exists and user approved it. Hand-fix remaining call sites.
5. Verify. Pass → commit `chore(deps)!: <pkg> <old> → <new>` with breaking changes in body. Fail → `git reset --hard HEAD`, report why, move to next dep. Never carry a broken major forward.

One dep per commit at this wave. Batched majors are unbisectable.

## Step 6 — Report

```
## Updated
<pkg> <old> → <new>   (commit <sha>)

## Deferred
<pkg> <old> → <new>   why (user skipped / constraint / needs manual migration)

## Blocked
<pkg>   what blocks it, what would unblock it

## Still vulnerable
<pkg>   advisory, why not fixed
```

Empty section → keep the heading, write `none`. Silent omission reads as "handled".

## Hard rules

- Never apply a major without explicit per-dep approval.
- Never run a codemod without showing what it rewrites first.
- Never edit a lockfile by hand. Package manager owns it.
- Never `--force`, `--legacy-peer-deps`, or equivalent to make a resolution work. Peer conflict is information — report it.
- Never bump a dep listed as pinned in `.claude/deps-constraints.md`. Report the constraint instead.
- Verify command runs after every wave. No exceptions, including "trivial" patch batches.
