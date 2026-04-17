---
---

# Git Conventions

## Commits
- Conventional Commits format: `type(scope): subject`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `build`, `ci`
- Subject: imperative mood, lowercase, no period: `add user registration` not `Added user registration.`
- Scope is optional but useful for monorepos or large apps: `feat(auth): ...`

## Commit granularity
- One logical change per commit — not one commit per file, not one commit per sprint
- If the commit message needs "and", split the commit
- First commit in a PR should be the simplest possible — easier to review, rollback
- Never mix refactoring with behavior changes in one commit

## Commit body
- Explain WHY, not WHAT — the diff shows what
- Link issues: `Closes #123`, `Refs #456`
- Breaking changes: `BREAKING CHANGE:` section in body, also `!` after type: `feat!: remove deprecated API`

## Branches
- `main` or `master` — pick one, don't rename mid-project
- Feature branches: `feat/<short-description>` or `feature/<ticket>-<description>`
- Fix branches: `fix/<issue-number>-<description>`
- No long-lived branches except main/develop

## Merging
- Squash merges keep history clean — default for feature PRs
- Merge commits acceptable for long feature branches with meaningful commit history
- Never force-push to shared branches — rebase locally before pushing
- Rebase over merge when updating your branch — cleaner history

## Pull requests
- PR title follows commit convention — squash commit will use it
- PR description has: what changed, why, how to test, screenshots for UI
- Link to issue or ticket — traceability
- Draft PRs for work-in-progress — don't ping reviewers until ready

## Code review
- Every PR reviewed by at least one other person — no direct-to-main pushes
- Reviewer checks: correctness, tests, docs, performance concerns, style
- Comments actionable — not just "this seems wrong", explain why
- Approve ≠ defer to author's judgment — blocking review if something's really wrong

## History hygiene
- Don't commit: debug prints, commented-out code, TODO without ticket, generated files that should be gitignored
- `.gitignore` kept current — don't accumulate noise
- Large files (>100MB) use Git LFS or stay out of the repo
- Secrets never committed — `git-secrets` or pre-commit hooks catch them

## Rewriting history
- Amend or rebase LOCAL commits freely before pushing
- Pushed to shared branch — never rewrite
- Force-push to YOUR feature branch OK — other team members should be warned
- `git rebase -i` for cleanup before PR — squash fixup commits
