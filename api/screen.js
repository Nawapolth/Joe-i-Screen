/* global process */

function buildSystemPrompt() {
  return `You are a hospital triage clinical intake assistant. Return only valid JSON without markdown fences.
Respond with:
{
  "mode": "result_mode",
  "risk_level": "ฉุกเฉิน|เร่งด่วน|ทั่วไป",
  "recommended_specialty": "specialty in Thai",
  "summary": "concise medical summary in Thai",
  "urgency_score": "1-10",
  "next_steps": ["step 1", "step 2", "step 3"]
}`;
}

function getJsonPayload(text) {
  const withoutThinking = String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  const cleaned = withoutThinking
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      const candidate = cleaned.slice(start, end + 1);
      return JSON.parse(candidate);
    }

    throw new Error("AI service returned a non-JSON response.");
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Missing prompt payload.",
    });
  }

  const apiKey = process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENROUTER_KEY is not configured in Vercel environment variables.",
    });
  }

  const referer =
    req.headers.origin ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://joe-imed.vercel.app");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": "joe-imed-screening",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        temperature: 0.2,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(502).json({
        error: "OpenRouter request failed.",
        details: errorBody,
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error: "OpenRouter returned an empty response.",
      });
    }

    const parsed = getJsonPayload(content);
    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Vercel AI proxy error:", error);
    return res.status(500).json({
      error: "Failed to process screening request.",
      details: error.message,
    });
  }
}
