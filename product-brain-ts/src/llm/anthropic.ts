import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./base.js";

export class AnthropicProvider implements LLMProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string, baseURL?: string) {
    this.client = baseURL ? new Anthropic({ apiKey, baseURL }) : new Anthropic({ apiKey });
  }

  async call(prompt: string, model: string, maxTokens = 2000): Promise<string> {
    const resp = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
}
