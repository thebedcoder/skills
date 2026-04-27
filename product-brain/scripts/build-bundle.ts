// Builds a single-file distributable from src/cli.ts.
//
// Output:
//   dist/product-brain.cjs       single bundled CommonJS file (esbuild)
//   dist/package.json            minimal manifest listing only native + LLM deps
//   dist/README.md               operator README (NOT the dev README)
//   dist/LICENSE                 copy of the repo LICENSE
//   dist/install.sh              one-line install script
//
// External (NOT bundled, fetched by `npm install --production` at the customer):
//   better-sqlite3        native binding (.node), can't be bundled
//   @anthropic-ai/sdk     large; customer may want to update independently
//   openai                large; customer may want to update independently
//   pino-pretty           lazy-loaded by pino at runtime
//   fsevents              optional dep on macOS, ignored elsewhere
//
// Everything else is bundled and minified into a single .cjs file.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import url from "node:url";
import esbuild from "esbuild";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DIST = path.join(ROOT, "dist");

const EXTERNAL = [
  "better-sqlite3",
  "@anthropic-ai/sdk",
  "openai",
  "pino-pretty",
  "fsevents",
];

interface PackageJson {
  name: string;
  version: string;
  description: string;
  dependencies?: Record<string, string>;
  [k: string]: unknown;
}

function readPkg(): PackageJson {
  return JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as PackageJson;
}

function gitDescribe(): string {
  try {
    return execFileSync("git", ["-C", ROOT, "describe", "--always", "--dirty"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

async function build(): Promise<void> {
  const pkg = readPkg();
  const version = pkg.version;
  const buildId = gitDescribe();
  const buildTime = new Date().toISOString();

  if (existsSync(DIST)) {
    execFileSync("rm", ["-rf", DIST]);
  }
  mkdirSync(DIST, { recursive: true });

  // The entry src/cli.ts already starts with #!/usr/bin/env node; esbuild
  // preserves shebangs from the entry point, so don't duplicate it here.
  const banner =
    `// product-brain ${version} (${buildId}) — built ${buildTime}\n` +
    "// Proprietary — All Rights Reserved. See LICENSE.\n";

  const out = path.join(DIST, "product-brain.cjs");
  await esbuild.build({
    entryPoints: [path.join(ROOT, "src", "cli.ts")],
    outfile: out,
    bundle: true,
    minify: true,
    sourcemap: false,
    platform: "node",
    target: "node20",
    format: "cjs",
    external: EXTERNAL,
    banner: { js: banner },
    define: {
      "process.env.PB_VERSION": JSON.stringify(version),
      "process.env.PB_BUILD_ID": JSON.stringify(buildId),
      "process.env.PB_BUILD_TIME": JSON.stringify(buildTime),
    },
    legalComments: "none",
    metafile: true,
  });

  // make it executable
  execFileSync("chmod", ["+x", out]);

  // minimal package.json for the customer install
  const distPkg = {
    name: pkg.name,
    version,
    description: pkg.description,
    private: true,
    license: "SEE LICENSE IN LICENSE",
    bin: { "product-brain": "./product-brain.cjs" },
    main: "./product-brain.cjs",
    engines: { node: ">=20.18.0" },
    dependencies: Object.fromEntries(
      EXTERNAL.filter((d) => d !== "fsevents").map((d) => [d, pkg.dependencies?.[d] ?? "*"]),
    ),
  };
  writeFileSync(path.join(DIST, "package.json"), JSON.stringify(distPkg, null, 2));

  // operator README
  const opReadme = `# product-brain ${version}

Self-contained build. To install:

\`\`\`bash
tar xzf product-brain-${version}.tgz
cd product-brain-${version}
npm install --production
node product-brain.cjs --help
\`\`\`

Then configure \`.env\` and \`config.yaml\` and run:

\`\`\`bash
node product-brain.cjs init               # bootstrap a brain repo
node product-brain.cjs bind <source>      # bind a source repo
node product-brain.cjs backfill           # initial sync
node product-brain.cjs bot serve          # webhook server
node product-brain.cjs bot worker         # job worker
node product-brain.cjs bot admin          # admin UI (localhost:8089)
\`\`\`

For setup, integration, and operational details, refer to the documentation
provided alongside your license. To update to a new version: replace the
extracted directory with the new tarball, run \`npm install --production\`,
and restart the bot. Schema migrations apply automatically on startup.

Build: ${buildId} · ${buildTime}
License: Proprietary — All Rights Reserved.
`;
  writeFileSync(path.join(DIST, "README.md"), opReadme);

  // LICENSE
  if (existsSync(path.join(ROOT, "LICENSE"))) {
    copyFileSync(path.join(ROOT, "LICENSE"), path.join(DIST, "LICENSE"));
  }

  // install.sh
  writeFileSync(
    path.join(DIST, "install.sh"),
    `#!/usr/bin/env bash
set -euo pipefail
echo "Installing product-brain ${version}..."
npm install --production
echo
echo "Done. Configure .env and config.yaml, then run:"
echo "  node product-brain.cjs --help"
`,
  );
  execFileSync("chmod", ["+x", path.join(DIST, "install.sh")]);

  // size report
  const stats = execFileSync("ls", ["-la", out], { encoding: "utf8" });
  process.stdout.write(`built ${out}\n${stats}`);
  process.stdout.write(`version: ${version}\nbuild:   ${buildId}\n`);
}

build().catch((e) => {
  process.stderr.write(`build failed: ${(e as Error).message}\n`);
  process.exit(1);
});
