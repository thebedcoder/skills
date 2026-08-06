---
name: flutter-motion
description: >
  Audit a Flutter project's UI motion and apply polish in approval-gated waves —
  a consistent duration/curve token system, reduce-motion compliance, animation
  hygiene, and page/state transitions that earn their place. Use when user says
  "make the app feel more polished", "the app feels cheap", "add animations",
  "improve transitions", "audit our animations", "make it feel expensive", or
  asks for Flutter UI/UX motion review.
---

# flutter-motion

Make an app feel expensive by making its motion consistent, not by adding more of it. Audit first, apply in verified waves, never touch a path the user declined. Restraint is the product — a mature app is usually over-animated and under-systematised, and adding motion on top of that reads as noise.

## Preconditions — check before anything

1. Flutter project. `pubspec.yaml` exists with `flutter:` under `dependencies`. No → stop.
2. No uncommitted **tracked** changes: `git status --porcelain --untracked-files=no` empty. Dirty → stop, tell user to commit or stash. The user's own pre-existing untracked files do not block — `git reset --hard HEAD` never touches them, so a wave revert cannot destroy them, and blocking on a stray local file refuses to run for no safety gain.

   **This cuts the other way for files the skill itself creates.** `reset --hard` will not remove those either, so a rejected wave leaves them behind. Track every path you add during a run and delete it explicitly on revert — see the Verify block.
3. **Capture baseline.** Run `flutter analyze` and `flutter test`, record both results BEFORE touching anything. Pre-existing failures get recorded, not fixed and not blamed on this skill. The gate is **no worse than baseline**, never "clean" — most real projects are not clean.

## Step 1 — Read the contract

`.claude/motion.md` present → read it first. It overrides everything below. Absent → create it at Step 8.

```markdown
# .claude/motion.md

## Tokens
Source: lib/theme/motion.dart

## Declined
lib/screens/settings.dart:88
  no AnimatedSwitcher on theme toggle
  — intentional, instant feedback wanted

## Do not animate
lib/widgets/chart/**  — perf-critical
```

A finding under `Declined` is never re-proposed. A path under `Do not animate` is never touched. Both are permanent until the user edits the file.

## Step 2 — Detect the stack

Four detections. Each has a reference; none is a single grep.

| What | Where | Trap |
|---|---|---|
| Router | `references/routing.md` §1–5 | **Never conclude from `pubspec.yaml` alone.** A wrapper package can re-export the real router under its own name with no trace in the manifest. Run §5's re-export check before deciding. |
| State management | `references/state-mgmt.md` §0 | `flutter_bloc` re-exports Provider's `context.watch`/`context.select`, so those greps false-positive Provider on every BLoC app. §0's detection is AND-gated for this reason. |
| Existing animation deps | `pubspec.yaml` — `animations`, `flutter_animate`, `lottie`, `rive` | Adopt the house style. **Never stack a second animation library** on a project that already has one. **Two different categories, and only the first one collides:** `animations` / `flutter_animate` drive *UI transitions* — pick one, never both. `lottie` / `rive` play *authored assets* and drive no transition; their presence is not a reason to decline `package:animations`. Relaty ships `lottie` and no transition library, so the container transform and fade-through fixes still need one added — and that still gets asked, per the hard rules. |
| Existing motion scale | `references/motion-system.md` §2 | Glob the paths §2 lists before proposing a new token file. A project with its own scale adopts that scale at Step 4 — never get Material's values imposed on it. **Cupertino-specific motion has no coverage in these references; on an all-Cupertino project say so rather than applying Material timings.** |

## Step 3 — Scan and report, before any edit

Work `references/findings.md` — twenty rules, `nav-1`…`nav-5`, `state-1`…`state-7`, `style-1`…`style-3`, `hyg-1`…`hyg-5`.

**Grep finds candidates. Reading confirms them.** Every rule has a probe and a confirm step; the probe is a starting set, not a finding list. Report a probe's raw hits as findings and the false-positive rate makes the whole audit worthless — on a real project `state-6` ran 57 raw to 2 real, `state-5` 6 to zero. Read `findings.md`'s preamble before running anything; it carries the mechanics that apply to every probe.

