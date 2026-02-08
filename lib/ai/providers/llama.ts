import Groq from "groq-sdk";
import { BaseProvider } from "./base";

export class LlamaProvider extends BaseProvider {
  private client: Groq;

  constructor(timeout: number) {
    super("Llama 3 (Groq)", timeout);
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY eksik!");
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async generate(userPrompt: string, systemPrompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama3-70b-8192", // En performanslı model
    });
    return completion.choices[0]?.message?.content || "";
  }
}