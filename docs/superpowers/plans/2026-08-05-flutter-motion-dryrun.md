# flutter-motion — Relaty dry run and false-positive pass

**Date:** 2026-08-06
**Target:** `/Users/getman/DevWorkspaces/FlutterProjects/relaty` (654 Dart files under `lib/`, branch `chore/rebrand-memocue` @ `7d9169c`) — read-only for the whole run.
**Scope:** SKILL.md Preconditions → Step 3 only. No wave applied, no file in Relaty modified.

This is the first end-to-end execution of the skill. Everything before it was the plugin
asserting it works.

---

## Baseline (Preconditions 1–3)

| Check | Result |
|---|---|
| Flutter project | `pubspec.yaml:10-12` — `dependencies: flutter: sdk: flutter` ✓ |
| Working tree clean | `git status --porcelain` empty ✓ |
| `flutter analyze` | **102 issues (0 error, 13 warning, 89 info), exit 1.** 40 in `lib/`, 62 in `test/`. Pre-existing. |
| `flutter test` | **290 tests, all passed, exit 0.** |

Toolchain: Flutter 3.44.1 / Dart 3.12.1 via fvm.

Gate for any future wave is **no worse than 102 issues / 290 passing**, never "clean".

## Stack detection (Step 2)

| What | Answer | How |
|---|---|---|
| Router | **go_router 17.x**, via `bedcode_navigator` 0.2.0+2 re-export | `routing.md` §5 Step 1. `bedcode_navigator-0.2.0+2/lib/bedcode_navigator.dart:3` = `export 'package:go_router/go_router.dart';`; its `pubspec.yaml:35` = `go_router: ^17.0.1`. Relaty's own manifest names neither. A pubspec grep routes this app down the "unknown router" branch and finds nothing. |
| State management | **flutter_bloc 9.1.1**, zero Provider | `state-mgmt.md` §0. `provider` is `dependency: transitive` in `pubspec.lock`, pulled by flutter_bloc's re-export. |
| Animation deps | **`lottie: 3.5.1` only.** No `animations`, no `flutter_animate`. | `pubspec.yaml` |
| Existing motion scale | **absent** — no file matching `motion-system.md` §2's globs is a token file. 16 distinct durations, 11 distinct curves scattered. | §2 detection |

**Note on the disk layout:** Relaty's source root is `lib/src/`. Probes are rooted at `lib`
and print `lib/src/core/…`; `findings.md`'s prose cites `core/…`. That mismatch is now
documented in `findings.md`'s mechanics preamble.

---

## Per-rule results

`Reported` = findings surviving the confirm step. `Real` = confirmed by opening the file at
the cited line. Every rule reporting under 20 was checked exhaustively; `style-1` (75) was
sampled at 20; `hyg-5` (13 candidates) had 5 hand-checked; `state-6`'s full 18-candidate set
was read.

| Rule | Raw | After filters | Reported | Real | FP | Notes |
|---|---|---|---|---|---|---|
| `nav-1` | 2 Nav1.0 + 17 `GoRoute` | 13 stage-1 / 19 stage-2 | 17 routes + 0 | 17 / 0 | **0%** | Both Nav1.0 hits correctly reclassified as delegated-transition, not "missing". |
| `nav-2` | 0 | probe 2 → 3 | 1 | 1 | **0%** | Known false negative on probe 1; probe 2 recovers it. |
| `nav-3` | 48 | 2 flows | 1 | **0** | **100%** | **FALSE POSITIVE — fixed.** |
| `nav-4` | 2 | 2 | 2 | 2 | **0%** | |
| `nav-5` | 0 | — | 0 | 0 | — | Real zero. `Hero(` appears nowhere under `lib/`. |
| `state-1` | 39 / 16 files | — | 1 | 1 | **0%** | |
| `state-2` | 3 | 2 | 2 | **1** | **50%** | **FALSE POSITIVE — fixed.** |
| `state-3` | manual | — | 0 | 0 | — | Confirmed zero; `isEmpty` guard present. |
| `state-4` | manual | — | 1 | 1 | **0%** | |
| `state-5` | 6 | — | 0 | 0 | — | Confirmed zero. All 6 read; 6/6 correctly discarded. |
| `state-6` | 57 | 22 anchored → 18 | 2 | 2 | **0%** | All 18 candidates read. No false negatives. |
| `state-7` | 10 | — | 0 | 0 | — | Confirmed zero. All 8 cross-fades measured at 300ms. |
| `style-1` | 92 | 77 → 75 | 75 literals | see below | **0%** on the sample | Confirm step correct; the *headline count* was misleading. |
| `style-2` | 63 | 55, 11 distinct | 5 cheap + 1 spread | 5 + 1 | **0%** | Histogram reproduced exactly. |
| `style-3` | 75 | — | 31 outside band | 31 | **0%** | 44/18/7/6 reproduced exactly. |
| `hyg-1` | 50 / 16 files | — | 0 | 0 | — | **0 leaks.** Every one of 21 controller fields disposed. All 5 clauses load-bearing. |
| `hyg-2` | 15 | 10 + 5 | 3 style, 0 crash | 3 / 0 | **0%** | All 10 `Single…` classes own exactly one controller. |
| `hyg-3` | 5 | 3 real + 2 generated | — | — | n/a | See defect D8 — the rule states no verdict. |
| `hyg-4` | 0 | — | 1 app-wide | 1 | **0%** | 0 of 654 files check `disableAnimations`; no `pageTransitionsTheme`. |
| `hyg-5` | 25 | 13 | 13 | 5/5 sampled | **0%** | Same 13 sites reproduced exactly. |

