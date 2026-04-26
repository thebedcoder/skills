// Port target: ../product-brain/src/product_brain/backfill/summarize.py
import type { Config } from "../config.js";
import { getProvider } from "../llm/index.js";

export type LLMCall = (prompt: string, maxTokens?: number) => Promise<string>;

export function llmCallFactory(config: Config, model?: string): LLMCall {
  const provider = getProvider(config);
  const chosenModel = model ?? config.llm.model_summarize;
  return async (prompt, maxTokens = 2000) => provider.call(prompt, chosenModel, maxTokens);
}
