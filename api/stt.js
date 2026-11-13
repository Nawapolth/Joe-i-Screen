/* global process, Buffer */

/**
 * Serverless Speech-to-Text Endpoint for Hospital Kiosk voice input.
 * Tier 1: ElevenLabs Scribe (State-of-the-art Thai speech recognition)
 * Tier 2: Google Gemini Audio Understanding (Accurate Thai transcription)
 */

async function callElevenLabsSTT(audioBuffer, mimeType, apiKey) {
  const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });

  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model_id", "scribe_v1");
  formData.append("language_code", "tha");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs STT error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.text || "";
}

async function callGeminiSTT(audioBase64, mimeType, apiKey) {
  const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-2.5-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "audio/webm",
                    data: audioBase64,
                  },
                },
                {
                  text: "ถอดความเสียงพูดภาษาไทยของผู้ป่วยต่อไปนี้เป็นข้อความภาษาไทยอย่างถูกต้องแม่นยำ ไม่ต้องใส่คำอธิบายเพิ่มเติม ตอบเฉพาะข้อความคำพูดที่ถอดความได้เท่านั้น",
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text.trim();
        }
      } else {
        const errText = await response.text();
        lastError = new Error(`Gemini STT (${model}) failed: ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Gemini STT transcription failed.");
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

  const { audioBase64, mimeType } = req.body || {};

  if (!audioBase64 || typeof audioBase64 !== "string") {
    return res.status(400).json({ error: "Missing audioBase64 payload." });
  }

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  try {
    let transcript = "";

    // 1. Try ElevenLabs Scribe STT
    if (elevenLabsKey) {
      try {
        const buffer = Buffer.from(audioBase64, "base64");
        transcript = await callElevenLabsSTT(buffer, mimeType, elevenLabsKey);
      } catch (err) {
        console.warn("ElevenLabs STT failed, trying Gemini STT:", err.message);
      }
    }

    // 2. Try Gemini STT Audio Recognition
    if (!transcript && geminiKey) {
      try {
        transcript = await callGeminiSTT(audioBase64, mimeType, geminiKey);
      } catch (err) {
        console.warn("Gemini STT failed:", err.message);
      }
    }

    if (!transcript) {
      return res.status(500).json({
        error: "Failed to transcribe audio. Please verify your ElevenLabs or Gemini API key.",
      });
    }

    return res.status(200).json({ text: transcript });
  } catch (error) {
    console.error("STT endpoint error:", error);
    return res.status(500).json({
      error: "Speech-to-text processing failed.",
      details: error.message,
    });
  }
}
