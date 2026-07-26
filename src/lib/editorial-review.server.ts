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
 * Safe diagnostic logging - logs only safe metadata, never exposes secrets
 */
function logSafeDiagnostic(stage: string, message: string, data?: Record<string, any>) {
  const safeLog = {
    timestamp: new Date().toISOString(),
    stage,
    message,
    ...data,
  };
  console.log(`[VERTEX_AI_DIAGNOSTIC] ${JSON.stringify(safeLog)}`);
}

/**
 * Normalizes a private key from Google service account JSON.
 * Handles both actual newlines (\n) and escaped newlines (\\n) transparently.
 * @param privateKey Raw private key string from service account JSON
 * @returns Normalized private key ready for RSA signing
 * @throws Error if key format is invalid
 */
function normalizePrivateKey(privateKey: string): string {
  if (!privateKey || typeof privateKey !== "string") {
    logSafeDiagnostic("NORMALIZE_KEY", "Private key is missing or not a string", {
      keyType: typeof privateKey,
      keyExists: !!privateKey,
    });
    throw new Error("Private key is missing or not a string");
  }

  const keyLengthBefore = privateKey.length;
  logSafeDiagnostic("NORMALIZE_KEY", "Starting normalization", {
    keyLengthBefore,
    hasEscapedNewlines: privateKey.includes("\\n"),
    hasDoubleEscapedNewlines: privateKey.includes("\\\\n"),
    hasLiteralNewlines: privateKey.includes("\n"),
  });

  // Handle both escaped (\\n) and literal (\n) newlines
  // First, normalize any escaped newlines to literal newlines
  let normalized = privateKey.replace(/\\n/g, "\n");

  const keyLengthAfter = normalized.length;
  logSafeDiagnostic("NORMALIZE_KEY", "After newline normalization", {
    keyLengthAfter,
    lengthChanged: keyLengthBefore !== keyLengthAfter,
  });

  // Trim any surrounding whitespace
  normalized = normalized.trim();

  const keyLengthTrimmed = normalized.length;
  logSafeDiagnostic("NORMALIZE_KEY", "After trimming whitespace", {
    keyLengthTrimmed,
  });

  // Validate minimum length (PKCS#8 RSA private keys are typically 1700+ chars)
  if (normalized.length < 500) {
    logSafeDiagnostic("NORMALIZE_KEY", "Key is suspiciously short", {
      keyLength: normalized.length,
      expectedMinimum: 1700,
    });
    throw new Error(
      `Private key is suspiciously short (${normalized.length} chars). ` +
      "The key may be truncated or incomplete. Expected 1700+ characters for a valid PKCS#8 key."
    );
  }

  // Validate PEM markers
  const startsCorrectly = normalized.startsWith("-----BEGIN PRIVATE KEY-----");
  const endsCorrectly = normalized.endsWith("-----END PRIVATE KEY-----");

  logSafeDiagnostic("NORMALIZE_KEY", "PEM marker validation", {
    startsCorrectly,
    endsCorrectly,
    firstChars: normalized.substring(0, 30),
    lastChars: normalized.substring(Math.max(0, normalized.length - 30)),
  });

  if (!startsCorrectly) {
    throw new Error(
      "Private key does not begin with the PKCS#8 marker '-----BEGIN PRIVATE KEY-----'. " +
      "Verify the key is in PKCS#8 format and not truncated."
    );
  }

  if (!endsCorrectly) {
    throw new Error(
      "Private key does not end with the PKCS#8 marker '-----END PRIVATE KEY-----'. " +
      "The key may be truncated or have extra characters at the end."
    );
  }

  // Validate base64 content between markers
  const keyBody = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, ""); // Remove all whitespace

  const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(keyBody);
  logSafeDiagnostic("NORMALIZE_KEY", "Base64 validation", {
    keyBodyLength: keyBody.length,
    isValidBase64,
  });

  if (!isValidBase64) {
    throw new Error(
      "Private key body contains invalid base64 characters. " +
      "The key may be corrupted, incomplete, or have extra whitespace embedded within it."
    );
  }

  logSafeDiagnostic("NORMALIZE_KEY", "Normalization successful", {
    finalKeyLength: normalized.length,
  });

  return normalized;
}

