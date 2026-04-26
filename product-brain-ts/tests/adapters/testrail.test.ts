import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestRailAdapter } from "../../src/adapters/testrail.js";

const config = {
  testrail: {
    base_url: "https://yourco.testrail.io",
    user_email: "bot@yourco.com",
    api_key_env: "TESTRAIL_API_KEY",
    project_id: 7,
    refs_field: "refs",
    run_history_window_days: 90,
  },
  testrailApiKey() {
    return "rail-key";
  },
} as unknown as ConstructorParameters<typeof TestRailAdapter>[0];

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
});
afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TestRailAdapter.fetchCase", () => {
  it("maps a case payload", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResp({
        id: 4521,
        title: "Login with locked account shows error",
        custom_preconds: "User locked",
        custom_steps: "Step 1\nStep 2",
        custom_expected: "Specific error",
        custom_automation_type: 0,
        type: "functional",
        suite_id: 1,
        refs: "AHA-1100, AHA-1234",
      }),
    );
    const adapter = new TestRailAdapter(config);
    const c = await adapter.fetchCase("TR-C-4521");
    expect(c).not.toBeNull();
    expect(c!.id).toBe("TR-C-4521");
    expect(c!.title).toContain("locked account");
    expect(c!.automation).toBe("manual");
    expect(c!.linkedTickets).toEqual(["AHA-1100", "AHA-1234"]);
    expect(c!.url).toContain("/cases/view/4521");
    expect(c!.steps).toEqual(["Step 1", "Step 2"]);
  });

  it("returns null on 404", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 404 }));
    const adapter = new TestRailAdapter(config);
    expect(await adapter.fetchCase("TR-C-9999")).toBeNull();
  });

  it("maps automation int correctly", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResp({ id: 1, custom_automation_type: 1 }));
    const adapter = new TestRailAdapter(config);
    expect((await adapter.fetchCase("TR-C-1"))!.automation).toBe("automated");
  });
});

describe("TestRailAdapter.fetchCasesForTicket", () => {
  it("filters by linked ticket id", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResp({
        cases: [
          { id: 1, title: "match", refs: "AHA-1234, AHA-9999" },
          { id: 2, title: "miss", refs: "AHA-9999" },
        ],
      }),
    );
    const adapter = new TestRailAdapter(config);
    const cases = await adapter.fetchCasesForTicket("AHA-1234");
    expect(cases.length).toBe(1);
    expect(cases[0]!.id).toBe("TR-C-1");
  });

  it("returns empty when project_id is 0", async () => {
    const adapter = new TestRailAdapter({
      ...config,
      testrail: { ...config.testrail, project_id: 0 },
    } as unknown as ConstructorParameters<typeof TestRailAdapter>[0]);
    expect(await adapter.fetchCasesForTicket("AHA-1234")).toEqual([]);
  });

  it("returns empty on HTTP error", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("server error", { status: 500 }));
    const adapter = new TestRailAdapter(config);
    expect(await adapter.fetchCasesForTicket("AHA-1234")).toEqual([]);
  });
});

describe("TestRailAdapter.fetchRunHistory", () => {
  it("aggregates results across runs", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResp({ runs: [{ id: 100 }, { id: 101 }] }))
      .mockResolvedValueOnce(
        jsonResp({
          results: [
            { status_id: 5, created_on: 1_700_000_000, comment: "fail" },
            { status_id: 1, created_on: 1_700_001_000, comment: "" },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResp({ results: [{ status_id: 2, created_on: 1_700_002_000, comment: "" }] }));
    const adapter = new TestRailAdapter(config);
    const history = await adapter.fetchRunHistory("TR-C-4527");
    expect(history.length).toBe(3);
    const failed = history.filter((r) => r.status === "failed");
    const blocked = history.filter((r) => r.status === "blocked");
    const passed = history.filter((r) => r.status === "passed");
    expect(failed.length).toBe(1);
    expect(blocked.length).toBe(1);
    expect(passed.length).toBe(1);
  });
});
