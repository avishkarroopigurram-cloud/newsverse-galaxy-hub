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
 * @throws Error with diagnostic information if validation fails
 */
function normalizePrivateKey(privateKey: string): string {
  if (!privateKey || typeof privateKey !== "string") {
    throw new Error("Private key is missing or not a string");
  }

  // Replace escaped newlines (\\n from environment variables) with actual newlines
  let normalized = privateKey.replace(/\\n/g, "\n");

  // Trim whitespace
  normalized = normalized.trim();

  // Check length (PKCS#8 private keys are typically 1700-3000 characters)
  if (normalized.length < 500) {
    throw new Error(
      `Private key is suspiciously short (${normalized.length} chars). ` +
      "The key may be truncated. Expected 1700+ characters for a valid PKCS#8 key."
    );
  }

  // Validate key format
  if (!normalized.startsWith("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "Private key does not start with '-----BEGIN PRIVATE KEY-----'. " +
      "Expected PKCS#8 format. Check that the JSON was not escaped or truncated."
    );
  }

  if (!normalized.endsWith("-----END PRIVATE KEY-----")) {
    throw new Error(
      "Private key does not end with '-----END PRIVATE KEY-----'. " +
      "The key may be truncated, malformed, or have extra characters at the end."
    );
  }

  // Verify the key contains only valid base64 characters between markers
  const keyBody = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, ""); // Remove all whitespace

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(keyBody)) {
    throw new Error(
      "Private key body contains invalid base64 characters. " +
      "The key may be corrupted or contain extra whitespace within the key data."
    );
  }

  return normalized;
}

/**
 * Validates the structure of a parsed service account JSON object.
 * Provides detailed diagnostics without exposing secrets.
 * @param sa Parsed service account object
 * @throws Error with specific validation failure details
 */
function validateServiceAccount(sa: unknown): asserts sa is ServiceAccountKey {
  if (!sa || typeof sa !== "object") {
    throw new Error("VERTEX_SA_JSON is not a valid JSON object");
  }

  const obj = sa as Record<string, unknown>;

  // Check required fields exist
  const requiredFields = ["type", "project_id", "private_key_id", "private_key", "client_email"];
  const missingFields = requiredFields.filter(field => !obj[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `VERTEX_SA_JSON is missing required fields: ${missingFields.join(", ")}. ` +
      "Ensure you've copied the complete service account JSON from Google Cloud Console."
    );
  }

  // Validate field types
  if (typeof obj.type !== "string") {
    throw new Error('Field "type" must be a string, expected "service_account"');
  }

  if (typeof obj.project_id !== "string") {
    throw new Error('Field "project_id" must be a string (Google Cloud project ID)');
  }

  if (typeof obj.private_key !== "string") {
    throw new Error('Field "private_key" must be a string (PEM-formatted PKCS#8 key)');
  }

  if (typeof obj.client_email !== "string") {
    throw new Error('Field "client_email" must be a string (service account email)');
  }

  if (typeof obj.private_key_id !== "string") {
    throw new Error('Field "private_key_id" must be a string (key fingerprint)');
  }

  // Validate type is "service_account"
  if (obj.type !== "service_account") {
    throw new Error(
      `Field "type" is "${obj.type}", expected "service_account". ` +
      "This does not appear to be a Google service account JSON."
    );
  }

  // Validate email format
  if (!obj.client_email.includes("@")) {
    throw new Error(
      'Field "client_email" does not contain "@". ' +
      "The field appears corrupted or truncated."
    );
  }

  // Validate project_id is not a placeholder
  const projectId = obj.project_id as string;
  if (projectId === "" || projectId === "your-project-id" || projectId === "PROJECT_ID") {
    throw new Error(
      `Field "project_id" is "${projectId}". ` +
      "The service account JSON has not been properly configured with a real project ID."
    );
  }
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
  try {
    const crypto = await import("crypto");
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(messageToSign);
    const signatureBuffer = sign.sign(normalizedPrivateKey);
    const signatureEncoded = signatureBuffer.toString("base64url");

    return `${messageToSign}.${signatureEncoded}`;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    // Provide diagnostic hints based on common errors
    let diagnostic = "";
    if (errorMsg.includes("PEM routines")) {
      diagnostic = "The Node.js crypto module failed to parse the private key as PEM. " +
        "The key may have invalid base64 encoding or incorrect formatting. " +
        "Verify the key starts/ends with the correct markers and contains no extra characters.";
    } else if (errorMsg.includes("key")) {
      diagnostic = "The private key format is not recognized. " +
        "Ensure the key is PKCS#8 format (-----BEGIN PRIVATE KEY-----)";
    } else if (errorMsg.includes("RSA")) {
      diagnostic = "The key does not appear to be a valid RSA private key. " +
        "Ensure you've downloaded the correct service account key type.";
    }

    throw new Error(
      `Failed to sign JWT: ${errorMsg}. ${diagnostic} ` +
      "Verify VERTEX_SA_JSON contains a complete, valid Google service account key."
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
  // Load service account credentials
  const saJson = process.env.VERTEX_SA_JSON;
  if (!saJson) {
    throw new Error(
      "AI service is not configured (missing VERTEX_SA_JSON on the server). " +
      "Set VERTEX_SA_JSON to your complete Google service account JSON from Cloud Console.",
    );
  }

  // Parse JSON
  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = JSON.parse(saJson) as ServiceAccountKey;
  } catch (err) {
    throw new Error(
      `VERTEX_SA_JSON is not valid JSON: ${err instanceof Error ? err.message : String(err)}. ` +
      "Ensure the environment variable contains the complete service account JSON without truncation."
    );
  }

  // Validate service account structure and fields
  try {
    validateServiceAccount(serviceAccount);
  } catch (err) {
    throw err;
  }

  // Generate JWT and obtain access token
  let jwt: string;
  try {
    jwt = await getVertexAIAccessToken(serviceAccount);
  } catch (err) {
    throw err;
  }

  let accessToken: string;
  try {
    accessToken = await exchangeJwtForAccessToken(jwt);
  } catch (err) {
    throw new Error(
      `Failed to exchange JWT for access token: ${err instanceof Error ? err.message : String(err)}. ` +
      "Verify the service account has Vertex AI permissions in Google Cloud Console."
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
