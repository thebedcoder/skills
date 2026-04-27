export interface LLMProvider {
  call(prompt: string, model: string, maxTokens?: number): Promise<string>;
}
