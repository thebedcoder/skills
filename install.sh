#!/usr/bin/env bash
#
# bedcode-skills installer — bedcode skills for any coding agent
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash -s -- --tool=cursor
#   bash install.sh [--skill=<skill>] [--tool=<tool>] [--branch=main] [--scope=project|user]
#
# Available skills (--skill=, default: agentic-engineering):
#   agentic-engineering  Full SDLC workflow — TDD, PRDs, stories, 5-agent review
#   jtbd                 Jobs to Be Done — research, personas, landing copy, ad scripts
#
# Supported tools:
#   claude-code     Full plugin install (slash commands + specialist agents)
#   cursor          .cursor/rules/*.mdc + AGENTS.md
#   codex           AGENTS.md (Codex CLI reads this from project root)
#   copilot         .github/copilot-instructions.md (GitHub Copilot in IDE)
#   copilot-cli     Print plugin install instructions (Copilot CLI has its own marketplace)
#   cline           .clinerules (Cline VS Code extension)
#   windsurf        .windsurfrules (Windsurf / Codeium)
#   aider           CONVENTIONS.md (Aider)
#   gemini          GEMINI.md (Gemini CLI)
#   zed             AGENTS.md (Zed assistant)
#   openhands       AGENTS.md (OpenHands / OpenDevin)
#   agents-md       AGENTS.md only — generic, read by any AGENTS.md-aware tool
#   auto            Detect installed tools and install for each
#
# Scope:
#   project (default for most tools) — writes to current directory
#   user                              — writes to user's global config (where supported)

set -euo pipefail

REPO_URL="${BEDCODE_SKILLS_REPO:-https://github.com/thebedcoder/skills.git}"
DEFAULT_CACHE="${BEDCODE_SKILLS_DIR:-$HOME/.local/share/bedcode-skills}"
BRANCH="main"
TOOL="claude-code"
SKILL="agentic-engineering"
SCOPE="project"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tool=*)   TOOL="${1#*=}"; shift ;;
    --tool)     TOOL="${2:?--tool requires a value}"; shift 2 ;;
    --branch=*) BRANCH="${1#*=}"; shift ;;
    --branch)   BRANCH="${2:?--branch requires a value}"; shift 2 ;;
    --skill=*)  SKILL="${1#*=}"; shift ;;
    --skill)    SKILL="${2:?--skill requires a value}"; shift 2 ;;
    --scope=*)  SCOPE="${1#*=}"; shift ;;
    --scope)    SCOPE="${2:?--scope requires a value}"; shift 2 ;;
    -h|--help)
      cat <<'EOF'
bedcode-skills installer — bedcode skills for any coding agent

Usage:
  curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/thebedcoder/skills/main/install.sh | bash -s -- --tool=cursor
  bash install.sh [--skill=<skill>] [--tool=<tool>] [--branch=main] [--scope=project|user]

Available skills (--skill=, default: agentic-engineering):
  agentic-engineering  Full SDLC workflow — TDD, PRDs, stories, 5-agent review
  jtbd                 Jobs to Be Done — research, personas, landing copy, ad scripts

