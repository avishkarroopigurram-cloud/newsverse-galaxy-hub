// NewsAPI.org adapter. Requires NEWSAPI_KEY env var. Absent = provider skipped.
import {
  slugify,
  estimateReadingTime,
  type NormalizedArticle,
  type SectionSlug,
} from "../newsdata.server";
import { credibilityFor, type ProviderArticle, type ProviderResult } from "./types";

const NEWSAPI_CATEGORY: Partial<Record<SectionSlug, string>> = {
  breaking: "general",
  world: "general",
  business: "business",
  technology: "technology",
  science: "science",
  health: "health",
  sports: "sports",
  entertainment: "entertainment",
};
const NEWSAPI_QUERY: Partial<Record<SectionSlug, string>> = {
  telangana: "Telangana",
  hyderabad: "Hyderabad",
  india: "India",
  politics: "India politics",
  ai: "artificial intelligence",
  startups: "startup India",
  education: "education India",
};

export async function fetchNewsAPI(section: SectionSlug, size: number): Promise<ProviderResult> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return { ok: false, provider: "newsapi", rateLimited: false, error: "NEWSAPI_KEY missing" };

  const cat = NEWSAPI_CATEGORY[section];
  const q = NEWSAPI_QUERY[section];
  const base = cat ? "https://newsapi.org/v2/top-headlines" : "https://newsapi.org/v2/everything";
  const params = new URLSearchParams({
    apiKey,
    pageSize: String(Math.min(size, 20)),
    language: "en",
  });
  if (cat) {
    params.set("category", cat);
    if (section !== "world") params.set("country", "in");
  }
  if (q) params.set("q", q);
  params.set("sortBy", "publishedAt");

  try {
    const res = await fetch(`${base}?${params.toString()}`, {
      headers: { "User-Agent": "NewsVerse/1.0" },
    });
    if (res.status === 429) {
      return { ok: false, provider: "newsapi", rateLimited: true, error: "Rate limited" };
    }
    if (!res.ok) {
      return { ok: false, provider: "newsapi", rateLimited: false, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      status?: string;
      code?: string;
      message?: string;
      articles?: Array<{
        source: { id: string | null; name: string };
        author: string | null;
        title: string | null;
        description: string | null;
        url: string;
        urlToImage: string | null;
        publishedAt: string;
        content: string | null;
      }>;
    };
    if (json.status !== "ok" || !Array.isArray(json.articles)) {
      const rateLimited = json.code === "rateLimited";
      return { ok: false, provider: "newsapi", rateLimited, error: json.message ?? "Bad response" };
    }
    const articles: ProviderArticle[] = json.articles
      .map((a): ProviderArticle | null => {
        if (!a.title || !a.url) return null;
        const external_id = `newsapi:${hashUrl(a.url)}`;
        const base: NormalizedArticle = {
          external_id,
          slug: `${slugify(a.title) || "article"}-${external_id.slice(-8)}`,
          title: a.title,
          description: a.description,
          content: a.content,
          url: a.url,
          image_url: a.urlToImage,
          source_id: a.source?.id ?? null,
          source_name: a.source?.name ?? null,
          author: a.author,
          category: section,
          country: "in",
          language: "en",
          keywords: [],
          published_at: a.publishedAt ?? null,
          reading_time_minutes: estimateReadingTime(a.content ?? a.description),
        };
        return {
          ...base,
          provider: "newsapi",
          credibility: credibilityFor(base.source_id, base.source_name),
          trending_score: 0,
        };
      })
      .filter((a): a is ProviderArticle => a !== null);
    return { ok: true, provider: "newsapi", articles };
  } catch (err) {
    return {
      ok: false,
      provider: "newsapi",
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
