import OpenAI from "openai";
import { BaseProvider } from "./base";

export class GroqProvider extends BaseProvider {
  private client: OpenAI;

  constructor(timeout: number = 30000) {
    super("Groq (LPU)", timeout);
    
    if (!process.env.GROQ_API_KEY) {
      console.warn("GROQ_API_KEY eksik! RAG sistemi çalışmayabilir.");
    }

    this.client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY || "", 
      dangerouslyAllowBrowser: true, 
    });
  }

  async generate(userPrompt: string, systemPrompt: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // DEĞİŞİKLİK BURADA: Eski model yerine Llama 3.1 70B Versatile kullanıyoruz.
        // Bu model çok güçlüdür, hızlıdır ve decommission sorunu yoktur.
        model: "llama-3.1-70b-versatile", 
        temperature: 0.5,
        max_tokens: 1024,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Groq Generate Error:", error);
      throw error;
    }
  }
}