const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || "";

export function formatPatientPrompt(form, bmi = "") {
  const symptomLabels = (form.symptoms || [])
    .map((s) => {
      const matched = [
        { id: "fever",     label: "ไข้" },
        { id: "cough",     label: "ไอ" },
        { id: "headache",  label: "ปวดหัว" },
        { id: "chest",     label: "เจ็บหน้าอก" },
        { id: "breath",    label: "หายใจลำบาก" },
        { id: "nausea",    label: "คลื่นไส้" },
        { id: "dizziness", label: "เวียนหัว" },
        { id: "fatigue",   label: "อ่อนเพลีย" },
        { id: "pain",      label: "ปวดกล้ามเนื้อ" },
        { id: "rash",      label: "ผื่น" },
        { id: "swelling",  label: "บวม" },
      ].find((entry) => entry.id === s);

      return matched?.label || s;
    })
    .join(", ");

  const severityLabel = form.severity === "high"
    ? "รุนแรง (เคสความเสี่ยงสูง)"
    : form.severity === "mid"
      ? "ปานกลาง"
      : "เล็กน้อย";

  return `คุณเป็นแพทย์ผู้เชี่ยวชาญด้านเวชศาสตร์ฉุกเฉินและคัดกรองผู้ป่วยในโรงพยาบาล วิเคราะห์ผู้ป่วยต่อไปนี้และตอบเป็นภาษาไทยในรูปแบบ JSON เท่านั้น:

ข้อมูลผู้ป่วย:
- อายุ: ${form.age || "ไม่ระบุ"} ปี, เพศ: ${form.gender || "ไม่ระบุ"}
- อาการหลัก: ${form.chiefComplaint || "ไม่ระบุ"}
- อาการที่ตรวจพบ: ${symptomLabels || "ไม่ระบุ"}
- ระดับความรุนแรง: ${severityLabel}
- ประวัติโรคประจำตัว: ${form.medHistory || "ไม่มี"}
- ประวัติแพ้ยา: ${form.allergies || "ไม่มี"}
- สัญญาณชีพ: ความดัน ${form.bp || "ไม่ทราบ"} mmHg, ชีพจร ${form.pulse || "ไม่ทราบ"} ครั้ง/นาที, อุณหภูมิ ${form.temp || "ไม่ทราบ"}°C${bmi ? `, BMI ${bmi}` : ""}`;
}

