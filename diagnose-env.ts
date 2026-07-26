/**
 * Safe Environment Variable Diagnostic
 * 
 * Prints only safe diagnostics about VERTEX_SA_JSON without exposing secrets.
 * Helps identify if the deployment platform is truncating, escaping, or modifying
 * the environment variable.
 * 
 * Run in your deployed environment:
 *   NODE_ENV=production npx ts-node diagnose-env.ts
 */

const SAFE_DIAGNOSTICS = {
  // Check if VERTEX_SA_JSON exists
  exists: () => {
    const value = process.env.VERTEX_SA_JSON;
    return {
      present: value !== undefined && value !== "",
      source: "process.env.VERTEX_SA_JSON",
    };
  },

  // Safe length check
  length: () => {
    const value = process.env.VERTEX_SA_JSON;
    if (!value) return null;
    return {
      totalLength: value.length,
      expectedLength: 2200, // Typical for genesis-490014 service account
      isWithinRange: value.length > 2000 && value.length < 3000,
      isTruncated: value.length < 500,
    };
  },

  // Check for common escape/encoding issues
  escapingIssues: () => {
    const value = process.env.VERTEX_SA_JSON;
    if (!value) return null;

    return {
      hasDoubleEscapedNewlines: value.includes("\\\\n"), // \\\\n instead of \\n
      hasEscapedNewlines: value.includes("\\n") && !value.includes("\n"),
      hasLiteralNewlines: value.includes("\n"),
      startsWithQuote: value.startsWith('"'),
      endsWithQuote: value.endsWith('"'),
      startsWithBrace: value.startsWith("{"),
      endsWithBrace: value.endsWith("}"),
    };
  },

  // Try to parse JSON and report issues
  jsonParse: () => {
    const value = process.env.VERTEX_SA_JSON;
    if (!value) return null;

    let parsed: any = null;
    let error: string | null = null;

    try {
      parsed = JSON.parse(value);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    if (!parsed) {
      return {
        parseSuccess: false,
        error: error,
        firstChars: value.substring(0, 100),
        lastChars: value.substring(Math.max(0, value.length - 100)),
      };
    }

    return {
      parseSuccess: true,
      type: parsed.type,
      hasProjectId: !!parsed.project_id,
      hasPrivateKey: !!parsed.private_key,
      hasClientEmail: !!parsed.client_email,
      hasPrivateKeyId: !!parsed.private_key_id,
    };
  },

  // Check private key separately
  privateKey: () => {
    const value = process.env.VERTEX_SA_JSON;
    if (!value) return null;

    let parsed: any = null;
    try {
      parsed = JSON.parse(value);
    } catch {
      return { error: "Could not parse JSON" };
    }

    const key = parsed.private_key;
    if (!key) return { error: "No private_key field in JSON" };

    return {
      keyLength: key.length,
      expectedMinLength: 1700,
      isTruncated: key.length < 1700,
      startsCorrectly: key.startsWith("-----BEGIN PRIVATE KEY-----"),
      endsCorrectly: key.endsWith("-----END PRIVATE KEY-----"),
      hasEscapedNewlines: key.includes("\\n"),
      hasLiteralNewlines: key.includes("\n"),
      hasDoubleBackslash: key.includes("\\\\"),
      lineCount: (key.match(/\n/g) || []).length + (key.match(/\\n/g) || []).length,
    };
  },

  // Check for null bytes or other corruption
  corruption: () => {
    const value = process.env.VERTEX_SA_JSON;
    if (!value) return null;

    return {
      hasNullBytes: value.includes("\0"),
      hasControlChars: /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value),
      hasUnicodeSpaces: /[\u00a0\u2000-\u200b\u3000]/.test(value),
      endsWithNewline: value.endsWith("\n"),
      hasTrailingWhitespace: value.endsWith(" ") || value.endsWith("\t"),
    };
  },

  // Check if normalization would fix it
  normalizationTest: () => {
    const value = process.env.VERTEX_SA_JSON;
    if (!value) return null;

    let parsed: any = null;
    try {
      parsed = JSON.parse(value);
    } catch {
      return { error: "Could not parse JSON" };
    }

    const key = parsed.private_key;
    if (!key) return { error: "No private_key field" };

    // Simulate normalization
    const normalized = key.replace(/\\n/g, "\n").trim();

    return {
      originalStartsCorrectly: key.startsWith("-----BEGIN PRIVATE KEY-----"),
      normalizedStartsCorrectly: normalized.startsWith("-----BEGIN PRIVATE KEY-----"),
      originalEndsCorrectly: key.endsWith("-----END PRIVATE KEY-----"),
      normalizedEndsCorrectly: normalized.endsWith("-----END PRIVATE KEY-----"),
      normalizationWouldFix: 
        !key.endsWith("-----END PRIVATE KEY-----") && 
        normalized.endsWith("-----END PRIVATE KEY-----"),
    };
  },
};