**Aggregate: 2 false positives out of 20 rules.** Every other rule that reported anything
reported only real findings. Every rule reporting zero was confirmed to be a correct zero
except `nav-2`, whose zero is the documented probe gap that the second probe closes.

### Numbers checked against the brief's corrected baseline

Every figure in the brief's expected-shape table reproduced exactly: `style-2` 7→5 cheap,
`hyg-2` 10+5, `state-6` 57→22→18→2, `state-7` 4 cross-fades in `frequency_step.dart`,
`nav-1` 2 + 17, `style-1` 92→75, `hyg-1` 50→0, `hyg-4` 0→1, `state-4` 1
(`profile_content.dart:83`), `state-5` 6→0, `hyg-5` 25→13. **No number in the brief was
wrong.**

---

## The false positives, in detail

The next person changing these rules needs to know what they used to get wrong.

### FP-1 — `nav-3`, `features/onboarding/presentation/widgets/onboarding_content.dart:46-49`

**What was reported.** Confirm clause 3 says the finding is usually a bypass path, and
names this exact site: `if (isSkipped) { _pageController.jumpToPage(index); return; }`
sitting beside an animated `animateToPage(…, 200ms, easeInOut)` at `:52-55`. Skip is an
instant cut while every other step animates. Clause 3 ends there, so the site gets reported.

**Why it is not real.** `_onOnboardingSkipPressed`
(`features/onboarding/presentation/bloc/onboarding_bloc.dart:57-71`) sets
`_currentPageIndex = _totalPages - 1` at `:61` — skip jumps straight to the last of four
steps from wherever the user is. Animating that scrolls the user through every intermediate
page, which is worse than the cut. The instant jump is correct.

**Why the rule missed it.** The disqualifying test existed — but it lived in the **Fix**
section as an "Exception", after the finding had already been reported. A confirm step that
does not contain the test that kills the finding is not a confirm step. It also cannot be
answered at the call site: `index` is computed by the bloc, so the reader has to open the
emitter.

**Fix.** New confirm clause 4 (old 4 → 5): resolve how far the bypass jumps, in source,
before reporting. Fix-section "Exception" wording removed and pointed at clause 4 so there
is one place the carve-out lives. Rule index row `2 flows → 1` → `2 flows → 0`.

### FP-2 — `state-2`, `features/timeline/presentation/widgets/contacts_progress.dart:43`

**What was reported.** `findings.md` said "Same shape at `contacts_progress.dart:43`",
grouping it with the genuine hit at `smart_add_voice_input.dart:72`.

**Why it is not real.** It is not the same shape. `ContactsProgress` is a stateless
onboarding card rendering `LinearProgressIndicator(value: contactsCount / 3, …
disableAnimation: false)` — a "you have N of 3 contacts" meter. There is **no conditional
anywhere in that file** governing the indicator. The nearest one is
`if (showProgress) ContactsProgress(contactsCount: contactsCount)` at
`features/timeline/presentation/widgets/timeline_content.dart:209` — a different file, and
it governs the whole card, not the indicator. Nothing pops relative to its surroundings.

**Why the rule missed it.** Confirm clause 1 asked "is the indicator inside a conditional"
without bounding *whose* conditional, so an ancestor in another file satisfied it.

**The tightening that did NOT work, and why it is worth recording.** The first fix drafted
was "discard a determinate `value:` bound to a domain quantity — that is a meter, not a
spinner". Opening `smart_add_voice_input.dart:72` killed it: the real finding is
`CircularProgressIndicator(value: progress, …)`, also determinate. That rule would have
dropped the one true positive and kept nothing. **Determinacy does not discriminate here**;
the confirm step now says so explicitly so the same wrong fix is not re-derived.

**Fix.** Confirm clause 1 rewritten to require the governing conditional and the indicator
to be in the same `build`, with an explicit hand-off to `state-1` when the conditional wraps
the whole widget. Rule index row `3 → 2` → `3 → 2 filtered → 1`.

---

## Other defects found (not false positives)

- **D3 — `style-1`'s headline count reads as a finding count.** The rule index said
  `92 → 75 real literals`. 75 is a *pre-confirm* literal count; clause 1 then removes every
  scheduling site (`Future.delayed`, `Timer`, `debounceTime`, retry backoffs). Fixed in the
  index row and the Raw-hits line.
