import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getSectionFeed } from "@/lib/news.functions";
import { SECTION_LABELS, type SectionSlug } from "@/lib/newsdata.server";
import { prettySourceName } from "@/lib/source-name";


export const Route = createFileRoute("/section/$slug")({
  head: ({ params }) => {
    const label = SECTION_LABELS[params.slug as SectionSlug] ?? params.slug;
    return {
      meta: [
        { title: `${label} — South India Journal` },
        { name: "description", content: `Latest ${label} news, analysis and reports on South India Journal.` },
        { property: "og:title", content: `${label} — South India Journal` },
        { property: "og:description", content: `Latest ${label} news on South India Journal.` },
      ],
    };
  },
  component: SectionPage,
  errorComponent: ({ error }) => <div className="min-h-screen bg-black text-white p-8">Error: {error.message}</div>,
  notFoundComponent: () => <div className="min-h-screen bg-black text-white p-8">Section not found</div>,
});

function SectionPage() {
  const { slug } = Route.useParams();
  const label = SECTION_LABELS[slug as SectionSlug] ?? slug;

  const q = useInfiniteQuery({
    queryKey: ["section", slug],
    queryFn: ({ pageParam = 0 }) => getSectionFeed({ data: { section: slug, page: pageParam, pageSize: 12 } }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
  });

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && q.hasNextPage && !q.isFetchingNextPage) {
        void q.fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [q]);

  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-bold tracking-tight">NEWS<span className="text-red-500">VERSE</span></Link>
          <Link to="/search" className="text-sm text-white/70 hover:text-white">Search</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-red-400">Section</div>
          <h1 className="mt-1 text-4xl font-serif font-semibold" style={{ fontFamily: "Fraunces, serif" }}>{label}</h1>
        </div>

        {q.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5 border border-white/10 animate-pulse h-72" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-white/60">No articles in this section yet. Check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <Link key={a.id} to="/article/$slug" params={{ slug: a.slug }} className="group rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition">
                {a.image_url && <img src={a.image_url} alt="" loading="lazy" decoding="async" className="w-full h-44 object-cover" />}
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-widest text-red-400">{prettySourceName(a.source_name) ?? a.category}</div>
                  <h3 className="mt-2 font-semibold leading-snug group-hover:text-red-300">{a.title}</h3>
                  {a.description && <p className="mt-2 text-sm text-white/60 line-clamp-3">{a.description}</p>}
                  <div className="mt-3 text-xs text-white/50">{a.reading_time_minutes} min read</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div ref={sentinel} className="h-16 flex items-center justify-center text-white/40 text-sm">
          {q.isFetchingNextPage ? "Loading more…" : q.hasNextPage ? "Scroll for more" : rows.length > 0 ? "End of feed" : ""}
        </div>
      </main>
    </div>
  );
}
