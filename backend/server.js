/* global process */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const OPENROUTER_API_KEY = process.env.OPENROUTER_KEY;

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    service: "joe-imed-ai-proxy",
  });
});

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
  const withoutThinking = String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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

app.post("/api/screen", async (req, res) => {
  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Missing prompt payload.",
    });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      error: "OPENROUTER_KEY is not configured on the backend.",
    });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": FRONTEND_URL,
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

    return res.json(parsed);
  } catch (error) {
    console.error("AI proxy error:", error);
    return res.status(500).json({
      error: "Failed to process screening request.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend proxy listening on http://localhost:${PORT}`);
});
