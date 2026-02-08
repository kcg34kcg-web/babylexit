import OpenAI from "openai";
import { BaseProvider } from "./base";

export class GPT4Provider extends BaseProvider {
  private client: OpenAI;

  constructor(timeout: number) {
    super("GPT-4o (OpenAI)", timeout);
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY eksik!");

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generate(userPrompt: string, systemPrompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o",
    });
    return completion.choices[0]?.message?.content || "";
  }
}