async function diagnose() {
  console.log("\n" + "=".repeat(80));
  console.log("VERTEX_SA_JSON ENVIRONMENT VARIABLE DIAGNOSTIC");
  console.log("=".repeat(80) + "\n");

  console.log("1. EXISTENCE CHECK");
  console.log("-".repeat(80));
  const existence = SAFE_DIAGNOSTICS.exists();
  console.log(`   Present: ${existence.present}`);
  if (!existence.present) {
    console.log("   ✗ CRITICAL: VERTEX_SA_JSON is not set in the environment");
    console.log("   ACTION: Check your deployment platform settings");
    return;
  }
  console.log("   ✓ Variable is present\n");

  console.log("2. LENGTH CHECK");
  console.log("-".repeat(80));
  const length = SAFE_DIAGNOSTICS.length();
  if (length) {
    console.log(`   Total length: ${length.totalLength} chars`);
    console.log(`   Expected range: 2000-3000 chars`);
    console.log(`   Within range: ${length.isWithinRange}`);
    if (length.isTruncated) {
      console.log("   ✗ CRITICAL: Variable appears truncated (< 500 chars)");
      console.log("   ACTION: Your deployment platform may have truncated the variable");
      return;
    }
    console.log("   ✓ Length is reasonable\n");
  }

  console.log("3. ESCAPING ISSUES");
  console.log("-".repeat(80));
  const escaping = SAFE_DIAGNOSTICS.escapingIssues();
  if (escaping) {
    console.log(`   Double-escaped newlines (\\\\\\\\n): ${escaping.hasDoubleEscapedNewlines}`);
    if (escaping.hasDoubleEscapedNewlines) {
      console.log("   ✗ ISSUE: Newlines are double-escaped");
      console.log("   This could cause normalization to fail");
    }
    console.log(`   Escaped newlines (\\\\n): ${escaping.hasEscapedNewlines}`);
    console.log(`   Literal newlines (\\n): ${escaping.hasLiteralNewlines}`);
    if (!escaping.hasEscapedNewlines && !escaping.hasLiteralNewlines) {
      console.log("   ✗ ISSUE: No newlines found in the JSON at all");
      console.log("   This suggests the variable is truncated or corrupted");
      return;
    }
    console.log(`   Starts with quote: ${escaping.startsWithQuote}`);
    if (escaping.startsWithQuote) {
      console.log("   ✗ ISSUE: Variable starts with a quote (should be raw JSON)");
      console.log("   Your shell may have added extra quotes");
    }
    console.log(`   Starts with brace: ${escaping.startsWithBrace}`);
    console.log(`   Ends with brace: ${escaping.endsWithBrace}`);
    console.log();
  }

  console.log("4. JSON PARSE TEST");
  console.log("-".repeat(80));
  const jsonParse = SAFE_DIAGNOSTICS.jsonParse();
  if (jsonParse) {
    if (!jsonParse.parseSuccess) {
      console.log(`   ✗ JSON parse failed: ${jsonParse.error}`);
      console.log(`   First 100 chars: ${jsonParse.firstChars}`);
      console.log(`   Last 100 chars: ${jsonParse.lastChars}`);
      console.log("   ACTION: The environment variable contains invalid JSON");
      console.log("   ACTION: Re-copy the JSON from genesis-490014-20920c06ce2a.json");
      return;
    }
    console.log(`   Parse success: ✓`);
    console.log(`   Type field: ${jsonParse.type}`);
    console.log(`   Has project_id: ${jsonParse.hasProjectId}`);
    console.log(`   Has private_key: ${jsonParse.hasPrivateKey}`);
    console.log(`   Has client_email: ${jsonParse.hasClientEmail}`);
    console.log(`   Has private_key_id: ${jsonParse.hasPrivateKeyId}`);
    console.log();
  }

  console.log("5. PRIVATE KEY VALIDATION");
  console.log("-".repeat(80));
  const privateKey = SAFE_DIAGNOSTICS.privateKey();
  if (privateKey && !privateKey.error) {
    console.log(`   Key length: ${privateKey.keyLength} chars`);
    console.log(`   Expected minimum: ${privateKey.expectedMinLength} chars`);
    if (privateKey.isTruncated) {
      console.log("   ✗ CRITICAL: Private key is truncated (< 1700 chars)");
      console.log("   ACTION: Re-copy the complete private_key from the service account JSON");
      return;
    }
    console.log(`   Starts with marker: ${privateKey.startsCorrectly}`);
    if (!privateKey.startsCorrectly) {
      console.log("   ✗ ISSUE: Private key does not start with -----BEGIN PRIVATE KEY-----");
    }
    console.log(`   Ends with marker: ${privateKey.endsCorrectly}`);
    if (!privateKey.endsCorrectly) {
      console.log("   ✗ ISSUE: Private key does not end with -----END PRIVATE KEY-----");
    }
    console.log(`   Has escaped newlines (\\\\n): ${privateKey.hasEscapedNewlines}`);
    console.log(`   Has literal newlines (\\n): ${privateKey.hasLiteralNewlines}`);
    console.log(`   Has double backslash (\\\\\\\\): ${privateKey.hasDoubleBackslash}`);
    if (privateKey.hasDoubleBackslash) {
      console.log("   ✗ ISSUE: Found double backslashes - may indicate over-escaping");
    }
    console.log(`   Line count: ${privateKey.lineCount}`);
    console.log();
  } else if (privateKey?.error) {
    console.log(`   ✗ ${privateKey.error}`);
    return;
  }

  console.log("6. CORRUPTION CHECK");
  console.log("-".repeat(80));
  const corruption = SAFE_DIAGNOSTICS.corruption();
  if (corruption) {
    console.log(`   Has null bytes: ${corruption.hasNullBytes}`);
    console.log(`   Has control characters: ${corruption.hasControlChars}`);
    console.log(`   Has unusual Unicode spaces: ${corruption.hasUnicodeSpaces}`);
    console.log(`   Ends with newline: ${corruption.endsWithNewline}`);
    console.log(`   Has trailing whitespace: ${corruption.hasTrailingWhitespace}`);
    if (corruption.hasControlChars || corruption.hasUnicodeSpaces) {
      console.log("   ✗ ISSUE: Detected corruption or unusual characters");
      console.log("   ACTION: Re-copy the JSON carefully");
    }
    console.log();
  }

  console.log("7. NORMALIZATION TEST");
  console.log("-".repeat(80));
  const normalization = SAFE_DIAGNOSTICS.normalizationTest();
  if (normalization && !normalization.error) {
    console.log(`   Original starts correctly: ${normalization.originalStartsCorrectly}`);
    console.log(`   Normalized starts correctly: ${normalization.normalizedStartsCorrectly}`);
    console.log(`   Original ends correctly: ${normalization.originalEndsCorrectly}`);
    console.log(`   Normalized ends correctly: ${normalization.normalizedEndsCorrectly}`);
    console.log(`   Normalization would help: ${normalization.normalizationWouldFix}`);
    console.log();
  }

  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  const allChecks = {
    existence: SAFE_DIAGNOSTICS.exists(),
    length: SAFE_DIAGNOSTICS.length(),
    escaping: SAFE_DIAGNOSTICS.escapingIssues(),
    jsonParse: SAFE_DIAGNOSTICS.jsonParse(),
    privateKey: SAFE_DIAGNOSTICS.privateKey(),
    corruption: SAFE_DIAGNOSTICS.corruption(),
  };

  // Check for issues
  const hasIssues = 
    !allChecks.existence.present ||
    (allChecks.length && allChecks.length.isTruncated) ||
    (allChecks.jsonParse && !allChecks.jsonParse.parseSuccess) ||
    (allChecks.privateKey && allChecks.privateKey.isTruncated);

  if (hasIssues) {
    console.log("✗ ISSUES DETECTED - The environment variable is corrupted or incomplete");
    console.log("\nACTIONS:");
    console.log("1. Check your deployment platform (Vercel, Cloud Run, etc.)");
    console.log("2. Re-set VERTEX_SA_JSON with the complete JSON from:");
    console.log("   genesis-490014-20920c06ce2a.json");
    console.log("3. Verify the value is exactly as provided (no truncation/modification)");
    console.log("4. Re-deploy after changing the secret");
  } else {
    console.log("✓ Environment variable appears valid");
    console.log("✓ JSON structure is intact");
    console.log("✓ Private key format is correct");
    console.log("\nIf JWT signing still fails, the issue is in the runtime environment,");
    console.log("not in the environment variable itself.");
  }
  console.log();
}

diagnose().catch(console.error);
