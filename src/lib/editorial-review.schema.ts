/**
 * Gemini `responseSchema` for the editorial review call. Passing this with
 * responseMimeType: "application/json" makes Gemini return well-formed JSON
 * matching src/types/editorial.ts#EditorialReviewResult directly, instead of
 * the frontend having to parse free-form text.
 */
export const EDITORIAL_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    subheadline: { type: "string" },
    summary: { type: "string" },
    content: { type: "string" },
    editedContentDiffNotes: {
      type: "array",
      items: { type: "string" },
    },
    headlineSuggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          style: {
            type: "string",
            enum: [
              "breaking",
              "professional",
              "seo",
              "editorial",
              "investigative",
              "exclusive",
            ],
          },
        },
        required: ["text", "style"],
      },
    },
    scores: {
      type: "object",
      properties: {
        grammar: { type: "number" },
        readability: { type: "number" },
        seo: { type: "number" },
        trust: { type: "number" },
        headline: { type: "number" },
        structure: { type: "number" },
        publishingReadiness: { type: "number" },
        overall: { type: "number" },
      },
      required: [
        "grammar",
        "readability",
        "seo",
        "trust",
        "headline",
        "structure",
        "publishingReadiness",
        "overall",
      ],
    },
    factCheckFlags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "unsupported_claim",
              "unsupported_number",
              "missing_date",
              "missing_location",
              "missing_source",
              "missing_name",
            ],
          },
          excerpt: { type: "string" },
          note: { type: "string" },
        },
        required: ["type", "excerpt", "note"],
      },
    },
    legalFlags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "defamation",
              "hate_speech",
              "offensive_language",
              "political_bias",
              "sensitive_claim",
              "copyright",
            ],
          },
          excerpt: { type: "string" },
          note: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["type", "excerpt", "note", "severity"],
      },
    },
    heroRecommendation: {
      type: "object",
      properties: {
        recommended: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["recommended", "reason"],
    },
    suggestedDestination: {
      type: "string",
      enum: ["hero", "originals"],
    },
    seo: {
      type: "object",
      properties: {
        seoTitle: { type: "string" },
        metaTitle: { type: "string" },
        metaDescription: { type: "string" },
        slug: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        canonicalUrl: { type: "string" },
        openGraphTitle: { type: "string" },
        openGraphDescription: { type: "string" },
        twitterCardTitle: { type: "string" },
        twitterCardDescription: { type: "string" },
      },
      required: [
        "seoTitle",
        "metaTitle",
        "metaDescription",
        "slug",
        "keywords",
        "tags",
        "canonicalUrl",
        "openGraphTitle",
        "openGraphDescription",
        "twitterCardTitle",
        "twitterCardDescription",
      ],
    },
    socialPosts: {
      type: "object",
      properties: {
        facebook: { type: "string" },
        instagram: { type: "string" },
        linkedin: { type: "string" },
        x: { type: "string" },
        whatsapp: { type: "string" },
        telegram: { type: "string" },
      },
      required: [
        "facebook",
        "instagram",
        "linkedin",
        "x",
        "whatsapp",
        "telegram",
      ],
    },
    estimatedReadingTimeMinutes: { type: "number" },
  },
  required: [
    "headline",
    "subheadline",
    "summary",
    "content",
    "editedContentDiffNotes",
    "headlineSuggestions",
    "scores",
    "factCheckFlags",
    "legalFlags",
    "heroRecommendation",
    "suggestedDestination",
    "seo",
    "socialPosts",
    "estimatedReadingTimeMinutes",
  ],
} as const;
