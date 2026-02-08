import { AIResponse } from "../config";

export abstract class BaseProvider {
  name: string;
  timeout: number;

  constructor(name: string, timeout: number) {
    this.name = name;
    this.timeout = timeout;
  }

  // Her modelin kendi API çağrısını yapacağı metod
  abstract generate(userPrompt: string, systemPrompt: string): Promise<string>;

  // Timeout korumalı çalıştırma metodu (Bunu değiştirmene gerek yok)
  async execute(userPrompt: string, systemPrompt: string): Promise<string> {
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_LIMIT_EXCEEDED (${this.timeout}ms)`)), this.timeout)
    );

    try {
      const result = await Promise.race([
        this.generate(userPrompt, systemPrompt),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      throw error; // Hatayı yöneticiye fırlat
    }
  }
}