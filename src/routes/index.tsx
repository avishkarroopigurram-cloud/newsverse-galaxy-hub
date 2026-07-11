import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getHomepageFeed, getBreaking } from "@/lib/news.functions";
import { SECTION_ORDER, SECTION_LABELS, type SectionSlug } from "@/lib/newsdata.server";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/newsverse-logo.png.asset.json";

const feedQuery = queryOptions({
  queryKey: ["homepage-feed"],
  queryFn: () => getHomepageFeed(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(feedQuery);
  },
  head: () => ({
    meta: [
      { title: "NewsVerse — Truth Beyond Headlines" },
      { name: "description", content: "NewsVerse: AI-augmented Indian journalism — Telangana, Hyderabad, India, world, business, technology, AI, sports, entertainment and analysis." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(feedQuery);
  const breaking = useQuery({
    queryKey: ["breaking-live"],
    queryFn: () => getBreaking(),
    refetchInterval: 60_000, // live-refresh breaking every minute
    initialData: data.breaking,
    staleTime: 30_000,
  });

  const [session, setSession] = useState<{ email: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSession(data.user ? { email: data.user.email ?? "" } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { email: s.user.email ?? "" } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const anyData = data.latest.length > 0 || data.telanganaLead != null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-white p-1.5 shadow-lg">
              <img src={logoAsset.src} alt="NewsVerse" className="h-8 w-auto" />
            </div>
            <span className="hidden sm:inline font-bold tracking-tight text-lg">NEWS<span className="text-red-500">VERSE</span></span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 text-sm ml-6 overflow-x-auto">
            {SECTION_ORDER.slice(0, 10).map((s) => (
              <Link key={s} to="/section/$slug" params={{ slug: s }} className="px-2.5 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/5 whitespace-nowrap">
                {SECTION_LABELS[s]}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/search" className="text-sm text-white/70 hover:text-white">Search</Link>
            {session ? (
              <Link to="/_authenticated/admin" className="text-sm rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/5">Admin</Link>
            ) : (
              <Link to="/auth" className="text-sm rounded-md bg-red-600 hover:bg-red-500 px-3 py-1.5">Sign in</Link>
            )}
          </div>
        </div>

        {/* Breaking ticker */}
        {breaking.data && breaking.data.length > 0 && (
          <div className="border-t border-white/10 bg-red-950/30">
            <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-2 overflow-hidden">
              <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0">Breaking</span>
              <div className="flex gap-8 animate-[scroll_60s_linear_infinite] whitespace-nowrap text-sm">
                {[...breaking.data, ...breaking.data].map((b, i) => (
                  <Link key={`${b.id}-${i}`} to="/article/$slug" params={{ slug: b.slug }} className="hover:text-red-300">
                    {b.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

      {!anyData ? (
        <EmptyState />
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-10 space-y-16">
          {/* Featured */}
          {(data.featured || data.telanganaLead) && (
            <Featured article={(data.featured ?? data.telanganaLead)!} />
          )}

          {/* Telangana flagship */}
          {data.telanganaLead && (
            <SectionBlock
              eyebrow="Flagship · Telangana"
              title="Telangana Today"
              viewAll="telangana"
            >
              <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                <ArticleHero article={data.telanganaLead} />
                <div className="space-y-4">
                  {data.telanganaRail.map((a) => <RailItem key={a.id} article={a} />)}
                </div>
              </div>
            </SectionBlock>
          )}

          {/* Hyderabad */}
          {data.hyderabad.length > 0 && (
            <SectionBlock eyebrow="Local · Hyderabad" title="Hyderabad" viewAll="hyderabad">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.hyderabad.map((a) => <Card key={a.id} article={a} />)}
              </div>
            </SectionBlock>
          )}

          {/* Trending */}
          {data.trending.length > 0 && (
            <SectionBlock eyebrow="Most read" title="Trending Now">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {data.trending.map((a, i) => (
                  <Link key={a.id} to="/article/$slug" params={{ slug: a.slug }} className="group flex gap-3">
                    <span className="text-5xl font-serif text-red-500/60 leading-none" style={{ fontFamily: "Fraunces, serif" }}>{i + 1}</span>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-red-400">{a.category}</div>
                      <h3 className="text-sm font-semibold group-hover:text-red-300 mt-1 leading-snug">{a.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionBlock>
          )}

          {/* Editor's picks */}
          {data.editorsPicks.length > 0 && (
            <SectionBlock eyebrow="Curated" title="Editor's Picks">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {data.editorsPicks.map((a) => <Card key={a.id} article={a} />)}
              </div>
            </SectionBlock>
          )}

          {/* Latest */}
          {data.latest.length > 0 && (
            <SectionBlock eyebrow="Live" title="Latest News">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.latest.map((a) => <Card key={a.id} article={a} />)}
              </div>
            </SectionBlock>
          )}

          {/* All sections links */}
          <SectionBlock eyebrow="Explore" title="All sections">
            <div className="flex flex-wrap gap-2">
              {SECTION_ORDER.map((s) => (
                <Link key={s} to="/section/$slug" params={{ slug: s }} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5 hover:border-white/30">
                  {SECTION_LABELS[s]}
                </Link>
              ))}
            </div>
          </SectionBlock>
        </main>
      )}

      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <div className="font-bold text-lg">NEWS<span className="text-red-500">VERSE</span></div>
            <p className="mt-3 text-white/60">Truth beyond headlines. AI-augmented Indian journalism.</p>
          </div>
          <div>
            <div className="font-semibold mb-3">Sections</div>
            <ul className="space-y-1.5 text-white/60">
              {SECTION_ORDER.slice(0, 7).map((s) => (
                <li key={s}><Link to="/section/$slug" params={{ slug: s }} className="hover:text-white">{SECTION_LABELS[s]}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">More</div>
            <ul className="space-y-1.5 text-white/60">
              {SECTION_ORDER.slice(7).map((s) => (
                <li key={s}><Link to="/section/$slug" params={{ slug: s }} className="hover:text-white">{SECTION_LABELS[s]}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Founder</div>
            <p className="text-white/60">Dr. Mattepally Rajanikanth<br />Founder & Editor-in-Chief</p>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} NewsVerse. News sourced via NewsData.io and enriched with AI.
        </div>
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="text-4xl font-serif font-semibold" style={{ fontFamily: "Fraunces, serif" }}>NewsVerse is loading its first stories</h1>
      <p className="mt-4 text-white/60">
        Automatic news ingestion runs every 15 minutes. The first batch will appear here within a few minutes,
        or an editor can trigger a manual refresh from the admin dashboard.
      </p>
      <Link to="/auth" className="mt-6 inline-block rounded-md bg-red-600 hover:bg-red-500 px-5 py-2.5 font-medium">Sign in as editor</Link>
    </div>
  );
}

type A = { id: string; slug: string; title: string; description: string | null; image_url: string | null; category: string; source_name: string | null; author: string | null; published_at: string | null; reading_time_minutes: number | null; is_breaking: boolean; is_featured: boolean; is_editors_pick: boolean; view_count: number; keywords: string[] | null };

function SectionBlock({ eyebrow, title, viewAll, children }: { eyebrow: string; title: string; viewAll?: SectionSlug; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-red-400">{eyebrow}</div>
          <h2 className="mt-1 text-2xl md:text-3xl font-serif font-semibold" style={{ fontFamily: "Fraunces, serif" }}>{title}</h2>
        </div>
        {viewAll && <Link to="/section/$slug" params={{ slug: viewAll }} className="text-sm text-white/60 hover:text-white">View all →</Link>}
      </div>
      {children}
    </section>
  );
}

function Featured({ article }: { article: A }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group block relative rounded-2xl overflow-hidden border border-white/10">
      {article.image_url && <img src={article.image_url} alt="" className="w-full h-[420px] object-cover" loading="eager" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="text-xs uppercase tracking-widest text-red-400">Featured · {article.category}</div>
        <h2 className="mt-2 text-3xl md:text-5xl font-serif font-semibold leading-tight group-hover:text-red-300" style={{ fontFamily: "Fraunces, serif" }}>{article.title}</h2>
        {article.description && <p className="mt-3 text-white/70 max-w-3xl line-clamp-2">{article.description}</p>}
      </div>
    </Link>
  );
}

function ArticleHero({ article }: { article: A }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group block">
      {article.image_url && <img src={article.image_url} alt="" className="w-full h-80 object-cover rounded-xl border border-white/10" loading="lazy" />}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-widest text-red-400">{article.source_name ?? article.category}</div>
        <h3 className="mt-2 text-2xl font-serif font-semibold group-hover:text-red-300" style={{ fontFamily: "Fraunces, serif" }}>{article.title}</h3>
        {article.description && <p className="mt-2 text-white/60 line-clamp-2">{article.description}</p>}
      </div>
    </Link>
  );
}

function RailItem({ article }: { article: A }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group flex gap-3 pb-4 border-b border-white/10 last:border-0">
      {article.image_url && <img src={article.image_url} alt="" className="w-24 h-20 object-cover rounded-lg border border-white/10" loading="lazy" />}
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-red-400">{article.category}</div>
        <h4 className="text-sm font-semibold mt-1 group-hover:text-red-300 leading-snug">{article.title}</h4>
      </div>
    </Link>
  );
}

function Card({ article }: { article: A }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition">
      {article.image_url && <img src={article.image_url} alt="" className="w-full h-44 object-cover" loading="lazy" />}
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-widest text-red-400">{article.source_name ?? article.category}</div>
        <h3 className="mt-2 font-semibold leading-snug group-hover:text-red-300">{article.title}</h3>
        {article.description && <p className="mt-2 text-sm text-white/60 line-clamp-3">{article.description}</p>}
        <div className="mt-3 text-xs text-white/40">{article.reading_time_minutes ?? 3} min read</div>
      </div>
    </Link>
  );
}
