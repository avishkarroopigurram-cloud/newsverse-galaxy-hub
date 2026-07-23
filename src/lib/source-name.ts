// Convert raw source identifiers (domains, slugs) into clean publication brand names.
// Never display raw URLs/domains to users.

const BRAND_MAP: Record<string, string> = {
  "thehindu.com": "The Hindu",
  "indianexpress.com": "The Indian Express",
  "hindustantimes.com": "Hindustan Times",
  "timesofindia.indiatimes.com": "Times of India",
  "toi": "Times of India",
  "ndtv.com": "NDTV",
  "edition.cnn.com": "CNN",
  "cnn.com": "CNN",
  "bbc.com": "BBC News",
  "bbc.co.uk": "BBC News",
  "reuters.com": "Reuters",
  "apnews.com": "Associated Press",
  "bloomberg.com": "Bloomberg",
  "wsj.com": "The Wall Street Journal",
  "nytimes.com": "The New York Times",
  "theguardian.com": "The Guardian",
  "cnbc.com": "CNBC",
  "aljazeera.com": "Al Jazeera",
  "moneycontrol.com": "Moneycontrol",
  "livemint.com": "Mint",
  "thewire.in": "The Wire",
  "scroll.in": "Scroll",
  "deccanchronicle.com": "Deccan Chronicle",
  "telanganatoday.com": "Telangana Today",
  "news18.com": "News18",
  "firstpost.com": "Firstpost",
  "theprint.in": "The Print",
  "business-standard.com": "Business Standard",
  "economictimes.indiatimes.com": "The Economic Times",
  "financialexpress.com": "Financial Express",
};

function stripDomain(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function looksLikeDomain(s: string): boolean {
  return /\.[a-z]{2,}(\.[a-z]{2,})?$/i.test(s.trim()) || /^www\./i.test(s.trim());
}

/**
 * Returns a clean, human-friendly publication brand name, or null if unknown.
 * Never returns a raw domain — if we can't map it to a brand, we hide the source.
 */
export function prettySourceName(_raw: string | null | undefined): string | null {
  // Editorial policy: never display external publication/source names on the public site.
  return null;
}

/**
 * Source label for cards: shows "SOUTH INDIA JOURNAL ORIGINALS" for originals,
 * otherwise null (hide). External source names are never shown.
 */
export function sourceLabel(opts: {
  source_name?: string | null;
  is_original?: boolean | null;
}): string | null {
  if (opts.is_original) return "SOUTH INDIA JOURNAL ORIGINALS";
  return null;
}
