/* global process, Buffer */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY;

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

app.post("/api/tts", async (req, res) => {
  const text = (req.body?.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "Missing text." });
  }

  const googleKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_CLOUD_API_KEY;

  try {
    let audioBuffer;
    if (googleKey) {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`;
      const gRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "th-TH", name: "th-TH-Neural2-C", ssmlGender: "FEMALE" },
          audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
        }),
      });
      if (gRes.ok) {
        const data = await gRes.json();
        if (data.audioContent) {
          audioBuffer = Buffer.from(data.audioContent, "base64");
        }
      }
    }

    if (!audioBuffer) {
      const encoded = encodeURIComponent(text.slice(0, 200));
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=th&client=tw-ob`;
      const fRes = await fetch(fallbackUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Referer: "https://translate.google.com/",
        },
      });
      const ab = await fRes.arrayBuffer();
      audioBuffer = Buffer.from(ab);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(audioBuffer);
  } catch (error) {
    return res.status(500).json({ error: "TTS failed", details: error.message });
  }
});

export const CLINICAL_TRIAGE_SYSTEM_PROMPT = `คุณคือ "แพทย์ผู้เชี่ยวชาญด้านเวชศาสตร์ฉุกเฉินและระบบคัดกรองผู้ป่วยนอก (Emergency Medicine & Hospital Triage Specialist)" ประจำโรงพยาบาล ปฏิบัติหน้าที่คัดกรองอาการผู้ป่วยตามมาตรฐานสากล Emergency Severity Index (ESI) และแนวทางเวชปฏิบัติของกระทรวงสาธารณสุขไทย (MOPH CPG)

ภารกิจ:
วิเคราะห์อาการสำคัญ สัญญาณชีพ อาการที่ตรวจพบ และประวัติการรักษา เพื่อคัดกรองระดับความเร่งด่วน แนะนำแผนกที่เหมาะสม และให้คำแนะนำการปฏิบัติตัวเบื้องต้นระหว่างรอพบแพทย์

กฎเกณฑ์ทางการแพทย์และจริยธรรมที่ต้องยึดถืออย่างเคร่งครัด:
1. การคัดแยกความเสี่ยงตามมาตรฐาน ESI:
   - "ฉุกเฉิน" (ESI 1-2): มีอาการสัญญาณเตือนวิกฤต (Red Flags) หรือสัญญาณชีพผิดปกติร้ายแรง ได้แก่:
     * แน่นหน้าอกร้าวไปกรามหรือแขนซ้าย, เจ็บหน้าอกรุนแรง, หายใจเหนื่อยหอบเฉียบพลัน (สงสัยภาวะกล้ามเนื้อหัวใจขาดเลือด ACS)
     * ปากเบี้ยว แขนขาอ่อนแรงครึ่งซีก พูดไม่ชัด สับสนเฉียบพลัน (FAST - Stroke Alert)
     * ภาวะแพ้รุนแรง (Anaphylaxis): หน้าบวม ปากบวม หายใจมีเสียงหวีด หรือลมพิษร่วมกับหายใจขัด
     * สัญญาณชีพวิกฤต: ความดันโลหิตตัวบน >= 180 หรือ < 90 mmHg, ชีพจร > 120 หรือ < 50 ครั้ง/นาที, ไข้สูงเกิน 39.0°C
     * ในกรณีนี้ "recommended_specialty" ต้องส่ง "ห้องฉุกเฉิน (ER)" และ "urgency_score" ต้องเป็น "8-10"
   - "เร่งด่วน" (ESI 3): อาการปานกลางที่ต้องพบแพทย์ภายใน 30-60 นาที เช่น มีไข้สูงหลายวัน, ปวดท้องรุนแรง, เวียนศีรษะทรงตัวไม่ได้
   - "ทั่วไป" (ESI 4-5): อาการเจ็บป่วยทั่วไป รบกวนชีวิตประจำวันเล็กน้อย สามารถรอตรวจตามลำดับคิวผู้ป่วยนอกปกติได้

2. ข้อกำหนดด้านกฎหมายและจรรยาบรรณแพทย์:
   - ห้ามระบุคำวินิจฉัยฟันธงเด็ดขาด (ห้ามบอกว่า "ผู้ป่วยเป็นโรค...") ให้ใช้คำว่า "อาการเบื้องต้นสงสัยเข้าได้กับ..." หรือ "ควรได้รับการตรวจวินิจฉัยเพิ่มเติมเกี่ยวกับ..."
   - ห้ามสั่งจ่ายยาเด็ดขาด แต่ให้คำแนะนำการดูแลตนเองที่ปลอดภัยใน next_steps (เช่น นั่งพัก, เช็ดตัวลดไข้, งดน้ำงดอาหารหากสงสัยเคสผ่าตัด)
   - หากผู้ป่วยมีประวัติแพ้ยา ให้ระบุข้อควรระวังให้แจ้งพยาบาลและแพทย์เสมอ

3. การแนะนำแผนก (recommended_specialty) ให้สอดคล้องกับระบบโรงพยาบาล:
   - ผู้ป่วยเด็กอายุต่ำกว่า 15 ปี -> "กุมารเวชศาสตร์ (คลินิกเด็ก)"
   - อาการระบบทางเดินหายใจ / ไข้หวัด / โรคเรื้อรัง -> "อายุรกรรม" (หรือระบุคลินิกย่อย เช่น คลินิกโรคระบบทางเดินหายใจ)
   - ปวดกล้ามเนื้อ / ปวดข้อ / กระดูก -> "ออร์โธปิดิกส์ (ศัลยกรรมกระดูกและข้อ)"
   - เวียนหัว / บ้านหมุน / หูอื้อ / คอ จมูก -> "โสต-ศอ-นาสิก (หู คอ จมูก)"
   - ตา -> "จักษุวิทยา"
   - ฟันและช่องปาก -> "ทันตกรรม"
   - ผื่นแพ้ผิวหนัง -> "อายุรกรรม (ผิวหนังและภูมิแพ้)"
   - เคสวิกฤต/สัญญาณชีพวิกฤต -> "ห้องฉุกเฉิน (ER)"

รูปแบบผลลัพธ์:
ตอบกลับเป็น JSON ที่ถูกต้องตามโครงสร้างที่กำหนดเท่านั้น`;

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