Supported tools:
  claude-code     Full plugin install (slash commands + specialist agents)
  cursor          .cursor/rules/*.mdc + AGENTS.md
  codex           AGENTS.md (Codex CLI reads this from project root)
  copilot         .github/copilot-instructions.md (GitHub Copilot in IDE)
  copilot-cli     Print plugin install instructions (Copilot CLI has its own marketplace)
  cline           .clinerules (Cline VS Code extension)
  windsurf        .windsurfrules (Windsurf / Codeium)
  aider           CONVENTIONS.md (Aider)
  gemini          GEMINI.md (Gemini CLI)
  zed             AGENTS.md (Zed assistant)
  openhands       AGENTS.md (OpenHands / OpenDevin)
  agents-md       AGENTS.md only — generic, read by any AGENTS.md-aware tool
  auto            Detect installed tools and install for each

Scope:
  project (default for most tools) — writes to current directory
  user                              — writes to user's global config (where supported)

Environment overrides:
  BEDCODE_SKILLS_REPO   Git URL for the source repo
  BEDCODE_SKILLS_DIR    Cache location (default: ~/.local/share/bedcode-skills)
  CURSOR_RULES_DIR, CURSOR_AGENTS_MD, CLINERULES, WINDSURFRULES,
  AIDER_CONVENTIONS, GEMINI_MD, COPILOT_INSTRUCTIONS, CODEX_AGENTS_MD, AGENTS_MD
EOF
      exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ---------- Resolve source dir: local checkout, else clone/pull cache ----------

SCRIPT_PATH="${BASH_SOURCE[0]:-}"
SOURCE_DIR=""
if [[ -n "$SCRIPT_PATH" && -f "$SCRIPT_PATH" ]]; then
  CANDIDATE="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
  if [[ -d "$CANDIDATE/$SKILL" && -f "$CANDIDATE/$SKILL/install.sh" ]]; then
    SOURCE_DIR="$CANDIDATE"
  fi
fi

if [[ -n "$SOURCE_DIR" ]]; then
  if [[ -d "$SOURCE_DIR/.git" ]]; then
    echo "↻ Pulling latest in $SOURCE_DIR ..."
    git -C "$SOURCE_DIR" pull --ff-only --quiet || echo "  (git pull skipped — continuing with local state)"
  else
    echo "→ Using local checkout at $SOURCE_DIR (not a git repo — won't auto-update)"
  fi
else
  command -v git >/dev/null 2>&1 || { echo "git is required but not installed" >&2; exit 1; }
  SOURCE_DIR="$DEFAULT_CACHE"
  if [[ -d "$SOURCE_DIR/.git" ]]; then
    echo "↻ Updating $SOURCE_DIR ..."
    git -C "$SOURCE_DIR" fetch --quiet origin "$BRANCH"
    git -C "$SOURCE_DIR" checkout --quiet "$BRANCH"
    git -C "$SOURCE_DIR" reset --hard --quiet "origin/$BRANCH"
  else
    echo "↓ Cloning $REPO_URL → $SOURCE_DIR ..."
    mkdir -p "$(dirname "$SOURCE_DIR")"
    git clone --quiet --branch "$BRANCH" "$REPO_URL" "$SOURCE_DIR"
  fi
fi

SHA="$(git -C "$SOURCE_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
SKILL_DIR="$SOURCE_DIR/$SKILL"
TEMPLATE="$SKILL_DIR/adapters/AGENTS.md.template"

[[ -d "$SKILL_DIR" ]] || { echo "Skill '$SKILL' not found in $SOURCE_DIR" >&2; exit 1; }

# ---------- Helpers ----------

# Resolve <project|user> target for a tool. Sets globals TARGET_FILE and RULES_DIR.
# Returns 1 if the tool is unsupported by this helper (e.g., claude-code, copilot-cli).
resolve_target() {
  local tool="$1" scope="$2"
  TARGET_FILE=""
  RULES_DIR=""

  case "$tool" in
    cursor)
      if [[ "$scope" == "user" ]]; then
        TARGET_FILE="${CURSOR_AGENTS_MD:-$HOME/.cursor/AGENTS.md}"
        RULES_DIR="${CURSOR_RULES_DIR:-$HOME/.cursor/rules}"
      else
        TARGET_FILE="${CURSOR_AGENTS_MD:-$PWD/AGENTS.md}"
        RULES_DIR="${CURSOR_RULES_DIR:-$PWD/.cursor/rules}"
      fi ;;
    codex)
      if [[ "$scope" == "user" ]]; then
        TARGET_FILE="${CODEX_AGENTS_MD:-$HOME/.codex/AGENTS.md}"
      else
        TARGET_FILE="${CODEX_AGENTS_MD:-$PWD/AGENTS.md}"
      fi ;;
    copilot)
      TARGET_FILE="${COPILOT_INSTRUCTIONS:-$PWD/.github/copilot-instructions.md}"
      ;;
    cline)
      TARGET_FILE="${CLINERULES:-$PWD/.clinerules}"
      ;;
    windsurf)
      TARGET_FILE="${WINDSURFRULES:-$PWD/.windsurfrules}"
      ;;
    aider)
      TARGET_FILE="${AIDER_CONVENTIONS:-$PWD/CONVENTIONS.md}"
      ;;
    gemini)
      if [[ "$scope" == "user" ]]; then
        TARGET_FILE="${GEMINI_MD:-$HOME/.gemini/GEMINI.md}"
      else
        TARGET_FILE="${GEMINI_MD:-$PWD/GEMINI.md}"
      fi ;;
    zed|openhands|agents-md)
      TARGET_FILE="${AGENTS_MD:-$PWD/AGENTS.md}"
      ;;
    *)
      return 1 ;;
  esac
  return 0
}

# Idempotent write: replace existing <skill>:start..<skill>:end block if present,
# otherwise append. Creates file/dir if missing. Marker name is the skill short
# name (e.g. `agentic-engineering:start`, `jtbd:start`) so multiple skills can
# coexist in the same AGENTS.md.
write_or_replace() {
  local target="$1" template="$2" marker="$3"

  mkdir -p "$(dirname "$target")"

  if [[ -f "$target" ]] && grep -q "${marker}:start" "$target"; then
    echo "  → Replacing existing ${marker} block in $target ..."
    python3 - "$target" "$template" "$marker" <<'PY'
import re, sys, pathlib
target = pathlib.Path(sys.argv[1])
template = pathlib.Path(sys.argv[2]).read_text()
marker = re.escape(sys.argv[3])
content = target.read_text()
content = re.sub(
    rf"<!-- {marker}:start.*?{marker}:end[^>]*-->\n?",
    template,
    content,
    flags=re.DOTALL,
)
target.write_text(content)
PY
  elif [[ -f "$target" ]]; then
    echo "  → Appending to existing $target ..."
    printf "\n\n" >> "$target"
    cat "$template" >> "$target"
  else
    echo "  → Writing $target ..."
    cp "$template" "$target"
  fi
}

# Copy rules-library into a Cursor-friendly .cursor/rules dir.
# Renames frontmatter `paths:` (rules-library convention) to `globs:` so
# Cursor's MDC format honors the path scoping. Skips README.md, which is
# documentation, not a rule.
copy_rules_to_cursor() {
  local dest="$1"
  [[ -d "$SKILL_DIR/rules-library" ]] || { echo "  (no rules-library — skipping)"; return; }
  mkdir -p "$dest"
  local count=0
  for src in "$SKILL_DIR/rules-library"/*.md; do
    [[ -f "$src" ]] || continue
    local base
    base="$(basename "$src")"
    [[ "$base" == "README.md" ]] && continue
    local name="${base%.md}.mdc"
    # Accept both `paths:` (current rules-library convention) and `pattern:`
    # (older convention) — map either to Cursor's `globs:`. YAML list format
    # below the key is preserved verbatim; Cursor accepts list-of-strings.
    # Use `#` as sed delimiter to avoid collision with `|` in the alternation.
    sed -E 's#^(paths|pattern):#globs:#' "$src" > "$dest/$name"
    count=$((count + 1))
  done
  echo "  → Copied $count rules to $dest"
}

install_agents_md_style() {
  local tool="$1"
  local note=""

  # Several plugins are Claude-Code-only and ship no adapters/AGENTS.md.template.
  # Without this check the `cp` below dies under `set -e` with a bare
  # "No such file or directory" — and under --tool=auto that happens *after* the
  # claude-code install already succeeded, so the run half-completes and aborts.
  if [[ ! -f "$TEMPLATE" ]]; then
    echo "⚠ Skipping $tool — '$SKILL' is Claude Code only (no adapters/AGENTS.md.template)." >&2
    SKIPPED_ANY=1
    return 0
  fi

  resolve_target "$tool" "$SCOPE" || { echo "resolve_target failed for $tool" >&2; return 1; }

  case "$tool" in
    cursor)     note="Cursor reads AGENTS.md + .cursor/rules/ automatically. Rules are scoped by glob." ;;
    codex)      note="Codex CLI reads AGENTS.md from project root (or ~/.codex/AGENTS.md with --scope=user)." ;;
    copilot)    note="GitHub Copilot (VS Code / JetBrains) reads .github/copilot-instructions.md when present." ;;
    cline)      note="Cline (VS Code extension) reads .clinerules from project root on activation." ;;
    windsurf)   note="Windsurf (Codeium) reads .windsurfrules from project root." ;;
    aider)      note="Aider: pass via /add CONVENTIONS.md, or add 'read: CONVENTIONS.md' to .aider.conf.yml." ;;
    gemini)     note="Gemini CLI reads GEMINI.md from project root (or ~/.gemini/GEMINI.md with --scope=user)." ;;
    zed)        note="Zed's assistant reads AGENTS.md from project root." ;;
    openhands)  note="OpenHands reads AGENTS.md from project root." ;;
    agents-md)  note="Generic AGENTS.md — read by Codex, Cursor, Zed, OpenHands, Aider (recent), etc." ;;
  esac

  write_or_replace "$TARGET_FILE" "$TEMPLATE" "$SKILL"
  if [[ -n "$RULES_DIR" ]]; then
    if [[ "$tool" == "cursor" ]]; then
      copy_rules_to_cursor "$RULES_DIR"
    else
      mkdir -p "$RULES_DIR"
      cp -r "$SKILL_DIR/rules-library/." "$RULES_DIR/"
      echo "  → Copied rules-library to $RULES_DIR"
    fi
  fi

  echo ""
  echo "ℹ $note"
}

detect_installed_tools() {
  local detected=()
  [[ -d "$HOME/.claude" ]] && detected+=("claude-code")
  [[ -d "$HOME/.codex" ]] && detected+=("codex")
  { [[ -d "$HOME/.cursor" ]] || [[ -d "$PWD/.cursor" ]]; } && detected+=("cursor")
  { [[ -d "$HOME/.config/github-copilot" ]] || [[ -d "$HOME/Library/Application Support/Code/User/globalStorage/github.copilot" ]]; } && detected+=("copilot")
  { [[ -d "$HOME/.aider" ]] || [[ -f "$PWD/.aider.conf.yml" ]]; } && detected+=("aider")
  [[ -d "$HOME/.windsurf" ]] && detected+=("windsurf")
  [[ -d "$HOME/.gemini" ]] && detected+=("gemini")
  { [[ -d "$HOME/.zed" ]] || [[ -d "$HOME/Library/Application Support/Zed" ]]; } && detected+=("zed")
  # Cline / Roo / Continue live inside VS Code extensions — best-effort detect:
  if [[ -d "$HOME/.vscode/extensions" ]]; then
    ls "$HOME/.vscode/extensions" 2>/dev/null | grep -qi "cline\.cline\|saoudrizwan\.claude-dev" && detected+=("cline")
    ls "$HOME/.vscode/extensions" 2>/dev/null | grep -qi "codeium\.windsurf\|exafunction\.windsurf" && detected+=("windsurf")
  fi
  printf '%s\n' "${detected[@]}"
}

# ---------- Main dispatch ----------

case "$TOOL" in
  claude-code)
    bash "$SKILL_DIR/install.sh"
    ;;

  copilot-cli)
    cat <<EOF
GitHub Copilot CLI uses its own plugin marketplace — there is no shell
installer for Copilot CLI plugins yet.

To use the $SKILL portable workflow with Copilot in your IDE:
  bash install.sh --skill=$SKILL --tool=copilot

That writes .github/copilot-instructions.md, which the Copilot VS Code /
JetBrains extension reads automatically.
EOF
    ;;

  auto)
    DETECTED=()
    while IFS= read -r line; do
      [[ -n "$line" ]] && DETECTED+=("$line")
    done < <(detect_installed_tools)
    if (( ${#DETECTED[@]} == 0 )); then
      echo "No coding agent tools detected on this machine."
      echo "Falling back to writing a generic AGENTS.md in the current directory."
      echo ""
      install_agents_md_style "agents-md"
    else
      echo "Detected: ${DETECTED[*]}"
      echo ""
      for t in "${DETECTED[@]}"; do
        echo "─── Installing for $t ───"
        if [[ "$t" == "claude-code" ]]; then
          bash "$SKILL_DIR/install.sh"
        else
          install_agents_md_style "$t"
        fi
        echo ""
      done
    fi
    ;;

  cursor|codex|copilot|cline|windsurf|aider|gemini|zed|openhands|agents-md)
    install_agents_md_style "$TOOL"
    ;;

  *)
    echo "Unknown tool: $TOOL" >&2
    echo "Supported: claude-code, cursor, codex, copilot, copilot-cli," >&2
    echo "           cline, windsurf, aider, gemini, zed, openhands," >&2
    echo "           agents-md, auto" >&2
    exit 1 ;;
esac

echo ""
if [[ "${SKIPPED_ANY:-0}" == "1" && "$TOOL" != "claude-code" && "$TOOL" != "auto" ]]; then
  echo "⚠ Nothing installed for $TOOL — '$SKILL' is Claude Code only."
  echo "  Install it with: --tool=claude-code --skill=$SKILL"
  exit 1
fi
echo "✅ Installed $SKILL@$SHA for $TOOL"
echo ""
if [[ "$TOOL" == "claude-code" ]]; then
  echo "For built-in updates, prefer the plugin install:"
  echo "  /plugin marketplace add thebedcoder/skills"
  echo "  /plugin install $SKILL@thebedcoder"
elif [[ "$TOOL" != "copilot-cli" ]]; then
  echo "Update later: re-run this command. The script git-pulls the source and re-applies."
fi
