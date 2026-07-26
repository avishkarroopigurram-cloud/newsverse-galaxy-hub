// Server-only: editorial review pipeline for the AI Editorial Desk.
// Calls Groq (llama-3.3-70b-versatile) via the OpenAI-compatible chat completions API.
// API key read from GROQ_API_KEY environment variable.
// Never import from client / route files directly — imported by
// editorial.functions.ts handlers only.
//
// ─── Vision limitation ───────────────────────────────────────────────────────
// llama-3.3-70b-versatile is a text-only model and does not accept image input.
// If image analysis is required, switch MODEL_VISION to:
//   "llama-3.2-90b-vision-preview"   ← best Groq vision model
// and set USE_VISION_MODEL_FOR_IMAGES = true below.
// That model uses the same OpenAI-compatible image_url part format.
// The vision model is slower and has a smaller context window (8k vs 128k),
// so it is kept opt-in rather than as the default.
// ─────────────────────────────────────────────────────────────────────────────

import type { ArticleDraftInput, EditorialReviewResult } from "@/types/editorial";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Primary model — text only, 128k context, fastest, best quality on Groq. */
const MODEL_TEXT = "llama-3.3-70b-versatile";

/**
 * Vision-capable alternative. Swap MODEL_TEXT for this and set
 * USE_VISION_MODEL_FOR_IMAGES = true when image analysis is needed.
 *
 * @see https://console.groq.com/docs/vision
 */
const MODEL_VISION = "llama-3.2-90b-vision-preview"; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Set to true to route requests that include images through MODEL_VISION.
 * When false, images are stripped and the editor works on text only.
 */
const USE_VISION_MODEL_FOR_IMAGES = false;

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
  console.log(`[GROQ_DIAGNOSTIC] ${JSON.stringify(safeLog)}`);
}

function buildPrompt(input: ArticleDraftInput, imagesStripped: boolean): string {
  const sourceNote =
    input.sourceType === "voice"
      ? "The following was transcribed from voice input."
      : input.sourceType === "docx"
        ? "The following was extracted from a Word document."
        : input.sourceType === "pdf"
          ? "The following was extracted from a PDF."
          : "The following was pasted directly by the editor.";

  const imageNote = imagesStripped
    ? "\n[NOTE: This submission included attached images, but the active model is text-only. " +
      "Image content has not been analysed. Enable USE_VISION_MODEL_FOR_IMAGES in " +
      "editorial-review.server.ts to route image submissions through llama-3.2-90b-vision-preview.]"
    : "";

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
${imageNote}

${sourceNote}

DRAFT:
"""
${input.rawText}
"""`.trim();
}

export async function runEditorialReviewGemini(
  draft: ArticleDraftInput,
): Promise<EditorialReviewResult> {
  logSafeDiagnostic("EDITORIAL_REVIEW", "Starting editorial review via Groq");

  // Load API key from environment
  const apiKey = process.env.GROQ_API_KEY;

  logSafeDiagnostic("LOAD_SECRET", "Loading GROQ_API_KEY from environment", {
    present: !!apiKey && apiKey.length > 0,
    length: apiKey?.length ?? 0,
  });

  if (!apiKey) {
    throw new Error(
      "Groq is not configured. Set the GROQ_API_KEY environment variable " +
      "to your Groq API key (obtain one at https://console.groq.com/keys)."
    );
  }

  // Determine which model to use and whether images can be passed through
  const hasImages = (draft.imageDataUrls ?? []).some(
    (u) => typeof u === "string" && u.startsWith("data:")
  );
  const useVisionModel = hasImages && USE_VISION_MODEL_FOR_IMAGES;
  const model = useVisionModel ? MODEL_VISION : MODEL_TEXT;
  const imagesStripped = hasImages && !USE_VISION_MODEL_FOR_IMAGES;

  logSafeDiagnostic("MODEL_SELECTION", "Model selected", {
    model,
    hasImages,
    useVisionModel,
    imagesStripped,
  });

  if (imagesStripped) {
    logSafeDiagnostic(
      "VISION_LIMITATION",
      "Images were provided but USE_VISION_MODEL_FOR_IMAGES is false. " +
      "Images will be ignored. To enable vision, set USE_VISION_MODEL_FOR_IMAGES = true " +
      "and the model will switch to llama-3.2-90b-vision-preview.",
    );
  }

  // Build message content
  const userContent: ContentPart[] = [
    { type: "text", text: buildPrompt(draft, imagesStripped) },
  ];

  if (useVisionModel) {
    for (const dataUrl of draft.imageDataUrls ?? []) {
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) continue;
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }
  }

  logSafeDiagnostic("GROQ_CALL", "Calling Groq API", {
    model,
    contentParts: userContent.length,
  });

  // Call Groq
  let response: Response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You output only a single valid JSON object matching the requested schema. No markdown, no prose, no code fences.",
          },
          {
            role: "user",
            content: useVisionModel ? userContent : (userContent[0] as TextContentPart).text,
          },
        ],
        temperature: 0.4,
        // json_object mode is supported on llama-3.3-70b-versatile and llama-3.2-90b-vision-preview
        response_format: { type: "json_object" },
      }),
    });
  } catch (fetchErr) {
    logSafeDiagnostic("GROQ_CALL", "Network error", {
      error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
    });
    throw new Error(
      `Network error calling Groq: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
    );
  }

  logSafeDiagnostic("GROQ_CALL", "Response received", {
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");

    logSafeDiagnostic("GROQ_CALL", "API error", {
      status: response.status,
      errorLength: errorBody.length,
    });

    if (response.status === 401) {
      throw new Error(
        "Groq authentication failed (401). " +
        "Verify GROQ_API_KEY is set correctly and is a valid key from https://console.groq.com/keys."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Groq rate limit exceeded (429). Please retry in a moment. " +
        "Check your plan limits at https://console.groq.com."
      );
    }

    if (response.status === 503 || response.status === 502) {
      throw new Error(
        `Groq service temporarily unavailable (${response.status}). Please retry shortly.`
      );
    }

    throw new Error(
      `Groq API error (${response.status}): ${errorBody.slice(0, 300) || response.statusText}`
    );
  }

  // Parse OpenAI-compatible response envelope
  const responseData = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (responseData?.error?.message) {
    throw new Error(`Groq returned an error: ${responseData.error.message}`);
  }

  const generatedText = responseData?.choices?.[0]?.message?.content;

  logSafeDiagnostic("GROQ_RESPONSE", "Response parsed", {
    hasText: !!generatedText,
    textLength: generatedText?.length ?? 0,
  });

  if (!generatedText) {
    throw new Error(
      "Groq returned an empty response. The model may not have generated any content."
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
      `Groq returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. ` +
      "The model may have violated the response schema. Response was: " +
      cleanedJson.slice(0, 200)
    );
  }
}