async function callGoogleGemini(prompt, apiKey) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: CLINICAL_TRIAGE_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                mode: { type: "STRING", enum: ["result_mode"] },
                risk_level: { type: "STRING", enum: ["ฉุกเฉิน", "เร่งด่วน", "ทั่วไป"] },
                recommended_specialty: { type: "STRING" },
                summary: { type: "STRING" },
                urgency_score: { type: "STRING" },
                next_steps: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
              },
              required: ["mode", "risk_level", "recommended_specialty", "summary", "urgency_score", "next_steps"],
            },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          return getJsonPayload(rawText);
        }
      } else {
        const errText = await res.text();
        lastError = new Error(`Gemini ${model} failed (${res.status}): ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

app.post("/api/screen", async (req, res) => {
  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Missing prompt payload.",
    });
  }

  // 1. Try Direct Gemini API first
  if (GEMINI_API_KEY) {
    try {
      const result = await callGoogleGemini(prompt, GEMINI_API_KEY);
      return res.json(result);
    } catch (err) {
      console.warn("Direct Gemini failed on backend proxy, trying OpenRouter fallback:", err.message);
    }
  }

  // 2. Fallback to OpenRouter if configured
  if (OPENROUTER_API_KEY) {
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
          model: "google/gemini-2.5-flash",
          temperature: 0.1,
          messages: [
            { role: "system", content: CLINICAL_TRIAGE_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = getJsonPayload(content);
          return res.json(parsed);
        }
      }
    } catch (error) {
      console.error("OpenRouter fallback error:", error);
    }
  }

  return res.status(500).json({
    error: "No active AI API key configured (GEMINI_API_KEY or OPENROUTER_KEY).",
  });
});

app.listen(PORT, () => {
  console.log(`Backend proxy listening on http://localhost:${PORT}`);
});
