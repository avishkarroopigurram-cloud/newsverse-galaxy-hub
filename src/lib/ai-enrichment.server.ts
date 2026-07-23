// AI enrichment via Lovable AI Gateway (Gemini 2.5 Flash).
// Server-only. Fail-soft: on any error returns null so ingestion continues.

export type Enrichment = {
  summary: string;
  takeaways: string[];
  meta_description: string;
  categorized_as: string;
};

const CATEGORIES = [
  "Breaking News",
  "Telangana",
  "Hyderabad",
  "India",
  "World",
  "Politics",
  "Business",
  "Technology",
  "Artificial Intelligence",
  "Startups",
  "Science",
  "Health",
  "Sports",
  "Entertainment",
  "Education",
];

export async function enrichArticle(input: {
  title: string;
  description: string | null;
  content: string | null;
}): Promise<Enrichment | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;

  const body = [
    `Title: ${input.title}`,
    input.description ? `Description: ${input.description}` : "",
    input.content ? `Content: ${input.content.slice(0, 3000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = `You are a news editor for South India Journal, an Indian news publication. Analyze this article and return a JSON object with:
- "summary": a 2-3 sentence AI summary of the story
- "takeaways": array of 3-5 short key takeaway bullet points (each under 20 words)
- "meta_description": SEO meta description under 155 characters
- "categorized_as": the single best-fit category from this list: ${CATEGORIES.join(", ")}

Return ONLY valid JSON, no markdown fences.

ARTICLE:
${body}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output only valid JSON. No markdown, no prose." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("[ai-enrichment] gateway error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as Partial<Enrichment>;
    return {
      summary: String(parsed.summary ?? "").slice(0, 1000),
      takeaways: Array.isArray(parsed.takeaways)
        ? parsed.takeaways.map((t) => String(t)).slice(0, 6)
        : [],
      meta_description: String(parsed.meta_description ?? "").slice(0, 160),
      categorized_as: CATEGORIES.includes(String(parsed.categorized_as ?? ""))
        ? String(parsed.categorized_as)
        : "",
    };
  } catch (err) {
    console.error("[ai-enrichment] failed", err);
    return null;
  }
}
