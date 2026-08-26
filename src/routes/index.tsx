import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getHomepageFeed, getBreaking, getOriginals, getSectionFeed } from "@/lib/news.functions";
import { pickEditorialLead, sortByEditorialPriority } from "@/lib/editorial-priority";
import { prettySourceName } from "@/lib/source-name";

import { SECTION_ORDER, SECTION_LABELS, type SectionSlug } from "@/lib/newsdata.server";
import { supabase } from "@/integrations/supabase/client";
import { AdSlot, StickyMobileAd } from "@/components/AdSlot";
import logoAsset from "@/assets/southindiajournal-logo.png.asset.json";
import vijayaHeroRail1Asset from "@/assets/vijaya-hero-rail-1.jpg.asset.json";

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
      { title: "South India Journal — Truth Beyond Headlines" },
      { name: "description", content: "Premium editorial journalism from Telangana, Hyderabad, India and the world. Breaking news, politics, business, technology, science, sports and analysis — augmented by AI." },
      { property: "og:title", content: "South India Journal — Truth Beyond Headlines" },
      { property: "og:description", content: "Premium editorial journalism from Telangana, Hyderabad, India and the world." },
      { property: "og:url", content: "https://southindiajournal.com/" },
    ],
    links: [{ rel: "canonical", href: "https://southindiajournal.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsMediaOrganization",
          name: "South India Journal",
          url: "https://southindiajournal.com",
          logo: "https://southindiajournal.com/icon-512.png",
          sameAs: [],
        }),
      },
    ],
  }),
  component: Home,
});

type A = {
  id: string; slug: string; title: string; description: string | null;
  image_url: string | null; category: string; source_name: string | null;
  author: string | null; published_at: string | null;
  reading_time_minutes: number | null; is_breaking: boolean;
  is_featured: boolean; is_editors_pick: boolean; view_count: number;
  keywords: string[] | null;
};

const ACCENT = "#c8102e"; // editorial red

