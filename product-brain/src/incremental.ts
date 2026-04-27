import { execFileSync } from "node:child_process";
import { backfillRepo } from "./backfill/run.js";
import { load } from "./config.js";

function lastCommitMessage(repo: string): string {
  return execFileSync("git", ["-C", repo, "log", "-1", "--pretty=%B"], { encoding: "utf8" });
}

export async function runForSource(
  repoName: string,
  sinceSha?: string,
  configPath?: string,
): Promise<number> {
  const config = load(configPath);
  let repoCfg;
  try {
    repoCfg = config.repo(repoName);
  } catch {
    process.stderr.write(`product-brain: repo '${repoName}' not in config\n`);
    return 1;
  }

  let since = sinceSha;
  if (!since) {
    const msg = lastCommitMessage(repoCfg.path);
    const re = new RegExp(config.ticketRegex);
    if (!re.test(msg)) return 0;
    let parent: string | undefined;
    try {
      parent = execFileSync("git", ["-C", repoCfg.path, "rev-parse", "HEAD~1"], { encoding: "utf8" }).trim();
    } catch {
      parent = undefined;
    }
    since = parent || undefined;
  }

  const summary = await backfillRepo(config, repoName, { since });
  process.stdout.write(`product-brain incremental: ${JSON.stringify(summary)}\n`);
  return 0;
}
