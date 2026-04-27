# Distribution & updates

How customer-hosted instances of product-brain are built, delivered, and updated.

## Build artifact

`npm run release` produces a single tarball:

```
product-brain-X.Y.Z.tgz
└── product-brain-X.Y.Z/
    ├── product-brain.cjs    minified CommonJS bundle (~1.2 MB)
    ├── package.json         minimal manifest, lists only externalized deps
    ├── install.sh           one-liner: `npm install --production`
    ├── README.md            operator README (not the dev one)
    └── LICENSE              proprietary license notice
```

Inside the bundle:

| Bundled (in the .cjs) | External (fetched at install) |
|---|---|
| Fastify, commander, zod, js-yaml, dotenv, pino | better-sqlite3 (native binding) |
| All `src/` modules + admin templates + styles | @anthropic-ai/sdk |
| Build version constants (injected at compile time) | openai |
|  | pino-pretty (lazy-loaded by pino) |

The customer never sees `src/`, `tsconfig.json`, dev deps, or tests. They get a single `.cjs` to execute and a tiny `package.json` that pulls four runtime deps from npm.

## Why bundling matters

1. **Tamper resistance.** Source isn't shipped — anyone wanting to disable license enforcement would need to disassemble a 1.2 MB minified blob and patch it, which crosses a clear "intent to circumvent" threshold (relevant for the contract's anti-circumvention clause).
2. **Reproducibility.** A specific version bundles a specific dep tree. Customers can't accidentally drift via local edits to `node_modules`.
3. **Smaller installs.** The customer doesn't build from source, so no TypeScript toolchain on their hosts.
4. **Single delivery file.** One `.tgz` + a license key + operator docs is the entire delivery. Easy to email, easy to host on a private S3, easy to track per-customer.

## Customer install

```bash
tar xzf product-brain-X.Y.Z.tgz
cd product-brain-X.Y.Z
./install.sh                        # → npm install --production
cp /path/to/their/license.key ./    # if license enforcement enabled
node product-brain.cjs --help
```

Then `init`, `bind`, `backfill`, and `bot {serve,worker,admin}` exactly as documented.

## Update flow

The data layer is designed so updates are a **swap-and-restart** operation. No manual data migration steps.

### 1. Customer downloads the new tarball

We send (or host privately) `product-brain-X.Y.Z+1.tgz` along with release notes.

### 2. Replace the install directory

```bash
cd /opt/product-brain                 # wherever the bot host runs from
systemctl stop product-brain-bot      # or `pm2 stop`, `docker compose stop`, etc
mv product-brain-X.Y.Z product-brain-X.Y.Z.bak     # keep old version for rollback
tar xzf ~/Downloads/product-brain-X.Y.Z+1.tgz
cd product-brain-X.Y.Z+1
cp ../product-brain-X.Y.Z.bak/.env .                   # carry env / license key
cp ../product-brain-X.Y.Z.bak/config.yaml .            # carry config (if outside brain repo)
./install.sh
systemctl start product-brain-bot
```

### 3. Schema migrations apply automatically

On boot, the bot creates any new tables/columns it needs (`CREATE TABLE IF NOT EXISTS`, idempotent `ALTER` calls). Existing data — `audit.sqlite`, `queue.sqlite`, the brain repo records on disk — is preserved.

For breaking schema changes, the bot would refuse to start with a clear error and instructions to run `product-brain migrate`. We don't have any of those in v1; reserved for major-version bumps.

### 4. Rollback if needed

```bash
systemctl stop product-brain-bot
rm -rf product-brain-X.Y.Z+1
mv product-brain-X.Y.Z.bak product-brain-X.Y.Z
systemctl start product-brain-bot
```

Brain repo records are forward-compatible across patch + minor versions, so rolling back is safe within a major.

### 5. Customers running Docker

If the customer runs in containers:

```bash
docker pull yourorg/product-brain:X.Y.Z+1
docker compose up -d
```

(We don't ship Docker images yet; that's a follow-up — same `dist/` artifact, just in a `node:22-slim` container.)

## How customers learn about updates

For now: out-of-band. Email the customer their tarball + release notes. The `/admin/about` page shows the currently-installed version so the customer can confirm they're up to date.

Future options (not implemented):

- **Update check on startup.** Tool fetches `https://releases.example.com/product-brain/manifest.json` keyed by license ID; if newer version available, log a warning and surface a banner in `/admin/`.
- **Self-update command.** `product-brain self-update` downloads + verifies signature + replaces the bundle in place. Convenient but adds infra (release manifest server, signing keys, key rotation).
- **Heartbeat telemetry.** Periodic POST with `{license_id, version, anonymized_metrics}` to a license server. Lets you see who's on what version without asking. Some customers refuse outbound calls; design as opt-in.

For the first 5–20 customers, manual delivery + email release notes is fine. Build automation when the count grows enough that it's actually painful.

## Versioning

Semantic versioning. The build identity baked into every bundle:

```
0.1.0-ts.0 (4e64612-dirty 2026-04-26T16:44:09.267Z)
^^^^^^^^^   ^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^
version     git describe  build timestamp (UTC)
```

Visible in:

- `node product-brain.cjs --version`
- The `/admin/about` page
- The bundle's banner comment (first 3 lines of the `.cjs`)

`git describe --always --dirty` produces the build ID, so a release built off a clean tag (`v0.2.0`) shows that tag; a build from a dirty working tree gets `<sha>-dirty` and you should refuse to ship it. (Worth wiring into a CI release job once we have one.)

## Release checklist (for the maintainer)

Before running `npm run release`:

- [ ] `git status` is clean (otherwise build ID has `-dirty`, signaling an unreleasable build)
- [ ] `npm test` passes
- [ ] `npm run typecheck` clean
- [ ] `npm run audit` clean (`--omit=dev`)
- [ ] `package.json` `version` bumped
- [ ] `git tag v$VERSION` created and pushed
- [ ] CHANGELOG entry written

`npm run release` then produces `product-brain-$VERSION.tgz` + sha256 ready to send.

## Signing (recommended, not yet wired)

For customers who care, the tarball can be signed with `cosign sign-blob` or `gpg --detach-sign`. Customer verifies with the public key before extracting. Adds a step to the release script when we set this up. Worth doing before the first paid customer ships.

## What's deliberately NOT in the bundle

- TypeScript source (`src/**/*.ts`)
- Tests (`tests/**`)
- Configs (`tsconfig.json`, `eslint.config.js`, `vitest.config.ts`)
- Dev deps (vitest, esbuild, tsx, @types/*, eslint, etc.)
- Screenshots and the screenshot script
- Migration tooling for legacy `.product-brain/` dirs (kept in source; not relevant once a customer is on the brain-repo layout)

If a customer needs to inspect or extend behavior, they get the bundle plus their license agreement — not source. For paid integration work, that's a service the maintainer provides; not a self-service path.
