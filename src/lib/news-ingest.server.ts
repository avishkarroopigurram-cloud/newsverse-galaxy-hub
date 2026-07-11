// Multi-provider ingestion pipeline. Server-only.
// Try NewsData -> GNews -> NewsAPI -> RSS in priority order, merge, dedupe,
// rank, and persist. If every provider fails, existing cached articles in the
// database keep serving unchanged.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SECTION_ORDER, type SectionSlug } from "./newsdata.server";
import { aggregateSection, type ProviderArticle } from "./providers";
import { enrichArticle } from "./ai-enrichment.server";

export type IngestSummary = {
  section: SectionSlug;
  inserted: number;
  duplicates: number;
  status: "success" | "error" | "rate_limited";
  error?: string;
  providers: Array<{ provider: string; status: string; count: number; error?: string }>;
};

export async function ingestSection(section: SectionSlug): Promise<IngestSummary> {
  const target = section === "breaking" ? 15 : 12;
  const { articles, providerLogs } = await aggregateSection(section, target);

  // Log each provider's contribution separately for monitoring.
  const logRows = providerLogs.map((p) => ({
    category: section,
    provider: p.provider,
    status: p.status,
    error: p.error ?? null,
    rate_limited: p.status === "rate_limited",
    inserted_count: 0,
    duplicate_count: 0,
  }));
  if (logRows.length > 0) {
    await supabaseAdmin.from("article_fetch_log").insert(logRows);
  }

  const allProvidersDown = providerLogs.every((p) => p.status !== "success");
  if (articles.length === 0) {
    const rateLimited = providerLogs.some((p) => p.status === "rate_limited");
    const errText = providerLogs.map((p) => `${p.provider}:${p.error ?? p.status}`).join(" | ");
    return {
      section,
      inserted: 0,
      duplicates: 0,
      status: allProvidersDown ? (rateLimited ? "rate_limited" : "error") : "success",
      error: allProvidersDown ? errText : undefined,
      providers: providerLogs,
    };
  }

  // Filter out articles already in DB (by external_id or canonical URL).
  const externalIds = articles.map((a) => a.external_id);
  const urls = articles.map((a) => a.url).filter((u): u is string => !!u);
  const [{ data: byExt }, { data: byUrl }] = await Promise.all([
    supabaseAdmin.from("articles").select("external_id").in("external_id", externalIds),
    urls.length > 0
      ? supabaseAdmin.from("articles").select("url").in("url", urls)
      : Promise.resolve({ data: [] as { url: string | null }[] }),
  ]);
  const seenExt = new Set((byExt ?? []).map((r) => r.external_id));
  const seenUrls = new Set((byUrl ?? []).map((r) => r.url).filter(Boolean) as string[]);

  const newOnes = articles.filter(
    (a) => !seenExt.has(a.external_id) && (!a.url || !seenUrls.has(a.url)),
  );
  const duplicates = articles.length - newOnes.length;

  // Ensure slug uniqueness within batch.
  const slugSeen = new Set<string>();
  for (const a of newOnes) {
    let s = a.slug;
    let i = 1;
    while (slugSeen.has(s)) s = `${a.slug}-${i++}`;
    slugSeen.add(s);
    a.slug = s;
  }

  const rows = newOnes.map((a: ProviderArticle) => ({
    external_id: a.external_id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    content: a.content,
    url: a.url,
    image_url: a.image_url,
    source_id: a.source_id,
    source_name: a.source_name,
    author: a.author,
    category: a.category,
    country: a.country,
    language: a.language,
    keywords: a.keywords,
    published_at: a.published_at,
    reading_time_minutes: a.reading_time_minutes,
    provider: a.provider,
    is_breaking: section === "breaking",
    status: "approved" as const,
  }));

  let inserted = 0;
  if (rows.length > 0) {
    const { error, count } = await supabaseAdmin
      .from("articles")
      .insert(rows, { count: "exact" });
    if (error) {
      await supabaseAdmin.from("article_fetch_log").insert({
        category: section,
        provider: "pipeline",
        status: "error",
        error: error.message,
      });
      return {
        section,
        inserted: 0,
        duplicates,
        status: "error",
        error: error.message,
        providers: providerLogs,
      };
    }
    inserted = count ?? rows.length;
  }

  await supabaseAdmin.from("article_fetch_log").insert({
    category: section,
    provider: "pipeline",
    status: "success",
    inserted_count: inserted,
    duplicate_count: duplicates,
  });

  return {
    section,
    inserted,
    duplicates,
    status: "success",
    providers: providerLogs,
  };
}

export async function ingestAllSections(): Promise<IngestSummary[]> {
  const results: IngestSummary[] = [];
  for (const section of SECTION_ORDER) {
    const r = await ingestSection(section);
    results.push(r);
  }
  await enrichRecent(6);
  return results;
}

export async function ingestBreakingOnly(): Promise<IngestSummary> {
  const r = await ingestSection("breaking");
  await enrichRecent(3);
  return r;
}

// Enrich up to N recent articles missing AI summary.
export async function enrichRecent(limit = 5): Promise<number> {
  const { data } = await supabaseAdmin
    .from("articles")
    .select("id, title, description, content")
    .is("ai_summary", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data || data.length === 0) return 0;

  let done = 0;
  for (const row of data) {
    const enrichment = await enrichArticle({
      title: row.title,
      description: row.description,
      content: row.content,
    });
    if (!enrichment) continue;
    await supabaseAdmin
      .from("articles")
      .update({
        ai_summary: enrichment.summary || null,
        ai_takeaways: enrichment.takeaways,
        ai_meta_description: enrichment.meta_description || null,
        ai_categorized_as: enrichment.categorized_as || null,
      })
      .eq("id", row.id);
    done++;
  }
  return done;
}
