# Release focus — `/focus done`

Clear CURRENT and PLAN, promote NEXT. Run by `/focus done` and, at the end of a successful chain, by the chain itself — without loading all of `commands/focus.md`.

**Who releases.** `/ship` and `/implement` release on success unless nested: `set_by:` on CURRENT contains `/ship-all` (for `/ship`) or `/ship` / `/ship-all` (for `/implement`) → the parent releases, skip. `/ship-all` releases once, after its final story. Under `--auto` the caller applies the auto branch below inline (pass `auto`): no widget, no re-invoked slash command.

Read `.agentic/focus.md`. **PLAN is cleared in every sub-case below** — it describes the task being closed. `/cleanup` reads PLAN, so a chain command that wants its steps recorded must run cleanup *before* calling `/focus done`.

Three sub-cases:

**NEXT empty (or file absent):** Clear CURRENT + PLAN (delete sections, or remove file if NEXT also empty). Print:
```
━━━ FOCUS DONE ━━━
🎯 (none)
NEXT queue empty.
```
Exit.

**Auto-mode short-circuit (NEXT non-empty + `$ARGUMENTS` contains `auto` token):** Parent command runs under `--auto`. Skip y/n/b prompt entirely. Promote NEXT item #1 to CURRENT with `set_by: /focus done (auto-promoted)`, `since: now`. Renumber NEXT (remove item 1, shift up). Append DECISION line to `.agentic/auto-log.md` (create if missing) describing promotion. Print:
```
━━━ FOCUS DONE (auto-promoted) ━━━
🎯 [promoted item]
```
Exit.

**NEXT non-empty (interactive):** Read item #1 of NEXT. Print state, then gate:

```
━━━ FOCUS DONE ━━━
🎯 (cleared)

Next queued: [item #1 text]
```

⚠️ **Human checkpoint** `[ASK: single]`: *"Pick up '[item #1 text]' next?"*

| Option | Effect |
|---|---|
| **Pick it up (Recommended)** | Rewrite CURRENT with `title: <item #1 text>`, `since: now`, `set_by: /focus done (promoted)`. Remove item #1 from NEXT; renumber. |
| **Leave it queued** | Clear CURRENT only. NEXT untouched. |
| **Move to backlog** | Invoke `/note` workflow with the item text. Remove from NEXT; renumber. |

Confirm result.
