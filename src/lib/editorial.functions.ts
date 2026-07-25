// Server functions for the AI Editorial Desk. Both are gated to admins.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EditorialReviewResult, PublishResult } from "@/types/editorial";

const draftSchema = z.object({
  rawText: z.string().min(1, "Paste or upload some article text first."),
  sourceType: z.enum(["paste", "docx", "pdf", "voice", "clipboard"]),
  imageDataUrls: z.array(z.string()).optional(),
});

const seoSchema = z.object({
  seoTitle: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  slug: z.string(),
  keywords: z.array(z.string()),
  tags: z.array(z.string()),
  canonicalUrl: z.string(),
  openGraphTitle: z.string(),
  openGraphDescription: z.string(),
  twitterCardTitle: z.string(),
  twitterCardDescription: z.string(),
});

const publishSchema = z.object({
  destination: z.enum(["hero", "originals"]),
  headline: z.string().min(1),
  subheadline: z.string().optional().default(""),
  content: z.string().min(1),
  seo: seoSchema,
  heroImageDataUrl: z.string().optional(),
  scheduledFor: z.string().optional(),
});

async function assertAdmin(ctx: {
  supabase: Awaited<ReturnType<typeof requireSupabaseAuth._types.middlewares[0]>>;
  userId: string;
}) {
  // Runtime type-safe check via existing has_role RPC.
  // (Cast to any to avoid pulling the middleware's inferred type shape.)
  const supabase = ctx.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || data !== true) {
    throw new Error("Forbidden: admin role required.");
  }
}

export const runEditorialReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => draftSchema.parse(data))
  .handler(async ({ data, context }): Promise<EditorialReviewResult> => {
    await assertAdmin(context);
    const { runEditorialReviewGemini } = await import("./editorial-review.server");
    return runEditorialReviewGemini(data);
  });

export const publishArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => publishSchema.parse(data))
  .handler(async ({ data, context }): Promise<PublishResult> => {
    await assertAdmin(context);
    const { publishEditorialArticle } = await import("./editorial-publish.server");
    return publishEditorialArticle(data);
  });
