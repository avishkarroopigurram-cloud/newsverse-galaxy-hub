// Shared types for multi-provider news aggregation. Server-only.
import type { SectionSlug, NormalizedArticle } from "../newsdata.server";

export type ProviderName = "newsdata" | "gnews" | "newsapi" | "rss";

export type ProviderArticle = NormalizedArticle & {
  provider: ProviderName;
  credibility: number; // 0-100
  trending_score: number; // heuristic
};

export type ProviderResult =
  | { ok: true; provider: ProviderName; articles: ProviderArticle[] }
  | { ok: false; provider: ProviderName; rateLimited: boolean; error: string };

export type ProviderFetcher = (section: SectionSlug, size: number) => Promise<ProviderResult>;

// Known-source credibility. Higher = more trusted. Unknown falls back to 50.
const CRED: Record<string, number> = {
  "reuters": 95, "reuters.com": 95,
  "ap": 95, "apnews.com": 95, "associated press": 95,
  "bbc": 92, "bbc.com": 92, "bbc.co.uk": 92, "bbc news": 92,
  "the hindu": 90, "thehindu.com": 90,
  "ndtv": 85, "ndtv.com": 85,
  "hindustan times": 85, "hindustantimes.com": 85,
  "times of india": 82, "timesofindia.indiatimes.com": 82, "toi": 82,
  "indian express": 88, "indianexpress.com": 88,
  "bloomberg": 92, "bloomberg.com": 92,
  "wall street journal": 92, "wsj.com": 92, "wsj": 92,
  "new york times": 92, "nytimes.com": 92, "nyt": 92,
  "guardian": 88, "theguardian.com": 88,
  "cnn": 80, "cnn.com": 80,
  "cnbc": 82, "cnbc.com": 82,
  "aljazeera": 82, "aljazeera.com": 82,
  "moneycontrol": 78, "livemint": 82, "mint": 82,
  "scroll": 78, "thewire": 78, "thewire.in": 78,
  "deccanchronicle": 75, "deccan chronicle": 75,
  "telangana today": 78, "telanganatoday.com": 78,
};

export function credibilityFor(sourceId: string | null, sourceName: string | null): number {
  const keys = [sourceId, sourceName]
    .filter((v): v is string => !!v)
    .map((v) => v.toLowerCase().trim());
  for (const k of keys) {
    if (CRED[k] !== undefined) return CRED[k];
    // partial match
    for (const known of Object.keys(CRED)) {
      if (k.includes(known)) return CRED[known];
    }
  }
  return 50;
}
