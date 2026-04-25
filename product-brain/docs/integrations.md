# Integrations — LLM providers and engineer-side AI tools

Product Brain has two AI surfaces, each pluggable:

| Surface | What it is | Pluggable via |
|---|---|---|
| **Backend LLM** | Calls product-brain makes (backfill prose, edge mining, synthesis, coverage gaps). Mostly invisible. | `config.llm.provider` |
| **Engineer-side AI** | The chat tool the engineer uses (Claude Code, Copilot Chat, Codex, Cursor, ...). | The CLI is the universal surface; each tool wraps it differently. |

The PM-facing bot (Aha comments) is unaffected by either — it's just a webhook.

---

## Part 1: Backend LLM provider

Set `config.llm.provider` to one of:

- `anthropic`         — Claude (Haiku/Sonnet/Opus). Default.
- `openai`            — OpenAI direct (GPT-4o, etc).
- `azure_openai`      — Azure OpenAI (most enterprise Copilot orgs).
- `openai_compatible` — Anything speaking the OpenAI Chat Completions API: Ollama, LM Studio, vLLM, llama.cpp server, text-generation-inference, OpenRouter, Groq, Together, Anyscale, Fireworks, etc.

### Anthropic (default)

```yaml
llm:
  provider: anthropic
  api_key_env: ANTHROPIC_API_KEY
  model_summarize:  claude-haiku-4-5-20251001
  model_extract:    claude-haiku-4-5-20251001
  model_synthesize: claude-sonnet-4-6
```

Install: `pip install 'product-brain[anthropic]'`.

### OpenAI direct

```yaml
llm:
  provider: openai
  api_key_env: OPENAI_API_KEY
  model_summarize:  gpt-4o-mini
  model_extract:    gpt-4o-mini
  model_synthesize: gpt-4o
```

Install: `pip install 'product-brain[openai]'`.

### Azure OpenAI

The most common path for enterprise orgs that use GitHub Copilot — same Microsoft contract usually grants Azure OpenAI access.

```yaml
llm:
  provider: azure_openai
  api_key_env: AZURE_OPENAI_API_KEY
  base_url: https://yourco.openai.azure.com           # Azure resource URL
  api_version: 2024-02-15-preview
  model_summarize:  gpt-4o-mini-deployment            # YOUR Azure deployment name
  model_extract:    gpt-4o-mini-deployment
  model_synthesize: gpt-4o-deployment
```

Note: `model_*` are your **deployment names**, not OpenAI model names. Configure them in Azure portal first.

Install: `pip install 'product-brain[openai]'` (Azure uses the `openai` SDK).

### Local / self-hosted via Ollama

```yaml
llm:
  provider: openai_compatible
  api_key_env: OPENAI_API_KEY            # any value; Ollama ignores it
  base_url: http://localhost:11434/v1
  model_summarize:  llama3.1:8b-instruct
  model_extract:    llama3.1:8b-instruct
  model_synthesize: llama3.1:70b-instruct
```

Same pattern works for **LM Studio** (`http://localhost:1234/v1`), **vLLM**, **llama.cpp server**, **text-generation-inference**.

Install: `pip install 'product-brain[openai]'`.

### Hosted OpenAI-compatible aggregators

```yaml
# OpenRouter
llm:
  provider: openai_compatible
  api_key_env: OPENROUTER_API_KEY
  base_url: https://openrouter.ai/api/v1
  model_summarize:  meta-llama/llama-3.1-8b-instruct
  model_synthesize: anthropic/claude-3.5-sonnet

# Groq
llm:
  provider: openai_compatible
  api_key_env: GROQ_API_KEY
  base_url: https://api.groq.com/openai/v1
  model_summarize: llama-3.1-8b-instant
  model_synthesize: llama-3.1-70b-versatile
```

### Caveats with local / small models

The mining steps (edge-case extraction, coverage-gap detection) require **strict JSON output**. Models below ~13B routinely fail this. Symptoms:

- `bullets_dropped` count spikes in backfill output
- `qa_edges` and `coverage_gaps` come out empty
- Audit log shows JSON parse errors

Mitigations:
- Use 70B+ for `model_extract` even if you use a smaller model for `model_synthesize`
- Or, hybrid: hosted (Haiku/GPT-4o-mini) for `model_extract`, local for the rest. (Per-task provider switching is on the roadmap; for now you have to commit to one provider for all three model slots.)

### Cost reference

| Provider/model | Backfill (per ticket) | Groom (per call) |
|---|---|---|
| Anthropic Haiku | ~$0.005 | ~$0.05 |
| Anthropic Sonnet | ~$0.05 | ~$0.30 |
| OpenAI gpt-4o-mini | ~$0.003 | ~$0.03 |
| OpenAI gpt-4o | ~$0.04 | ~$0.25 |
| Azure OpenAI | matches OpenAI | matches OpenAI |
| Ollama / local | $0 (just GPU power) | $0 |

