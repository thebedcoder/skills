import type { RunResult, TestCase } from "../models.js";

export interface TestAdapter {
  fetchCase(caseId: string): Promise<TestCase | null>;
  fetchCasesForTicket(ticketId: string): Promise<TestCase[]>;
  fetchCasesForFiles(paths: string[]): Promise<TestCase[]>;
  fetchRunHistory(caseId: string, since?: Date): Promise<RunResult[]>;
  searchCases(keywords: string, limit?: number): Promise<TestCase[]>;
}