/**
 * Validates the structure and content of a parsed service account JSON object.
 * Provides detailed, actionable error messages without exposing sensitive data.
 * @param sa Parsed service account object
 * @throws TypeScript assertion error or Error with diagnostic details
 */
function validateServiceAccount(sa: unknown): asserts sa is ServiceAccountKey {
  if (!sa || typeof sa !== "object") {
    logSafeDiagnostic("VALIDATE_SA", "Service account is not a valid JSON object", {
      type: typeof sa,
    });
    throw new Error(
      "VERTEX_SA_JSON could not be parsed as a JSON object. " +
      "Verify the environment variable contains valid JSON."
    );
  }

  const obj = sa as Record<string, unknown>;

  // Check all required fields
  const requiredFields = ["type", "project_id", "private_key_id", "private_key", "client_email"];
  const missingFields = requiredFields.filter(field => !obj[field]);

  logSafeDiagnostic("VALIDATE_SA", "Required fields check", {
    missingFields,
    allFieldsPresent: missingFields.length === 0,
  });

  if (missingFields.length > 0) {
    throw new Error(
      `VERTEX_SA_JSON is missing required fields: ${missingFields.join(", ")}. ` +
      "Ensure you've downloaded the complete service account JSON from Google Cloud Console."
    );
  }

  // Validate field types
  const stringFields = ["type", "project_id", "private_key_id", "private_key", "client_email"];
  const typeErrors: string[] = [];
  for (const field of stringFields) {
    if (typeof obj[field] !== "string") {
      typeErrors.push(`${field}:${typeof obj[field]}`);
    }
  }

  logSafeDiagnostic("VALIDATE_SA", "Field types check", {
    typeErrors: typeErrors.length === 0 ? "all_valid" : typeErrors,
  });

  if (typeErrors.length > 0) {
    throw new Error(
      `VERTEX_SA_JSON has invalid field types: ${typeErrors.join(", ")}. ` +
      "The JSON may be corrupted or incomplete."
    );
  }

  // Validate type is "service_account"
  const accountType = obj.type as string;
  if (accountType !== "service_account") {
    logSafeDiagnostic("VALIDATE_SA", "Account type mismatch", {
      type: accountType,
      expected: "service_account",
    });
    throw new Error(
      `VERTEX_SA_JSON field "type" is "${accountType}", expected "service_account". ` +
      "This does not appear to be a Google service account JSON."
    );
  }

  // Validate email format
  const email = obj.client_email as string;
  const hasEmailFormat = email.includes("@");

  logSafeDiagnostic("VALIDATE_SA", "Email format check", {
    hasEmailFormat,
    emailEndsWithIAM: email.endsWith("iam.gserviceaccount.com"),
  });

  if (!hasEmailFormat) {
    throw new Error(
      'VERTEX_SA_JSON field "client_email" is invalid. ' +
      "Email should contain '@' and look like: account-name@project-id.iam.gserviceaccount.com"
    );
  }

  // Validate project ID is not a placeholder
  const projectId = obj.project_id as string;
  const isPlaceholder = !projectId || projectId === "your-project-id" || projectId === "PROJECT_ID";

  logSafeDiagnostic("VALIDATE_SA", "Project ID check", {
    isPlaceholder,
    projectIdLength: projectId.length,
  });

  if (isPlaceholder) {
    throw new Error(
      `VERTEX_SA_JSON field "project_id" is "${projectId}". ` +
      "This appears to be a template/placeholder. Use a real Google Cloud project ID."
    );
  }

  logSafeDiagnostic("VALIDATE_SA", "All validations passed");
}

/**
 * Obtains a Vertex AI access token using Google's JWT OAuth2 flow.
 * Reference: https://cloud.google.com/docs/authentication/service-account
 */