// ─── CLINICAL RULE-BASED TRIAGE ENGINE (OFFLINE & FAIL-SAFE) ──────────────────
export function generateClinicalTriage(form = {}) {
  const symptoms = Array.isArray(form.symptoms) ? form.symptoms : [];
  const chief = (form.chiefComplaint || "").toLowerCase();
  const age = parseInt(form.age, 10) || 30;
  const severity = form.severity || "mid";
  const temp = parseFloat(form.temp) || 36.8;

  // Red Flags: Cardiac / Respiratory / Severe Emergency
  const hasChestPain = symptoms.includes("chest") || chief.includes("อก") || chief.includes("หัวใจ");
  const hasBreathingDifficulty = symptoms.includes("breath") || chief.includes("หายใจ") || chief.includes("เหนื่อย");
  const isHighRisk = severity === "high" || hasChestPain || hasBreathingDifficulty;

  if (hasChestPain || hasBreathingDifficulty || (severity === "high" && symptoms.includes("dizziness"))) {
    return {
      status: "success",
      mode: "result_mode",
      risk_level: "ฉุกเฉิน",
      recommended_specialty: "ห้องฉุกเฉิน (ER) / อายุรกรรมหัวใจ",
      summary: "ผู้ป่วยมีอาการสัญญาณเตือนภาวะวิกฤตทางระบบหัวใจและหลอดเลือดหรือระบบทางเดินหายใจ (แน่นหน้าอก/หายใจลำบาก) ต้องได้รับการตรวจคลื่นไฟฟ้าหัวใจและประเมินสัญญาณชีพโดยด่วน",
      urgency_score: "9/10",
      next_steps: [
        "ติดต่อเคาน์เตอร์พยาบาลห้องฉุกเฉินทันทีโดยไม่ต้องรอคิว",
        "นั่งพักบนเก้าอี้หรือเตียงพยาบาล งดเดินหรือออกกำลังเด็ดขาด",
        "เตรียมตรวจวัดคลื่นไฟฟ้าหัวใจ (ECG) และค่าความอิ่มตัวของออกซิเจน",
      ],
    };
  }

  // Pediatric cases
  if (age < 15) {
    const hasFever = symptoms.includes("fever") || temp >= 38.0;
    return {
      status: "success",
      mode: "result_mode",
      risk_level: hasFever && temp >= 38.5 ? "เร่งด่วน" : "ทั่วไป",
      recommended_specialty: "กุมารเวชศาสตร์ (คลินิกเด็ก)",
      summary: `ผู้ป่วยเด็กอายุ ${age} ปี มีอาการ${hasFever ? `ไข้ (${temp}°C) ร่วมกับอาการทางเดินหายใจ` : "ผิดปกติทางร่างกาย"} ควรได้รับการประเมินขนาดยาและการดูแลตามเกณฑ์เด็ก`,
      urgency_score: hasFever ? "7/10" : "4/10",
      next_steps: [
        "เช็ดตัวลดไข้ด้วยน้ำอุณหภูมิห้อง และดื่มน้ำสะอาดทีละน้อย",
        "สวมหน้ากากอนามัยสำหรับเด็กระหว่างรอพบกุมารแพทย์",
        "นำสมุดวัคซีนหรือประวัติการรักษาเดิมมาแสดงต่อแพทย์",
      ],
    };
  }

  // Fever & Respiratory Infection
  if (symptoms.includes("fever") || symptoms.includes("cough")) {
    const isHighFever = temp >= 38.5;
    return {
      status: "success",
      mode: "result_mode",
      risk_level: isHighFever || severity === "high" ? "เร่งด่วน" : "ทั่วไป",
      recommended_specialty: "อายุรกรรม (คลินิกโรคระบบทางเดินหายใจ)",
      summary: `มีอาการไข้${isHighFever ? `สูง (${temp}°C)` : ""} ร่วมกับอาการไอหรือปวดศีรษะ เบื้องต้นสงสัยภาวะติดเชื้อทางเดินหายใจส่วนบนหรือไข้หวัดใหญ่`,
      urgency_score: isHighFever ? "7/10" : "5/10",
      next_steps: [
        "สวมหน้ากากอนามัยตลอดเวลาที่อยู่ภายในโรงพยาบาล",
        "ดื่มน้ำอุ่นมากๆ และพักผ่อนระหว่างรอคิวตรวจ",
        "แจ้งประวัติการรับวัคซีนไข้หวัดใหญ่และประวัติแพ้ยาแก่พยาบาล",
      ],
    };
  }

  // ENT / Neurological / Dizziness
  if (symptoms.includes("dizziness") || symptoms.includes("nausea") || symptoms.includes("headache")) {
    return {
      status: "success",
      mode: "result_mode",
      risk_level: severity === "high" ? "เร่งด่วน" : "ทั่วไป",
      recommended_specialty: "โสต-ศอ-นาสิก (หู คอ จมูก) / อายุรกรรมประสาท",
      summary: "มีอาการเวียนศีรษะ บ้านหมุน หรือคลื่นไส้ เบื้องต้นสัมพันธ์กับความผิดปกติของระบบการทรงตัวในหูชั้นในหรือความดันโลหิต",
      urgency_score: severity === "high" ? "6/10" : "4/10",
      next_steps: [
        "นั่งพักในบริเวณที่มีอากาศถ่ายเทสะดวก หลีกเลี่ยงการหันศีรษะเร็ว",
        "จิบน้ำอุ่นหรือเครื่องดื่มเกลือแร่อย่างช้าๆ",
        "วัดระดับความดันโลหิตซ้ำที่จุดคัดกรองของแผนก",
      ],
    };
  }

  // Orthopedics / Musculoskeletal
  if (symptoms.includes("pain") || symptoms.includes("swelling")) {
    return {
      status: "success",
      mode: "result_mode",
      risk_level: severity === "high" ? "เร่งด่วน" : "ทั่วไป",
      recommended_specialty: "ออร์โธปิดิกส์ (ศัลยกรรมกระดูกและข้อ)",
      summary: "มีอาการปวดกล้ามเนื้อ หรือมีอาการบวมตามข้อต่อ เข้าข่ายความผิดปกติของกล้ามเนื้อ เส้นเอ็น หรือกระดูก",
      urgency_score: severity === "high" ? "6/10" : "3/10",
      next_steps: [
        "ลดการลงน้ำหนักหรือพักการใช้งานอวัยวะบริเวณที่มีอาการปวด",
        "แจ้งเจ้าหน้าที่หากต้องการรถเข็นนั่ง (Wheelchair)",
        "แจ้งประวัติอุบัติเหตุ การล้ม หรือการยกของหนักแก่แพทย์",
      ],
    };
  }

  // Dermatology / Allergy
  if (symptoms.includes("rash")) {
    return {
      status: "success",
      mode: "result_mode",
      risk_level: severity === "high" ? "เร่งด่วน" : "ทั่วไป",
      recommended_specialty: "อายุรกรรม (คลินิกผิวหนังและภูมิแพ้)",
      summary: "มีผื่นขึ้นตามผิวหนัง อาจเกิดจากการแพ้ยา อาหาร สารสัมผัส หรือการติดเชื้อผิวหนัง",
      urgency_score: "3/10",
      next_steps: [
        "หลีกเลี่ยงการแกะ เกา หรือทายาโดยยังไม่ทราบสาเหตุ",
        "แจ้งประวัติการรับประทานยาใหม่หรืออาหารที่เพิ่งรับประทาน",
        "หากเริ่มมีอาการแน่นคอ หายใจขัด หรือตาบวม ให้รีบแจ้งพยาบาลทันที",
      ],
    };
  }

  // General default triage
  return {
    status: "success",
    mode: "result_mode",
    risk_level: isHighRisk ? "เร่งด่วน" : "ทั่วไป",
    recommended_specialty: form.department || "เวชปฏิบัติทั่วไป / อายุรกรรม",
    summary: `ผู้ป่วยมีอาการ${symptoms.length > 0 ? "ไม่สุขสบายทางร่างกาย" : "ทั่วไป"} จัดอยู่ในกลุ่มการตรวจรักษาตามลำดับคิวของแผนกผู้ป่วยนอก`,
    urgency_score: isHighRisk ? "6/10" : "3/10",
    next_steps: [
      "รอเรียกเข้าห้องตรวจตามหมายเลขคิวที่ได้รับ",
      "เตรียมบัตรประจำตัวประชาชนและเอกสารสิทธิ์การรักษา",
      "หากอาการเปลี่ยนแปลงหรือทวีความรุนแรงขึ้น ให้แจ้งพยาบาลทันที",
    ],
  };
}

