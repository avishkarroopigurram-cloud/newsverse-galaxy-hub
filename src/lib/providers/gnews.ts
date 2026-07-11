// GNews API adapter. https://gnews.io
// Requires GNEWS_API_KEY env var. Absent = provider skipped.
import {
  slugify,
  estimateReadingTime,
  type NormalizedArticle,
  type SectionSlug,
} from "../newsdata.server";
import { credibilityFor, type ProviderArticle, type ProviderResult } from "./types";

const GNEWS_TOPIC: Partial<Record<SectionSlug, string>> = {
  breaking: "breaking-news",
  world: "world",
  politics: "nation",
  business: "business",
  technology: "technology",
  science: "science",
  health: "health",
  sports: "sports",
  entertainment: "entertainment",
};
const GNEWS_QUERY: Partial<Record<SectionSlug, string>> = {
  telangana: "Telangana",
  hyderabad: "Hyderabad",
  india: "India",
  ai: "artificial intelligence",
  startups: "startup India",
  education: "education India",
};

export async function fetchGNews(section: SectionSlug, size: number): Promise<ProviderResult> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return { ok: false, provider: "gnews", rateLimited: false, error: "GNEWS_API_KEY missing" };

  const topic = GNEWS_TOPIC[section];
  const q = GNEWS_QUERY[section];
  const base = topic ? "https://gnews.io/api/v4/top-headlines" : "https://gnews.io/api/v4/search";
  const params = new URLSearchParams({
    apikey: apiKey,
    lang: "en",
    max: String(Math.min(size, 10)),
    country: section === "world" ? "" : "in",
  });
  if (topic) params.set("topic", topic);
  if (q) params.set("q", q);
  if (!params.get("country")) params.delete("country");

  try {
    const res = await fetch(`${base}?${params.toString()}`);
    if (res.status === 429 || res.status === 403) {
      return { ok: false, provider: "gnews", rateLimited: true, error: `HTTP ${res.status}` };
    }
    if (!res.ok) {
      return { ok: false, provider: "gnews", rateLimited: false, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      articles?: Array<{
        title: string;
        description: string | null;
        content: string | null;
        url: string;
        image: string | null;
        publishedAt: string;
        source: { name: string; url: string };
      }>;
    };
    if (!Array.isArray(json.articles)) {
      return { ok: false, provider: "gnews", rateLimited: false, error: "Bad response" };
    }
    const articles: ProviderArticle[] = json.articles
      .map((a): ProviderArticle | null => {
        if (!a.title || !a.url) return null;
        const external_id = `gnews:${hashUrl(a.url)}`;
        const base: NormalizedArticle = {
          external_id,
          slug: `${slugify(a.title) || "article"}-${external_id.slice(-8)}`,
          title: a.title,
          description: a.description,
          content: a.content,
          url: a.url,
          image_url: a.image,
          source_id: a.source?.url ?? null,
          source_name: a.source?.name ?? null,
          author: null,
          category: section,
          country: "in",
          language: "en",
          keywords: [],
          published_at: a.publishedAt ?? null,
          reading_time_minutes: estimateReadingTime(a.content ?? a.description),
        };
        return {
          ...base,
          provider: "gnews",
          credibility: credibilityFor(base.source_id, base.source_name),
          trending_score: 0,
        };
      })
      .filter((a): a is ProviderArticle => a !== null);
    return { ok: true, provider: "gnews", articles };
  } catch (err) {
    return {
      ok: false,
      provider: "gnews",
      rateLimited: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function hashUrl(u: string): string {
  let h = 0;
  for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
