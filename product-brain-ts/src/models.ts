// Port target: ../product-brain/src/product_brain/models.py

export interface FileChange {
  path: string;
  change: "added" | "modified" | "deleted" | "renamed";
  loc_added?: number;
  loc_removed?: number;
}

export interface Commit {
  sha: string;
  author: string;
  authorEmail: string;
  date: Date;
  subject: string;
  body: string;
  parents: string[];
  files: FileChange[];
  tickets: string[];
}

export interface PRComment {
  author: string;
  body: string;
  file?: string;
  line?: number;
  sha?: string;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  labels: string[];
  openedAt?: Date;
  mergedAt?: Date;
  reviewComments: PRComment[];
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: "feature" | "bug" | "chore" | "spike" | "epic" | "unknown";
  status: string;
  labels: string[];
  parentId?: string;
  childrenIds: string[];
  url: string;
  createdAt?: Date;
  updatedAt?: Date;
  raw: Record<string, unknown>;
}

export interface TicketDraft {
  title: string;
  description: string;
  type?: string;
  parentId?: string;
  labels?: string[];
  status?: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  author: string;
  body: string;
  createdAt: Date;
}

export interface WebhookEvent {
  kind: "comment_created" | "ticket_status_changed" | "unknown";
  ticketId?: string;
  comment?: Comment;
  prevStatus?: string;
  newStatus?: string;
  raw: Record<string, unknown>;
}

export interface EdgeCaseBullet {
  text: string;
  source: string;
  sourceTicket?: string;
}

export interface TestCase {
  id: string;
  title: string;
  preconditions: string;
  steps: string[];
  expected: string;
  automation: "manual" | "automated" | "semi" | "unknown";
  type: string;
  suite: string;
  linkedTickets: string[];
  lastStatus?: "passed" | "failed" | "blocked" | "retest" | "untested" | "unknown";
  lastRun?: Date;
  recentFailures: number;
  url: string;
}

export interface RunResult {
  caseId: string;
  status: string;
  runId: string;
  timestamp?: Date;
  comment: string;
}

export interface CoverageGap {
  edge: string;
  edgeSource: string;
  rationale: string;
}

export interface TicketRecord {
  ticket: string;
  title: string;
  type: string;
  status: "shipped" | "in_progress" | "draft" | "abandoned";
  firstCommit?: Date;
  lastCommit?: Date;
  shas: string[];
  prs: number[];
  authors: string[];
  files: FileChange[];
  symbols: string[];
  relatedTickets: string[];
  revertedBy: string[];
  linkedBugs: string[];
  locAdded: number;
  locRemoved: number;
  durationDays: number;
  prOpenToMergeDays?: number;
  manualSections: string[];
  whatShipped: string;
  keyDecisions: string[];
  edgeCasesHandled: EdgeCaseBullet[];
  knownGaps: EdgeCaseBullet[];
  testCases: TestCase[];
  qaEdges: EdgeCaseBullet[];
  stabilitySignals: string[];
  coverageGaps: CoverageGap[];
  manualBody: string;
  repo: string;
}

export interface Manifest {
  repo: string;
  ticketRegex: string;
  workflow: "squash" | "merge" | "rebase";
  languages: string[];
  entryPoints: string[];
  ownersFile: string;
  ignorePaths: string[];
  megaFileThreshold: number;
  lastIndexedSha: string;
  indexCutoffDate: string;
  body: string;
}
