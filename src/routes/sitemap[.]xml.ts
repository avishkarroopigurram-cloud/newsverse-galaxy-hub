import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SECTION_ORDER } from "@/lib/newsdata.server";

const BASE = "https://newsverse.today";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticUrls = [
          { loc: `${BASE}/`, changefreq: "hourly", priority: "1.0" },
          { loc: `${BASE}/search`, changefreq: "daily", priority: "0.5" },
          ...SECTION_ORDER.map((s) => ({
            loc: `${BASE}/section/${s}`,
            changefreq: "hourly",
            priority: "0.8",
          })),
        ];

        let articles: Array<{ slug: string; published_at: string | null; image_url: string | null; title: string }> = [];
        try {
          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data } = await sb
            .from("articles")
            .select("slug, published_at, image_url, title")
            .eq("status", "approved")
            .order("published_at", { ascending: false })
            .limit(1000);
          articles = data ?? [];
        } catch {}

        const staticXml = staticUrls
          .map(
            (u) =>
              `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
          )
          .join("\n");

        const articleXml = articles
          .map((a) => {
            const lm = a.published_at ? new Date(a.published_at).toISOString() : "";
            const img = a.image_url
              ? `<image:image><image:loc>${escapeXml(a.image_url)}</image:loc><image:title>${escapeXml(a.title)}</image:title></image:image>`
              : "";
            return `  <url><loc>${BASE}/article/${a.slug}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}<changefreq>daily</changefreq><priority>0.7</priority>${img}</url>`;
          })
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticXml}
${articleXml}
</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}
