// Core ingestion logic. Server-only.
// Fetches NewsData sections, dedupes by external_id, upserts, then enriches N articles per run.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchNewsDataSection,
  normalizeArticle,
  SECTION_ORDER,
  type SectionSlug,
} from "./newsdata.server";
import { enrichArticle } from "./ai-enrichment.server";

export type IngestSummary = {
  section: SectionSlug;
  inserted: number;
  duplicates: number;
  status: "success" | "error" | "rate_limited";
  error?: string;
};

export async function ingestSection(section: SectionSlug): Promise<IngestSummary> {
  const result = await fetchNewsDataSection(section, section === "breaking" ? 10 : 10);

  if (!result.ok) {
    await supabaseAdmin.from("article_fetch_log").insert({
      category: section,
      status: result.rateLimited ? "rate_limited" : "error",
      error: result.error,
      rate_limited: result.rateLimited,
    });
    return {
      section,
      inserted: 0,
      duplicates: 0,
      status: result.rateLimited ? "rate_limited" : "error",
      error: result.error,
    };
  }

  const normalized = result.articles
    .map((a) => normalizeArticle(a, section))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  if (normalized.length === 0) {
    await supabaseAdmin.from("article_fetch_log").insert({
      category: section,
      status: "success",
      inserted_count: 0,
      duplicate_count: 0,
    });
    return { section, inserted: 0, duplicates: 0, status: "success" };
  }

  // Check which external_ids already exist
  const externalIds = normalized.map((a) => a.external_id);
  const { data: existing } = await supabaseAdmin
    .from("articles")
    .select("external_id")
    .in("external_id", externalIds);
  const existingSet = new Set((existing ?? []).map((r) => r.external_id));

  const newOnes = normalized.filter((a) => !existingSet.has(a.external_id));
  const duplicates = normalized.length - newOnes.length;

  // Ensure slug uniqueness within batch by appending index if collision
  const slugSeen = new Set<string>();
  for (const a of newOnes) {
    let s = a.slug;
    let i = 1;
    while (slugSeen.has(s)) {
      s = `${a.slug}-${i++}`;
    }
    slugSeen.add(s);
    a.slug = s;
  }

  // Mark breaking section as breaking
  const rows = newOnes.map((a) => ({
    ...a,
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
        status: "error",
        error: error.message,
      });
      return { section, inserted: 0, duplicates, status: "error", error: error.message };
    }
    inserted = count ?? rows.length;
  }

  await supabaseAdmin.from("article_fetch_log").insert({
    category: section,
    status: "success",
    inserted_count: inserted,
    duplicate_count: duplicates,
  });

  return { section, inserted, duplicates, status: "success" };
}

export async function ingestAllSections(): Promise<IngestSummary[]> {
  const results: IngestSummary[] = [];
  for (const section of SECTION_ORDER) {
    const r = await ingestSection(section);
    results.push(r);
    if (r.status === "rate_limited") break; // stop cascading 429s
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
