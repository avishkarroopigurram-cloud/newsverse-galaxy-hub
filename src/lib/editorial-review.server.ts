// Server-only: editorial review pipeline for the AI Editorial Desk.
// Calls Vertex AI Gemini endpoint directly using service account authentication.
// Service account credentials read from VERTEX_SA_JSON environment variable.
// Never import from client / route files directly — imported by
// editorial.functions.ts handlers only.

import type { ArticleDraftInput, EditorialReviewResult } from "@/types/editorial";

const VERTEX_AI_REGION = "us-central1";
const MODEL = "gemini-2.5-flash";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

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

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

type ContentPart = 
  | { type: "text"; text: string }
  | { type: "inlineData"; inlineData: { mimeType: string; data: string } };

/**
 * Validates and normalizes a private key from Google service account JSON.
 * Handles escaped newlines (\\n) that occur when the key is stored in environment variables.
 * @param privateKey Raw private key string, potentially with escaped newlines
 * @returns Normalized private key ready for cryptographic operations
 * @throws Error if the key format is invalid
 */
function normalizePrivateKey(privateKey: string): string {
  if (!privateKey || typeof privateKey !== "string") {
    throw new Error("Private key is missing or not a string");
  }

  // Replace escaped newlines (\\n from environment variables) with actual newlines
  let normalized = privateKey.replace(/\\n/g, "\n");

  // Trim whitespace
  normalized = normalized.trim();

  // Validate key format
  if (!normalized.startsWith("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "Private key does not start with '-----BEGIN PRIVATE KEY-----'. " +
      "The key may be corrupted or in an unsupported format."
    );
  }

  if (!normalized.endsWith("-----END PRIVATE KEY-----")) {
    throw new Error(
      "Private key does not end with '-----END PRIVATE KEY-----'. " +
      "The key may be truncated or corrupted."
    );
  }

  return normalized;
}

/**
 * Obtains a Vertex AI access token using the service account key.
 * Implements Google's JWT OAuth2 flow per RFC 6749 / Google Cloud documentation.
 */
async function getVertexAIAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  // Validate and normalize the private key
  const normalizedPrivateKey = normalizePrivateKey(serviceAccount.private_key);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // 1 hour

  // Build JWT header and payload
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccount.private_key_id,
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: GOOGLE_TOKEN_ENDPOINT,
    iat: now,
    exp: expiresAt,
  };

  // Encode JWT using base64url
  const headerEncoded = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const messageToSign = `${headerEncoded}.${payloadEncoded}`;

  // Sign with private key using RS256
  let sign;
  try {
    const crypto = await import("crypto");
    sign = crypto.createSign("RSA-SHA256");
    sign.update(messageToSign);
    const signatureBuffer = sign.sign(normalizedPrivateKey);
    const signatureEncoded = signatureBuffer.toString("base64url");

    return `${messageToSign}.${signatureEncoded}`;
  } catch (err) {
    throw new Error(
      `Failed to sign JWT: ${err instanceof Error ? err.message : String(err)}. ` +
      "The private key may be malformed or incompatible with RSA-SHA256 signing."
    );
  }
}

/**
 * Exchanges a JWT for a Google OAuth2 access token.
 * @param jwt The signed JWT assertion
 * @returns OAuth2 access token valid for 1 hour
 */
async function exchangeJwtForAccessToken(jwt: string): Promise<string> {
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Failed to obtain Vertex AI access token: ${tokenResponse.status} ${errorText}`,
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    throw new Error("No access_token in response from Google token endpoint");
  }

  return tokenData.access_token;
}

/**
 * Converts a data URL to base64-encoded content with MIME type.
 * Vertex AI requires inlineData format for images, not OpenAI-style data URLs.
 * @param dataUrl Data URL in format "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
 * @returns Object with mimeType and base64 content, or null if invalid format
 */
function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2],
  };
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
  // Load and parse service account credentials
  const saJson = process.env.VERTEX_SA_JSON;
  if (!saJson) {
    throw new Error(
      "AI service is not configured (missing VERTEX_SA_JSON on the server).",
    );
  }

  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = JSON.parse(saJson) as ServiceAccountKey;
  } catch (err) {
    throw new Error(
      `Invalid VERTEX_SA_JSON: failed to parse as JSON. ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Validate required fields
  if (!serviceAccount.project_id) {
    throw new Error("VERTEX_SA_JSON is missing required field: project_id");
  }
  if (!serviceAccount.private_key) {
    throw new Error("VERTEX_SA_JSON is missing required field: private_key");
  }
  if (!serviceAccount.client_email) {
    throw new Error("VERTEX_SA_JSON is missing required field: client_email");
  }

  // Generate JWT and obtain access token
  let jwt: string;
  try {
    jwt = await getVertexAIAccessToken(serviceAccount);
  } catch (err) {
    throw new Error(
      `Failed to generate JWT: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let accessToken: string;
  try {
    accessToken = await exchangeJwtForAccessToken(jwt);
  } catch (err) {
    throw new Error(
      `Failed to exchange JWT for access token: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const projectId = serviceAccount.project_id;

  // Build request content parts: text + images
  const parts: ContentPart[] = [{ type: "text", text: buildPrompt(draft) }];

  // Convert data URLs to Vertex AI inlineData format
  for (const dataUrl of draft.imageDataUrls ?? []) {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) continue;
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) continue;
    parts.push({
      type: "inlineData",
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.base64,
      },
    });
  }

  // Construct Vertex AI generateContent endpoint URL
  const endpointUrl = `https://${VERTEX_AI_REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_AI_REGION}/publishers/google/models/${MODEL}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: "You output only a single valid JSON object matching the requested schema. No markdown, no prose, no code fences.",
            },
          ],
        },
        generationConfig: {
          temperature: 0.4,
          responseFormat: {
            type: "JSON",
          },
        },
      }),
    });
  } catch (err) {
    throw new Error(
      `Vertex AI request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("Vertex AI service is rate-limited. Please retry in a moment.");
    }
    if (res.status === 403) {
      throw new Error(
        "Access denied: service account may lack Vertex AI permissions.",
      );
    }
    throw new Error(
      `Vertex AI error (${res.status}): ${body.slice(0, 400) || res.statusText}`,
    );
  }

  const payload = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Vertex AI service returned an empty response.");

  // Be tolerant of accidental code fences
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as EditorialReviewResult;
  } catch {
    throw new Error("Vertex AI service returned invalid JSON.");
  }
}