**Never report a finding whose code you have not opened.**

Emit the report before touching a file:

```markdown
## Motion system
Tokens: absent | <path>          ← does a token file exist, per motion-system.md §2
Spread: N distinct durations, M distinct curves   ← always report, token file or not

## Findings
| # | Sev | Kind | Site | What's missing | Fix |

## Hygiene
(correctness and performance — bugs, not taste)

## Inconsistencies
(N durations across the app; which files disagree)
```

Severity: **the `Severity` column in `references/findings.md`'s rule index governs.** Consult it rather than re-deriving from the definitions below. Two rows are compound — `hyg-2` is "high crashing / low reverse", `style-2` is "medium (high for bounce/elastic/back)" — and there you pick the half the confirmed reading supports. The definitions:

- **high** — a bug, a crash, an accessibility gap, or motion on a hot path that reads as broken. Root transitions, primary list→detail, the main loading state, and any duration over 800ms on a common path are hot-path cases; a missing error branch is the accessibility/bug case.
- **medium** — real, worth fixing, felt across the app rather than at one site.
- **low** — polish, or a missed optimization. Aggregate these; never one line per site.

## Step 4 — Wave 0: tokens

Create or adopt the token file per `references/motion-system.md` §1–2. **No fix wave lands before this one** — every later fix references these names, and a fix that lands first writes a literal.

**Place it alongside the project's existing theme code, and derive the import from `pubspec.yaml`.** §2's globs find an existing token file; they do not tell you where to put a new one. Look at where the project already keeps theme/constants code and match it — a file dropped at `lib/theme/` in a project whose theme lives at `lib/src/core/presentation/theme/` violates its layout on the first commit. The import prefix is the `name:` field in `pubspec.yaml`, **not the directory name** — they differ more often than you'd think (a mid-rebrand project can have directory `relaty` and package `memocue`). Get this wrong and every fix in every later wave fails to resolve.

Values are taste. **ASK, and wait.** Present the proposed durations and curves as numbers the user can argue with. A project with an existing scale adopts that scale (§2), it does not get Material's imposed on it.

Verify. Commit alone: `feat(ui): motion token system`.

## Step 5 — Wave 1: hygiene

`hyg-1`…`hyg-5`. These are bugs — a leaked controller burning frames on a dead screen, a ticker mixin mismatch that crashes, reduce-motion never checked. Not taste, so not per-item gated.

Show the full list before applying. **Two commits, not one:**

1. `hyg-1`, `hyg-2`, `hyg-3`, `hyg-5` — localized, a handful of sites each. One batch: `fix(ui):` or `perf(ui):`.
2. `hyg-4` **alone**, its own verify and its own commit: `fix(ui): respect reduce-motion`.

`hyg-4` is one finding with an app-wide fix — every animation site gets its duration wrapped, which on a mature project is dozens of files. It is also where the `const`-site constraint in the hard rules bites hardest. Batching that with four small bug fixes produces an unbisectable commit, and a compile error anywhere in it strands the whole wave. Report the finding once with a count; apply and commit it on its own.

## Step 6 — Wave 2: high severity, one screen at a time

Gated per screen, not per finding. A screen carrying two high findings is one unit: both diffs shown together, applied together, verified together, one commit. Splitting them means two eyeball checkpoints on the same screen.

For each screen: show the diff for all high findings on it, apply them, then run the Verify block below — it owns everything from that point, including the checkpoint and the commit. One screen per commit, `feat(ui): <screen> — <what moved>`.

## Step 7 — Wave 3: medium and low, as a menu

Present them grouped by rule, let the user pick. Apply the picked set as one batch, verify, commit: `feat(ui): <what moved>`.

Anything unpicked is **declined** and gets written to `.claude/motion.md` at Step 8, so the next run does not re-propose it.

## Verify — after every wave, no exceptions

This block owns the whole post-apply sequence. A wave's own section says what to change; from "applied" onward, these five steps run and nothing repeats them.

