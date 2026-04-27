import { execFileSync } from "node:child_process";
import type { Commit, FileChange } from "../models.js";

const RECORD_SEP = "\x1e\x1e\x1e";
const FIELD_SEP = "\x1f";

function gitArgs(workflow: string, since?: string): string[] {
  const args = ["log", "--all"];
  if (workflow === "merge" || workflow === "rebase") args.push("--no-merges");
  args.push(
    `--pretty=format:${RECORD_SEP}%H${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%aI${FIELD_SEP}%P${FIELD_SEP}%s${FIELD_SEP}%b`,
    "--name-status",
    "--find-renames=50%",
  );
  if (since) args.push(`${since}..HEAD`);
  return args;
}

export function parseGitLog(
  repo: string,
  ticketRegex: string,
  workflow: "squash" | "merge" | "rebase" = "squash",
  since?: string,
): Commit[] {
  let stdout: string;
  try {
    stdout = execFileSync("git", ["-C", repo, ...gitArgs(workflow, since)], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error(`git log failed: ${(e as Error).message}`);
  }
  const pat = new RegExp(ticketRegex, "g");
  const commits: Commit[] = [];
  for (const chunk of stdout.split(RECORD_SEP)) {
    const trimmed = chunk.replace(/^\n+|\n+$/g, "");
    if (!trimmed) continue;
    const nl = trimmed.indexOf("\n");
    const firstLine = nl === -1 ? trimmed : trimmed.slice(0, nl);
    const rest = nl === -1 ? "" : trimmed.slice(nl + 1);
    const fields = firstLine.split(FIELD_SEP);
    if (fields.length < 7) continue;
    const [sha, author, email, dateIso, parentsStr, subject, body] = fields as [
      string, string, string, string, string, string, string,
    ];
    const date = new Date(dateIso);
    const parents = parentsStr ? parentsStr.split(" ").filter(Boolean) : [];
    const files: FileChange[] = [];
    for (const line of rest.replace(/^\n+|\n+$/g, "").split("\n")) {
      const parts = line.split("\t");
      if (parts.length < 2) continue;
      const code = parts[0] ?? "";
      if (code === "A") files.push({ path: parts[1] ?? "", change: "added" });
      else if (code === "M") files.push({ path: parts[1] ?? "", change: "modified" });
      else if (code === "D") files.push({ path: parts[1] ?? "", change: "deleted" });
      else if (code.startsWith("R") && parts.length >= 3) files.push({ path: parts[2] ?? "", change: "renamed" });
    }
    const text = `${subject}\n${body || ""}`;
    const matches = text.match(pat) ?? [];
    const tickets = [...new Set(matches)].sort();
    commits.push({
      sha,
      author,
      authorEmail: email,
      date,
      subject,
      body,
      parents,
      files,
      tickets,
    });
  }
  return commits;
}

export function groupByTicket(commits: Commit[]): Map<string, Commit[]> {
  const out = new Map<string, Commit[]>();
  for (const c of commits) {
    for (const t of c.tickets) {
      const arr = out.get(t) ?? [];
      arr.push(c);
      out.set(t, arr);
    }
  }
  for (const [, arr] of out) arr.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out;
}

export function diffStat(repo: string, sha: string): Map<string, [number, number]> {
  let stdout: string;
  try {
    stdout = execFileSync("git", ["-C", repo, "show", "--numstat", "--pretty=", sha], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return new Map();
  }
  const out = new Map<string, [number, number]>();
  for (const line of stdout.split("\n")) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const added = /^\d+$/.test(parts[0] ?? "") ? Number(parts[0]) : 0;
    const removed = /^\d+$/.test(parts[1] ?? "") ? Number(parts[1]) : 0;
    out.set(parts[2] ?? "", [added, removed]);
  }
  return out;
}
