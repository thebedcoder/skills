---
name: rebuild-artifacts
description: Rebuild the .skill zip archives for the claude.ai skill packager from the current source tree. Use before publishing a release, or after changing any SKILL.md, command body, or agent under agentic-engineering/ or jtbd/.
disable-model-invocation: true
allowed-tools: Bash, Read, Glob
---

# rebuild-artifacts

`agentic-engineering.skill` and `jtbd.skill` are zip archives for the claude.ai
skill packager. They are **build output**, not source — `*.skill` is gitignored.
Rebuild them at release time; never edit one in place.

## The two recipes are not the same

This is the trap. The archives have different contents, so a single loop over
both plugins produces a broken jtbd package.

| Archive | Zip root contains | Assembled from |
|---|---|---|
| `agentic-engineering.skill` | `SKILL.md`, `commands/` | `agentic-engineering/skills/agentic-engineering/` only |
| `jtbd.skill` | `SKILL.md`, `commands/`, `agents/` | `jtbd/skills/jtbd/` **plus** `jtbd/agents/` staged in |

jtbd bundles its 5 specialist agents (each with a `references/` subdir) inside
the archive. agentic-engineering does not bundle agents at all.

## Run

```bash
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
STAGE="$(mktemp -d)"

# --- agentic-engineering: skill dir only ---
mkdir -p "$STAGE/ae"
cp -R "$REPO/agentic-engineering/skills/agentic-engineering" "$STAGE/ae/"
( cd "$STAGE/ae" && zip -r "$REPO/agentic-engineering/agentic-engineering.skill" \
    agentic-engineering/ -x "*.DS_Store" >/dev/null )

# --- jtbd: skill dir + agents staged in ---
mkdir -p "$STAGE/jt"
cp -R "$REPO/jtbd/skills/jtbd" "$STAGE/jt/"
cp -R "$REPO/jtbd/agents" "$STAGE/jt/jtbd/agents"
( cd "$STAGE/jt" && zip -r "$REPO/jtbd/jtbd.skill" \
    jtbd/ -x "*.DS_Store" >/dev/null )

rm -rf "$STAGE"
```

Delete each target before zipping if it already exists — `zip` **updates** an
existing archive rather than replacing it, so stale entries survive otherwise.

## Verify

```bash
unzip -l agentic-engineering/agentic-engineering.skill | tail -3
unzip -l jtbd/jtbd.skill | awk '{print $4}' | cut -d/ -f2 | sort -u
```

Assert:

1. No `.DS_Store` entries in either archive.
2. Neither archive's `SKILL.md` contains `user-invocable` — the packager rejects
   it. It belongs only in the installed copy, patched in by
   `agentic-engineering/install.sh`.
3. `jtbd.skill` lists `SKILL.md`, `agents`, `commands`; the agentic-engineering
   archive lists `SKILL.md` and `commands` only.
4. Nothing under the source tree is newer than the archive you just wrote:
   `find agentic-engineering -name '*.md' -newer agentic-engineering/agentic-engineering.skill | wc -l` → `0`.

Check 4 is the one that matters. Both archives previously drifted ~4 months
behind source (74 and 23 files newer) while git reported the repo clean —
committed binaries that no process regenerates go stale invisibly.
