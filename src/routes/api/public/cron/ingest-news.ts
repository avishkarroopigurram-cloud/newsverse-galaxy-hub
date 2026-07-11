import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/ingest-news")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        if (key !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { ingestAllSections } = await import("@/lib/news-ingest.server");
        const results = await ingestAllSections();
        return Response.json({ ok: true, results });
      },
      GET: async () => Response.json({ ok: true, route: "ingest-news" }),
    },
  },
});
