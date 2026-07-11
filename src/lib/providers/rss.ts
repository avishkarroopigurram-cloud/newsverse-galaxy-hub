// RSS fallback adapter — no API key required.
// Curated public feeds per section. Uses a minimal regex parser to stay
// Worker-compatible (no Node-only XML libraries).
import {
  slugify,
  estimateReadingTime,
  type NormalizedArticle,
  type SectionSlug,
} from "../newsdata.server";
import { credibilityFor, type ProviderArticle, type ProviderResult } from "./types";

const FEEDS: Record<SectionSlug, string[]> = {
  breaking: [
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://www.thehindu.com/news/national/feeder/default.rss",
  ],
  telangana: ["https://www.thehindu.com/news/national/telangana/feeder/default.rss"],
  hyderabad: ["https://www.thehindu.com/news/cities/Hyderabad/feeder/default.rss"],
  india: [
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://indianexpress.com/section/india/feed/",
  ],
  world: [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.thehindu.com/news/international/feeder/default.rss",
  ],
  politics: ["https://www.thehindu.com/news/national/feeder/default.rss"],
  business: [
    "https://www.thehindu.com/business/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/business/rss.xml",
  ],
  technology: [
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "https://www.thehindu.com/sci-tech/technology/feeder/default.rss",
  ],
  ai: ["https://feeds.bbci.co.uk/news/technology/rss.xml"],
  startups: ["https://www.thehindu.com/business/feeder/default.rss"],
  science: [
    "https://www.thehindu.com/sci-tech/science/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
  ],
  health: [
    "https://www.thehindu.com/sci-tech/health/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/health/rss.xml",
  ],
  sports: [
    "https://www.thehindu.com/sport/feeder/default.rss",
    "https://feeds.bbci.co.uk/sport/rss.xml",
  ],
  entertainment: [
    "https://www.thehindu.com/entertainment/feeder/default.rss",
    "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
  ],
  education: ["https://www.thehindu.com/education/feeder/default.rss"],
};

export async function fetchRSS(section: SectionSlug, size: number): Promise<ProviderResult> {
  const feeds = FEEDS[section];
  if (!feeds || feeds.length === 0) {
    return { ok: false, provider: "rss", rateLimited: false, error: "No RSS feeds for section" };
  }
  const all: ProviderArticle[] = [];
  const errors: string[] = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(feed, {
        headers: { "User-Agent": "NewsVerse/1.0 (+https://newsverse.today)" },
      });
      if (!res.ok) {
        errors.push(`${feed}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = parseRSS(xml).slice(0, Math.ceil(size / feeds.length) + 2);
      const host = hostFromUrl(feed);
      for (const it of items) {
        if (!it.title || !it.link) continue;
        const external_id = `rss:${hashUrl(it.link)}`;
        const base: NormalizedArticle = {
          external_id,
          slug: `${slugify(it.title) || "article"}-${external_id.slice(-8)}`,
          title: it.title,
          description: it.description,
          content: it.description,
          url: it.link,
          image_url: it.image,
          source_id: host,
          source_name: it.source ?? host,
          author: it.author,
          category: section,
          country: "in",
          language: "en",
          keywords: [],
          published_at: it.pubDate,
          reading_time_minutes: estimateReadingTime(it.description),
        };
        all.push({
          ...base,
          provider: "rss",
          credibility: credibilityFor(base.source_id, base.source_name),
          trending_score: 0,
        });
      }
    } catch (err) {
      errors.push(`${feed}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (all.length === 0) {
    return { ok: false, provider: "rss", rateLimited: false, error: errors.join(" | ") || "No items" };
  }
  return { ok: true, provider: "rss", articles: all.slice(0, size) };
}

type RSSItem = {
  title: string | null;
  link: string | null;
  description: string | null;
  pubDate: string | null;
  author: string | null;
  image: string | null;
  source: string | null;
};

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  // Handle both <item> (RSS) and <entry> (Atom)
  const blocks = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ];
  for (const m of blocks) {
    const block = m[0];
    const title = pick(block, "title");
    let link = pick(block, "link");
    if (!link) {
      const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      if (href) link = href[1];
    }
    const description = stripHtml(pick(block, "description") ?? pick(block, "summary") ?? pick(block, "content") ?? "");
    const pubDate = pick(block, "pubDate") ?? pick(block, "published") ?? pick(block, "updated");
    const author = stripHtml(pick(block, "author") ?? pick(block, "dc:creator") ?? "");
    let image: string | null = null;
    const mediaContent = block.match(/<media:content[^>]*url=["']([^"']+)["']/i);
    const mediaThumb = block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
    const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i);
    const imgTag = description.match(/<img[^>]*src=["']([^"']+)["']/i);
    image = mediaContent?.[1] ?? mediaThumb?.[1] ?? enclosure?.[1] ?? imgTag?.[1] ?? null;
    items.push({
      title: stripHtml(title ?? ""),
      link: link ? link.trim() : null,
      description: description ? description.slice(0, 800) : null,
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      author: author || null,
      image,
      source: null,
    });
  }
  return items;
}

function pick(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  return unwrapCdata(m[1]).trim();
}
function unwrapCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function hostFromUrl(u: string): string {
  try { return new URL(u).host; } catch { return u; }
}
function hashUrl(u: string): string {
  let h = 0;
  for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