async function getVertexAIAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  logSafeDiagnostic("GET_TOKEN", "Starting JWT generation and token exchange");

  // Normalize and validate the private key
  const privateKey = normalizePrivateKey(serviceAccount.private_key);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600; // Token valid for 1 hour

  // Build JWT header and claims
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccount.private_key_id,
  };

  const claims = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: GOOGLE_TOKEN_ENDPOINT,
    iat: now,
    exp: expiresAt,
  };

  logSafeDiagnostic("JWT_CREATION", "JWT header and claims prepared");

  // Encode header and claims as base64url
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const claimsB64 = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signInput = `${headerB64}.${claimsB64}`;

  logSafeDiagnostic("JWT_CREATION", "Header and claims encoded", {
    headerB64Length: headerB64.length,
    claimsB64Length: claimsB64.length,
    signInputLength: signInput.length,
  });

  // Sign with RSA-SHA256
  let jwtSignature: string;
  try {
    logSafeDiagnostic("JWT_SIGNING", "Attempting RSA-SHA256 signature", {
      privateKeyLength: privateKey.length,
      signInputLength: signInput.length,
    });

    const crypto = await import("crypto");
    const signer = crypto.createSign("RSA-SHA256");
    
    logSafeDiagnostic("JWT_SIGNING", "Signer created successfully");

    signer.update(signInput);
    
    logSafeDiagnostic("JWT_SIGNING", "Signature input updated");

    const signatureBytes = signer.sign(privateKey);
    
    logSafeDiagnostic("JWT_SIGNING", "JWT signed successfully", {
      signatureBytesLength: signatureBytes.length,
    });

    jwtSignature = signatureBytes.toString("base64url");
    
    logSafeDiagnostic("JWT_SIGNING", "Signature converted to base64url", {
      signatureB64Length: jwtSignature.length,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorCode = err instanceof Error && err.code ? err.code : "UNKNOWN";

    logSafeDiagnostic("JWT_SIGNING", "JWT signing FAILED", {
      error: errorMsg,
      errorCode,
      errorType: err instanceof Error ? err.name : typeof err,
      privateKeyLength: privateKey.length,
      privateKeyStartsCorrectly: privateKey.startsWith("-----BEGIN PRIVATE KEY-----"),
      privateKeyEndsCorrectly: privateKey.endsWith("-----END PRIVATE KEY-----"),
    });

    throw new Error(
      `Failed to sign JWT with private key: ${errorMsg}. ` +
      "The private key may be invalid, corrupted, or not in PKCS#8 format. " +
      "Verify VERTEX_SA_JSON was downloaded directly from Google Cloud Console without modification."
    );
  }

  const jwt = `${signInput}.${jwtSignature}`;

  logSafeDiagnostic("JWT_CREATION", "JWT created successfully", {
    jwtLength: jwt.length,
  });

  // Exchange JWT for access token
  try {
    logSafeDiagnostic("TOKEN_EXCHANGE", "Exchanging JWT for access token");

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });

    logSafeDiagnostic("TOKEN_EXCHANGE", "Token endpoint response received", {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logSafeDiagnostic("TOKEN_EXCHANGE", "Token endpoint error", {
        status: response.status,
        errorLength: errorBody.length,
        errorStart: errorBody.slice(0, 100),
      });

      throw new Error(
        `Google token endpoint returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    const tokenData = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      logSafeDiagnostic("TOKEN_EXCHANGE", "Response missing access_token", {
        responseKeys: Object.keys(tokenData),
      });

      throw new Error(
        "Google token endpoint response missing 'access_token' field. " +
        "The JWT may be invalid or the service account may have insufficient permissions."
      );
    }

    logSafeDiagnostic("TOKEN_EXCHANGE", "Access token obtained successfully", {
      tokenLength: tokenData.access_token.length,
      expiresIn: tokenData.expires_in,
    });

    return tokenData.access_token;
  } catch (err) {
    logSafeDiagnostic("TOKEN_EXCHANGE", "Token exchange failed", {
      error: err instanceof Error ? err.message : String(err),
    });

    throw new Error(
      `Failed to exchange JWT for access token: ${err instanceof Error ? err.message : String(err)}. ` +
      "Verify the service account has Vertex AI API permissions in Google Cloud Console."
    );
  }
}

/**
 * Converts a data URL to Vertex AI inlineData format.
 * @param dataUrl Data URL like "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
 * @returns Object with mimeType and base64, or null if format invalid
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
  logSafeDiagnostic("EDITORIAL_REVIEW", "Starting editorial review");

  // Load service account credentials from environment
  const saJsonString = process.env.VERTEX_SA_JSON;

  logSafeDiagnostic("LOAD_SECRET", "Loading VERTEX_SA_JSON from environment", {
    present: saJsonString !== undefined && saJsonString !== "",
    length: saJsonString?.length || 0,
  });

  if (!saJsonString) {
    logSafeDiagnostic("LOAD_SECRET", "VERTEX_SA_JSON not found in environment");
    throw new Error(
      "Vertex AI is not configured. Set the VERTEX_SA_JSON environment variable " +
      "to your complete Google service account JSON (download from Cloud Console)."
    );
  }

  // Parse the JSON string
  let serviceAccount: ServiceAccountKey;
  try {
    logSafeDiagnostic("PARSE_JSON", "Attempting to parse VERTEX_SA_JSON", {
      jsonLength: saJsonString.length,
      startsWithBrace: saJsonString.trim().startsWith("{"),
      endsWithBrace: saJsonString.trim().endsWith("}"),
    });

    serviceAccount = JSON.parse(saJsonString) as ServiceAccountKey;

    logSafeDiagnostic("PARSE_JSON", "JSON parsed successfully", {
      type: serviceAccount.type,
      hasPrivateKey: !!serviceAccount.private_key,
      privateKeyLength: serviceAccount.private_key?.length || 0,
    });
  } catch (parseErr) {
    logSafeDiagnostic("PARSE_JSON", "JSON parse failed", {
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      jsonStart: saJsonString.substring(0, 100),
    });

    throw new Error(
      `VERTEX_SA_JSON is not valid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. ` +
      "Verify the environment variable contains the complete, unmodified service account JSON."
    );
  }

  // Validate the service account structure
  try {
    validateServiceAccount(serviceAccount);
  } catch (validateErr) {
    logSafeDiagnostic("VALIDATE_SA", "Service account validation failed", {
      error: validateErr instanceof Error ? validateErr.message : String(validateErr),
    });
    throw validateErr;
  }

  // Generate JWT and exchange for access token
  let accessToken: string;
  try {
    accessToken = await getVertexAIAccessToken(serviceAccount);
  } catch (authErr) {
    logSafeDiagnostic("GET_TOKEN", "Token generation failed", {
      error: authErr instanceof Error ? authErr.message : String(authErr),
    });
    throw authErr;
  }

  const projectId = serviceAccount.project_id;

  logSafeDiagnostic("EDITORIAL_REVIEW", "Authentication successful, preparing request", {
    projectId,
  });

  // Prepare request: text + images
  const parts: ContentPart[] = [{ type: "text", text: buildPrompt(draft) }];

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

  // Construct Vertex AI endpoint URL
  const endpointUrl = `https://${VERTEX_AI_REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_AI_REGION}/publishers/google/models/${MODEL}:generateContent`;

  logSafeDiagnostic("VERTEX_AI_CALL", "Calling Vertex AI API", {
    endpoint: endpointUrl,
    partCount: parts.length,
  });

  // Call Vertex AI API
  let response: Response;
  try {
    response = await fetch(endpointUrl, {
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
  } catch (fetchErr) {
    logSafeDiagnostic("VERTEX_AI_CALL", "Network error", {
      error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
    });

    throw new Error(
      `Network error calling Vertex AI: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
    );
  }

  logSafeDiagnostic("VERTEX_AI_CALL", "Response received", {
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");

    logSafeDiagnostic("VERTEX_AI_CALL", "API error", {
      status: response.status,
      errorLength: errorBody.length,
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Vertex AI authentication failed (${response.status}). ` +
        "The service account may lack Vertex AI permissions. " +
        "Verify the service account has 'Vertex AI User' role in Google Cloud Console."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Vertex AI API rate limit exceeded. Please retry in a moment."
      );
    }

    throw new Error(
      `Vertex AI API error (${response.status}): ${errorBody.slice(0, 300) || response.statusText}`
    );
  }

  // Parse response
  const responseData = (await response.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;

  const generatedText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

  logSafeDiagnostic("VERTEX_AI_RESPONSE", "Response parsed", {
    hasText: !!generatedText,
    textLength: generatedText?.length || 0,
  });

  if (!generatedText) {
    throw new Error(
      "Vertex AI returned an empty response. The model may not have generated any content."
    );
  }

  // Clean up JSON (remove code fences if present)
  const cleanedJson = generatedText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Parse and return the result
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
      `Vertex AI returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. ` +
      "The model may have violated the response schema. Response was: " +
      cleanedJson.slice(0, 200)
    );
  }
}
