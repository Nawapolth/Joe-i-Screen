/* global process, Buffer */

/**
 * Serverless Text-to-Speech Endpoint for Hospital Kiosk announcements.
 * Primary: Google Cloud Text-to-Speech REST API (th-TH-Neural2-C / th-TH-Standard-A)
 * Fallback: Google Translate TTS TTS voice synthesis (zero-config, zero-credential backup)
 */

async function callGoogleCloudTTS(text, apiKey) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: "th-TH",
        name: "th-TH-Neural2-C", // High-fidelity clinical broadcast voice (Female)
        ssmlGender: "FEMALE",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 0.95,
        pitch: 0.0,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Cloud TTS API error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  if (!data?.audioContent) {
    throw new Error("No audioContent in Google Cloud TTS response.");
  }

  return Buffer.from(data.audioContent, "base64");
}

async function callTranslateFallbackTTS(text) {
  // Safe, zero-credential clinical Thai voice fallback
  const encoded = encodeURIComponent(text.slice(0, 200));
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=th&client=tw-ob`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
  });

  if (!response.ok) {
    throw new Error(`Translate fallback failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use POST or GET." });
  }

  const text = (req.method === "POST" ? req.body?.text : req.query?.text) || "";

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Missing 'text' parameter." });
  }

  const cleanText = text.trim();
  const apiKey =
    process.env.GOOGLE_TTS_API_KEY ||
    process.env.GOOGLE_CLOUD_API_KEY ||
    process.env.GEMINI_API_KEY;

  try {
    let audioBuffer;

    if (apiKey) {
      try {
        audioBuffer = await callGoogleCloudTTS(cleanText, apiKey);
      } catch (err) {
        console.warn("Primary Google Cloud TTS failed, falling back:", err.message);
        audioBuffer = await callTranslateFallbackTTS(cleanText);
      }
    } else {
      audioBuffer = await callTranslateFallbackTTS(cleanText);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("TTS endpoint error:", error);
    return res.status(500).json({
      error: "Failed to generate speech audio.",
      details: error.message,
    });
  }
}
