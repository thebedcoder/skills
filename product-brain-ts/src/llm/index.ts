import type { Config } from "../config.js";
import { AnthropicProvider } from "./anthropic.js";
import type { LLMProvider } from "./base.js";
import { OpenAIProvider } from "./openai.js";

export type { LLMProvider } from "./base.js";

export function getProvider(config: Config): LLMProvider {
  const name = (config.llm.provider ?? "anthropic").toLowerCase();
  const apiKey = config.llmApiKey();
  const baseURL = config.llm.base_url ?? undefined;
  const apiVersion = config.llm.api_version ?? undefined;

  if (name === "anthropic") {
    return new AnthropicProvider(apiKey, baseURL ?? undefined);
  }
  if (name === "openai" || name === "openai_compatible") {
    return new OpenAIProvider({ apiKey, baseURL: baseURL ?? undefined });
  }
  if (name === "azure_openai") {
    return new OpenAIProvider({
      apiKey,
      azure: true,
      apiVersion: apiVersion ?? undefined,
      azureEndpoint: baseURL ?? undefined,
    });
  }
  throw new Error(
    `unknown LLM provider: ${name}. valid: anthropic | openai | azure_openai | openai_compatible`,
  );
}
