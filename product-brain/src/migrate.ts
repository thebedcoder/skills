import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

export interface MigrateResult {
  copied: number;
  reason?: string;
  from?: string;
  to?: string;
  removed_from_source?: boolean;
}

export function migrateSource(
  brainRoot: string,
  sourcePath: string,
  repoName: string,
  removeFromSource = false,
): MigrateResult {
  const brain = path.resolve(brainRoot);
  const source = path.resolve(sourcePath);
  const legacy = path.join(source, ".product-brain");
  if (!existsSync(legacy)) return { copied: 0, reason: "no .product-brain/ in source" };

  const target = path.join(brain, "repos", repoName);
  mkdirSync(target, { recursive: true });

  let copied = 0;
  const legacyManifest = path.join(legacy, "manifest.md");
  if (existsSync(legacyManifest)) {
    copyFileSync(legacyManifest, path.join(target, "manifest.md"));
    copied += 1;
  }
  const legacyTickets = path.join(legacy, "tickets");
  if (existsSync(legacyTickets)) {
    const targetTickets = path.join(target, "tickets");
    mkdirSync(targetTickets, { recursive: true });
    for (const name of readdirSync(legacyTickets)) {
      if (!name.endsWith(".md")) continue;
      copyFileSync(path.join(legacyTickets, name), path.join(targetTickets, name));
      copied += 1;
    }
  }

  if (removeFromSource) rmSync(legacy, { recursive: true, force: true });

  return {
    copied,
    from: legacy,
    to: target,
    removed_from_source: removeFromSource,
  };
}
