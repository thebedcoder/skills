// Port target: ../product-brain/src/product_brain/backfill/pr_enrichment.py
import { execFileSync } from "node:child_process";
import type { Commit, PRComment, PullRequest } from "../models.js";

const PR_PAREN_RE = /\(#(\d+)\)/g;

function parseDt(s: unknown): Date | undefined {
  if (!s || typeof s !== "string") return undefined;
  const d = new Date(s.replace("Z", "+00:00"));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function gitRemoteRepo(repoPath: string): { owner: string; repo: string } | null {
  let url: string;
  try {
    url = execFileSync("git", ["-C", repoPath, "remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
  const m = /[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  if (!m) return null;
  return { owner: m[1] ?? "", repo: m[2] ?? "" };
}

function prNumbersFromCommits(commits: Commit[]): number[] {
  const nums = new Set<number>();
  for (const c of commits) {
    const text = `${c.subject}\n${c.body ?? ""}`;
    PR_PAREN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PR_PAREN_RE.exec(text)) !== null) {
      nums.add(Number(m[1]));
    }
  }
  return [...nums].sort((a, b) => a - b);
}

async function gh(url: string, token: string, params?: Record<string, string>): Promise<Response> {
  const u = new URL(url);
  if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return fetch(u, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    signal: AbortSignal.timeout(30_000),
  });
}

export async function enrich(
  repoPath: string,
  ticketId: string,
  commits: Commit[],
  githubToken: string | undefined,
  enabled = true,
): Promise<PullRequest[]> {
  if (!enabled || !githubToken) return [];
  const remote = gitRemoteRepo(repoPath);
  if (!remote) return [];
  const { owner, repo } = remote;

  let prNumbers = prNumbersFromCommits(commits);
  if (prNumbers.length === 0) {
    const r = await gh("https://api.github.com/search/issues", githubToken, {
      q: `repo:${owner}/${repo} is:pr is:merged ${ticketId}`,
    });
    if (r.ok) {
      const data = (await r.json()) as { items?: Array<{ number: number }> };
      prNumbers = [...new Set((data.items ?? []).map((i) => i.number))].sort((a, b) => a - b);
    }
  }

  const out: PullRequest[] = [];
  for (const num of prNumbers) {
    const prResp = await gh(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}`, githubToken);
    if (!prResp.ok) continue;
    const data = (await prResp.json()) as Record<string, unknown>;
    const commentsResp = await gh(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${num}/comments`,
      githubToken,
      { per_page: "100" },
    );
    const reviewComments: PRComment[] = [];
    if (commentsResp.ok) {
      const items = (await commentsResp.json()) as Array<Record<string, unknown>>;
      for (const c of items) {
        const user = (c["user"] as Record<string, unknown> | undefined) ?? {};
        reviewComments.push({
          author: String(user["login"] ?? ""),
          body: String(c["body"] ?? ""),
          file: c["path"] as string | undefined,
          line: c["line"] as number | undefined,
          sha: c["commit_id"] as string | undefined,
        });
      }
    }
    const labels = ((data["labels"] as Array<Record<string, unknown>>) ?? []).map((l) => String(l["name"] ?? ""));
    out.push({
      number: num,
      title: String(data["title"] ?? ""),
      body: String(data["body"] ?? ""),
      labels,
      openedAt: parseDt(data["created_at"]),
      mergedAt: parseDt(data["merged_at"]),
      reviewComments,
    });
  }
  return out;
}
