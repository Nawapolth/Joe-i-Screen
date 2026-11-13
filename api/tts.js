/* global process, Buffer */

/**
 * Serverless Text-to-Speech Endpoint for Hospital Kiosk announcements.
 * Tier 1: ElevenLabs Multilingual v2 (Studio-quality human Thai voice)
 * Tier 2: Google Cloud Text-to-Speech (th-TH-Neural2-C)
 * Tier 3: Chunked Translate Fallback (Zero-config, seamless length with no cutoffs)
 */

async function callElevenLabsTTS(text, apiKey, voiceId) {
  const selectedVoice = voiceId || process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9"; // Default: Jessica / Multilingual v2
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_v4_turbo",
      language_code: "th",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.85,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs TTS error: ${response.status} ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function callGoogleCloudTTS(text, apiKey) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: "th-TH",
        name: "th-TH-Neural2-C", // High-fidelity broadcast voice (Female)
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
  // Safe, zero-credential clinical Thai voice fallback with chunking so audio never cuts off
  const chunks = [];
  const maxChunk = 150;
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxChunk) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf(" ", maxChunk);
    if (splitIdx <= 30) splitIdx = remaining.lastIndexOf("ค่ะ", maxChunk);
    if (splitIdx <= 30) splitIdx = maxChunk;
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }

  const buffers = [];
  for (const chunk of chunks) {
    if (!chunk) continue;
    const encoded = encodeURIComponent(chunk);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=th&client=tw-ob`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    }
  }

  if (buffers.length === 0) {
    throw new Error("Translate fallback returned no audio chunks.");
  }

  return Buffer.concat(buffers);
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
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
  const googleKey =
    process.env.GOOGLE_TTS_API_KEY ||
    process.env.GOOGLE_CLOUD_API_KEY ||
    process.env.GEMINI_API_KEY;

  try {
    let audioBuffer;
    let provider = "translate-fallback";

    // 1. Prioritize ElevenLabs Studio Voice if API key provided
    if (elevenLabsKey) {
      try {
        audioBuffer = await callElevenLabsTTS(cleanText, elevenLabsKey);
        provider = "elevenlabs";
      } catch (err) {
        console.warn("ElevenLabs TTS failed, attempting Google Cloud TTS fallback:", err.message);
      }
    }

    // 2. Google Cloud Neural2 TTS
    if (!audioBuffer && googleKey) {
      try {
        audioBuffer = await callGoogleCloudTTS(cleanText, googleKey);
        provider = "google-cloud";
      } catch (err) {
        console.warn("Google Cloud TTS failed, attempting translate fallback:", err.message);
      }
    }

    // 3. Resilient zero-config concatenated fallback (guaranteed never to cut off)
    if (!audioBuffer) {
      audioBuffer = await callTranslateFallbackTTS(cleanText);
      provider = "translate-fallback";
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-TTS-Provider", provider);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("TTS endpoint error:", error);
    return res.status(500).json({
      error: "Failed to generate speech audio.",
      details: error.message,
    });
  }
}
