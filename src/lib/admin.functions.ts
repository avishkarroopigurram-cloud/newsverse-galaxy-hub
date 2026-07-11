// Admin-only server functions.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "editor"]);
  if (!data || data.length === 0) throw new Error("Forbidden: admin/editor role required");
}

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role);
    return {
      isAdmin: roles.includes("admin"),
      isEditor: roles.includes("editor") || roles.includes("admin"),
      roles,
    };
  });

export const runIngestAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { ingestAllSections } = await import("./news-ingest.server");
    return ingestAllSections();
  });

export const runIngestSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ section: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { ingestSection } = await import("./news-ingest.server");
    return ingestSection(data.section as never);
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: totalArticles }, { count: pendingCount }, { data: byCategory }, { data: recentLogs }] =
      await Promise.all([
        supabaseAdmin.from("articles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("articles").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabaseAdmin.from("articles").select("category").limit(1000),
        supabaseAdmin
          .from("article_fetch_log")
          .select("*")
          .order("ran_at", { ascending: false })
          .limit(20),
      ]);

    const byCat: Record<string, number> = {};
    for (const r of byCategory ?? []) byCat[r.category] = (byCat[r.category] ?? 0) + 1;

    return {
      totalArticles: totalArticles ?? 0,
      pendingCount: pendingCount ?? 0,
      byCategory: byCat,
      recentLogs: recentLogs ?? [],
    };
  });

export const listAdminArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(["all", "approved", "pending", "rejected"]),
        page: z.number().int().min(0),
        pageSize: z.number().int().min(1).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin
      .from("articles")
      .select(
        "id, slug, title, category, status, is_featured, is_breaking, is_editors_pick, is_original, published_at, source_name",
        { count: "exact" },
      );
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, count } = await q
      .order("published_at", { ascending: false })
      .range(from, to);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const updateArticleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        status: z.enum(["approved", "pending", "rejected"]).optional(),
        is_featured: z.boolean().optional(),
        is_breaking: z.boolean().optional(),
        is_editors_pick: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...updates } = data;

    // If setting featured, unset any other featured first (single featured slot)
    if (updates.is_featured === true) {
      await supabaseAdmin.from("articles").update({ is_featured: false }).eq("is_featured", true);
    }

    const { error } = await supabaseAdmin.from("articles").update(updates).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find duplicate titles, keep the earliest
    const { data: dupes } = await supabaseAdmin
      .from("articles")
      .select("id, title, created_at")
      .order("created_at", { ascending: true });
    if (!dupes) return { removed: 0 };
    const seen = new Map<string, string>();
    const toRemove: string[] = [];
    for (const row of dupes) {
      const key = row.title.trim().toLowerCase();
      if (seen.has(key)) toRemove.push(row.id);
      else seen.set(key, row.id);
    }
    if (toRemove.length === 0) return { removed: 0 };
    const { error } = await supabaseAdmin.from("articles").delete().in("id", toRemove);
    if (error) throw new Error(error.message);
    return { removed: toRemove.length };
  });
