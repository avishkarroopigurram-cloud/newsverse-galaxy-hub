import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/ingest-breaking")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        if (key !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { ingestBreakingOnly } = await import("@/lib/news-ingest.server");
        const result = await ingestBreakingOnly();
        return Response.json({ ok: true, result });
      },
      GET: async () => Response.json({ ok: true, route: "ingest-breaking" }),
    },
  },
});
