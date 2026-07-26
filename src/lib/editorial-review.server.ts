// Server-only: editorial review pipeline for the AI Editorial Desk.
// Calls OpenRouter (google/gemini-2.5-flash) via the OpenAI-compatible chat completions API.
// API key read from OPENROUTER_API_KEY environment variable.
// Never import from client / route files directly — imported by
// editorial.functions.ts handlers only.

import type { ArticleDraftInput, EditorialReviewResult } from "@/types/editorial";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
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

type TextContentPart = { type: "text"; text: string };
type ImageContentPart = { type: "image_url"; image_url: { url: string } };
type ContentPart = TextContentPart | ImageContentPart;

/**
 * Safe diagnostic logging — logs only safe metadata, never exposes secrets.
 */
function logSafeDiagnostic(stage: string, message: string, data?: Record<string, unknown>) {
  const safeLog = {
    timestamp: new Date().toISOString(),
    stage,
    message,
    ...data,
  };
  console.log(`[OPENROUTER_DIAGNOSTIC] ${JSON.stringify(safeLog)}`);
}

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

export async function runEditorialReviewGemini(
  draft: ArticleDraftInput,
): Promise<EditorialReviewResult> {
  logSafeDiagnostic("EDITORIAL_REVIEW", "Starting editorial review via OpenRouter");

  // Load API key from environment
  const apiKey = process.env.OPENROUTER_API_KEY;

  logSafeDiagnostic("LOAD_SECRET", "Loading OPENROUTER_API_KEY from environment", {
    present: !!apiKey && apiKey.length > 0,
    length: apiKey?.length ?? 0,
  });

  if (!apiKey) {
    throw new Error(
      "OpenRouter is not configured. Set the OPENROUTER_API_KEY environment variable " +
      "to your OpenRouter API key (obtain one at https://openrouter.ai/keys)."
    );
  }

  // Build message content: text prompt + optional images
  const userContent: ContentPart[] = [
    { type: "text", text: buildPrompt(draft) },
  ];

  for (const dataUrl of draft.imageDataUrls ?? []) {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) continue;
    // OpenAI-compatible vision format — OpenRouter supports data URLs directly
    userContent.push({
      type: "image_url",
      image_url: { url: dataUrl },
    });
  }

  logSafeDiagnostic("OPENROUTER_CALL", "Calling OpenRouter API", {
    model: MODEL,
    partCount: userContent.length,
  });

  // Call OpenRouter
  let response: Response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://southindiajournal.com",
        "X-Title": "South India Journal Editorial Desk",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You output only a single valid JSON object matching the requested schema. No markdown, no prose, no code fences.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });
  } catch (fetchErr) {
    logSafeDiagnostic("OPENROUTER_CALL", "Network error", {
      error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
    });
    throw new Error(
      `Network error calling OpenRouter: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
    );
  }

  logSafeDiagnostic("OPENROUTER_CALL", "Response received", {
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");

    logSafeDiagnostic("OPENROUTER_CALL", "API error", {
      status: response.status,
      errorLength: errorBody.length,
    });

    if (response.status === 401) {
      throw new Error(
        "OpenRouter authentication failed (401). " +
        "Verify OPENROUTER_API_KEY is set correctly and is a valid key from https://openrouter.ai/keys."
      );
    }

    if (response.status === 402) {
      throw new Error(
        "OpenRouter payment required (402). " +
        "Your OpenRouter account may have insufficient credits. Check https://openrouter.ai/credits."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "OpenRouter rate limit exceeded (429). Please retry in a moment."
      );
    }

    if (response.status === 503 || response.status === 502) {
      throw new Error(
        `OpenRouter / model temporarily unavailable (${response.status}). Please retry shortly.`
      );
    }

    throw new Error(
      `OpenRouter API error (${response.status}): ${errorBody.slice(0, 300) || response.statusText}`
    );
  }

  // Parse OpenAI-compatible response envelope
  const responseData = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (responseData?.error?.message) {
    throw new Error(`OpenRouter returned an error: ${responseData.error.message}`);
  }

  const generatedText = responseData?.choices?.[0]?.message?.content;

  logSafeDiagnostic("OPENROUTER_RESPONSE", "Response parsed", {
    hasText: !!generatedText,
    textLength: generatedText?.length ?? 0,
  });

  if (!generatedText) {
    throw new Error(
      "OpenRouter returned an empty response. The model may not have generated any content."
    );
  }

  // Strip code fences if the model wrapped the JSON anyway
  const cleanedJson = generatedText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Parse and return the editorial result
  try {
    logSafeDiagnostic("PARSE_RESULT", "Parsing editorial review result");

    const result = JSON.parse(cleanedJson) as EditorialReviewResult;

    logSafeDiagnostic("PARSE_RESULT", "Editorial review completed successfully", {
      hasHeadline: !!result.headline,
      hasScores: !!result.scores,
      scoreCount: result.scores ? Object.keys(result.scores).length : 0,
    });

    return result;
  } catch (parseErr) {
    logSafeDiagnostic("PARSE_RESULT", "Result JSON parse failed", {
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      jsonStart: cleanedJson.slice(0, 100),
    });

    throw new Error(
      `OpenRouter returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. ` +
      "The model may have violated the response schema. Response was: " +
      cleanedJson.slice(0, 200)
    );
  }
}
