// Editorial priority ranking for NewsVerse.
// Lower rank number = higher editorial importance.
// Entertainment & cinema is always lowest priority and never leads
// unless an editor manually flags an article as is_featured.

export const EDITORIAL_PRIORITY: Record<string, number> = {
  breaking: 1,
  government: 2,
  "public-policy": 2,
  policy: 2,
  telangana: 3,
  "telangana-government": 3,
  hyderabad: 4,
  india: 5,
  world: 6,
  politics: 7,
  crime: 8,
  "crime-law": 8,
  law: 8,
  courts: 9,
  judiciary: 9,
  "courts-judiciary": 9,
  business: 10,
  economy: 11,
  markets: 11,
  "economy-markets": 11,
  technology: 12,
  tech: 12,
  ai: 12,
  science: 13,
  space: 13,
  "science-space": 13,
  health: 14,
  education: 15,
  weather: 16,
  sports: 17,
  agriculture: 18,
  environment: 19,
  entertainment: 20,
  cinema: 20,
  "entertainment-cinema": 20,
  movies: 20,
};

export function priorityRank(category: string | null | undefined, isBreaking = false): number {
  if (isBreaking) return 0;
  if (!category) return 99;
  const key = category.toLowerCase().trim();
  return EDITORIAL_PRIORITY[key] ?? 50;
}

type Rankable = {
  id: string;
  category: string;
  is_breaking: boolean;
  is_featured?: boolean;
  published_at: string | null;
};

/**
 * Sort articles by editorial priority.
 * Order: manually featured → breaking → category priority → freshness.
 * Entertainment/cinema always sinks to the bottom unless is_featured.
 */
export function sortByEditorialPriority<T extends Rankable>(articles: T[]): T[] {
  return [...articles].sort((a, b) => {
    if (!!b.is_featured !== !!a.is_featured) return b.is_featured ? 1 : -1;
    const ra = priorityRank(a.category, a.is_breaking);
    const rb = priorityRank(b.category, b.is_breaking);
    if (ra !== rb) return ra - rb;
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
}

/**
 * Pick the homepage lead story.
 * Manually featured wins. Otherwise the highest-priority recent article wins.
 * Entertainment can only lead if is_featured.
 */
export function pickEditorialLead<T extends Rankable>(articles: T[]): T | null {
  const featured = articles.find((a) => a.is_featured);
  if (featured) return featured;
  const ranked = sortByEditorialPriority(articles.filter((a) => priorityRank(a.category, a.is_breaking) < 20));
  return ranked[0] ?? sortByEditorialPriority(articles)[0] ?? null;
}
