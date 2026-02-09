// Dosya: lib/ai/providers/groq.ts
import OpenAI from "openai";
import { BaseProvider } from "./base";

export class GroqProvider extends BaseProvider {
  private client: OpenAI;

  constructor(timeout: number = 30000) {
    // Adını 'Groq' (Q ile) koyuyoruz
    super("Groq (LPU)", timeout);
    
    if (!process.env.GROQ_API_KEY) {
      console.warn("GROQ_API_KEY eksik! RAG sistemi çalışmayabilir.");
    }

    // Groq, OpenAI SDK'sı ile uyumludur ancak 'baseURL' farklıdır.
    this.client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY || "", // .env dosyana eklemelisin
      dangerouslyAllowBrowser: true, // Sadece server-side kullanacaksan false yapabilirsin
    });
  }

  async generate(userPrompt: string, systemPrompt: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // Qwen 2.5: Çok hızlı ve Türkçe performansı yüksek
        model: "qwen-2.5-32b", 
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