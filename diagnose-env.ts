/**
 * Safe Environment Variable Diagnostic
 *
 * Checks that GROQ_API_KEY is set and prints safe metadata about it.
 * Does NOT print the key value.
 *
 * Run with:
 *   npx ts-node diagnose-env.ts
 */

async function diagnose() {
  console.log("\n" + "=".repeat(80));
  console.log("GROQ_API_KEY ENVIRONMENT VARIABLE DIAGNOSTIC");
  console.log("=".repeat(80) + "\n");

  const key = process.env.GROQ_API_KEY;

  console.log("1. EXISTENCE CHECK");
  console.log("-".repeat(80));
  if (!key) {
    console.log("   ✗ CRITICAL: GROQ_API_KEY is not set in the environment");
    console.log("   ACTION: Add GROQ_API_KEY to your environment secrets.");
    console.log("           Obtain a key at https://console.groq.com/keys");
    return;
  }
  console.log("   ✓ Variable is present");
  console.log(`   Length: ${key.length} chars`);

  console.log("\n2. FORMAT CHECK");
  console.log("-".repeat(80));
  const startsWithGsk = key.startsWith("gsk_");
  const looksValid = key.length > 20;
  console.log(`   Starts with 'gsk_': ${startsWithGsk}`);
  console.log(`   Length > 20 chars:   ${looksValid}`);
  if (!startsWithGsk) {
    console.log("   ⚠ WARNING: Groq keys typically start with 'gsk_'.");
    console.log("     Verify this is a valid key from https://console.groq.com/keys");
  }
  if (!looksValid) {
    console.log("   ✗ CRITICAL: Key looks too short — may be truncated.");
    return;
  }

  console.log("\n3. LIVE API CHECK");
  console.log("-".repeat(80));
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    console.log(`   HTTP status: ${res.status}`);
    if (res.ok) {
      const data = (await res.json()) as { data?: { id: string }[] };
      const models = data.data?.map((m) => m.id) ?? [];
      console.log("   ✓ Key is accepted by Groq");
      console.log(`   Available models: ${models.slice(0, 8).join(", ")}${models.length > 8 ? ", …" : ""}`);
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
