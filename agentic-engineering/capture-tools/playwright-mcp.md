---
name: playwright-mcp
description: Playwright MCP — Claude controls the browser directly, captures per-AC
platforms: [web]
mechanism: mcp
detection: []
output_dir: docs/features/<feature-name>/artifacts/STORY-XXX/
---

# Playwright MCP

Model Context Protocol server that gives Claude direct browser control. Claude navigates, fills forms, clicks, and screenshots without running test code. Useful for stories where AC describe user flows but no test exists yet.

Reference: https://github.com/microsoft/playwright-mcp

## One-time setup

Install the Playwright MCP server in Claude Code per the project's documentation. Typically:

```bash
# In Claude Code settings, add MCP server:
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Verify the server is listed in Claude Code's MCP server view after restart.

## MCP usage (instead of a capture command)

During `/ship` Phase 4, the implementer agent uses these MCP tools:

- `mcp__playwright__navigate(url)` — open the dev server URL
- `mcp__playwright__fill(selector, value)` — fill form fields
- `mcp__playwright__click(selector)` — click buttons / links
- `mcp__playwright__screenshot(path)` — capture current viewport, write to disk
- `mcp__playwright__close()` — clean up

The agent walks through each AC's user flow (derived from the AC text + the implementation), captures the relevant viewport state(s), and writes files directly to the artifacts dir.

## Where captures land

Written directly via the MCP to `docs/features/<feature-name>/artifacts/STORY-XXX/` with names matching AC numbers (e.g., `ac-1-happy-path.png`, `ac-2-error-state.png`).

## /ship Phase 4 integration

1. `/ship` Phase 4 detects `mechanism: mcp` in `.claude/visual-capture.md`.
2. Implementer agent reads STORIES.md for the active story; extracts AC text.
3. Per AC, agent uses MCP tools to navigate + interact + screenshot. Captures land directly in artifacts dir with predictable per-AC names.
4. Agent populates Visual Artifacts table rows from the captured files.

On MCP failure (server not running, selectors missing, navigation timeout): emit warning, mark affected AC as skipped, continue ship chain. Operator captures manually for those AC.

## Tradeoffs vs Playwright test runner

| | playwright (test-runner) | playwright-mcp (MCP) |
|---|---|---|
| Requires test code | Yes — your existing test suite | No — Claude scripts the flow from AC text |
| Reproducible across runs | Yes (deterministic) | Less (depends on Claude's flow interpretation) |
| Captures match tests | Yes (1:1 with test names) | No (1:1 with AC) |
| Setup overhead | Low if Playwright tests exist | Low if MCP server installed |

Use `playwright` when you have a Playwright test suite. Use `playwright-mcp` for early-stage projects or for AC that aren't yet covered by automated tests.
