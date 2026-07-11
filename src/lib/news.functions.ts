// Public server functions for reading news from the DB.
// Uses server publishable client (RLS as anon). All rows returned have status='approved'.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function serverPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

const ARTICLE_COLS =
  "id, slug, title, description, image_url, category, source_name, author, published_at, reading_time_minutes, is_breaking, is_featured, is_editors_pick, view_count, keywords";

export const getHomepageFeed = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverPublicClient();

  const [telanganaLead, telanganaRail, hyderabad, breaking, featured, trending, latest, editorsPicks] =
    await Promise.all([
      sb.from("articles").select(ARTICLE_COLS).eq("category", "telangana").order("published_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("articles").select(ARTICLE_COLS).eq("category", "telangana").order("published_at", { ascending: false }).range(1, 4),
      sb.from("articles").select(ARTICLE_COLS).eq("category", "hyderabad").order("published_at", { ascending: false }).limit(3),
      sb.from("articles").select(ARTICLE_COLS).eq("is_breaking", true).order("published_at", { ascending: false }).limit(6),
      sb.from("articles").select(ARTICLE_COLS).eq("is_featured", true).order("published_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("articles").select(ARTICLE_COLS).order("view_count", { ascending: false }).order("published_at", { ascending: false }).limit(4),
      sb.from("articles").select(ARTICLE_COLS).order("published_at", { ascending: false }).limit(9),
      sb.from("articles").select(ARTICLE_COLS).eq("is_editors_pick", true).order("published_at", { ascending: false }).limit(4),
    ]);

  return {
    telanganaLead: telanganaLead.data ?? null,
    telanganaRail: telanganaRail.data ?? [],
    hyderabad: hyderabad.data ?? [],
    breaking: breaking.data ?? [],
    featured: featured.data ?? null,
    trending: trending.data ?? [],
    latest: latest.data ?? [],
    editorsPicks: editorsPicks.data ?? [],
  };
});

export const getBreaking = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverPublicClient();
  const { data } = await sb
    .from("articles")
    .select(ARTICLE_COLS)
    .eq("is_breaking", true)
    .order("published_at", { ascending: false })
    .limit(10);
  return data ?? [];
});

export const getSectionFeed = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        section: z.string(),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(30).default(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sb = serverPublicClient();
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, count } = await sb
      .from("articles")
      .select(ARTICLE_COLS, { count: "exact" })
      .eq("category", data.section)
      .order("published_at", { ascending: false })
      .range(from, to);
    return { rows: rows ?? [], count: count ?? 0, hasMore: (rows?.length ?? 0) === data.pageSize };
  });

const FULL_ARTICLE_COLS =
  "id, slug, title, description, content, url, image_url, category, source_id, source_name, author, published_at, reading_time_minutes, is_breaking, is_featured, is_editors_pick, view_count, keywords, ai_summary, ai_takeaways, ai_meta_description, ai_categorized_as, country, language";

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sb = serverPublicClient();
    const { data: article } = await sb
      .from("articles")
      .select(FULL_ARTICLE_COLS)
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle();
    if (!article) return { article: null, related: [] as unknown[] };

    const { data: related } = await sb
      .from("articles")
      .select(ARTICLE_COLS)
      .eq("category", article.category)
      .neq("id", article.id)
      .order("published_at", { ascending: false })
      .limit(4);

    return { article, related: related ?? [] };
  });

export const searchArticles = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().min(1).max(200),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(30).default(12),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sb = serverPublicClient();
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    // ilike search across title/description as a portable fallback; also FTS via textSearch if available
    const like = `%${data.q.replace(/[%_]/g, "")}%`;
    const { data: rows } = await sb
      .from("articles")
      .select(ARTICLE_COLS)
      .or(`title.ilike.${like},description.ilike.${like}`)
      .order("published_at", { ascending: false })
      .range(from, to);
    return { rows: rows ?? [], hasMore: (rows?.length ?? 0) === data.pageSize };
  });
