// Dosya: lib/ai/providers/base.ts
import { AIResponse } from "../config";

export abstract class BaseProvider {
  name: string;
  timeout: number;

  constructor(name: string, timeout: number) {
    this.name = name;
    this.timeout = timeout;
  }

  // Her modelin kendi içinde dolduracağı metot
  abstract generate(userPrompt: string, systemPrompt: string): Promise<string>;

  // Zamanlayıcılı çalıştırma motoru
  async execute(userPrompt: string, systemPrompt: string): Promise<string> {
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`ZAMAN AŞIMI (${this.timeout}ms)`)), this.timeout)
    );

    try {
      // Modelin cevabı mı önce gelecek, süre mi dolacak?
      const result = await Promise.race([
        this.generate(userPrompt, systemPrompt),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      throw error; // Hatayı Orchestrator yakalasın
    }
  }
}