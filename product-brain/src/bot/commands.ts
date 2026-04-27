
const BRAIN_RE = /(?:^|\n)\s*\/brain(?:\s+(\S+))?(?:\s+([^\n]*))?/;

export const VALID_COMMANDS = new Set([
  "groom",
  "estimate",
  "edges",
  "related",
  "draft-tickets",
  "refresh",
  "explain",
  "on",
  "off",
]);

export interface BrainCommand {
  command: string;
  args: string;
}

export function parseBrainCommand(commentBody: string): BrainCommand | null {
  if (!commentBody) return null;
  const m = BRAIN_RE.exec(commentBody);
  if (!m) return null;
  const cmd = (m[1] ?? "groom").toLowerCase().trim();
  const args = (m[2] ?? "").trim();
  if (!VALID_COMMANDS.has(cmd)) return null;
  return { command: cmd, args };
}
