// NewsData.io adapter (primary provider).
import {
  fetchNewsDataSection,
  normalizeArticle,
  type SectionSlug,
} from "../newsdata.server";
import { credibilityFor, type ProviderArticle, type ProviderResult } from "./types";

export async function fetchNewsdata(section: SectionSlug, size: number): Promise<ProviderResult> {
  const r = await fetchNewsDataSection(section, size);
  if (!r.ok) return { ok: false, provider: "newsdata", rateLimited: r.rateLimited, error: r.error };
  const articles: ProviderArticle[] = [];
  for (const a of r.articles) {
    const n = normalizeArticle(a, section);
    if (!n) continue;
    articles.push({
      ...n,
      provider: "newsdata",
      credibility: credibilityFor(n.source_id, n.source_name),
      trending_score: 0,
    });
  }
  return { ok: true, provider: "newsdata", articles };
}
