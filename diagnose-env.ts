/**
 * Safe Environment Variable Diagnostic
 *
 * Checks that OPENROUTER_API_KEY is set and prints safe metadata about it.
 * Does NOT print the key value.
 *
 * Run with:
 *   npx ts-node diagnose-env.ts
 */

async function diagnose() {
  console.log("\n" + "=".repeat(80));
  console.log("OPENROUTER_API_KEY ENVIRONMENT VARIABLE DIAGNOSTIC");
  console.log("=".repeat(80) + "\n");

  const key = process.env.OPENROUTER_API_KEY;

  console.log("1. EXISTENCE CHECK");
  console.log("-".repeat(80));
  if (!key) {
    console.log("   ✗ CRITICAL: OPENROUTER_API_KEY is not set in the environment");
    console.log("   ACTION: Add OPENROUTER_API_KEY to your environment secrets.");
    console.log("           Obtain a key at https://openrouter.ai/keys");
    return;
  }
  console.log("   ✓ Variable is present");
  console.log(`   Length: ${key.length} chars`);

  console.log("\n2. FORMAT CHECK");
  console.log("-".repeat(80));
  const startsWithSk = key.startsWith("sk-");
  const looksValid = key.length > 20;
  console.log(`   Starts with 'sk-': ${startsWithSk}`);
  console.log(`   Length > 20 chars:  ${looksValid}`);
  if (!startsWithSk) {
    console.log("   ⚠ WARNING: OpenRouter keys typically start with 'sk-'.");
    console.log("     Verify this is a valid key from https://openrouter.ai/keys");
  }
  if (!looksValid) {
    console.log("   ✗ CRITICAL: Key looks too short — may be truncated.");
    return;
  }

  console.log("\n3. LIVE API CHECK");
  console.log("-".repeat(80));
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    console.log(`   HTTP status: ${res.status}`);
    if (res.ok) {
      console.log("   ✓ Key is accepted by OpenRouter");
    } else {
      const body = await res.text().catch(() => "");
      console.log(`   ✗ API returned error: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.log(`   ✗ Network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("DONE");
  console.log("=".repeat(80) + "\n");
}

diagnose().catch(console.error);
