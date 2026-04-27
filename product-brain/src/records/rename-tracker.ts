import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export function canonicalPaths(repo: string, paths: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of paths) {
    if (existsSync(path.join(repo, p))) {
      out[p] = p;
      continue;
    }
    let stdout: string;
    try {
      stdout = execFileSync(
        "git",
        ["-C", repo, "log", "--follow", "--name-status", "--pretty=", "-1", "--", p],
        { encoding: "utf8" },
      );
    } catch {
      out[p] = p;
      continue;
    }
    let newPath = p;
    for (const line of stdout.split("\n")) {
      const parts = line.split("\t");
      if (parts.length >= 3 && parts[0]?.startsWith("R")) {
        newPath = parts[2] ?? p;
        break;
      }
    }
    out[p] = newPath;
  }
  return out;
}
