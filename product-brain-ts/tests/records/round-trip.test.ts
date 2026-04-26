import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Manifest, TicketRecord } from "../../src/models.js";
import { readManifest, readRecord, readRecords } from "../../src/records/read.js";
import { render, writeManifest, writeRecord } from "../../src/records/write.js";

let brainRoot: string;

beforeEach(() => {
  brainRoot = mkdtempSync(path.join(tmpdir(), "pb-test-"));
});
afterEach(() => {
  rmSync(brainRoot, { recursive: true, force: true });
});

const sampleRecord: TicketRecord = {
  ticket: "AHA-1234",
  title: "Add 2FA to login",
  type: "feature",
  status: "shipped",
  firstCommit: new Date("2025-03-10T09:14:00Z"),
  lastCommit: new Date("2025-03-14T17:33:00Z"),
  shas: ["abc1234", "def5678"],
  prs: [789],
  authors: ["alice", "bob"],
  files: [
    { path: "auth/two_factor.py", change: "added", loc_added: 248, loc_removed: 0 },
    { path: "auth/login.py", change: "modified", loc_added: 47, loc_removed: 12 },
  ],
  symbols: ["TwoFactorService.verify"],
  relatedTickets: ["AHA-900"],
  revertedBy: [],
  linkedBugs: [],
  locAdded: 295,
  locRemoved: 12,
  durationDays: 4.3,
  prOpenToMergeDays: 2.1,
  manualSections: ["Edge cases (manual)"],
  whatShipped: "TOTP-based 2FA shipped.",
  keyDecisions: ["Used pyotp", "Codes hashed at rest"],
  edgeCasesHandled: [
    { text: "Rate-limit verification", source: "pr#789 review @bob" },
    { text: "Lockout after 5 attempts", source: "test_lockout_after_n_attempts" },
  ],
  knownGaps: [{ text: "No backup codes", source: "pr#789 description" }],
  testCases: [
    {
      id: "TR-C-4521",
      title: "Login with locked account shows specific error",
      preconditions: "",
      steps: [],
      expected: "",
      automation: "manual",
      type: "functional",
      suite: "1",
      linkedTickets: ["AHA-1234"],
      lastStatus: "passed",
      lastRun: new Date("2026-04-10T12:00:00Z"),
      recentFailures: 0,
      url: "https://example.testrail.io/index.php?/cases/view/4521",
    },
  ],
  qaEdges: [{ text: "Locked account specific error", source: "TR-C-4521 (manual, passed)" }],
  stabilitySignals: ["TR-C-4527: 5 failures/blocks in window"],
  coverageGaps: [
    { edge: "Rate-limit verification", edgeSource: "pr#789 review @bob", rationale: "no QA case match" },
  ],
  manualBody:
    "<!-- manual: do not overwrite below this line -->\n## Edge cases (manual)\n\n- Hand-added edge case\n",
  repo: "backend",
};

describe("ticket record round-trip", () => {
  it("writes and reads back a record losslessly for structured fields", () => {
    writeRecord(brainRoot, sampleRecord);
    const got = readRecords(brainRoot, "backend", ["AHA-1234"])["AHA-1234"];
    expect(got).toBeDefined();
    expect(got!.ticket).toBe("AHA-1234");
    expect(got!.title).toBe(sampleRecord.title);
    expect(got!.shas).toEqual(sampleRecord.shas);
    expect(got!.prs).toEqual(sampleRecord.prs);
    expect(got!.authors).toEqual(sampleRecord.authors);
    expect(got!.files.length).toBe(2);
    expect(got!.files[0]!.path).toBe("auth/two_factor.py");
    expect(got!.files[0]!.loc_added).toBe(248);
    expect(got!.testCases.length).toBe(1);
    expect(got!.testCases[0]!.id).toBe("TR-C-4521");
    expect(got!.testCases[0]!.recentFailures).toBe(0);
    expect(got!.coverageGaps[0]!.edge).toBe("Rate-limit verification");
  });

  it("preserves prose sections", () => {
    writeRecord(brainRoot, sampleRecord);
    const got = readRecords(brainRoot, "backend", ["AHA-1234"])["AHA-1234"]!;
    expect(got.whatShipped).toContain("TOTP-based 2FA");
    expect(got.keyDecisions).toEqual(sampleRecord.keyDecisions);
    expect(got.edgeCasesHandled.length).toBe(2);
    expect(got.edgeCasesHandled[0]!.source).toBe("pr#789 review @bob");
    expect(got.qaEdges[0]!.source).toBe("TR-C-4521 (manual, passed)");
    expect(got.stabilitySignals[0]).toContain("TR-C-4527");
  });

  it("preserves manual body verbatim across re-write", () => {
    writeRecord(brainRoot, sampleRecord);
    const got = readRecords(brainRoot, "backend", ["AHA-1234"])["AHA-1234"]!;
    expect(got.manualBody).toContain("<!-- manual:");
    expect(got.manualBody).toContain("Hand-added edge case");
  });

  it("renders deterministic output (no timestamps in body)", () => {
    const a = render(sampleRecord);
    const b = render(sampleRecord);
    expect(a).toBe(b);
  });

  it("throws if record has no repo", () => {
    expect(() => writeRecord(brainRoot, { ...sampleRecord, repo: "" })).toThrow();
  });
});

describe("manifest round-trip", () => {
  it("writes and reads back a manifest", () => {
    const manifest: Manifest = {
      repo: "backend",
      ticketRegex: "AHA-\\d+",
      workflow: "squash",
      languages: ["python"],
      entryPoints: ["api/main.py"],
      ownersFile: "CODEOWNERS",
      ignorePaths: ["vendor/", "node_modules/"],
      megaFileThreshold: 0.95,
      lastIndexedSha: "abc123",
      indexCutoffDate: "2024-01-01",
      body: "## What this repo is\n\nBackend service.\n",
    };
    writeManifest(brainRoot, manifest);
    const got = readManifest(brainRoot, "backend");
    expect(got).not.toBeNull();
    expect(got!.repo).toBe("backend");
    expect(got!.workflow).toBe("squash");
    expect(got!.languages).toEqual(["python"]);
    expect(got!.lastIndexedSha).toBe("abc123");
    expect(got!.body).toContain("Backend service");
  });

  it("returns null for missing manifest", () => {
    expect(readManifest(brainRoot, "nonexistent")).toBeNull();
  });
});

describe("readRecord low-level", () => {
  it("falls back to filename for ticket id when front-matter lacks it", () => {
    const fakePath = path.join(brainRoot, "AHA-X.md");
    writeFileSync(fakePath, "no front matter here");
    const rec = readRecord(fakePath, "backend");
    expect(rec.ticket).toBe("AHA-X");
  });
});
