// NewsData.io API client + normalizer. Server-only.
// Reads NEWSDATA_API_KEY from the environment inside the fetch function.

export type NewsDataArticle = {
  article_id: string;
  title: string;
  link: string;
  keywords: string[] | null;
  creator: string[] | null;
  description: string | null;
  content: string | null;
  pubDate: string | null;
  image_url: string | null;
  source_id: string | null;
  source_name: string | null;
  country: string[] | null;
  category: string[] | null;
  language: string | null;
};

export type SectionSlug =
  | "breaking"
  | "telangana"
  | "hyderabad"
  | "india"
  | "world"
  | "politics"
  | "business"
  | "technology"
  | "ai"
  | "startups"
  | "science"
  | "health"
  | "sports"
  | "entertainment"
  | "education";

export const SECTION_LABELS: Record<SectionSlug, string> = {
  breaking: "Breaking News",
  telangana: "Telangana",
  hyderabad: "Hyderabad",
  india: "India",
  world: "World",
  politics: "Politics",
  business: "Business",
  technology: "Technology",
  ai: "Artificial Intelligence",
  startups: "Startups",
  science: "Science",
  health: "Health",
  sports: "Sports",
  entertainment: "Entertainment",
  education: "Education",
};

export const SECTION_ORDER: SectionSlug[] = [
  "breaking",
  "telangana",
  "hyderabad",
  "india",
  "world",
  "politics",
  "business",
  "technology",
  "ai",
  "startups",
  "science",
  "health",
  "sports",
  "entertainment",
  "education",
];

// Query params per section. NewsData.io /latest supports: q, country, category, language, size
const SECTION_QUERY: Record<SectionSlug, Record<string, string>> = {
  breaking: { country: "in", language: "en" },
  telangana: { q: "Telangana", country: "in", language: "en" },
  hyderabad: { q: "Hyderabad", country: "in", language: "en" },
  india: { country: "in", language: "en" },
  world: { category: "world", language: "en" },
  politics: { category: "politics", country: "in", language: "en" },
  business: { category: "business", country: "in", language: "en" },
  technology: { category: "technology", language: "en" },
  ai: { q: "artificial intelligence", language: "en" },
  startups: { q: "startup India", language: "en" },
  science: { category: "science", language: "en" },
  health: { category: "health", language: "en" },
  sports: { category: "sports", country: "in", language: "en" },
  entertainment: { category: "entertainment", country: "in", language: "en" },
  education: { q: "education India", language: "en" },
};

export type FetchResult =
  | { ok: true; articles: NewsDataArticle[] }
  | { ok: false; rateLimited: boolean; error: string };

export async function fetchNewsDataSection(
  section: SectionSlug,
  size = 10,
): Promise<FetchResult> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return { ok: false, rateLimited: false, error: "NEWSDATA_API_KEY missing" };

  const params = new URLSearchParams({
    apikey: apiKey,
    size: String(size),
    ...SECTION_QUERY[section],
  });
  const url = `https://newsdata.io/api/1/latest?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 429) {
      return { ok: false, rateLimited: true, error: "Rate limit reached" };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, rateLimited: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      status?: string;
      results?: NewsDataArticle[];
      code?: string;
      message?: string;
    };
    if (json.status !== "success" || !Array.isArray(json.results)) {
      const rateLimited = json.code === "RateLimitExceeded" || json.code === "TooManyRequests";
      return { ok: false, rateLimited, error: json.message ?? "Unknown NewsData response" };
    }
    return { ok: true, articles: json.results };
  } catch (err) {
    return { ok: false, rateLimited: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
}

export function estimateReadingTime(text: string | null | undefined): number {
  if (!text) return 3;
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, Math.ceil(words / 220));
}

export type NormalizedArticle = {
  external_id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  image_url: string | null;
  source_id: string | null;
  source_name: string | null;
  author: string | null;
  category: SectionSlug;
  country: string | null;
  language: string | null;
  keywords: string[];
  published_at: string | null;
  reading_time_minutes: number;
};

export function normalizeArticle(
  a: NewsDataArticle,
  section: SectionSlug,
): NormalizedArticle | null {
  if (!a.article_id || !a.title) return null;
  const baseSlug = slugify(a.title);
  const suffix = a.article_id.slice(-8);
  const slug = `${baseSlug || "article"}-${suffix}`;
  return {
    external_id: a.article_id,
    slug,
    title: a.title,
    description: a.description,
    content: a.content,
    url: a.link,
    image_url: a.image_url,
    source_id: a.source_id,
    source_name: a.source_name ?? a.source_id,
    author: a.creator?.[0] ?? null,
    category: section,
    country: a.country?.[0] ?? null,
    language: a.language,
    keywords: a.keywords ?? [],
    published_at: a.pubDate ? new Date(a.pubDate.replace(" ", "T") + "Z").toISOString() : null,
    reading_time_minutes: estimateReadingTime(a.content ?? a.description),
  };
}
