// Server-only: publishes AI Editorial Desk articles into the existing
// `articles` table so they surface in the site's Hero and Originals
// sections. This is the ONLY write path from the desk; by construction it
// only touches originals (is_original=true) — never API-fed rows.

import type { PublishRequest, PublishResult } from "@/types/editorial";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `sij-${Date.now()}`;
}

export async function publishEditorialArticle(
  data: PublishRequest,
): Promise<PublishResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const slug = slugify(data.seo?.slug || data.headline);
  const now = new Date().toISOString();
  const isHero = data.destination === "hero";

  const row = {
    external_id: `sij-editorial-${crypto.randomUUID()}`,
    slug,
    title: data.headline,
    description: data.subheadline || data.seo?.metaDescription || null,
    content: data.content,
    url: null,
    image_url: data.heroImageDataUrl ?? null,
    source_id: "sij-editorial",
    source_name: "South India Journal Originals",
    author: "South India Journal Editorial",
    category: "telangana",
    country: "in",
    language: "en",
    keywords: data.seo?.keywords ?? [],
    published_at: data.scheduledFor ?? now,
    ai_summary: null,
    ai_takeaways: [],
    ai_meta_description: data.seo?.metaDescription ?? null,
    ai_categorized_as: "South India Journal Originals",
    reading_time_minutes: 3,
    status: "approved",
    is_featured: isHero,
    is_breaking: false,
    is_editors_pick: isHero,
    is_original: true,
    provider: "sij-editorial",
  };

  const { data: inserted, error } = await supabaseAdmin
    .from("articles")
    .insert(row)
    .select("id, slug, published_at")
    .single();

  if (error) throw new Error(`Publish failed: ${error.message}`);

  return {
    id: inserted.id as string,
    destination: data.destination,
    publishedAt: (inserted.published_at as string) ?? now,
    slug: inserted.slug as string,
  };
}
