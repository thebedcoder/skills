import type { Config } from "../config.js";
import { AhaAdapter } from "./aha.js";
import type { PMAdapter } from "./base.js";
import type { TestAdapter } from "./test-base.js";
import { TestRailAdapter } from "./testrail.js";

export type { PMAdapter } from "./base.js";
export type { TestAdapter } from "./test-base.js";

const PM_ADAPTERS: Record<string, new (config: Config) => PMAdapter> = {
  aha: AhaAdapter,
};

const TEST_ADAPTERS: Record<string, new (config: Config) => TestAdapter> = {
  testrail: TestRailAdapter,
};

export function getPmAdapter(name: string, config: Config): PMAdapter {
  const Cls = PM_ADAPTERS[name];
  if (!Cls) {
    throw new Error(`unknown PM adapter: ${name}. registered: ${Object.keys(PM_ADAPTERS).join(", ")}`);
  }
  return new Cls(config);
}

export function getTestAdapter(name: string | null | undefined, config: Config): TestAdapter | null {
  if (!name) return null;
  const Cls = TEST_ADAPTERS[name];
  if (!Cls) {
    throw new Error(`unknown test adapter: ${name}. registered: ${Object.keys(TEST_ADAPTERS).join(", ")}`);
  }
  return new Cls(config);
}
