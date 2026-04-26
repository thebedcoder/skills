// Packs dist/ into a versioned tarball for customer delivery.
//
//   product-brain-X.Y.Z.tgz
//     product-brain.cjs
//     package.json
//     README.md
//     LICENSE
//     install.sh
//
// Run after `npm run build:bundle`. Customer installs with:
//
//   tar xzf product-brain-X.Y.Z.tgz
//   cd product-brain-X.Y.Z && ./install.sh
//

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DIST = path.join(ROOT, "dist");

interface PackageJson {
  version: string;
}

function readVersion(): string {
  const p = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as PackageJson;
  return p.version;
}

function main(): void {
  if (!existsSync(DIST) || !existsSync(path.join(DIST, "product-brain.cjs"))) {
    process.stderr.write("dist/ not built. run `npm run build:bundle` first.\n");
    process.exit(1);
  }

  const version = readVersion();
  const tarballName = `product-brain-${version}.tgz`;
  const stagingDir = path.join(ROOT, `product-brain-${version}`);

  if (existsSync(stagingDir)) {
    execFileSync("rm", ["-rf", stagingDir]);
  }
  execFileSync("cp", ["-r", DIST, stagingDir]);

  // tar from ROOT so the archive contains the named directory at its root
  execFileSync("tar", [
    "-czf",
    tarballName,
    "-C",
    ROOT,
    `product-brain-${version}`,
  ]);

  execFileSync("rm", ["-rf", stagingDir]);

  // optional sha256 for integrity checks customers can verify
  const sha = execFileSync("sha256sum", [tarballName], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();

  process.stdout.write(`packed ${tarballName}\n${sha}\n`);
  process.stdout.write(`\nDeliver this file to the customer alongside their license key.\n`);
}

main();
