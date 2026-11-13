/* global process */

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

async function callGoogleGemini(prompt, apiKey) {
  const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-2.5-flash"];
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
          const parsed = getJsonPayload(rawText);
          return { ...parsed, _ai_provider: `Google Gemini API (${model})` };
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

  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_KEY || process.env.VITE_OPENROUTER_KEY;

  // 1. Prioritize Direct Google Gemini API
  if (geminiKey) {
    try {
      const result = await callGoogleGemini(prompt, geminiKey);
      return res.status(200).json(result);
    } catch (err) {
      console.warn("Direct Gemini call in serverless failed, checking OpenRouter fallback:", err.message);
      // Fall through to OpenRouter if configured
    }
  }

  // 2. Fallback to OpenRouter if Gemini Key not present or failed
  if (openrouterKey) {
    const referer =
      req.headers.origin ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://joe-imed.vercel.app");

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
          "HTTP-Referer": referer,
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
          return res.status(200).json(parsed);
        }
      }
    } catch (error) {
      console.error("OpenRouter fallback error:", error);
    }
  }

  return res.status(500).json({
    error: "No active AI API key configured (GEMINI_API_KEY or OPENROUTER_KEY).",
  });
}