1. `flutter analyze` — no worse than baseline. **It will not catch a `Motion.of` called from `initState`** — that is a runtime assertion, not a static error, and it analyzes clean (measured). Grep for it yourself before trusting a green analyze: `grep -n 'Motion\.of' <changed files>` and confirm every hit is in `build`, `didChangeDependencies`, or a callback — never `initState`.
2. `flutter test` — no worse than baseline. Motion breaks widget tests routinely: `pumpAndSettle` times out against an infinite animation; finders that ran mid-frame stop matching. **Fix the tests your motion broke. Never delete one, never add `skip`.**

   **If step 1 or step 2 comes back worse than baseline, you do not proceed to the human.** Fix it, or revert the wave per step 4 and report. An analyze regression is the *expected* failure of the `hyg-4` commit — that is where the `const`-site constraint bites — so treat it as a normal branch, not an emergency. Never show a human a wave that does not build.
3. **Human checkpoint.** State exactly what to open and what to watch. Not "check the animations" — "Open Home, tap the second card, watch whether the card grows into the detail page or the page slides in from the right."
4. User approves → step 5. User rejects → revert, report why, move on:

   ```bash
   git reset --hard HEAD                      # tracked edits
   git clean -fd -- <every path this wave created>   # reset --hard will NOT remove these
   ```

   **Name the created paths explicitly — never a bare `git clean -fd`,** which would also delete the user's own untracked files. Wave 0's entire output is a new file, so this line is the whole of its revert.

   **If Wave 0 is rejected, stop.** Do not "move on" — every later wave references tokens that no longer exist, and every hard rule below becomes unsatisfiable. Report and exit.
5. **Stage, then commit.** `git add <paths>` — a wave that only adds files (Wave 0) commits nothing under `git commit -a`. **One verify cycle, one commit** — never two commits from one run of this block, never one commit spanning two. Wave 0 is one; Wave 1 is two (small hygiene, then `hyg-4`); Wave 2 is one per screen; Wave 3 is one.

**The commit is always last.** Nothing is committed before the human has looked at it, which is what makes step 4's `git reset --hard HEAD` safe — the wave is still uncommitted at that point. If you have already committed, that command reverts nothing; you are past the gate and the wave stands.

**Jank check.** `flutter run --profile` with a DevTools timeline trace is the only real one, and it is heavy. Required ONLY for findings that touch a scrolling list — the one place added motion actually drops frames. Everywhere else, list it under suggested manual checks.

## Step 8 — Contract and final report

Write `.claude/motion.md` (token source, everything declined this run, any path the user ruled out). Then:

```markdown
## Applied
<finding>  (commit <sha>)

## Declined
<finding>  why

## Blocked
<finding>  what blocks it, what would unblock it

## Suggested manual checks
<what to profile, what to watch>
```

Empty section keeps its heading and reads `none`. Silent omission reads as "handled".

## Hard rules

- Never propose an animation on a code path you have not read.
- Never report a probe's hits as findings. The confirm step is not optional.
- Never add a package silently. `package:animations` absent → ask. Prefer built-ins if the project already uses `flutter_animate` or `rive`.
- Never write a bounce, elastic, or back curve. Flag existing ones as findings.
- Every duration you write comes from the token file. Zero inline literals.
- Every animation you write respects reduce-motion — **at the site where the duration is consumed, not where it is declared.** A `const` site (default parameter, `static const`, file-level `const`) takes the bare token; `Motion.of(…)` is a function call, not a constant expression, and will not compile there. Wrap at the build site that reads it, and never call `Motion.of` from `initState`. `references/motion-system.md` §1 is authoritative and carries the SDK citation.
- A duration is not a motion duration just because it is a `Duration`. Retry backoffs, debounces, polling intervals and `Future.delayed` floors are scheduling — they leave this skill's scope entirely rather than getting a token. `references/findings.md` `style-1` clause 1 is authoritative.
- Never touch a path under `Do not animate` in `.claude/motion.md`.
- Never re-propose a finding under `Declined`.
- Never carry a failed wave forward. Revert it, report why, move on.
- Every commit gets its own verification. No batching because "they're all small".
- Never delete or skip a test that new motion broke. Fix it.
