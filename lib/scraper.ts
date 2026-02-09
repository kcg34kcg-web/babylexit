// lib/scraper.ts
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';

// HTML'i Markdown'a çeviren servis
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export interface ScrapedResult {
  url: string;
  title: string;
  content: string; // Markdown formatında temiz içerik
}

export async function scrapeAndClean(urls: string[]): Promise<ScrapedResult[]> {
  console.log(`🕷️ [Scraper] ${urls.length} adet URL taranıyor...`);

  // Paralel İstek (Rapordaki Concurrent Scraping)
  const promises = urls.map(async (url) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5sn Timeout (Fail-Fast)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const html = await response.text();

      // 1. Gürültü Temizliği (Readability)
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || article.content.length < 200) return null;

      // 2. Markdown Dönüşümü (LLM Token Tasarrufu için)
      const markdown = turndownService.turndown(article.content);

      return {
        url,
        title: article.title,
        content: markdown
      };
    } catch (err) {
      console.warn(`❌ [Scraper] Hata (${url}):`, err);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is ScrapedResult => r !== null);
}