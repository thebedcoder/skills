# Tool Detection Map

Detection only. Never catalog. Never install — config + docs output only.

| Detected in repo | Suggest |
|---|---|
| `playwright.config.*` | Playwright MCP → `.mcp.json` |
| `vercel.json` / `.vercel/` | Vercel CLI → CLAUDE.md Required CLIs |
| `supabase/` | Supabase MCP → `.mcp.json` |
| `Dockerfile` / `compose.yaml` / `docker-compose.yml` | docker CLI |
| `.github/workflows/` | gh CLI |
| `fastlane/` | fastlane CLI |
| `firebase.json` | firebase CLI |
| `wrangler.toml` / `wrangler.jsonc` | wrangler CLI |
| `*.tf` | terraform CLI |
| `prisma/schema.prisma` | prisma CLI |

## Output rules

- MCP servers → `.mcp.json` entry. Merge with existing file — never overwrite existing keys.
- CLIs → `CLAUDE.md` "Required CLIs" section: name + install hint + what for.
- Suggestion unconfirmed by user → not written. Manifest lists each suggestion with detection evidence.

Map extension over time allowed — detection entries only, never a browsable catalog.
