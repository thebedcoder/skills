// Port target: ../product-brain/src/product_brain/llm/base.py
export interface LLMProvider {
  call(prompt: string, model: string, maxTokens?: number): Promise<string>;
}