function Home() {
  const { data } = useSuspenseQuery(feedQuery);
  const breaking = useQuery({
    queryKey: ["breaking-live"],
    queryFn: () => getBreaking(),
    refetchInterval: 60_000,
    initialData: data.breaking,
    staleTime: 30_000,
  });
  // Main Telangana news, auto-refreshed from the same news API feed as other sections.
  const telanganaQ = useQuery({
    queryKey: ["telangana-live"],
    queryFn: () => getSectionFeed({ data: { section: "telangana", page: 0, pageSize: 12 } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const telanganaLive = (telanganaQ.data?.rows ?? []) as A[];
  const originalsQ = useQuery({
    queryKey: ["nv-originals", 0],
    queryFn: () => getOriginals({ data: { page: 0, pageSize: 6 } }),
    staleTime: 60_000,
  });
  const originals = ((originalsQ.data?.rows ?? []) as A[]).map((a) => ({ ...a, is_featured: true }));

  const [session, setSession] = useState<{ email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSession(data.user ? { email: data.user.email ?? "" } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { email: s.user.email ?? "" } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const anyData = data.latest.length > 0 || data.telanganaLead != null;

  // Editorial priority: South India Journal Originals are prioritized for the hero slot,
  // then breaking > gov > telangana > hyderabad > india > … > entertainment.
  const leadPool: A[] = [
    ...originals,
    ...(data.featured ? [data.featured] : []),
    ...data.breaking,
    ...(data.telanganaLead ? [data.telanganaLead] : []),
    ...telanganaLive,
    ...data.telanganaRail,
    ...data.hyderabad,
    ...data.trending,
    ...data.latest,
  ];

  const featured = pickEditorialLead(leadPool.filter((a) => !!a.image_url)) as A | null;

  // Build feed slices for the editorial grid without repeats.
  const seen = new Set<string>();
  const take = (arr: A[] | null | undefined, n: number, skip: (a: A) => boolean = () => false) => {
    const out: A[] = [];
    for (const a of arr ?? []) {
      if (out.length >= n) break;
      if (seen.has(a.id) || skip(a)) continue;
      seen.add(a.id);
      out.push(a);
    }
    return out;
  };
  if (featured) seen.add(featured.id);
  // Top stories rail also follows editorial priority (not just recency).
  const rankedLatest = sortByEditorialPriority(data.latest) as A[];
  const topStories = take(rankedLatest, 4);
  const telanganaRail = take(
    [data.telanganaLead, ...telanganaLive, ...data.telanganaRail].filter(Boolean) as A[],
    4,
  );
  const hyderabad = take(data.hyderabad, 3);
  const trending = data.trending; // ranked; may overlap intentionally
  const editors = take(data.editorsPicks, 4);
  const moreLatest = take(rankedLatest, 8);

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ---------- TOP NAV ---------- */}
      <div className="hidden md:block bg-neutral-950 text-white text-xs">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-4 text-white/70">
            <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="h-3 w-px bg-white/20" />
            <Link to="/section/$slug" params={{ slug: "weather" as SectionSlug }} className="hover:text-white">Weather</Link>
            <Link to="/section/$slug" params={{ slug: "business" as SectionSlug }} className="hover:text-white">Markets</Link>
          </div>
          <div className="flex items-center gap-4 text-white/70">
            <a href="#newsletter" className="hover:text-white">Newsletter</a>
            {session ? (
              <Link to="/admin" className="hover:text-white">Admin</Link>
            ) : (
              <Link to="/auth" className="hover:text-white">Sign in</Link>
            )}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w-[1400px] mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:px-6 py-3">
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden h-9 w-9 grid place-items-center rounded-md hover:bg-neutral-100"
          >
            <span className="i-menu block w-5 h-[2px] bg-neutral-900 relative before:content-[''] before:absolute before:-top-1.5 before:left-0 before:w-5 before:h-[2px] before:bg-neutral-900 after:content-[''] after:absolute after:top-1.5 after:left-0 after:w-5 after:h-[2px] after:bg-neutral-900" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-md bg-white p-2.5 ring-1 ring-neutral-200">
              <img src={logoAsset.url} alt="South India Journal" className="h-14 w-auto" />
            </div>
          </Link>


          <nav className="hidden lg:flex items-center gap-1 text-sm justify-center col-start-2 row-start-1 justify-self-center">
            {SECTION_ORDER.slice(0, 9).map((s) => (
              <Link
                key={s}
                to="/section/$slug"
                params={{ slug: s }}
                className="px-2.5 py-1.5 rounded-md text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 whitespace-nowrap font-medium"
              >
                {SECTION_LABELS[s]}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            <Link to="/auth" className="text-xs sm:text-sm rounded-md border border-neutral-300 px-2 sm:px-3 py-1.5 hover:bg-neutral-50 font-medium text-neutral-700">
              Login
            </Link>
            <Link to="/search" search={{ q: "" }} aria-label="Search" className="h-9 w-9 grid place-items-center rounded-md hover:bg-neutral-100 text-neutral-700">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
            </Link>
            {session ? (
              <Link to="/admin" className="hidden sm:inline text-sm rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 font-medium">Admin</Link>
            ) : (
              <Link to="/auth" className="hidden sm:inline text-sm rounded-md px-3 py-1.5 font-semibold text-white" style={{ backgroundColor: ACCENT }}>
                Subscribe
              </Link>
            )}
          </div>
        </div>

        {menuOpen && (
          <nav className="lg:hidden border-t border-neutral-200 bg-white">
            <div className="max-w-[1400px] mx-auto px-2 py-2 grid grid-cols-3 gap-1">
              {SECTION_ORDER.map((s) => (
                <Link
                  key={s}
                  to="/section/$slug"
                  params={{ slug: s }}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 text-sm text-neutral-700 rounded-md hover:bg-neutral-100"
                >
                  {SECTION_LABELS[s]}
                </Link>
              ))}
            </div>
          </nav>
        )}

        {tickerItems.length > 0 && (
          <div className="border-t border-neutral-200 bg-neutral-50">
            <div className="max-w-[1400px] mx-auto relative h-10 md:h-11 flex items-center px-4 md:px-6 overflow-hidden">
              <span
                className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm"
                style={{ backgroundColor: ACCENT }}
              >
                Live
              </span>
              <div
                aria-hidden
                className="absolute left-0 top-0 h-full w-24 md:w-28 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right, rgb(250 250 250) 60%, rgba(250,250,250,0))" }}
              />
              <div className="pl-20 md:pl-24 w-full overflow-hidden">
                <div className="flex gap-10 animate-[nv-scroll_10s_linear_infinite] whitespace-nowrap text-sm text-neutral-800 will-change-transform">
                  {[...tickerItems, ...tickerItems].map((b, i) => (
                    <Link key={`${b.id}-${i}`} to="/article/$slug" params={{ slug: b.slug }} className="hover:text-black inline-flex items-center gap-2">
                      <span className="font-semibold" style={{ color: ACCENT }}>●</span>
                      <span>{b.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <style>{`
        @keyframes nv-scroll { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        @keyframes nv-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .nv-fadeup { animation: nv-fadeup .6s ease both; }
      `}</style>

      {/* ---------- LEADERBOARD ---------- */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6">
        <AdSlot size="leaderboard" slotId="top-leaderboard" className="hidden md:flex" />
        <AdSlot size="mobile-banner" slotId="top-mobile" className="md:hidden" />
      </div>

      {!anyData ? (
        <EmptyState />
      ) : (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 pb-16">
          {/* ---------- HERO GRID (Featured + Top Stories rail) ---------- */}
          <section className="mt-8 grid gap-8 lg:grid-cols-[1.7fr_1fr] nv-fadeup">
            {featured && <Featured article={featured} />}
            <aside className="border-l lg:pl-8 border-neutral-200">
              <SectionEyebrow>Top Stories</SectionEyebrow>
              <ul className="mt-4 divide-y divide-neutral-200">
                {topStories.map((a) => (
                  <li key={a.id} className="py-4 first:pt-0">
                    <TopStoryItem article={a} />
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <AdSlot size="rectangle" slotId="hero-rail-1" imageUrl={vijayaHeroRail1Asset.url} alt="Vijaya Oils advertisement" />
              </div>
            </aside>
          </section>

          {/* ---------- SOUTH INDIA JOURNAL ORIGINALS ---------- */}
          <SijOriginals />



          {/* ---------- TELANGANA FLAGSHIP ---------- */}
          {telanganaRail.length > 0 && (
            <SectionBlock
              accent
              eyebrow="Flagship"
              title="Telangana"
              subtitle="Our home ground. Deep reporting from across the state."
              viewAll="telangana"
            >
              <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr]">
                {telanganaRail[0] && <EditorialCard article={telanganaRail[0]} size="lg" />}
                <div className="space-y-6">
                  {telanganaRail.slice(1, 3).map((a) => <EditorialCard key={a.id} article={a} size="md" />)}
                </div>
                <div className="space-y-6">
                  {telanganaRail.slice(3).map((a) => <EditorialCard key={a.id} article={a} size="md" />)}
                  {telanganaRail.length < 4 && <AdSlot size="rectangle" slotId="telangana-rail" />}
                </div>
              </div>
            </SectionBlock>
          )}

          {/* ---------- HYDERABAD + IN-FEED AD ---------- */}
          {hyderabad.length > 0 && (
            <SectionBlock eyebrow="City" title="Hyderabad" viewAll="hyderabad">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {hyderabad.slice(0, 2).map((a) => <EditorialCard key={a.id} article={a} size="md" />)}
                <AdSlot size="in-feed" slotId="hyderabad-infeed" className="md:col-span-2 lg:col-span-1" />
                {hyderabad.slice(2).map((a) => <EditorialCard key={a.id} article={a} size="md" />)}
              </div>
            </SectionBlock>
          )}

          <div className="my-14">
            <AdSlot size="billboard" slotId="mid-billboard" />
          </div>

          {/* ---------- SECTIONS 2-COL: TRENDING + EDITOR'S PICKS ---------- */}
          <section className="grid gap-10 lg:grid-cols-2 mt-14">
            {trending.length > 0 && (
              <div>
                <SectionHeader eyebrow="Most read" title="Trending" />
                <ol className="mt-6 space-y-5">
                  {trending.slice(0, 5).map((a, i) => (
                    <li key={a.id}>
                      <RankedItem rank={i + 1} article={a} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {editors.length > 0 && (
              <div>
                <SectionHeader eyebrow="Curated" title="Editor's Picks" />
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {editors.map((a) => <EditorialCard key={a.id} article={a} size="sm" />)}
                </div>
              </div>
            )}
          </section>

          {/* ---------- CATEGORY STRIPS ---------- */}
          <CategoryStrips exclude={new Set(["telangana", "hyderabad", "breaking"])} />

          {/* ---------- LATEST FEED ---------- */}
          {moreLatest.length > 0 && (
            <SectionBlock eyebrow="Live" title="Latest News">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {moreLatest.map((a, i) => (
                  <div key={a.id}>
                    <EditorialCard article={a} size="sm" />
                    {i === 3 && <div className="mt-6 sm:col-span-2 lg:col-span-4"><AdSlot size="in-feed" slotId="latest-infeed" /></div>}
                  </div>
                ))}
              </div>
            </SectionBlock>
          )}

          {/* ---------- ALL SECTIONS ---------- */}
          <SectionBlock eyebrow="Explore" title="All sections">
            <div className="flex flex-wrap gap-2">
              {SECTION_ORDER.map((s) => (
                <Link
                  key={s}
                  to="/section/$slug"
                  params={{ slug: s }}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
                >
                  {SECTION_LABELS[s]}
                </Link>
              ))}
            </div>
          </SectionBlock>
        </main>
      )}

      {/* ---------- TRANSITION → DARK ---------- */}
      <div aria-hidden className="h-32 bg-gradient-to-b from-white to-neutral-950" />

      {/* ---------- NEWSLETTER ---------- */}
      <section id="newsletter" className="bg-neutral-950 text-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-16 grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.3em]" style={{ color: "#ff6b6b" }}>The Morning Verse</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-semibold leading-tight" style={{ fontFamily: "Fraunces, serif" }}>
              The stories shaping India, in your inbox by 7 AM.
            </h2>
            <p className="mt-4 text-white/70 max-w-xl">
              A five-minute editorial briefing. No noise. No clickbait. Just what matters — curated by South India Journal editors and augmented with AI context.
            </p>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-3 lg:justify-end"
          >
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="flex-1 min-w-0 rounded-md bg-white/5 border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
            />
            <button
              type="submit"
              className="rounded-md px-6 py-3 font-semibold text-white shrink-0"
              style={{ backgroundColor: ACCENT }}
            >
              Subscribe free
            </button>
          </form>
        </div>
      </section>

      {/* ---------- FOOTER BANNER AD ---------- */}
      <div className="bg-neutral-950 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <AdSlot size="leaderboard" slotId="footer-banner" tone="dark" />
        </div>
      </div>

      {/* ---------- FOOTER ---------- */}
      <footer className="bg-neutral-950 text-white border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 text-sm">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="rounded-md bg-white p-2.5">
                <img src={logoAsset.url} alt="South India Journal" className="h-14 w-auto" />
              </div>
            </div>

            <p className="mt-4 text-white/60 max-w-sm leading-relaxed">
              Truth beyond headlines. Premium editorial journalism from Telangana to the world, augmented with AI, powered by trusted global news sources.
            </p>
            <div className="mt-6">
              <div className="text-white/50 text-xs uppercase tracking-[0.2em]">Founder</div>
              <p className="mt-2 text-white/80">Dr. Mattepally Rajanikanth</p>
              <p className="text-white/50 text-xs">Founder & Editor-in-Chief</p>
            </div>
          </div>
          <FooterCol title="News">
            {SECTION_ORDER.slice(0, 8).map((s) => (
              <li key={s}><Link to="/section/$slug" params={{ slug: s }} className="text-white/60 hover:text-white">{SECTION_LABELS[s]}</Link></li>
            ))}
          </FooterCol>
          <FooterCol title="More">
            {SECTION_ORDER.slice(8).map((s) => (
              <li key={s}><Link to="/section/$slug" params={{ slug: s }} className="text-white/60 hover:text-white">{SECTION_LABELS[s]}</Link></li>
            ))}
          </FooterCol>
          <FooterCol title="Company">
            <li><Link to="/search" search={{ q: "" }} className="text-white/60 hover:text-white">Search</Link></li>
            <li><a href="#newsletter" className="text-white/60 hover:text-white">Newsletter</a></li>
            <li><Link to="/auth" className="text-white/60 hover:text-white">Sign in</Link></li>
            <li><a href="/sitemap.xml" className="text-white/60 hover:text-white">Sitemap</a></li>
          </FooterCol>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
            <p>© {new Date().getFullYear()} South India Journal. All rights reserved.</p>
            <p>Aggregated from trusted global sources · Enriched with AI · Made in India.</p>
          </div>
        </div>
      </footer>

      <StickyMobileAd />
    </div>
  );
}

// ---------------- COMPONENTS ----------------

function EmptyState() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold text-neutral-900" style={{ fontFamily: "Fraunces, serif" }}>
        South India Journal is loading its first stories
      </h1>
      <p className="mt-4 text-neutral-600">
        Automatic news ingestion runs every 15 minutes. Fresh stories will appear here shortly — or an editor can trigger a manual refresh from the admin dashboard.
      </p>
      <Link to="/auth" className="mt-6 inline-block rounded-md px-5 py-2.5 font-medium text-white" style={{ backgroundColor: ACCENT }}>
        Sign in as editor
      </Link>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[2px] w-8" style={{ backgroundColor: ACCENT }} />
      <span className="text-[11px] uppercase tracking-[0.25em] font-bold" style={{ color: ACCENT }}>{children}</span>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle, viewAll }: { eyebrow: string; title: string; subtitle?: string; viewAll?: SectionSlug }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
      <div className="min-w-0">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "Fraunces, serif" }}>{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {viewAll && (
        <Link to="/section/$slug" params={{ slug: viewAll }} className="text-sm font-semibold text-neutral-700 hover:text-neutral-950 shrink-0">
          See all →
        </Link>
      )}
    </div>
  );
}

function SectionBlock({
  eyebrow, title, subtitle, viewAll, accent, children,
}: {
  eyebrow: string; title: string; subtitle?: string; viewAll?: SectionSlug;
  accent?: boolean; children: React.ReactNode;
}) {
  return (
    <section className={`mt-14 ${accent ? "relative" : ""}`}>
      {accent && (
        <div aria-hidden className="absolute -left-4 md:-left-6 top-0 bottom-0 w-1" style={{ backgroundColor: ACCENT }} />
      )}
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} viewAll={viewAll} />
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Featured({ article }: { article: A }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group block">
      {article.image_url && (
        <div className="relative overflow-hidden rounded-md aspect-[16/10] bg-neutral-100">
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            loading="eager"
            referrerPolicy="no-referrer"
          />
          {article.is_breaking && (
            <span
              className="absolute top-4 left-4 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md"
              style={{ backgroundColor: ACCENT }}
            >
              Breaking
            </span>
          )}
        </div>
      )}
      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-[0.25em] font-bold" style={{ color: ACCENT }}>
          {article.category}
        </div>
        <h1
          className="mt-3 text-3xl md:text-5xl font-semibold leading-[1.05] tracking-tight text-neutral-900 group-hover:text-neutral-700"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {article.title}
        </h1>
        {article.description && (
          <p className="mt-4 text-lg text-neutral-600 leading-relaxed line-clamp-3 max-w-3xl">
            {article.description}
          </p>
        )}
        <div className="mt-4 text-xs text-neutral-500 flex flex-wrap items-center gap-x-3 gap-y-1">
          {prettySourceName(article.source_name) && <span className="font-medium text-neutral-700">{prettySourceName(article.source_name)}</span>}
          {article.published_at && <span>· {timeAgo(article.published_at)}</span>}
          <span>· {article.reading_time_minutes ?? 3} min read</span>
        </div>

      </div>
    </Link>
  );
}

function TopStoryItem({ article }: { article: A }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group grid grid-cols-[1fr_auto] gap-3 items-start">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: ACCENT }}>{article.category}</div>
        <h3 className="mt-1.5 font-semibold text-neutral-900 group-hover:text-neutral-700 leading-snug line-clamp-3"
            style={{ fontFamily: "Fraunces, serif" }}>
          {article.title}
        </h3>
        {article.published_at && <div className="mt-1.5 text-[11px] text-neutral-500">{timeAgo(article.published_at)}</div>}
      </div>
      {article.image_url && (
        <img src={article.image_url} alt="" className="w-20 h-20 object-cover rounded shrink-0" loading="lazy" />
      )}
    </Link>
  );
}

function EditorialCard({ article, size }: { article: A; size: "sm" | "md" | "lg" }) {
  const titleClass =
    size === "lg" ? "text-2xl md:text-3xl" :
    size === "md" ? "text-xl" :
    "text-lg";
  const aspect = size === "lg" ? "aspect-[16/10]" : "aspect-[16/9]";
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group block">
      {article.image_url && (
        <div className={`relative overflow-hidden rounded-md ${aspect} bg-neutral-100`}>
          <img src={article.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
        </div>
      )}
      <div className={size === "lg" ? "mt-4" : "mt-3"}>
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: ACCENT }}>
          {prettySourceName(article.source_name) ?? article.category}

        </div>
        <h3 className={`mt-2 ${titleClass} font-semibold tracking-tight text-neutral-900 group-hover:text-neutral-700 leading-snug line-clamp-3`}
            style={{ fontFamily: "Fraunces, serif" }}>
          {article.title}
        </h3>
        {size !== "sm" && article.description && (
          <p className="mt-2 text-sm text-neutral-600 line-clamp-2">{article.description}</p>
        )}
        <div className="mt-2.5 text-[11px] text-neutral-500 flex items-center gap-2">
          {article.published_at && <span>{timeAgo(article.published_at)}</span>}
          <span>·</span>
          <span>{article.reading_time_minutes ?? 3} min</span>
        </div>
      </div>
    </Link>
  );
}

function RankedItem({ rank, article }: { rank: number; article: A }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group grid grid-cols-[auto_1fr] gap-4 items-start">
      <span
        className="text-4xl font-semibold leading-none tabular-nums select-none"
        style={{ fontFamily: "Fraunces, serif", color: ACCENT }}
      >
        {String(rank).padStart(2, "0")}
      </span>
      <div className="min-w-0 border-b border-neutral-200 pb-5">
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-neutral-500">{article.category}</div>
        <h4 className="mt-1.5 font-semibold text-neutral-900 group-hover:text-neutral-700 leading-snug line-clamp-2"
            style={{ fontFamily: "Fraunces, serif" }}>
          {article.title}
        </h4>
      </div>
    </Link>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider">{title}</div>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

// ---------------- CATEGORY STRIPS ----------------
// Lazy secondary sections rendered client-side per category.


function SijOriginals() {
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const q = useQuery({
    queryKey: ["nv-originals", page],
    queryFn: () => getOriginals({ data: { page, pageSize } }),
    staleTime: 60_000,
  });
  const rows = (q.data?.rows ?? []) as A[];
  if (!q.isLoading && rows.length === 0 && page === 0) return null;

  const [lead, ...rest] = rows;
  const shareUrl = (slug: string) =>
    encodeURIComponent(`https://southindiajournal.com/article/${slug}`);

  return (
    <section className="mt-14 relative">
      <div aria-hidden className="absolute -left-4 md:-left-6 top-0 bottom-0 w-1" style={{ backgroundColor: ACCENT }} />
      <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-8" style={{ backgroundColor: ACCENT }} />
            <span className="text-[11px] uppercase tracking-[0.25em] font-bold" style={{ color: ACCENT }}>South India Journal Originals</span>
            <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white" style={{ backgroundColor: ACCENT }}>Exclusive</span>
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "Fraunces, serif" }}>
            South India Journal Originals
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Exclusive reporting from the South India Journal Editorial Team.</p>
        </div>
      </div>

      {q.isLoading ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <SkeletonCard />
          <div className="grid gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            {lead && <OriginalLead article={lead} shareUrl={shareUrl(lead.slug)} />}
            <div className="grid gap-6 content-start">
              {rest.slice(0, 3).map((a) => (
                <OriginalCard key={a.id} article={a} />
              ))}
            </div>
          </div>
          {rest.length > 3 && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.slice(3).map((a) => (
                <OriginalCard key={a.id} article={a} compact />
              ))}
            </div>
          )}
          <div className="mt-8 flex items-center justify-between text-sm">
            <div className="text-neutral-500">
              Page {page + 1}{q.data?.count ? ` · ${q.data.count} originals` : ""}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!q.data?.hasMore}
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function OriginalBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
      style={{ backgroundColor: ACCENT }}
    >
      <span className="h-1 w-1 rounded-full bg-white" />
      Original
    </span>
  );
}

function OriginalLead({ article, shareUrl }: { article: A; shareUrl: string }) {
  return (
    <article className="group">
      <Link to="/article/$slug" params={{ slug: article.slug }} className="block">
        {article.image_url && (
          <div className="relative overflow-hidden rounded-md aspect-[16/10] bg-neutral-100">
            <img src={article.image_url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
            <span className="absolute top-4 left-4"><OriginalBadge /></span>
          </div>
        )}
      </Link>
      <div className="mt-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold" style={{ color: ACCENT }}>
          <span>{article.category}</span>
        </div>
        <Link to="/article/$slug" params={{ slug: article.slug }}>
          <h3 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 group-hover:text-neutral-700 leading-snug" style={{ fontFamily: "Fraunces, serif" }}>
            {article.title}
          </h3>
        </Link>
        {article.description && (
          <p className="mt-3 text-neutral-600 line-clamp-3">{article.description}</p>
        )}
        <div className="mt-3 text-xs text-neutral-500 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-neutral-800">{article.author ?? "South India Journal Editorial Team"}</span>
          {article.published_at && <span>· {new Date(article.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
          <span>· {article.reading_time_minutes ?? 4} min read</span>
        </div>
        <ShareRow shareUrl={shareUrl} title={article.title} />
      </div>
    </article>
  );
}

function OriginalCard({ article, compact }: { article: A; compact?: boolean }) {
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="group grid gap-3">
      {article.image_url && (
        <div className={`relative overflow-hidden rounded-md ${compact ? "aspect-[16/10]" : "aspect-[16/9]"} bg-neutral-100`}>
          <img src={article.image_url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <span className="absolute top-3 left-3"><OriginalBadge /></span>
        </div>
      )}
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: ACCENT }}>{article.category}</div>
        <h4 className="mt-1.5 text-lg font-semibold tracking-tight text-neutral-900 group-hover:text-neutral-700 leading-snug line-clamp-3" style={{ fontFamily: "Fraunces, serif" }}>
          {article.title}
        </h4>
        <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-2">
          <span className="font-medium text-neutral-700">{article.author ?? "South India Journal Editorial Team"}</span>
          {article.published_at && <span>· {timeAgo(article.published_at)}</span>}
        </div>
      </div>
    </Link>
  );
}

function ShareRow({ shareUrl, title }: { shareUrl: string; title: string }) {
  const encTitle = encodeURIComponent(title);
  return (
    <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
      <span className="uppercase tracking-widest text-[10px]">Share</span>
      <a target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${encTitle}`} className="rounded-full border border-neutral-300 px-2.5 py-1 hover:bg-neutral-100">Twitter</a>
      <a target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} className="rounded-full border border-neutral-300 px-2.5 py-1 hover:bg-neutral-100">Facebook</a>
      <a target="_blank" rel="noopener noreferrer" href={`https://api.whatsapp.com/send?text=${encTitle}%20${shareUrl}`} className="rounded-full border border-neutral-300 px-2.5 py-1 hover:bg-neutral-100">WhatsApp</a>
      <a target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} className="rounded-full border border-neutral-300 px-2.5 py-1 hover:bg-neutral-100">LinkedIn</a>
    </div>
  );
}


function CategoryStrips({ exclude }: { exclude: Set<string> }) {
  const cats = SECTION_ORDER.filter((s) => !exclude.has(s)).slice(0, 6);
  return (
    <div className="mt-14 space-y-14">
      {cats.map((c, idx) => (
        <div key={c}>
          <CategoryStrip section={c} />
          {idx === 2 && (
            <div className="mt-10">
              <AdSlot size="billboard" slotId={`mid-strip-${idx}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CategoryStrip({ section }: { section: SectionSlug }) {
  const q = useQuery({
    queryKey: ["home-strip", section],
    queryFn: () => getSectionFeed({ data: { section, page: 0, pageSize: 4 } }),
    staleTime: 5 * 60_000,
  });
  const rows = q.data?.rows ?? [];
  if (q.isLoading) {
    return (
      <div>
        <div className="border-b border-neutral-200 pb-4">
          <SectionEyebrow>{SECTION_LABELS[section]}</SectionEyebrow>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight" style={{ fontFamily: "Fraunces, serif" }}>{SECTION_LABELS[section]}</h2>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionHeader eyebrow={section === "telangana" ? "Flagship" : "Section"} title={SECTION_LABELS[section]} viewAll={section} />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {rows.slice(0, 4).map((a) => <EditorialCard key={a.id} article={a as A} size="sm" />)}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[16/9] bg-neutral-100 rounded-md" />
      <div className="mt-3 h-3 bg-neutral-100 rounded w-1/3" />
      <div className="mt-2 h-4 bg-neutral-100 rounded w-full" />
      <div className="mt-2 h-4 bg-neutral-100 rounded w-4/5" />
    </div>
  );
}

// ---------------- UTIL ----------------

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
