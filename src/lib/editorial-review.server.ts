// Server-only: editorial review pipeline for the AI Editorial Desk.
// Routes through the Lovable AI Gateway (OpenAI-compatible) using
// LOVABLE_API_KEY. This avoids the permission issues of calling the
// Google Generative Language API directly with a bring-your-own key.
// Never import from client / route files directly — imported by
// editorial.functions.ts handlers only.

import type { ArticleDraftInput, EditorialReviewResult } from "@/types/editorial";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const EDITORIAL_PROFILE = `
You are the South India Journal AI Editor: a professional Editor-in-Chief
with 30+ years of newsroom experience across journalism ethics, editorial
writing, copy editing, SEO, digital publishing, headline writing,
investigative reporting, breaking news, and feature writing.

House style:
- Tone: clear, credible, editorially neutral. Never sensationalize.
- Sentences: short to medium, active voice, no filler adjectives.
- Headlines: specific and factual first, evocative second. Avoid clickbait.
- Structure: strong lede (who/what/when/where), inverted pyramid.
- Attribution: every claim traceable to a named source or dateline.
- Never invent facts, quotes, names, dates, or statistics.
- Regional focus: South India (AP, Telangana, Karnataka, Tamil Nadu, Kerala).

Non-negotiable operating rules:
- You may only ever recommend publishing to "hero" (Hero Section) or
  "originals" (South India Journal Originals). Never any other section.
- Never fabricate content to fill gaps.
- Flag risk; never resolve it silently.
`.trim();

const JSON_SHAPE = `
Return ONLY a single JSON object (no markdown fences, no prose) with EXACTLY these keys:
{
  "headline": string,
  "subheadline": string,
  "summary": string,
  "content": string,
  "editedContentDiffNotes": string[],
  "headlineSuggestions": [{ "text": string, "style": "breaking"|"professional"|"seo"|"editorial"|"investigative"|"exclusive" }],
  "scores": { "grammar": number, "readability": number, "seo": number, "trust": number, "headline": number, "structure": number, "publishingReadiness": number, "overall": number },
  "factCheckFlags": [{ "type": "unsupported_claim"|"unsupported_number"|"missing_date"|"missing_location"|"missing_source"|"missing_name", "excerpt": string, "note": string }],
  "legalFlags": [{ "type": "defamation"|"hate_speech"|"offensive_language"|"political_bias"|"sensitive_claim"|"copyright", "excerpt": string, "note": string, "severity": "low"|"medium"|"high" }],
  "heroRecommendation": { "recommended": boolean, "reason": string },
  "suggestedDestination": "hero"|"originals",
  "seo": { "seoTitle": string, "metaTitle": string, "metaDescription": string, "slug": string, "keywords": string[], "tags": string[], "canonicalUrl": string, "openGraphTitle": string, "openGraphDescription": string, "twitterCardTitle": string, "twitterCardDescription": string },
  "socialPosts": { "facebook": string, "instagram": string, "linkedin": string, "x": string, "whatsapp": string, "telegram": string },
  "estimatedReadingTimeMinutes": number
}
All keys are REQUIRED. Arrays may be empty but must be present. Scores are 0-100 integers.
`.trim();

function buildPrompt(input: ArticleDraftInput): string {
  const sourceNote =
    input.sourceType === "voice"
      ? "The following was transcribed from voice input."
      : input.sourceType === "docx"
        ? "The following was extracted from a Word document."
        : input.sourceType === "pdf"
          ? "The following was extracted from a PDF."
          : "The following was pasted directly by the editor.";

  return `${EDITORIAL_PROFILE}

TASK
Perform a full editorial pass on the draft below and return ONLY JSON matching the shape described. No commentary, no markdown fences.

1. Rewrite "content" as publication-ready — grammar, readability, flow, structure. Preserve every fact/quote/name/date/number.
2. List changes in "editedContentDiffNotes".
3. Generate exactly 10 headlines across six styles (breaking, professional, seo, editorial, investigative, exclusive).
4. Score every dimension 0-100; "overall" weighted toward publishingReadiness and trust.
5. "factCheckFlags": only what's missing/unsupported. Empty array if none.
6. "legalFlags": defamation/hate/offensive/bias/sensitive/copyright, with severity. Empty array if none.
7. "heroRecommendation.recommended" = true only for high public interest / breaking / strong visual / trending.
8. "suggestedDestination": exactly "hero" or "originals".
9. Fill "seo" and "socialPosts" completely in SIJ voice.
10. "estimatedReadingTimeMinutes" at ~200 wpm.

${JSON_SHAPE}

${sourceNote}

DRAFT:
"""
${input.rawText}
"""`.trim();
}

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export async function runEditorialReviewGemini(
  draft: ArticleDraftInput,
): Promise<EditorialReviewResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    throw new Error(
      "AI service is not configured (missing LOVABLE_API_KEY on the server).",
    );
  }

  const parts: ChatContentPart[] = [{ type: "text", text: buildPrompt(draft) }];
  for (const dataUrl of draft.imageDataUrls ?? []) {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) continue;
    parts.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You output only a single valid JSON object matching the requested schema. No markdown, no prose, no code fences.",
          },
          { role: "user", content: parts },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });
  } catch (err) {
    throw new Error(
      `AI gateway request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("AI service is rate-limited. Please retry in a moment.");
    }
    if (res.status === 402) {
      throw new Error(
        "AI credits exhausted for this workspace. Add credits in Settings → Plans & credits.",
      );
    }
    throw new Error(
      `AI gateway error (${res.status}): ${body.slice(0, 400) || res.statusText}`,
    );
  }

  const payload = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI service returned an empty response.");

  // Be tolerant of accidental code fences.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as EditorialReviewResult;
  } catch {
    throw new Error("AI service returned invalid JSON.");
  }
}
