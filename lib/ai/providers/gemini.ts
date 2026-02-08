  import { GoogleGenerativeAI } from "@google/generative-ai";
  import { BaseProvider } from "./base";

  export class GeminiProvider extends BaseProvider {
    private model: any;

    constructor(timeout: number) {
      super("Gemini 1.5 Flash", timeout);
      if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY eksik!");
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async generate(userPrompt: string, systemPrompt: string): Promise<string> {
      // Gemini System Prompt'u ayrı parametre olarak almaz, birleştiriyoruz.
      const combinedPrompt = `${systemPrompt}\n\nKULLANICI SORUSU: ${userPrompt}`;
      const result = await this.model.generateContent(combinedPrompt);
      return result.response.text();
    }
  }