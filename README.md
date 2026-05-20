# bedcode skills

A marketplace of [Claude Code](https://claude.ai/code) plugins by [thebedcoder](https://github.com/thebedcoder) — structured SDLC workflows, product research, and decision-making tools. Installs into Claude Code as a plugin marketplace, or into any other coding agent (Cursor, Codex, Copilot, Cline, Windsurf, Aider, Gemini CLI, Zed, OpenHands) via a portable shell installer.

---

## Plugins

| Plugin | What it does |
|---|---|
| [`agentic-engineering`](./agentic-engineering/) | Full SDLC workflow with named specialist agents — `/bootstrap`, `/init`, `/feature`, `/ship`, `/review`, `/fix`, `/doc`. Five-agent parallel code review (bugs, requirements, tests, conventions, security). End-user product docs kept in sync. |
| [`jtbd`](./jtbd/) | Jobs-to-Be-Done megaskill — product brief to research, personas, competitor analysis, landing page copy, and platform-native ad scripts. Five chainable modes powered by parallel specialist agents. |
| [`premortem-skill`](./premortem-skill/) | `/premortem <plan>` — assumes the target failed 6 months from now, dispatches one investigator per failure reason in parallel, synthesizes the most likely failure, hidden assumptions, and a revised plan. |

Each plugin has its own README with the full workflow and command reference.

---

## Install

### Claude Code (plugin marketplace)

```
/plugin marketplace add thebedcoder/skills
/plugin install agentic-engineering@thebedcoder
/plugin install jtbd@thebedcoder
```

Updates flow through the marketplace — no shell re-run needed.

### Other coding agents

The top-level `install.sh` writes a portable rules file (`AGENTS.md`, `.cursor/rules/*.mdc`, `.clinerules`, `.windsurfrules`, `GEMINI.md`, `CONVENTIONS.md`, `.github/copilot-instructions.md`, etc.) into the right place for your tool.

```bash
# One-shot, autodetect installed tools
curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash -s -- --tool=auto

# Or pick a specific tool + skill
curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash -s -- --skill=agentic-engineering --tool=cursor

# From a local checkout
bash install.sh --skill=jtbd --tool=codex
bash install.sh --help     # full options
```

**Supported tools:** `claude-code`, `cursor`, `codex`, `copilot`, `copilot-cli`, `cline`, `windsurf`, `aider`, `gemini`, `zed`, `openhands`, `agents-md`, `auto`.

**Scope:** `--scope=project` (default) writes to the current directory. `--scope=user` writes to the tool's global config where supported (Cursor, Codex, Gemini).

Re-running the installer is idempotent — blocks are wrapped in `<!-- <plugin>:start -->` … `<!-- <plugin>:end -->` markers and replaced in place.

---

## Repo layout

```
.
├── .claude-plugin/
│   └── marketplace.json          # Claude Code marketplace manifest
├── agentic-engineering/          # plugin
├── jtbd/                         # plugin
├── premortem-skill/              # plugin (not yet in marketplace.json)
├── install.sh                    # universal multi-tool installer
├── LICENSE
└── CLAUDE.md                     # contributor guidance for AI assistants
```

Each plugin follows the same internal layout — see [`CLAUDE.md`](./CLAUDE.md) for the per-plugin structure and the conventions to follow when contributing.

---

## License

See [LICENSE](./LICENSE).
