import OpenAI from "openai";
import { BaseProvider } from "./base";

export class DeepSeekProvider extends BaseProvider {
  private client: OpenAI;

  constructor(timeout: number) {
    super("DeepSeek V3", timeout);
    if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY eksik!");
    
    // DeepSeek OpenAI SDK'sı ile uyumludur
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY
    });
  }

  async generate(userPrompt: string, systemPrompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "deepseek-chat",
    });
    return completion.choices[0]?.message?.content || "";
  }
}