- **D4 — `style-1` clause 2's scheduling measurement was a 4x undercount.** It said a
  3-line-window `Future\.delayed|Timer\(|debounceTime` scan finds "4 of the ~10 known
  scheduling sites". The **4 reproduces exactly** — but "~10" does not: adding one
  alternative, `Future(<void>)?\.delayed`, takes the same scan to **18**, because Relaty
  writes `Future<void>.delayed` and `Future\.delayed` cannot match it. Clause 2 rewritten
  with the measured 4 → 18 jump, since the shortfall is the whole point of the clause.
- **D5 — `style-1` "75 parse to a bare integer" is off by one.** 74 are a bare integer; the
  75th is `smart_overlay_details.dart:360`'s compound expression, which the leading-integer
  regex reads *cleanly* while the real values are 50/75/100/125ms. `style-3` already
  documented the compound case; the `style-1` line now agrees with it.
- **D6 — `nav-1` stage 1 printed unusable output.** The probe used `grep -rhn`; `-h`
  suppresses the filename, so stage 1 emitted `5:class AboutPage extends MaterialPage<void>`
  with no path — and its own confirm step says "open the widget containing the push, or the
  route entry", which cannot be done from that. Changed to `grep -rn`. Count unchanged (13).
- **D7 — Relaty citations are relative to `lib/src/`, never stated.** Every probe prints
  `lib/src/core/…`; every prose citation says `core/…`. Documented in the mechanics preamble.
- **D8 — `hyg-3` states no Relaty verdict.** Its rule-index cell (`5 → 3 real widgets, 2
  generated`) describes what *exists*, and the rule's own text says "the finding is what is
  absent". A first-time reader has no way to conclude whether Relaty has a `hyg-3` finding.
  Left as-is — it needs a judgment call about which animating subtrees sit beside expensive
  static siblings, which is a genuine reading task, not a wording bug. **Flagged, not fixed.**
- **D9 — the generated-tree exclusion is stated globally but implemented in one probe.**
  The mechanics preamble says "Exclude generated trees everywhere"; only `hyg-3`'s probe
  carries `| grep -v '^lib/gen/'`. Measured across all 16 greppable probes: `lib/gen/`,
  `*.g.dart`, `*.gr.dart` and `*.freezed.dart` contribute **hits to `hyg-3` only** on
  Relaty, so no count is wrong. Left as-is; the instruction is correct even where it is
  currently a no-op.

### SKILL.md flow defects

- **F1 — Step 2, "Existing animation deps".** The row lumps `animations` /
  `flutter_animate` (transition libraries) with `lottie` / `rive` (asset players) and then
  says "Never stack a second animation library on a project that already has one". Relaty
  ships `lottie`. Read literally, that forbids adding `package:animations` — which is the
  prescribed fix for `nav-1` and `nav-2`, the two highest-value findings in the whole run.
  The rule is right about the collision it means and wrong about which packages collide.
  **Fixed:** the row now separates the two categories and states that `lottie`/`rive` are
  not a reason to decline `package:animations`.
- **F2 — Step 3, report format.** `Tokens: absent | <path> | scattered literals (N distinct
  durations, M distinct curves)` reads as three alternatives, but Relaty is both "absent"
  **and** "scattered literals (16, 11)". **Fixed:** split into a `Tokens:` line (absent or a
  path) and an always-reported `Spread:` line.

### Not a defect, but a judgment call for the reader

`style-2`'s cheap-curve half is "flag on sight, high severity" with no ambient carve-out,
while `style-3` clause 3 explicitly exempts ambient/looping animation from its >800ms band.
Two of the five cheap-curve hits — `animations/listening_animation.dart:115,119`,
`Curves.elasticOut` on a voice-listening bounce — are exactly that ambient class. They are
**real** (the curve is there, in code, not a comment) so they are not counted as false
positives, but reporting a deliberate decorative bounce at the same severity as
`time_picker.dart:154`'s `bounceOut` on a time-picker wheel will read as over-firing.
Left unchanged: making it conditional risks giving every project an excuse, and the
catalog's stated position is that the family is never worth writing.

---

## What the run says about the plugin's thesis

The thesis is "grep finds candidates, reading confirms them". It held. The two rules the
brief predicted would be worst — `state-6` (`Container`, 57 raw) and `state-5`
(`Visibility`/`Opacity`, 6 raw, 6 false) — were the two cleanest: `state-6` read all 18
candidates down to 2 real with no misses, and `state-5` correctly reported nothing at all.
`hyg-1`'s five clauses each did real work on a real file and produced 0 leaks against 50 raw
hits.

The failures were both in *narrative* rules with hand-written confirm steps and a small
candidate set — `nav-3` (1 of 1 wrong) and `state-2` (1 of 2 wrong) — where a specific
Relaty site had been named in the prose as confirmed without the disqualifying test being
part of the confirm step. That is the pattern to watch: **a rule is most likely to be wrong
where its confirm step is prose about a named site rather than a test the reader applies.**

## Final rate

**Before:** 2 false positives across the rules that reported anything.
**After:** 0 — both re-run in Step 6 with the tightened confirm steps and the previously
mis-reported sites now correctly discarded, with the true positive in `state-2` retained.
