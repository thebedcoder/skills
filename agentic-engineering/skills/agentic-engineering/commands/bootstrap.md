## `/ae-bootstrap` — New Project Setup

**Agents active: ARCH (lead), PROD (feature planning)**

Use this on a blank or near-blank repo. Runs before `/ae-init`.
Sets up the actual project — package structure, base dependencies, tooling, config — then plans the core features to build first.

After bootstrap completes, run `/ae-init` to add the docs scaffold, then `/ae-feature` to start building.

---

### Phase 1 — Project Type

ARCH asks a single question: *"What kind of project is this?"*

Options presented:
- **Web app** — Next.js / React
- **API / Backend** — Node.js or Python
- **CLI tool** — Node.js or Python
- **Fullstack monorepo** — frontend + backend + shared packages
- **Flutter** — mobile / cross-platform

User picks one. ARCH proceeds to the stack selection for that type.

---

### Phase 2 — Stack Selection (per layer)

ARCH presents options layer by layer. Each layer shows 2-3 options with a recommended default and a one-line reason. User confirms or overrides each one before moving to the next.

Format per layer: present 2–3 options with recommended default, one-line why, and best-for note. Ask for choice (A/B/C or enter for default).

#### Web App layers
1. **Framework** — Next.js (App Router) · Vite + React
2. **Language** — TypeScript · JavaScript
3. **Styling** — Tailwind CSS · CSS Modules · Styled Components
4. **State management** — Zustand · Redux Toolkit · React Query only · None
5. **Auth** — NextAuth · Clerk · None
6. **Database** — Prisma + PostgreSQL · Supabase · PlanetScale · None
7. **Testing** — Vitest + Testing Library · Jest + Testing Library
8. **Linting / formatting** — ESLint + Prettier · Biome

#### API / Backend layers
1. **Runtime** — Node.js · Python
2. **Framework** — (Node: Fastify · Express · Hono) / (Python: FastAPI · Django · Flask)
3. **Language** — TypeScript / Python (follows runtime)
4. **Database** — Prisma + PostgreSQL · Drizzle + PostgreSQL · SQLAlchemy · MongoDB · None
5. **Auth** — JWT · OAuth2 · API keys · None
6. **Validation** — Zod · Joi · Pydantic (Python)
7. **Testing** — Vitest · Jest · Pytest
8. **Docs** — OpenAPI / Swagger auto-generated · None

#### CLI Tool layers
1. **Runtime** — Node.js · Python
2. **Framework** — (Node: oclif · commander · yargs) / (Python: Typer · Click · argparse)
3. **Language** — TypeScript / Python
4. **Config handling** — cosmiconfig · dotenv · None
5. **Testing** — Vitest · Jest · Pytest
6. **Distribution** — npm publish · PyPI · Homebrew tap · Binary via pkg

#### Fullstack Monorepo layers
1. **Monorepo tooling** — Turborepo · Nx · pnpm workspaces only
2. **Frontend** — (same as Web App layers)
3. **Backend** — (same as API/Backend layers)
4. **Shared packages** — types only · types + utils · types + utils + UI components
5. **Database** — (same as API/Backend)
6. **Deployment target** — Vercel + Railway · AWS · Self-hosted · TBD

#### Flutter layers
1. **State management** — Riverpod · Bloc · Provider · GetX
2. **Navigation** — GoRouter · Auto Route · Navigator 2.0
3. **Backend connection** — REST (Dio) · GraphQL · Supabase · Firebase · Custom API
4. **Local storage** — Hive · Isar · SharedPreferences · SQLite
5. **Auth** — Firebase Auth · Supabase Auth · Custom · None
6. **Testing** — Flutter test + Mocktail · Flutter test + Mockito
7. **Flavors / environments** — dev + staging + prod · dev + prod · Single env

---

### Phase 3 — Confirmed Stack Summary

After all layers are chosen, ARCH produces a summary for final confirmation:

```
ARCH — Confirmed Stack: [Project Name]

Type: [project type]

[Layer]: [chosen option]
[Layer]: [chosen option]
...

Folder structure to be created:
[tree preview of the project structure]

Base dependencies to install:
[list]

Dev dependencies to install:
[list]

Config files to generate:
[list — tsconfig, .eslintrc, tailwind.config, etc.]

⚠️ Confirm? Reply 'go' to scaffold, or adjust any layer above.
```

---

### Phase 4 — Scaffolding

On 'go', ARCH executes:

1. **Creates folder structure** appropriate to the project type and chosen stack
2. **Generates config files** — tsconfig, eslint, prettier, tailwind, env.example, .gitignore, etc.
3. **Installs dependencies** — runs the appropriate package manager command
4. **Writes base boilerplate** — entry points, root layout, base router, health check endpoint, etc. Minimal but runnable — `npm run dev` (or equivalent) should work after this step
5. **Sets up testing** — test config, one passing smoke test to confirm the setup works
6. **Initialises git** — if no `.git` exists yet:
```
git init
git add .
git commit -m "chore: bootstrap [project-type] project with [key choices]"
```
If `.git` already exists:
```
git add .
git commit -m "chore: bootstrap [project-type] project with [key choices]"
```

ARCH logs progress as it goes:
```
ARCH — Scaffolding:
✅ Folder structure created
✅ Config files generated
✅ Dependencies installed
✅ Base boilerplate written
✅ Tests passing
✅ Git initialised
```

---

### Phase 5 — Core Feature Planning

**PROD** asks: *"What are the core features this product needs to deliver its main value? List them in rough priority order — we'll plan them as epics."*

User provides a rough list. PROD and ARCH then:

1. **PROD** shapes each item into a properly scoped epic with a one-line description
2. **ARCH** flags any epic with significant architectural implications — things that should influence folder structure or data model before any feature work starts
3. Together they produce a prioritised epic roadmap:

```
PROD — Epic Roadmap: [Project Name]

CORE (must have for v1):
  1. [Epic name] — [one line description]
     ARCH note: [any architectural implication, or "none"]
  2. [Epic name] — ...

IMPORTANT (v1 stretch / v2):
  3. [Epic name] — ...

NICE TO HAVE (v2+):
  4. [Epic name] — ...
```

⚠️ **Human checkpoint:** *"Does this roadmap capture your vision? Adjust priorities or add missing epics. Reply 'approved' when ready."*

On approval, PROD saves the roadmap to `./docs/INDEX.md` (appended as the initial feature list) and creates placeholder folders under `./docs/features/` for each epic.

---

### Phase 6 — Bootstrap Complete

```
━━━ BOOTSTRAP COMPLETE ━━━

Project:  [name]
Type:     [type]
Stack:    [key choices on one line]

✅ Project scaffolded and running
✅ Git initialised with initial commit
✅ Epic roadmap saved to ./docs/INDEX.md + feature folders created

Next steps:
  1. Run /ae:init to set up the docs scaffold and CLAUDE.md
  2. Run /ae:feature [epic-1-name] to start your first feature
```

---