---

## Part 2: Engineer-side AI tools

The CLI is the universal surface. Anything that can shell out can use it:

```bash
product-brain run groom AHA-1234           # full grooming
product-brain run estimate AHA-1234        # estimate with refs
product-brain run edges AHA-1234           # edge-case checklist
product-brain run related AHA-1234         # similar shipped tickets
product-brain run draft-tickets AHA-1234   # propose sub-tickets
```

Output is markdown to stdout. Pipe, paste, or read it however your tool consumes data.

### Claude Code (out of the box)

Slash commands ship with the skill: `/pb-groom`, `/pb-plan`, `/pb-edges`, `/pb-related`, `/pb-draft-tickets`, `/pb-sync`. SKILL.md auto-triggers when the user mentions a ticket ID + planning verb. See [howto-engineer.md](howto-engineer.md).

### GitHub Copilot Chat

Copilot Chat doesn't have a slash-command extension model on par with Claude Code, but you have three integration patterns:

**1. Terminal-mediated (zero setup)**

Engineer asks Copilot Chat:
> "Run `product-brain run groom AHA-1234` and use the output to plan the implementation."

Copilot reads terminal output via the workspace agent. Works in VS Code / JetBrains today.

**2. Custom prompt template** (per-engineer setup)

Add to `.github/copilot-instructions.md` in any source repo:
```
When the user references a ticket ID matching AHA-\d+ and a planning verb,
suggest running: `product-brain run <command> AHA-XXXX`. The output is
markdown summarizing scope, estimate, edge cases, and risks across all
bound source repos. Use the output as planning context, not authoritative
truth — citations link back to real PRs and tests.
```

**3. Copilot extension** (org-wide setup, requires a Copilot Business/Enterprise plan)

Wrap product-brain as a Copilot extension. Skeleton:
```javascript
// minimal extension that exposes /pb-groom in Copilot Chat
app.post('/copilot', async (req, res) => {
  const ticket = extractTicket(req.body.messages);
  const result = await exec(`product-brain run groom ${ticket}`);
  res.send({ choices: [{ message: { content: result.stdout } }] });
});
```
~50 LOC. Document path: GitHub's [Copilot Extensions docs](https://docs.github.com/en/copilot/building-copilot-extensions).

### Codex CLI / OpenAI Codex

Just a shell command:

```bash
codex "summarize the plan for AHA-1234" --include "$(product-brain run groom AHA-1234)"
```

Or set up an alias:

```bash
alias pbg='product-brain run groom'
codex "look at $(pbg AHA-1234) and propose code changes"
```

### Cursor

Cursor's Composer can read terminal output. Pattern:

```
@terminal product-brain run groom AHA-1234
```

Then in chat: "Use that output as the plan."

For repeatable workflow, add to `.cursorrules` or your global rules:
```
For tickets like AHA-NNNN, prefer running `product-brain run groom <id>` and
treating the output as authoritative scope/estimate/edge-case context.
```

### Continue.dev / Aider / Generic IDE chat

Same pattern — terminal access.

For Continue, you can wrap as a custom slash command in `~/.continue/config.json`:
```json
{
  "slashCommands": [
    {
      "name": "pb-groom",
      "description": "Product Brain — groom an Aha ticket",
      "step": "ShellCommandStep",
      "params": { "command": "product-brain run groom" }
    }
  ]
}
```

### Generic terminal-only

If you have no chat tool integration, the CLI alone is fully usable:

```bash
product-brain run groom AHA-1234 | less
product-brain run edges AHA-1234 > qa-checklist.md
```

The output is markdown — render with `glow`, `bat`, etc.

---

## What's not yet pluggable

- **Per-task LLM provider switching** (e.g. local Llama for synthesis + hosted GPT-4o-mini for JSON-strict extraction). Today the provider is one-per-config. On the roadmap as `llm.tasks.{summarize,extract,synthesize}.provider`.
- **MCP server**. If you adopt Claude Desktop, future Copilot, or Cursor's MCP support, exposing product-brain as MCP tools is a natural fit. ~80 LOC. Defer until you commit to an MCP-aware client.

---

## Decision worth pinning

If your org already has Azure OpenAI (very common with Copilot enterprise contracts), use `azure_openai` — same models, same accounting, same security review you've already done. Anthropic-direct is best when you have a separate Anthropic contract. Local is best when data must not leave your infrastructure, accepting the JSON-discipline caveat above.