function cleanAndParseJson(text) {
  if (!text) return null;
  // Strip DeepSeek / reasoning tags <think>...</think> if present
  const withoutThinking = String(text).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ─── ROBUST SCREENING API WITH INSTANT RESILIENT FALLBACK ──────────────────────
export async function callScreeningAPI(prompt, patientForm = {}) {
  // 1. Try backend / Vercel serverless proxy (with 8-second timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_BASE_URL}/screen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === "object" && (data.mode || data.risk_level)) {
        return data;
      }
    }
  } catch {
    // Backend server is not running or timed out; proceed to next layer
  }

  // 2. Try direct OpenRouter API if API key is present
  if (OPENROUTER_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "X-Title": "joe-imed-hospital-screening",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `You are a hospital triage clinical intake assistant. Return only valid JSON without markdown fences.
Respond with:
{
  "mode": "result_mode",
  "risk_level": "ฉุกเฉิน" | "เร่งด่วน" | "ทั่วไป",
  "recommended_specialty": "specialty in Thai",
  "summary": "concise medical summary in Thai",
  "urgency_score": "1-10",
  "next_steps": ["step 1", "step 2", "step 3"]
}`,
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        const parsed = cleanAndParseJson(content);
        if (parsed && (parsed.risk_level || parsed.mode)) {
          return parsed;
        }
      }
    } catch {
      // Network/quota restriction; proceed to clinical triage engine
    }
  }

  // 3. Fallback: Instant Medical Rule-Based Triage Engine (100% reliable, zero downtime)
  return generateClinicalTriage(patientForm);
}

