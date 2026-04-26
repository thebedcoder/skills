// Port target: ../product-brain/src/product_brain/llm/openai_provider.py
//
// Covers OpenAI direct, Azure OpenAI, and any OpenAI-compatible endpoint
// (Ollama, LM Studio, vLLM, llama.cpp, OpenRouter, Groq, Together, ...).
import OpenAI, { AzureOpenAI } from "openai";
import type { LLMProvider } from "./base.js";

export interface OpenAIProviderOpts {
  apiKey: string;
  baseURL?: string | undefined;
  azure?: boolean;
  apiVersion?: string | undefined;
  azureEndpoint?: string | undefined;
}

export class OpenAIProvider implements LLMProvider {
  private readonly client: OpenAI;

  constructor(opts: OpenAIProviderOpts) {
    if (opts.azure) {
      this.client = new AzureOpenAI({
        apiKey: opts.apiKey || "azure",
        apiVersion: opts.apiVersion ?? "2024-02-15-preview",
        endpoint: opts.azureEndpoint ?? opts.baseURL ?? "",
      });
    } else {
      const cfg: { apiKey: string; baseURL?: string } = { apiKey: opts.apiKey || "local" };
      if (opts.baseURL) cfg.baseURL = opts.baseURL;
      this.client = new OpenAI(cfg);
    }
  }

  async call(prompt: string, model: string, maxTokens = 2000): Promise<string> {
    const resp = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return resp.choices[0]?.message?.content ?? "";
  }
}
