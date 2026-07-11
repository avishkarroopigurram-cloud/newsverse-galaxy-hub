import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getArticleBySlug } from "@/lib/news.functions";

const articleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: () => getArticleBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(articleQuery(params.slug));
    if (!data.article) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: "Article not found — NewsVerse" }] };
    const desc = a.ai_meta_description ?? a.description ?? "Read on NewsVerse.";
    const title = `${a.title} — NewsVerse`;
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: a.title },
        { property: "og:description", content: desc.slice(0, 160) },
        { property: "og:type", content: "article" },
        ...(a.image_url ? [{ property: "og:image", content: a.image_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        ...(a.image_url ? [{ name: "twitter:image", content: a.image_url }] : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: a.title,
            description: desc,
            image: a.image_url ? [a.image_url] : undefined,
            datePublished: a.published_at,
            author: a.author ? [{ "@type": "Person", name: a.author }] : undefined,
            publisher: { "@type": "Organization", name: "NewsVerse" },
          }),
        },
      ],
    };
  },
  component: ArticlePage,
  errorComponent: ({ error }) => <div className="min-h-screen bg-black text-white p-8">Error: {error.message}</div>,
  notFoundComponent: () => (
    <div className="min-h-screen bg-black text-white flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl">Article not found</h1>
      <Link to="/" className="underline">Go home</Link>
    </div>
  ),
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(articleQuery(slug));
  const a = data.article!;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const encoded = encodeURIComponent(shareUrl);
  const encTitle = encodeURIComponent(a.title);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-bold tracking-tight">NEWS<span className="text-red-500">VERSE</span></Link>
          <Link to="/search" className="text-sm text-white/70 hover:text-white">Search</Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/section/$slug" params={{ slug: a.category }} className="text-xs uppercase tracking-widest text-red-400">
          {a.category.replace(/^./, (c) => c.toUpperCase())}
        </Link>
        <h1 className="mt-3 text-3xl md:text-5xl font-serif font-semibold leading-tight" style={{ fontFamily: "Fraunces, serif" }}>{a.title}</h1>
        {a.description && <p className="mt-4 text-lg text-white/70">{a.description}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/60">
          {a.author && <span>By {a.author}</span>}
          {a.source_name && <span>· {a.source_name}</span>}
          {a.published_at && <span>· {new Date(a.published_at).toLocaleString()}</span>}
          <span>· {a.reading_time_minutes} min read</span>
        </div>

        {a.image_url && (
          <img src={a.image_url} alt={a.title} loading="lazy" decoding="async" className="mt-8 w-full rounded-xl border border-white/10" />
        )}

        {a.ai_summary && (
          <aside className="mt-8 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
            <div className="text-xs uppercase tracking-widest text-red-400 mb-2">AI Summary</div>
            <p className="text-white/85 leading-relaxed">{a.ai_summary}</p>
          </aside>
        )}

        {a.ai_takeaways && a.ai_takeaways.length > 0 && (
          <aside className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-widest text-white/70 mb-2">Key takeaways</div>
            <ul className="space-y-2">
              {a.ai_takeaways.map((t, i) => (
                <li key={i} className="flex gap-3 text-white/85"><span className="text-red-400">•</span>{t}</li>
              ))}
            </ul>
          </aside>
        )}

        {a.content && (
          <div className="prose prose-invert mt-8 max-w-none text-white/85 leading-relaxed whitespace-pre-wrap">{a.content}</div>
        )}

        {a.url && (
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-red-400 underline">
            Read original story at {a.source_name} →
          </a>
        )}

        {a.keywords && a.keywords.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {a.keywords.slice(0, 10).map((k) => (
              <span key={k} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">#{k}</span>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
          <span className="text-sm text-white/60">Share:</span>
          <a target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?url=${encoded}&text=${encTitle}`} className="text-sm underline">Twitter</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} className="text-sm underline">Facebook</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://api.whatsapp.com/send?text=${encTitle}%20${encoded}`} className="text-sm underline">WhatsApp</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} className="text-sm underline">LinkedIn</a>
          <button onClick={() => { void navigator.clipboard.writeText(shareUrl); }} className="text-sm underline">Copy link</button>
        </div>

        {data.related.length > 0 && (
          <section className="mt-14 border-t border-white/10 pt-8">
            <h2 className="text-xl font-semibold mb-6">Related stories</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {data.related.map((r) => (
                <Link key={r.id} to="/article/$slug" params={{ slug: r.slug }} className="group flex gap-4">
                  {r.image_url && <img src={r.image_url} alt="" className="w-24 h-24 object-cover rounded-lg border border-white/10" loading="lazy" />}
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest text-red-400">{r.category}</div>
                    <h3 className="mt-1 font-medium group-hover:text-red-300">{r.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
