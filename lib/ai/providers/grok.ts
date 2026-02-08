// Dosya: lib/ai/providers/grok.ts
import OpenAI from "openai";
import { BaseProvider } from "./base";

export class GrokProvider extends BaseProvider {
  private client: OpenAI;

  constructor(timeout: number) {
    super("Grok 2 (xAI)", timeout);
    if (!process.env.XAI_API_KEY) throw new Error("XAI_API_KEY eksik!");

    this.client = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
    });
  }

  async generate(userPrompt: string, systemPrompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "grok-2-latest",
    });
    return completion.choices[0]?.message?.content || "";
  }
}