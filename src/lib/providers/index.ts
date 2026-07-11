// Multi-provider orchestrator with failover, dedupe, and ranking.
import type { SectionSlug } from "../newsdata.server";
import { fetchNewsdata } from "./newsdata";
import { fetchGNews } from "./gnews";
import { fetchNewsAPI } from "./newsapi";
import { fetchRSS } from "./rss";
import type { ProviderArticle, ProviderFetcher, ProviderName, ProviderResult } from "./types";

// Priority order per the spec.
const PROVIDERS: Array<{ name: ProviderName; fetch: ProviderFetcher }> = [
  { name: "newsdata", fetch: fetchNewsdata },
  { name: "gnews", fetch: fetchGNews },
  { name: "newsapi", fetch: fetchNewsAPI },
  { name: "rss", fetch: fetchRSS },
];

export type AggregationResult = {
  articles: ProviderArticle[];
  providerLogs: Array<{
    provider: ProviderName;
    status: "success" | "error" | "rate_limited";
    count: number;
    error?: string;
  }>;
};

export async function aggregateSection(
  section: SectionSlug,
  size: number,
): Promise<AggregationResult> {
  const providerLogs: AggregationResult["providerLogs"] = [];
  const collected: ProviderArticle[] = [];

  // Try providers in order. Continue past failures/rate-limits (failover).
  // Merge successful providers so we get broader coverage rather than
  // stopping at the first success.
  for (const p of PROVIDERS) {
    // If we already have plenty, RSS is only useful as fallback — skip if we have enough.
    if (p.name === "rss" && collected.length >= size) {
      providerLogs.push({ provider: "rss", status: "success", count: 0 });
      continue;
    }
    const r: ProviderResult = await p.fetch(section, size);
    if (r.ok) {
      collected.push(...r.articles);
      providerLogs.push({ provider: p.name, status: "success", count: r.articles.length });
    } else {
      providerLogs.push({
        provider: p.name,
        status: r.rateLimited ? "rate_limited" : "error",
        count: 0,
        error: r.error,
      });
    }
  }

  const deduped = dedupe(collected);
  const ranked = rankArticles(deduped);
  return { articles: ranked, providerLogs };
}

// ------- Dedupe -------

export function dedupe(list: ProviderArticle[]): ProviderArticle[] {
  const byUrl = new Map<string, ProviderArticle>();
  // Pass 1: exact URL match — prefer higher-credibility record.
  for (const a of list) {
    const key = canonicalUrl(a.url);
    if (!key) {
      byUrl.set(a.external_id, a);
      continue;
    }
    const existing = byUrl.get(key);
    if (!existing || a.credibility > existing.credibility) {
      byUrl.set(key, a);
    }
  }
  const urlDeduped = [...byUrl.values()];

  // Pass 2: fuzzy title match within a 12-hour window.
  const kept: ProviderArticle[] = [];
  for (const a of urlDeduped) {
    const dupIdx = kept.findIndex((b) => isNearDuplicate(a, b));
    if (dupIdx === -1) {
      kept.push(a);
    } else if (a.credibility > kept[dupIdx].credibility) {
      kept[dupIdx] = a;
    }
  }
  return kept;
}

function canonicalUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    url.hash = "";
    // strip common tracking params
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$|^ref$/i.test(key)) url.searchParams.delete(key);
    }
    let s = url.toString().toLowerCase();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return u.toLowerCase();
  }
}

function isNearDuplicate(a: ProviderArticle, b: ProviderArticle): boolean {
  if (titleSimilarity(a.title, b.title) < 0.82) return false;
  const ta = a.published_at ? Date.parse(a.published_at) : NaN;
  const tb = b.published_at ? Date.parse(b.published_at) : NaN;
  if (Number.isFinite(ta) && Number.isFinite(tb)) {
    const diffHours = Math.abs(ta - tb) / 3_600_000;
    return diffHours <= 12;
  }
  return true; // no timestamps — treat as duplicate if titles are that close
}

function titleSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

const STOP = new Set([
  "a","an","the","of","in","on","for","and","or","to","is","was","are","were","be","by",
  "with","at","from","as","that","this","it","its","after","before","over","under","new",
  "news","report","says","said","update","live","breaking","today",
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

// ------- Ranking -------

const PROVIDER_WEIGHT: Record<ProviderName, number> = {
  newsdata: 1.0,
  gnews: 0.95,
  newsapi: 0.9,
  rss: 0.85,
};

export function rankArticles(list: ProviderArticle[]): ProviderArticle[] {
  const now = Date.now();
  const scored = list.map((a) => {
    const publishedMs = a.published_at ? Date.parse(a.published_at) : NaN;
    const ageHours = Number.isFinite(publishedMs)
      ? Math.max(0, (now - publishedMs) / 3_600_000)
      : 48;
    // Freshness decays over ~48 hours; 100 at 0h -> ~37 at 48h.
    const freshness = 100 * Math.exp(-ageHours / 48);
    const credibility = a.credibility;
    // Relevance: has image, description length, non-empty content.
    let relevance = 0;
    if (a.image_url) relevance += 20;
    if (a.description && a.description.length > 60) relevance += 15;
    if (a.content && a.content.length > 200) relevance += 10;
    relevance += Math.min(15, (a.keywords?.length ?? 0) * 3);
    // Trending: reserved for later signals (views, share velocity). Use recency clamp for now.
    const trending = ageHours < 3 ? 40 : ageHours < 12 ? 20 : ageHours < 24 ? 10 : 0;
    const providerWeight = PROVIDER_WEIGHT[a.provider] ?? 0.8;

    const score =
      (freshness * 0.35 + credibility * 0.30 + relevance * 0.15 + trending * 0.20) * providerWeight;

    return { a: { ...a, trending_score: Math.round(trending) }, score };
  });
  scored.sort((x, y) => y.score - x.score);
  return scored.map((s) => s.a);
}

export type { ProviderArticle, ProviderName } from "./types";
