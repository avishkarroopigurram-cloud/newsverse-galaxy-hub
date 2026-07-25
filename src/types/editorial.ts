/**
 * The single structured contract between Gemini and the UI.
 * Every editorial prompt template must return JSON matching this shape
 * (enforced server-side via Gemini's responseSchema, see
 * server/ai/gemini.server.ts). The UI never parses free-form text.
 */

export type PublishDestination = "hero" | "originals";

export interface QualityScores {
  grammar: number; // 0-100
  readability: number;
  seo: number;
  trust: number;
  headline: number;
  structure: number;
  publishingReadiness: number;
  overall: number;
}

export interface FactCheckFlag {
  type:
    | "unsupported_claim"
    | "unsupported_number"
    | "missing_date"
    | "missing_location"
    | "missing_source"
    | "missing_name";
  excerpt: string;
  note: string;
}

export interface LegalFlag {
  type:
    | "defamation"
    | "hate_speech"
    | "offensive_language"
    | "political_bias"
    | "sensitive_claim"
    | "copyright";
  excerpt: string;
  note: string;
  severity: "low" | "medium" | "high";
}

export interface HeadlineSuggestion {
  text: string;
  style:
    | "breaking"
    | "professional"
    | "seo"
    | "editorial"
    | "investigative"
    | "exclusive";
}

export interface HeroRecommendation {
  recommended: boolean;
  reason: string;
}

export interface SeoPackage {
  seoTitle: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
  tags: string[];
  canonicalUrl: string;
  openGraphTitle: string;
  openGraphDescription: string;
  twitterCardTitle: string;
  twitterCardDescription: string;
}

export interface SocialPosts {
  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  whatsapp: string;
  telegram: string;
}

/** Full response contract returned by the editorial review prompt. */
export interface EditorialReviewResult {
  headline: string;
  subheadline: string;
  summary: string;
  content: string;
  editedContentDiffNotes: string[];
  headlineSuggestions: HeadlineSuggestion[];
  scores: QualityScores;
  factCheckFlags: FactCheckFlag[];
  legalFlags: LegalFlag[];
  heroRecommendation: HeroRecommendation;
  suggestedDestination: PublishDestination;
  seo: SeoPackage;
  socialPosts: SocialPosts;
  estimatedReadingTimeMinutes: number;
}

export interface ArticleDraftInput {
  rawText: string;
  sourceType: "paste" | "docx" | "pdf" | "voice" | "clipboard";
  imageDataUrls?: string[];
}

export interface PublishRequest {
  destination: PublishDestination;
  headline: string;
  subheadline: string;
  content: string;
  seo: SeoPackage;
  heroImageDataUrl?: string;
  scheduledFor?: string; // ISO timestamp, optional
}

export interface PublishResult {
  id: string;
  destination: PublishDestination;
  publishedAt: string;
  slug: string;
}
