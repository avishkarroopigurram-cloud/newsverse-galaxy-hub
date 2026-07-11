import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { searchArticles } from "@/lib/news.functions";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({
    meta: [
      { title: "Search — NewsVerse" },
      { name: "description", content: "Search NewsVerse for the latest news across Telangana, India, and the world." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial);
  const [term, setTerm] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useInfiniteQuery({
    queryKey: ["search", term],
    queryFn: ({ pageParam = 0 }) => searchArticles({ data: { q: term, page: pageParam, pageSize: 12 } }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
    enabled: term.length > 0,
  });

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [query]);

  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-bold tracking-tight">NEWS<span className="text-red-500">VERSE</span></Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-serif font-semibold" style={{ fontFamily: "Fraunces, serif" }}>Search</h1>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search NewsVerse…"
          className="mt-4 w-full rounded-xl bg-white/5 border border-white/10 focus:border-white/30 outline-none px-4 py-3 text-lg"
        />

        <div className="mt-8">
          {term.length === 0 ? (
            <p className="text-white/50">Type to search across all articles.</p>
          ) : query.isLoading ? (
            <p className="text-white/50">Searching…</p>
          ) : rows.length === 0 ? (
            <p className="text-white/50">No results for "{term}".</p>
          ) : (
            <ul className="space-y-6">
              {rows.map((a) => (
                <li key={a.id}>
                  <Link to="/article/$slug" params={{ slug: a.slug }} className="flex gap-4 group">
                    {a.image_url && <img src={a.image_url} alt="" loading="lazy" className="w-32 h-24 object-cover rounded-lg border border-white/10" />}
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-widest text-red-400">{a.category}</div>
                      <h3 className="mt-1 font-semibold group-hover:text-red-300">{a.title}</h3>
                      {a.description && <p className="mt-1 text-sm text-white/60 line-clamp-2">{a.description}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinel} className="h-16 flex items-center justify-center text-white/40 text-sm">
            {query.isFetchingNextPage ? "Loading more…" : ""}
          </div>
        </div>
      </main>
    </div>
  );
}