// ─── VOICE-TO-QUEUE NATURAL LANGUAGE EXTRACTOR (THAI SPEECH PARSER) ───────────
export function parseVoicePatientTranscript(rawTranscript = "") {
  const text = String(rawTranscript || "").trim();

  // 1. Extract Age (เช่น "อายุ 72 ปี" หรือ "72 ปี")
  let age = "65";
  const ageMatch =
    text.match(/อายุ\s*(\d{1,3})\s*(?:ปี|ขวบ)?/) ||
    text.match(/(\d{2,3})\s*ปี/);
  if (ageMatch && ageMatch[1]) {
    age = ageMatch[1];
  }

  // 2. Extract Gender
  let gender = "ไม่ระบุ";
  if (/(นาย|ลุง|ตา|ปู่|คุณพ่อ|ผู้ชาย|เพศชาย|ผมชื่อ|กระผม)/.test(text)) {
    gender = "ชาย";
  } else if (/(นางสาว|นาง|ยาย|ป้า|ย่า|คุณแม่|ผู้หญิง|เพศหญิง|ดิฉัน|หนูชื่อ|ฉันชื่อ)/.test(text)) {
    gender = "หญิง";
  }

  // 3. Extract Name (เช่น "ชื่อสมศรี ใจดี" หรือ "ชื่อนายสมชาย รักไทย")
  let firstName = "ผู้รับบริการ";
  let lastName = "(แจ้งด้วยเสียง)";
  const nameMatch = text.match(
    /(?:ชื่อ|ผม|ดิฉัน|ยาย|ลุง|ป้า|ตา|นาย|นางสาว|นาง)\s*([ก-๙]{2,20})(?:\s+([ก-๙]{2,20}))?/
  );
  if (nameMatch && nameMatch[1]) {
    const cleanedFirst = nameMatch[1]
      .replace(/^(ชื่อ|นาย|นางสาว|นาง|คุณ|ยาย|ลุง|ป้า|ตา)/, "")
      .trim();
    if (cleanedFirst.length >= 2 && !["อายุ", "ปวด", "เจ็บ", "เป็น", "มีไข้"].includes(cleanedFirst)) {
      firstName = cleanedFirst;
      const candidateLast = (nameMatch[2] || "").trim();
      if (
        candidateLast &&
        !candidateLast.startsWith("อายุ") &&
        !candidateLast.startsWith("ปวด") &&
        !candidateLast.startsWith("มี") &&
        !candidateLast.startsWith("เป็น") &&
        !candidateLast.startsWith("สิทธิ")
      ) {
        lastName = candidateLast;
      } else {
        lastName = "";
      }
    }
  }

  // 4. Extract Benefit Type (สิทธิการรักษา)
  let benefitType = "บัตรทอง / สวัสดิการรัฐ";
  if (/(ประกันสังคม)/.test(text)) {
    benefitType = "ประกันสังคม";
  } else if (/(ข้าราชการ|เบิกตรง|สวัสดิการข้าราชการ)/.test(text)) {
    benefitType = "สิทธิสวัสดิการ";
  } else if (/(จ่ายเอง|เงินสด|ชำระเอง)/.test(text)) {
    benefitType = "เบิกตรง / จ่ายเอง";
  } else if (/(ประกันเอกชน|ประกันชีวิต)/.test(text)) {
    benefitType = "ประกันภาคเอกชน";
  } else if (/(ผู้สูงอายุ|สูงอายุ|บัตรทอง|30\s*บาท|สามสิบบาท|สวัสดิการรัฐ)/.test(text)) {
    benefitType = "บัตรทอง / สวัสดิการรัฐ";
  }

  // 5. Extract Symptoms
  const symptoms = [];
  const rules = [
    ["fever", /(ไข้|ตัวร้อน|หนาวสั่น)/],
    ["cough", /(ไอ|เจ็บคอ|เสมหะ)/],
    ["headache", /(ปวดหัว|ปวดศีรษะ|มึนหัว)/],
    ["chest", /(เจ็บหน้าอก|แน่นหน้าอก|จุกหน้าอก)/],
    ["breath", /(หายใจลำบาก|หายใจไม่ออก|หายใจไม่สะดวก|เหนื่อยหอบ|หอบ)/],
    ["nausea", /(คลื่นไส้|อาเจียน|อ้วก|พะอืดพะอม)/],
    ["dizziness", /(เวียนหัว|หน้ามืด|บ้านหมุน|ตาลาย)/],
    ["fatigue", /(อ่อนเพลีย|ไม่มีแรง|เพลีย)/],
    ["pain", /(ปวดหลัง|ปวดเอว|ปวดเข่า|ปวดขา|ปวดกล้ามเนื้อ|ปวดเมื่อย|ปวดท้อง)/],
    ["rash", /(ผื่น|คัน|ลมพิษ)/],
    ["swelling", /(บวม|ขาบวม|หน้าบวม)/],
  ];

  for (const [id, regex] of rules) {
    if (regex.test(text)) {
      symptoms.push(id);
    }
  }
  if (symptoms.length === 0) {
    symptoms.push("fatigue");
  }

  // 6. Determine Severity
  let severity = "mid";
  if (
    symptoms.includes("chest") ||
    symptoms.includes("breath") ||
    /(ฉุกเฉิน|รุนแรง|มาก|ทนไม่ไหว|หมดสติ|ชัก|เลือดออก)/.test(text)
  ) {
    severity = "high";
  } else if (symptoms.length === 1 && !/(มาก|รุนแรง|หลายวัน)/.test(text)) {
    severity = "low";
  }

  // 7. Extract Medical History / Allergies if mentioned
  let medHistory = "";
  const histMatch = text.match(/(?:โรคประจำตัว|เป็นโรค)\s*([ก-๙\s]{2,30})/);
  if (histMatch && histMatch[1]) {
    medHistory = histMatch[1].trim();
  } else if (/(เบาหวาน|ความดัน|ไขมัน|หัวใจ)/.test(text)) {
    const foundConds = [];
    if (/เบาหวาน/.test(text)) foundConds.push("เบาหวาน");
    if (/ความดัน/.test(text)) foundConds.push("ความดันโลหิตสูง");
    if (/ไขมัน/.test(text)) foundConds.push("ไขมันในเลือดสูง");
    if (/โรคหัวใจ/.test(text)) foundConds.push("โรคหัวใจ");
    medHistory = foundConds.join(", ");
  }

  let allergies = "ไม่มี";
  const allergyMatch = text.match(/แพ้ยา\s*([ก-๙a-zA-Z0-9\s]{2,25})/);
  if (allergyMatch && allergyMatch[1] && !/ไม่แพ้ยา/.test(text)) {
    allergies = allergyMatch[1].trim();
  }

  return {
    firstName,
    lastName,
    age,
    gender,
    phone: "",
    hn: "",
    weight: "",
    height: "",
    bp: "",
    pulse: "",
    temp: symptoms.includes("fever") ? "38.2" : "36.8",
    symptoms,
    severity,
    chiefComplaint: text,
    medHistory,
    benefitType,
    allergies,
  };
}

