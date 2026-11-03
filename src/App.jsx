import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Accessibility,
  Activity,
  ClipboardCheck,
  Database,
  Eye,
  Lock,
  LogOut,
  MousePointerClick,
  Plus,
  RotateCcw,
  Search,
  Ticket,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { callScreeningAPI, formatPatientPrompt, generateClinicalTriage } from "./api";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://smfbyfrjiafaugninelq.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_BssK88fq7YzC4B-M_80ppQ_KLDkOT81";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SYMPTOMS = [
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
  { id: "none",      label: "อื่นๆ" },
];

const DEPARTMENTS = [
  "แพทย์ทั่วไป", "อายุรกรรม", "ศัลยกรรม", "กุมารเวชศาสตร์",
  "สูติ-นรีเวชกรรม", "จิตเวชศาสตร์", "ออร์โธปิดิกส์", "โสต-ศอ-นาสิก",
  "จักษุวิทยา", "ทันตกรรม", "ฉุกเฉิน",
];

const BLANK_FORM = {
  firstName: "", lastName: "", age: "", gender: "", phone: "",
  hn: "", weight: "", height: "", bp: "", pulse: "", temp: "",
  symptoms: [], severity: "", chiefComplaint: "",
  medHistory: "", allergies: "", department: "", benefitType: "",
};

const INITIAL_PATIENTS = [
  {
    id: 101,
    dbId: 101,
    patientId: "PT-0101",
    queueNumber: "ER-001",
    firstName: "สมชาย",
    lastName: "วงศ์สวัสดิ์",
    age: "64",
    gender: "ชาย",
    phone: "081-234-5678",
    hn: "HN-670142",
    weight: "74",
    height: "168",
    bp: "165/100",
    pulse: "112",
    temp: "37.1",
    symptoms: ["chest", "breath"],
    severity: "high",
    chiefComplaint: "แน่นหน้าอกร้าวไปแขนซ้าย หายใจเหนื่อยเฉียบพลัน",
    medHistory: "ความดันโลหิตสูง, ไขมันในเลือดสูง",
    benefitType: "สิทธิสวัสดิการ",
    allergies: "ไม่มี",
    department: "ฉุกเฉิน",
    time: "09:40",
    aiAnalysis: {
      status: "success",
      mode: "result_mode",
      risk_level: "ฉุกเฉิน",
      recommended_specialty: "ฉุกเฉิน / อายุรกรรมหัวใจ",
      summary: "ผู้ป่วยมีอาการเจ็บแน่นหน้าอกร่วมกับหายใจลำบากและสัญญาณชีพผิดปกติ มีความเสี่ยงภาวะหัวใจขาดเลือดเฉียบพลัน",
      urgency_score: "9/10",
      next_steps: ["ติดต่อเคาน์เตอร์พยาบาลฉุกเฉินทันที", "งดเดินหรือออกแรงเพิ่ม", "เตรียมตรวจคลื่นไฟฟ้าหัวใจ (ECG)"],
    },
  },
  {
    id: 102,
    dbId: 102,
    patientId: "PT-0102",
    queueNumber: "A-042",
    firstName: "วิภาดา",
    lastName: "ศรีสุข",
    age: "38",
    gender: "หญิง",
    phone: "089-456-1230",
    hn: "HN-670189",
    weight: "56",
    height: "160",
    bp: "122/78",
    pulse: "88",
    temp: "38.6",
    symptoms: ["fever", "cough", "headache"],
    severity: "mid",
    chiefComplaint: "มีไข้สูงติดต่อกัน 2 วัน ไอแห้งและปวดศีรษะ",
    medHistory: "ไม่มี",
    benefitType: "ประกันสังคม",
    allergies: "เพนิซิลลิน",
    department: "อายุรกรรม",
    time: "09:15",
    aiAnalysis: null,
  },
  {
    id: 103,
    dbId: 103,
    patientId: "PT-0103",
    queueNumber: "A-043",
    firstName: "กิตติพงศ์",
    lastName: "ใจดี",
    age: "29",
    gender: "ชาย",
    phone: "086-789-4321",
    hn: "HN-670204",
    weight: "68",
    height: "175",
    bp: "118/76",
    pulse: "76",
    temp: "36.8",
    symptoms: ["dizziness", "nausea"],
    severity: "mid",
    chiefComplaint: "เวียนศีรษะบ้านหมุนเวลาเปลี่ยนท่าทาง ร่วมกับคลื่นไส้",
    medHistory: "ไม่มี",
    benefitType: "บัตรทอง / สวัสดิการรัฐ",
    allergies: "ไม่มี",
    department: "โสต-ศอ-นาสิก",
    time: "08:50",
    aiAnalysis: null,
  },
  {
    id: 104,
    dbId: 104,
    patientId: "PT-0104",
    queueNumber: "B-018",
    firstName: "ประภา",
    lastName: "เจริญผล",
    age: "52",
    gender: "หญิง",
    phone: "082-334-9988",
    hn: "HN-670215",
    weight: "62",
    height: "158",
    bp: "128/82",
    pulse: "72",
    temp: "36.6",
    symptoms: ["pain", "fatigue"],
    severity: "low",
    chiefComplaint: "ปวดกล้ามเนื้อหลังและอ่อนเพลียจากการทำงาน",
    medHistory: "เบาหวานชนิดที่ 2",
    benefitType: "เบิกตรง / จ่ายเอง",
    allergies: "ไม่มี",
    department: "ออร์โธปิดิกส์",
    time: "08:20",
    aiAnalysis: null,
  },
];

function extractBenefitType(rawMedHistory) {
  if (!rawMedHistory) return "";
  const match = rawMedHistory.match(/สิทธิ์ผู้ป่วย:\s*(.+?)(?:\s*\|\s|$)/i);
  return match ? match[1].trim() : "";
}

function generateQueueNumber(severity, count) {
  const prefix = severity === "high" ? "ER" : severity === "mid" ? "A" : "B";
  return `${prefix}-${String(count + 40).padStart(3, "0")}`;
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
function toRow(form, aiAnalysis) {
  const benefitText = form.benefitType ? `สิทธิ์ผู้ป่วย: ${form.benefitType}` : "";
  const medHistoryText = [form.medHistory, benefitText].filter(Boolean).join(" | ");

  return {
    first_name:       form.firstName,
    last_name:        form.lastName,
    age:              parseInt(form.age) || null,
    gender:           form.gender,
    phone:            form.phone || null,
    hn:               form.hn || null,
    weight_kg:        parseFloat(form.weight) || null,
    height_cm:        parseFloat(form.height) || null,
    bp:               form.bp || null,
    pulse:            parseInt(form.pulse) || null,
    temperature:      parseFloat(form.temp) || null,
    symptoms:         form.symptoms,
    severity:         form.severity,
    chief_complaint:  form.chiefComplaint || null,
    med_history:      medHistoryText || null,
    allergies:        form.allergies || null,
    department:       form.department || null,
    ai_analysis:      aiAnalysis || null,
  };
}

function fromRow(row, index = 0) {
  const benefitType = extractBenefitType(row.med_history);
  return {
    id:             row.id,
    dbId:           row.id,
    queueNumber:    generateQueueNumber(row.severity, index + 1),
    firstName:      row.first_name,
    lastName:       row.last_name,
    age:            row.age?.toString() || "",
    gender:         row.gender,
    phone:          row.phone || "",
    hn:             row.hn || "",
    weight:         row.weight_kg?.toString() || "",
    height:         row.height_cm?.toString() || "",
    bp:             row.bp || "",
    pulse:          row.pulse?.toString() || "",
    temp:           row.temperature?.toString() || "",
    symptoms:       row.symptoms || [],
    severity:       row.severity,
    chiefComplaint: row.chief_complaint || "",
    medHistory:     row.med_history ? row.med_history.replace(/\s*\|\s*สิทธิ์ผู้ป่วย:\s*.*$/i, "").trim() : "",
    benefitType,
    allergies:      row.allergies || "",
    department:     row.department || "",
    aiAnalysis:     row.ai_analysis || null,
    time:           new Date(row.created_at).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }),
    patientId:      `PT-${String(row.id).slice(-4).padStart(4, "0")}`,
  };
}

// ─── SECURE API CALL ──────────────────────────────────────────────────────────
async function callAI(prompt, formData = {}) {
  try {
    const response = await callScreeningAPI(prompt, formData);

    if (response && response.mode === "question_mode") {
      return {
        status: "success",
        mode: "question_mode",
        questions: Array.isArray(response.questions) ? response.questions : [],
      };
    }

    if (response && (response.mode === "result_mode" || response.risk_level)) {
      return {
        status: "success",
        mode: "result_mode",
        risk_level: response.risk_level || "ทั่วไป",
        recommended_specialty: response.recommended_specialty || "เวชปฏิบัติทั่วไป / อายุรกรรม",
        summary: response.summary || "ประเมินอาการเบื้องต้นตามเกณฑ์การคัดกรองของโรงพยาบาล",
        urgency_score: response.urgency_score ?? "4/10",
        next_steps: Array.isArray(response.next_steps) ? response.next_steps : [],
      };
    }

    return generateClinicalTriage(formData);
  } catch {
    return generateClinicalTriage(formData);
  }
}

function parseAIResult(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {
        status: "success",
        mode: "result_mode",
        risk_level: null,
        recommended_specialty: null,
        summary: String(raw),
        urgency_score: null,
        next_steps: [],
      };
    }
  }

  return {
    status: obj.status || (obj.error ? "error" : "success"),
    mode:
      obj.mode || (Array.isArray(obj.questions) ? "question_mode" : (obj.risk_level || obj.summary ? "result_mode" : undefined)),
    risk_level: obj.risk_level ?? obj.riskLevel ?? obj.risk ?? null,
    recommended_specialty: obj.recommended_specialty ?? obj.recommendedSpecialty ?? null,
    summary: obj.summary ?? obj.summary_text ?? obj.description ?? null,
    urgency_score: obj.urgency_score ?? obj.urgencyScore ?? null,
    next_steps: Array.isArray(obj.next_steps) ? obj.next_steps : (Array.isArray(obj.nextSteps) ? obj.nextSteps : (obj.next_steps ? [obj.next_steps] : [])),
    questions: Array.isArray(obj.questions) ? obj.questions : [],
    raw: obj,
  };
}

const DEFAULT_A11Y = {
  fontScale: "normal", // "normal" | "lg" | "xl"
  highContrast: false,
  largeTargets: false,
  autoRead: false,
};

function getPageSpeechSummary(pageName, ticket) {
  if (pageName === "home") {
    return "ยินดีต้อนรับสู่ระบบคัดกรองผู้ป่วย โจ ไอเมด บริการประเมินอาการเบื้องต้นด้วยตนเอง หากมีอาการฉุกเฉินวิกฤต เช่น แน่นหน้าอกรุนแรง หรือหายใจไม่ออก โปรดกดปุ่ม เอสโอเอส เรียกพยาบาล ด้านบนทันที ท่านสามารถกดปุ่ม เริ่มทำแบบประเมินอาการ เพื่อรับหมายเลขคิว หรือค้นหาบัตรคิวเดิมได้ในหน้านี้";
  }
  if (pageName === "intake") {
    return "หน้าแบบประเมินอาการเบื้องต้น กรุณากรอกข้อมูลตามขั้นตอนทั้ง 4 ขั้นตอน ได้แก่ ข้อมูลผู้ป่วย ข้อมูลสุขภาพเบื้องต้น ระบุอาการ และสรุปผลเพื่อรับบัตรคิว";
  }
  if (pageName === "ticket") {
    if (!ticket) {
      return "หน้าบัตรคิวของฉัน ขณะนี้ยังไม่มีบัตรคิวที่เปิดดู ท่านสามารถค้นหาบัตรคิวด้วยชื่อ เบอร์โทรศัพท์ หรือรหัสผู้ป่วย หรือกดเริ่มทำแบบประเมินอาการใหม่";
    }
    const urgencyText = ticket.severity === "high" ? "เคสความเสี่ยงสูง เร่งด่วน กรุณาติดต่อเคาน์เตอร์พยาบาลฉุกเฉินทันที" : ticket.severity === "mid" ? "ความเสี่ยงปานกลาง" : "ทั่วไป ตามลำดับคิว";
    return `บัตรคิวอิเล็กทรอนิกส์ของ คุณ ${ticket.firstName} ${ticket.lastName} หมายเลขคิวของคุณคือ ${ticket.queueNumber} แผนกที่แนะนำคือ แผนก${ticket.department || "อายุรกรรม"} ระดับความเร่งด่วน ${urgencyText}`;
  }
  return "ระบบจัดการคิวและคัดกรองผู้ป่วย โจ ไอเมด สำหรับเจ้าหน้าที่";
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [activeTicket, setActiveTicket] = useState(null);
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [showStaffLoginModal, setShowStaffLoginModal] = useState(false);
  const [showA11yMenu, setShowA11yMenu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [a11y, setA11y] = useState(() => {
    try {
      const saved = localStorage.getItem("joe_imed_a11y");
      return saved ? { ...DEFAULT_A11Y, ...JSON.parse(saved) } : DEFAULT_A11Y;
    } catch {
      return DEFAULT_A11Y;
    }
  });

  const [appointments, setAppointments] = useState([
    { id: "APT-1024", patientName: "นางสาวกานดา รัตนชัย", time: "08:30", department: "ศัลยกรรม", benefitType: "ประกันสังคม", status: "นัดหมายแล้ว", note: "นัดตรวจติดตามหลังผ่าตัด" },
    { id: "APT-1030", patientName: "นายธีรพงษ์ พงษ์ชัย", time: "09:15", department: "อายุรกรรม", benefitType: "สิทธิสวัสดิการ", status: "ลงทะเบียนแล้ว", note: "ติดตามความดันโลหิต" },
    { id: "APT-1042", patientName: "นางสาวพรพิมล ชูชาติ", time: "10:05", department: "กุมารเวชศาสตร์", benefitType: "บัตรทอง / สวัสดิการรัฐ", status: "รอพบแพทย์", note: "ปรึกษาแพทย์เด็ก" },
  ]);
  const [toast, setToast] = useState(null);
  const [dbStatus, setDbStatus] = useState(() =>
    SUPABASE_URL.includes("YOUR_PROJECT") ? "unconfigured" : "ok"
  );
  const [selectedPatient, setSelectedPatient] = useState(null);

  function updateAppointmentStatus(id, nextStatus) {
    setAppointments((prev) => prev.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
    showToast("สถานะนัดหมายอัปเดตแล้ว", "success");
  }

  useEffect(() => {
    if (SUPABASE_URL.includes("YOUR_PROJECT")) return;

    fetchPatients();

    const channel = supabase
      .channel("patients-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "patients" }, (payload) => {
        setPatients((prev) => [fromRow(payload.new, prev.length), ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("a11y-font-lg", "a11y-font-xl", "a11y-high-contrast", "a11y-large-targets");
    if (a11y.fontScale === "lg") root.classList.add("a11y-font-lg");
    if (a11y.fontScale === "xl") root.classList.add("a11y-font-xl");
    if (a11y.highContrast) root.classList.add("a11y-high-contrast");
    if (a11y.largeTargets) root.classList.add("a11y-large-targets");
    try {
      localStorage.setItem("joe_imed_a11y", JSON.stringify(a11y));
    } catch {
      // Ignore storage quota errors
    }
  }, [a11y]);

  function stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  function speakThai(text) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showToast("เบราว์เซอร์ของท่านไม่รองรับระบบอ่านออกเสียง", "error");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes("th"));
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function navigatePage(nextPage, ticketOverride = activeTicket) {
    setPage(nextPage);
    if (a11y.autoRead) {
      speakThai(getPageSpeechSummary(nextPage, ticketOverride));
    }
  }

  async function fetchPatients() {
    setDbStatus("loading");
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setDbStatus("ok");
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        setPatients(data.map((r, i) => fromRow(r, i)));
      }
      setDbStatus("ok");
    } catch {
      setDbStatus("ok");
    }
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function addPatient(form, aiAnalysis) {
    const queueNumber = generateQueueNumber(form.severity, patients.length + 1);
    const resolvedAI = aiAnalysis || generateClinicalTriage(form);
    const parsedAI = parseAIResult(resolvedAI) || generateClinicalTriage(form);
    const recommendedDept = form.department || parsedAI?.recommended_specialty || (form.severity === "high" ? "ห้องฉุกเฉิน (ER)" : "อายุรกรรม / เวชปฏิบัติทั่วไป");

    const fallbackPatient = {
      ...form,
      department: recommendedDept,
      id: Date.now(),
      dbId: Date.now(),
      queueNumber,
      patientId: `PT-${Math.floor(Math.random() * 9000 + 1000)}`,
      aiAnalysis: resolvedAI,
      time: new Date().toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }),
    };

    if (dbStatus === "unconfigured") {
      setPatients((prev) => [fallbackPatient, ...prev]);
      setActiveTicket(fallbackPatient);
      showToast(`ออกบัตรคิวหมายเลข ${queueNumber} เรียบร้อยแล้ว`);
      navigatePage("ticket", fallbackPatient);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("patients")
        .insert([toRow({ ...form, department: recommendedDept }, resolvedAI)])
        .select()
        .single();

      if (error || !data) {
        setPatients((prev) => [fallbackPatient, ...prev]);
        setActiveTicket(fallbackPatient);
        showToast(`ออกบัตรคิวหมายเลข ${queueNumber} เรียบร้อยแล้ว`);
        navigatePage("ticket", fallbackPatient);
        return;
      }

      const savedRecord = { ...fromRow(data, patients.length), queueNumber, department: recommendedDept, aiAnalysis: resolvedAI };
      setPatients((prev) => {
        if (prev.find((p) => p.dbId === data.id)) return prev;
        return [savedRecord, ...prev];
      });
      setActiveTicket(savedRecord);
      showToast(`ออกบัตรคิวหมายเลข ${queueNumber} เรียบร้อยแล้ว`);
      navigatePage("ticket", savedRecord);
    } catch {
      setPatients((prev) => [fallbackPatient, ...prev]);
      setActiveTicket(fallbackPatient);
      showToast(`ออกบัตรคิวหมายเลข ${queueNumber} เรียบร้อยแล้ว`);
      navigatePage("ticket", fallbackPatient);
    }
  }

  async function deletePatient(dbId) {
    setPatients((prev) => prev.filter((p) => (p.dbId || p.id) !== dbId));
    setSelectedPatient(null);
    showToast("ลบข้อมูลเรียบร้อย");

    if (dbStatus !== "unconfigured") {
      try {
        await supabase.from("patients").delete().eq("id", dbId);
      } catch {
        // Ignore network errors in offline/sandbox mode
      }
    }
  }

  function handleInspectPatient(patient) {
    setSelectedPatient(patient);
    navigatePage("staff-patients");
  }

  function handleLookupTicket(query) {
    const clean = query.trim().toLowerCase();
    if (!clean) {
      showToast("กรุณากรอกชื่อ เบอร์โทรศัพท์ หรือรหัสผู้ป่วย (HN)", "error");
      return;
    }
    const found = patients.find(
      (p) =>
        (p.hn && p.hn.toLowerCase().includes(clean)) ||
        (p.phone && p.phone.replace(/-/g, "").includes(clean.replace(/-/g, ""))) ||
        (p.queueNumber && p.queueNumber.toLowerCase() === clean) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(clean)
    );

    if (found) {
      setActiveTicket(found);
      navigatePage("ticket", found);
    } else {
      showToast("ไม่พบข้อมูลคิวของผู้ป่วยที่ระบุ", "error");
    }
  }

  function handleStaffAccessClick() {
    if (isStaffAuthenticated) {
      navigatePage("staff-dashboard");
    } else {
      setShowStaffLoginModal(true);
    }
  }

  function handleStaffLogout() {
    setIsStaffAuthenticated(false);
    setSelectedPatient(null);
    navigatePage("home");
    showToast("ออกจากระบบเจ้าหน้าที่แล้ว");
  }

  const isStaffView = page.startsWith("staff-");
  const hasActiveA11y =
    a11y.fontScale !== "normal" || a11y.highContrast || a11y.largeTargets || a11y.autoRead;

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", color: "#0F172A", paddingBottom: "3rem" }}>
      <a href="#main-content" className="skip-link">
        ข้ามไปยังเนื้อหาหลัก (Skip to main content)
      </a>

      <nav
        aria-label="แถบนำทางหลัก"
        className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 py-2.5"
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <button
            onClick={() => navigatePage(isStaffView ? "staff-dashboard" : "home")}
            className="flex items-center gap-2.5 text-left bg-transparent border-0 cursor-pointer p-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-900">
              <Activity className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight">
                JOE&apos;s i-MED
              </div>
              <div className="text-xs text-slate-500">
                {isStaffView ? "ระบบจัดการคิวและคัดกรอง (สำหรับเจ้าหน้าที่)" : "ระบบประเมินอาการและออกบัตรคิวผู้ป่วย"}
              </div>
            </div>
          </button>

          {isStaffAuthenticated && <DbStatusBadge status={dbStatus} onRetry={fetchPatients} />}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!isStaffView ? (
            <>
              {[
                ["home", "หน้าแรกผู้ป่วย"],
                ["intake", "ประเมินอาการ"],
                ["ticket", "บัตรคิวของฉัน"],
              ].map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => navigatePage(k)}
                  aria-current={page === k ? "page" : undefined}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
                    page === k
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {v}
                </button>
              ))}

              <div className="mx-1.5 h-4 w-px bg-slate-200 hidden sm:block" />

              <AccessibilityToolbar
                a11y={a11y}
                setA11y={setA11y}
                isOpen={showA11yMenu}
                setIsOpen={setShowA11yMenu}
                hasActiveA11y={hasActiveA11y}
                isSpeaking={isSpeaking}
                onSpeakCurrentPage={() => speakThai(getPageSpeechSummary(page, activeTicket))}
                onStopSpeech={stopSpeech}
                onReset={() => {
                  setA11y(DEFAULT_A11Y);
                  stopSpeech();
                  showToast("รีเซ็ตการตั้งค่าการเข้าถึงเป็นค่าเริ่มต้นแล้ว");
                }}
              />

              <button
                onClick={handleStaffAccessClick}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                {isStaffAuthenticated ? "แดชบอร์ดเจ้าหน้าที่" : "สำหรับบุคลากร"}
              </button>
            </>
          ) : (
            <>
              {[
                ["staff-dashboard", "ภาพรวมคัดกรอง"],
                ["staff-appointments", "คิวนัดหมาย"],
                ["staff-patients", "รายชื่อผู้ป่วยทั้งหมด"],
              ].map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => navigatePage(k)}
                  aria-current={page === k ? "page" : undefined}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
                    page === k
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {v}
                </button>
              ))}

              <div className="mx-1.5 h-4 w-px bg-slate-200 hidden sm:block" />

              <AccessibilityToolbar
                a11y={a11y}
                setA11y={setA11y}
                isOpen={showA11yMenu}
                setIsOpen={setShowA11yMenu}
                hasActiveA11y={hasActiveA11y}
                isSpeaking={isSpeaking}
                onSpeakCurrentPage={() => speakThai(getPageSpeechSummary(page, activeTicket))}
                onStopSpeech={stopSpeech}
                onReset={() => {
                  setA11y(DEFAULT_A11Y);
                  stopSpeech();
                  showToast("รีเซ็ตการตั้งค่าการเข้าถึงเป็นค่าเริ่มต้นแล้ว");
                }}
              />

              <button
                onClick={() => navigatePage("home")}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                สลับไปหน้าผู้ป่วย
              </button>

              <button
                onClick={handleStaffLogout}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </>
          )}
        </div>
      </nav>

      <main id="main-content" key={page} className="page-transition">
        {/* ─── PATIENT PORTAL VIEWS ─── */}
        {page === "home" && (
          <PatientHomePage
            setPage={navigatePage}
            activeTicket={activeTicket}
            onLookupTicket={handleLookupTicket}
            isSpeaking={isSpeaking}
            onSpeakPage={() => speakThai(getPageSpeechSummary("home", activeTicket))}
            onStopSpeech={stopSpeech}
            onTriggerSOS={() => {
              const sosMsg = "ส่งสัญญาณฉุกเฉิน SOS เรียกพยาบาลแล้ว เจ้าหน้าที่กำลังเดินทางมายังจุดคัดกรอง";
              showToast(sosMsg, "error");
              if (a11y.autoRead) speakThai(sosMsg);
            }}
          />
        )}
        {page === "intake" && (
          <IntakePage
            onSubmit={addPatient}
            isSpeaking={isSpeaking}
            onSpeak={speakThai}
            onStopSpeech={stopSpeech}
          />
        )}
        {page === "ticket" && (
          <PatientTicketPage
            ticket={activeTicket}
            isSpeaking={isSpeaking}
            onSpeakTicket={() => speakThai(getPageSpeechSummary("ticket", activeTicket))}
            onStopSpeech={stopSpeech}
            onStartNew={() => {
              setActiveTicket(null);
              navigatePage("home", null);
            }}
            onGoToIntake={() => navigatePage("intake")}
            onLookupTicket={handleLookupTicket}
            onTriggerSOS={() => {
              const sosMsg = "ส่งสัญญาณฉุกเฉิน SOS เรียกพยาบาลแล้ว เจ้าหน้าที่กำลังเดินทางมายังจุดคัดกรอง";
              showToast(sosMsg, "error");
              if (a11y.autoRead) speakThai(sosMsg);
            }}
          />
        )}

        {/* ─── PROTECTED STAFF VIEWS ─── */}
        {page === "staff-dashboard" && isStaffAuthenticated && (
          <StaffDashboardHome
            setPage={navigatePage}
            patients={patients}
            dbStatus={dbStatus}
            onInspectPatient={handleInspectPatient}
            onDeletePatient={deletePatient}
            onTriggerSOS={() => showToast("ส่งสัญญาณฉุกเฉิน SOS เรียกพยาบาลประจำจุดแล้ว", "error")}
          />
        )}
        {page === "staff-appointments" && isStaffAuthenticated && (
          <AppointmentsPage
            appointments={appointments}
            onUpdateAppointment={updateAppointmentStatus}
          />
        )}
        {page === "staff-patients" && isStaffAuthenticated && (
          <DashboardPage
            patients={patients}
            selected={selectedPatient}
            onSelect={setSelectedPatient}
            onDelete={deletePatient}
            onRefresh={fetchPatients}
            dbStatus={dbStatus}
          />
        )}
      </main>

      {/* ─── STAFF LOGIN MODAL ─── */}
      {showStaffLoginModal && (
        <StaffLoginModal
          onClose={() => setShowStaffLoginModal(false)}
          onSuccess={() => {
            setIsStaffAuthenticated(true);
            setShowStaffLoginModal(false);
            navigatePage("staff-dashboard");
            showToast("เข้าสู่ระบบสำหรับบุคลากรเรียบร้อยแล้ว");
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "10px 16px",
            borderRadius: "6px",
            backgroundColor: toast.type === "error" ? "#DC2626" : "#0F172A",
            color: "#FFFFFF",
            fontSize: "0.875rem",
            fontWeight: 600,
            border: toast.type === "error" ? "1px solid #B91C1C" : "1px solid #0F172A",
            zIndex: 1000,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── CLINICAL ACCESSIBILITY TOOLBAR (WCAG / HOSPITAL KIOSK) ───────────────────
function AccessibilityToolbar({
  a11y,
  setA11y,
  isOpen,
  setIsOpen,
  hasActiveA11y,
  isSpeaking,
  onSpeakCurrentPage,
  onStopSpeech,
  onReset,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="ตั้งค่าตัวช่วยการเข้าถึงสำหรับผู้พิการและผู้สูงอายุ"
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          hasActiveA11y || isOpen
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <Accessibility className="w-3.5 h-3.5" />
        <span>ตัวช่วยการเข้าถึง</span>
        {hasActiveA11y && (
          <span className="ml-0.5 rounded bg-white/20 px-1 py-0.2 text-[10px] font-bold">
            เปิดอยู่
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="เมนูตัวช่วยการเข้าถึง (Accessibility)"
            className="absolute right-0 mt-2 w-80 sm:w-88 rounded-md border border-slate-300 bg-white p-4 z-50 text-slate-900"
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <Accessibility className="w-4 h-4 text-slate-900" />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  ตัวช่วยการเข้าถึง (ผู้สูงอายุ / ผู้พิการ)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="ปิดเมนูตัวช่วยการเข้าถึง"
                className="rounded px-1.5 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            {/* 1. Font Size Scaling */}
            <div className="mb-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-1.5">
                <Type className="w-3.5 h-3.5 text-slate-600" />
                <span>ขนาดตัวอักษร (สำหรับผู้สายตาเลือนราง)</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["normal", "ก ปกติ"],
                  ["lg", "ก+ ใหญ่"],
                  ["xl", "ก++ ใหญ่พิเศษ"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setA11y((prev) => ({ ...prev, fontScale: val }))}
                    className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      a11y.fontScale === val
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. High Contrast & Large Touch Targets */}
            <div className="space-y-2 mb-3.5">
              <button
                type="button"
                onClick={() => setA11y((prev) => ({ ...prev, highContrast: !prev.highContrast }))}
                aria-pressed={a11y.highContrast}
                className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  a11y.highContrast
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>โหมดความคมชัดสูง (High Contrast)</span>
                </span>
                <span className="text-[11px] font-bold">
                  {a11y.highContrast ? "เปิด" : "ปิด"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setA11y((prev) => ({ ...prev, largeTargets: !prev.largeTargets }))}
                aria-pressed={a11y.largeTargets}
                className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  a11y.largeTargets
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                  <span>ปุ่มกดขนาดใหญ่ (ลดการกดพลาด/มือสั่น)</span>
                </span>
                <span className="text-[11px] font-bold">
                  {a11y.largeTargets ? "เปิด" : "ปิด"}
                </span>
              </button>
            </div>

            {/* 3. Thai Text-to-Speech (Audio Assist) */}
            <div className="pt-3 border-t border-slate-200 mb-3">
              <div className="text-xs font-semibold text-slate-800 mb-2">
                ระบบเสียงอ่านภาษาไทย (สำหรับผู้มีปัญหาทางการมองเห็น)
              </div>
              <div className="flex gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={isSpeaking ? onStopSpeech : onSpeakCurrentPage}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    isSpeaking
                      ? "border border-red-700 bg-red-600 text-white hover:bg-red-700"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>หยุดเสียงอ่าน</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>อ่านข้อมูลหน้านี้ให้ฟัง</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setA11y((prev) => ({ ...prev, autoRead: !prev.autoRead }))}
                aria-pressed={a11y.autoRead}
                className={`w-full flex items-center justify-between rounded-md border px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                  a11y.autoRead
                    ? "border-slate-900 bg-slate-100 text-slate-900 font-semibold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>อ่านออกเสียงอัตโนมัติเมื่อเปลี่ยนหน้า/รับคิว</span>
                <span className="font-bold">{a11y.autoRead ? "เปิด" : "ปิด"}</span>
              </button>
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={onReset}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white py-1.5 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตการตั้งค่าทั้งหมดเป็นค่าเริ่มต้น</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PATIENT PORTAL: HOME PAGE ────────────────────────────────────────────────
function PatientHomePage({
  setPage,
  activeTicket,
  onLookupTicket,
  onTriggerSOS,
  isSpeaking,
  onSpeakPage,
  onStopSpeech,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(e) {
    e.preventDefault();
    onLookupTicket(searchQuery);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Consolidated Header with Action Callouts */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            ระบบคัดกรองผู้ป่วย JOE&apos;s i-MED
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-normal">
            บริการประเมินอาการเบื้องต้นด้วยตนเอง เพื่อแนะนำแผนกตรวจที่เหมาะสมและรับบัตรคิวอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onSpeakPage && (
            <button
              type="button"
              onClick={isSpeaking ? onStopSpeech : onSpeakPage}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4 text-red-600" />
                  <span>หยุดเสียงอ่าน</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-slate-700" />
                  <span>ฟังคำแนะนำ</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setPage("intake")}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ เริ่มประเมินอาการ</span>
          </button>

          <button
            onClick={onTriggerSOS}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-700 bg-red-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <span>🚨</span>
            <span>SOS เรียกพยาบาล</span>
          </button>
        </div>
      </header>

      {/* Sleek, Single-Line Horizontal Emergency Alert Ribbon */}
      <div className="mb-5 flex items-center gap-2.5 rounded-md border border-red-200 bg-red-50/90 px-3.5 py-2 text-xs sm:text-sm text-red-900">
        <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-normal">
          <strong className="font-semibold text-red-950">กรณีฉุกเฉินวิกฤต:</strong>
          <span className="text-red-800">
            หากมีอาการแน่นหน้าอกรุนแรง หายใจไม่ออก ซึมลง หรือหมดสติเฉียบพลัน โปรดกดปุ่ม <strong className="font-semibold text-red-950">SOS เรียกพยาบาล</strong> ด้านบน หรือแจ้งพยาบาลประจำจุดคัดกรองทันที
          </span>
        </div>
      </div>

      {/* Balanced Anti-Slop Two-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left: Primary Self-Screening Container (md:col-span-7) */}
        <div className="md:col-span-7 flex flex-col justify-between rounded-md border border-slate-200 bg-white p-5 sm:p-6">
          <div>
            <div className="mb-3.5 inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>บริการคัดกรองด้วยตนเอง</span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">
              ลงทะเบียนและประเมินอาการเบื้องต้น
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              กรอกข้อมูลอาการป่วยและสัญญาณชีพเบื้องต้นเพื่อให้ระบบ AI ช่วยประเมินความเร่งด่วน แนะนำแผนกตรวจเฉพาะทาง และออกหมายเลขคิวเข้าพบแพทย์
            </p>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 mb-4">
              <div className="text-xs font-semibold text-slate-900 mb-2">
                ข้อมูลที่ใช้ในการประเมิน (ใช้เวลาประมาณ 2 นาที):
              </div>
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                  <span>ชื่อ-นามสกุล อายุ และสิทธิ์การรักษาพยาบาล</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                  <span>อาการสำคัญที่นำมาโรงพยาบาลและระยะเวลาที่เป็น</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                  <span>ประวัติโรคประจำตัวและประวัติการแพ้ยา (ถ้ามี)</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setPage("intake")}
            className="w-full mt-4 rounded-md bg-slate-900 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors text-center"
          >
            เริ่มทำแบบประเมินอาการ →
          </button>
        </div>

        {/* Right: Search Stack + Repositioned Guidance Card (md:col-span-5) */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4">
          {activeTicket ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                บัตรคิวล่าสุดในเครื่องนี้
              </div>
              <div className="flex items-center justify-between my-1">
                <div className="text-2xl font-bold text-slate-900">
                  {activeTicket.queueNumber}
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    activeTicket.severity === "high"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-slate-100 text-slate-800 border border-slate-200"
                  }`}
                >
                  แผนก{activeTicket.department || "อายุรกรรม"}
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-3">
                ผู้ป่วย: {activeTicket.firstName} {activeTicket.lastName}
              </div>
              <button
                onClick={() => setPage("ticket")}
                className="w-full rounded-md bg-slate-900 py-2 px-3 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
              >
                เปิดดูบัตรคิวของฉัน
              </button>
            </div>
          ) : null}

          {/* Search Card */}
          <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Search className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                ตรวจสอบสถานะคิว / บัตรคิวเดิม
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              ค้นหาบัตรคิวหรือผลการประเมินของท่านด้วยชื่อ เบอร์โทรศัพท์ หรือรหัสผู้ป่วย (HN)
            </p>

            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="เช่น HN-670189, 089-456-1230 หรือชื่อ"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 transition-colors"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 py-1.5 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                ค้นหาบัตรคิว
              </button>
            </form>
          </div>

          {/* Repositioned Guidance Card seated perfectly beneath search box card */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-slate-900 mb-1">
              คำแนะนำสำหรับผู้รับบริการ
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              หลังประเมินอาการเสร็จสิ้น ท่านจะได้รับหมายเลขคิวพร้อมแผนกตรวจ สามารถนำหมายเลขคิวไปแสดงที่จุดซักประวัติของแผนกได้ทันที
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PATIENT PORTAL: DIGITAL QUEUE TICKET PAGE ────────────────────────────────
function PatientTicketPage({
  ticket,
  onStartNew,
  onGoToIntake,
  onLookupTicket,
  onTriggerSOS,
  isSpeaking,
  onSpeakTicket,
  onStopSpeech,
}) {
  const [lookupInput, setLookupInput] = useState("");

  if (!ticket) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-md border border-slate-200 bg-white p-6 sm:p-8 text-center">
          <Ticket className="w-4 h-4 text-slate-700 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">
            ยังไม่มีบัตรคิวที่กำลังเปิดดู
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-5">
            ท่านสามารถเริ่มทำแบบประเมินอาการใหม่เพื่อรับบัตรคิว หรือค้นหาบัตรคิวที่ได้ลงทะเบียนไว้แล้ว
          </p>

          <div className="flex gap-2 max-w-sm mx-auto mb-4">
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="กรอกชื่อ, เบอร์โทร หรือ HN"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
            <button
              onClick={() => onLookupTicket(lookupInput)}
              className="rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              ค้นหา
            </button>
          </div>

          <button
            onClick={onGoToIntake}
            className="rounded-md bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            + เริ่มทำแบบประเมินอาการใหม่
          </button>
        </div>
      </div>
    );
  }

  const aiResult = parseAIResult(ticket.aiAnalysis);
  const isHighRisk = ticket.severity === "high" || aiResult?.risk_level === "ฉุกเฉิน";
  const symLabels = (ticket.symptoms || [])
    .map((s) => SYMPTOMS.find((x) => x.id === s)?.label)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {isHighRisk && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-900 flex-wrap">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="font-semibold text-red-950">เคสความเสี่ยงสูง: </span>
              <span className="text-red-800">กรุณาติดต่อเคาน์เตอร์พยาบาลฉุกเฉินทันทีโดยไม่ต้องรอเรียกคิวปกติ</span>
            </div>
          </div>
          <button
            onClick={onTriggerSOS}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-700 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
          >
            <span>🚨</span>
            <span>SOS เรียกพยาบาลฉุกเฉิน</span>
          </button>
        </div>
      )}

      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        {/* Ticket Top Header */}
        <div
          style={{
            backgroundColor: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            padding: "1.25rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
              บัตรคิวอิเล็กทรอนิกส์ · JOE&apos;s i-MED
            </div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
              {ticket.firstName} {ticket.lastName}
            </h1>
            <div style={{ fontSize: "0.825rem", color: "#64748B", marginTop: "2px" }}>
              รหัสอ้างอิง: {ticket.hn || ticket.patientId} · เวลาออกคิว: {ticket.time}
            </div>
          </div>

          <div
            style={{
              backgroundColor: isHighRisk ? "#FEF2F2" : "#FFFFFF",
              border: isHighRisk ? "1px solid #FECACA" : "1px solid #CBD5E1",
              borderRadius: "6px",
              padding: "0.75rem 1.25rem",
              textAlign: "center",
              minWidth: "140px",
            }}
          >
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: isHighRisk ? "#991B1B" : "#64748B" }}>
              หมายเลขคิวของคุณ
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: isHighRisk ? "#DC2626" : "#0F172A", lineHeight: 1.1, marginTop: "2px" }}>
              {ticket.queueNumber || "A-045"}
            </div>
          </div>
        </div>

        {/* Ticket Body */}
        <div style={{ padding: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              paddingBottom: "1.25rem",
              marginBottom: "1.25rem",
              borderBottom: "1px solid #E2E8F0",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>แผนกที่แนะนำให้เข้ารับบริการ</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F172A", marginTop: "4px" }}>
                แผนก{ticket.department || aiResult?.recommended_specialty || "อายุรกรรม / แพทย์ทั่วไป"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>ระดับความเร่งด่วน</div>
              <div style={{ marginTop: "4px" }}>
                <span
                  style={{
                    display: "inline-block",
                    backgroundColor: isHighRisk ? "#FEF2F2" : "#F1F5F9",
                    color: isHighRisk ? "#991B1B" : "#0F172A",
                    border: isHighRisk ? "1px solid #FECACA" : "1px solid #CBD5E1",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  {isHighRisk ? "เคสความเสี่ยงสูง (เร่งด่วน)" : ticket.severity === "mid" ? "ความเสี่ยงปานกลาง" : "ทั่วไป (ตามลำดับคิว)"}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>สิทธิ์การรักษาพยาบาล</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0F172A", marginTop: "4px" }}>
                {ticket.benefitType || "แจ้งที่จุดลงทะเบียน"}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.35rem" }}>
              อาการที่แจ้งคัดกรอง
            </div>
            <div style={{ fontSize: "0.9rem", color: "#0F172A" }}>
              {symLabels || "—"} {ticket.chiefComplaint ? `(${ticket.chiefComplaint})` : ""}
            </div>
          </div>

          {aiResult && aiResult.mode === "result_mode" && (
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.4rem" }}>
                คำแนะนำเบื้องต้นจากระบบวิเคราะห์อาการ (AI)
              </div>
              <p style={{ fontSize: "0.875rem", color: "#0F172A", lineHeight: 1.6, marginBottom: "0.65rem" }}>
                {aiResult.summary}
              </p>
              {Array.isArray(aiResult.next_steps) && aiResult.next_steps.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem", color: "#0F172A", lineHeight: 1.6 }}>
                  {aiResult.next_steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Pre-consultation patient checklist */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.4rem" }}>
              ขั้นตอนการเข้ารับบริการสำหรับผู้ป่วย
            </div>
            <ol style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem", color: "#64748B", lineHeight: 1.7 }}>
              <li>เตรียมบัตรประจำตัวประชาชน และเอกสารสิทธิ์การรักษาให้พร้อม</li>
              <li>เดินทางไปยังจุดซักประวัติของ <strong style={{ color: "#0F172A" }}>แผนก{ticket.department || "อายุรกรรม"}</strong></li>
              <li>หากมีอาการผิดปกติรุนแรงขึ้นระหว่างรอคิว กรุณาแจ้งพยาบาลประจำจุดคัดกรองทันที</li>
            </ol>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                onClick={() => window.print()}
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#0F172A",
                  border: "1px solid #CBD5E1",
                  borderRadius: "6px",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                พิมพ์บัตรคิว / บันทึกหน้าจอ
              </button>

              {onSpeakTicket && (
                <button
                  type="button"
                  onClick={isSpeaking ? onStopSpeech : onSpeakTicket}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4 text-red-600" />
                      <span>หยุดเสียงอ่าน</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-slate-800" />
                      <span>อ่านข้อมูลบัตรคิวให้ฟัง</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              onClick={onStartNew}
              style={{
                backgroundColor: "#0F172A",
                color: "#FFFFFF",
                border: "1px solid #0F172A",
                borderRadius: "6px",
                padding: "0.6rem 1.25rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              เสร็จสิ้น (ปิดหน้าข้อมูลเพื่อความเป็นส่วนตัว)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STAFF LOGIN MODAL ────────────────────────────────────────────────────────
function StaffLoginModal({ onClose, onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (pin === "1234" || pin.toLowerCase() === "admin") {
      onSuccess();
    } else {
      setError("รหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง (รหัสทดสอบ: 1234)");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 200,
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "6px",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Lock className="w-4 h-4 text-slate-900" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F172A" }}>
              เข้าสู่ระบบสำหรับบุคลากร
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#64748B", marginBottom: "1rem", lineHeight: 1.5 }}>
          เฉพาะแพทย์ พยาบาล และเจ้าหน้าที่เวชระเบียน กรุณากรอกรหัสผ่านเพื่อเข้าถึงแดชบอร์ดจัดการผู้ป่วย
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#0F172A",
                marginBottom: "0.35rem",
              }}
            >
              รหัสประจำตัวเจ้าหน้าที่ (PIN)
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              placeholder="กรอกรหัสผ่าน (เช่น 1234)"
              autoFocus
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "0.9rem",
                color: "#0F172A",
                outline: "none",
              }}
            />
            <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "4px" }}>
              รหัสผ่านสำหรับทดสอบระบบ: <code>1234</code>
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: "#FFFFFF",
                color: "#0F172A",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                padding: "0.55rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: "#0F172A",
                color: "#FFFFFF",
                border: "1px solid #0F172A",
                borderRadius: "6px",
                padding: "0.55rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DB STATUS UTILITY BADGE ──────────────────────────────────────────────────
function DbStatusBadge({ status, onRetry }) {
  const baseBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 500,
    backgroundColor: "#F8FAFC",
    color: "#64748B",
    border: "1px solid #E2E8F0",
  };

  if (status === "loading") {
    return (
      <span style={baseBadgeStyle}>
        <Database className="w-3.5 h-3.5 text-slate-500" />
        <span>ฐานข้อมูล: กำลังเชื่อมต่อ...</span>
      </span>
    );
  }

  if (status === "unconfigured") {
    return (
      <span style={baseBadgeStyle}>
        <Database className="w-3.5 h-3.5 text-slate-500" />
        <span>ฐานข้อมูล: ยังไม่ตั้งค่า DB</span>
      </span>
    );
  }

  if (status === "error") {
    return (
      <button onClick={onRetry} style={{ ...baseBadgeStyle, cursor: "pointer" }}>
        <Database className="w-3.5 h-3.5 text-slate-500" />
        <span>ฐานข้อมูล: เชื่อมต่อใหม่</span>
      </button>
    );
  }

  return (
    <span style={baseBadgeStyle} title="พร้อมใช้งานสำหรับทีมแพทย์">
      <Database className="w-3.5 h-3.5 text-slate-900" />
      <span style={{ color: "#0F172A", fontWeight: 600 }}>ฐานข้อมูล: เชื่อมต่อ</span>
      <span style={{ color: "#64748B" }}>· พร้อมใช้งาน</span>
    </span>
  );
}

// ─── STAFF CLINICAL DASHBOARD HOME ────────────────────────────────────────────
function StaffDashboardHome({ setPage, patients, dbStatus, onInspectPatient, onDeletePatient, onTriggerSOS }) {
  const highRiskPatients = patients.filter((p) => p.severity === "high");
  const highCount = highRiskPatients.length;
  const isUnconfigured = dbStatus === "unconfigured";

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {isUnconfigured && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.875rem 1rem",
            borderRadius: "6px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            color: "#0F172A",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <Database className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: "0.9rem", fontWeight: 600, color: "#0F172A" }}>
                ยังไม่ได้เชื่อมต่อ Supabase
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748B" }}>
                สร้างโปรเจกต์ที่ <strong>supabase.com</strong> แล้วใส่ <code>VITE_SUPABASE_URL</code> และ{" "}
                <code>VITE_SUPABASE_ANON_KEY</code> ใน <code>.env</code> (ต้องตั้งค่า Supabase ก่อนใช้งาน)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Minimalist Flat Page Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "1.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              marginBottom: "0.35rem",
            }}
          >
            ระบบคัดกรองผู้ป่วย JOE&apos;s i-MED
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.5 }}>
            วิเคราะห์อาการด้วย AI แนะนำแผนกที่เหมาะสม ลดเวลารอ และเพิ่มประสิทธิภาพการรักษา
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setPage("intake")}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            + เริ่มคัดกรองใหม่
          </button>

          <button
            onClick={onTriggerSOS}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-700 bg-red-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <span>🚨</span>
            <span>SOS เรียกพยาบาล</span>
          </button>
        </div>
      </header>

      {/* Asymmetric Clinical Metrics Layout: Simple Number Card + Prominent Flat Red Alert Banner */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 280px) 1fr",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {/* Total Patients: Simple, clean number card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748B" }}>
            ผู้ป่วยทั้งหมด
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.1, margin: "0.5rem 0" }}>
            {patients.length}
          </div>
          <div style={{ fontSize: "0.825rem", color: "#64748B" }}>
            ผู้ป่วยที่บันทึกแล้ว
          </div>
        </div>

        {/* High Risk Cases: Prominent, flat alert banner with solid light-red background */}
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "6px",
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#991B1B" }}>
                  เคสความเสี่ยงสูง
                </span>
                <span
                  style={{
                    backgroundColor: "#DC2626",
                    color: "#FFFFFF",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  ต้องเฝ้าระวังพิเศษ
                </span>
              </div>
              <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#7F1D1D" }}>
                จำนวนเคสที่ต้องรีบดูแลในขณะนี้ — โปรดตรวจสอบสัญญาณชีพและส่งต่อแผนกฉุกเฉินทันที
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#DC2626", lineHeight: 1 }}>
                {highCount}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#991B1B", marginTop: "4px" }}>
                รายการฉุกเฉิน
              </div>
            </div>
            <button
              onClick={() => setPage("staff-patients")}
              style={{
                backgroundColor: "#DC2626",
                color: "#FFFFFF",
                border: "1px solid #B91C1C",
                borderRadius: "6px",
                padding: "0.55rem 0.9rem",
                fontSize: "0.825rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ตรวจสอบเคสเร่งด่วน
            </button>
          </div>
        </div>
      </section>

      {/* Clean, Flat Recent Patients Data Table */}
      <RecentPatientsTable
        patients={patients}
        onInspectPatient={onInspectPatient}
        onDeletePatient={onDeletePatient}
        onStartIntake={() => setPage("intake")}
        onViewAll={() => setPage("staff-patients")}
      />
    </div>
  );
}

// ─── RECENT PATIENTS DATA TABLE ───────────────────────────────────────────────
function RecentPatientsTable({
  patients,
  onInspectPatient,
  onDeletePatient,
  onStartIntake,
  onViewAll,
}) {
  const recentPatients = patients.slice(0, 8);

  function getSymptomText(patient) {
    const labels = (patient.symptoms || [])
      .map((s) => SYMPTOMS.find((x) => x.id === s)?.label)
      .filter(Boolean)
      .join(", ");
    if (labels && patient.chiefComplaint) {
      return `${labels} — ${patient.chiefComplaint}`;
    }
    return labels || patient.chiefComplaint || "ไม่ระบุอาการ";
  }

  function renderRiskBadge(severity) {
    if (severity === "high") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #FECACA",
            borderRadius: "4px",
            padding: "3px 8px",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          เคสความเสี่ยงสูง (รุนแรง)
        </span>
      );
    }

    if (severity === "mid") {
      return (
        <span
          style={{
            display: "inline-block",
            backgroundColor: "#F1F5F9",
            color: "#0F172A",
            border: "1px solid #CBD5E1",
            borderRadius: "4px",
            padding: "3px 8px",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          ความเสี่ยงปานกลาง
        </span>
      );
    }

    return (
      <span
        style={{
          display: "inline-block",
          backgroundColor: "#F8FAFC",
          color: "#64748B",
          border: "1px solid #E2E8F0",
          borderRadius: "4px",
          padding: "3px 8px",
          fontSize: "0.75rem",
          fontWeight: 500,
        }}
      >
        ความเสี่ยงต่ำ (ทั่วไป)
      </span>
    );
  }

  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F172A" }}>
            รายชื่อผู้ป่วยที่คัดกรองล่าสุด
          </h2>
          <p style={{ fontSize: "0.825rem", color: "#64748B", marginTop: "2px" }}>
            ตารางแสดงข้อมูลผู้ป่วย อาการเบื้องต้น ระดับความเสี่ยง และการจัดการคิวตรวจ
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={onStartIntake}
            style={{
              backgroundColor: "#FFFFFF",
              color: "#0F172A",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              padding: "0.45rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + เริ่มคัดกรอง
          </button>
          <button
            onClick={onViewAll}
            style={{
              backgroundColor: "#F8FAFC",
              color: "#0F172A",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "0.45rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ดูผู้ป่วยทั้งหมด ({patients.length})
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "0.875rem",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                color: "#64748B",
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <th style={{ padding: "0.75rem 1.25rem" }}>ชื่อ-นามสกุล</th>
              <th style={{ padding: "0.75rem 1rem" }}>อายุ</th>
              <th style={{ padding: "0.75rem 1rem" }}>อาการ</th>
              <th style={{ padding: "0.75rem 1rem" }}>ระดับความเสี่ยง</th>
              <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {recentPatients.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "2.5rem 1.25rem",
                    textAlign: "center",
                    color: "#64748B",
                    fontSize: "0.9rem",
                  }}
                >
                  ยังไม่มีข้อมูลผู้ป่วยในระบบ กรุณากดปุ่ม &ldquo;เริ่มคัดกรองใหม่&rdquo; เพื่อบันทึกข้อมูล
                </td>
              </tr>
            ) : (
              recentPatients.map((patient) => (
                <tr
                  key={patient.dbId || patient.id}
                  style={{
                    borderBottom: "1px solid #E2E8F0",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <td style={{ padding: "0.85rem 1.25rem", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "2px" }}>
                      คิว {patient.queueNumber || "—"} · {patient.hn || patient.patientId || `ID-${patient.id}`} · แผนก{patient.department || "ยังไม่ระบุ"}
                    </div>
                  </td>

                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", color: "#0F172A", whiteSpace: "nowrap" }}>
                    <div>{patient.age ? `${patient.age} ปี` : "—"}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{patient.gender || "ไม่ระบุ"}</div>
                  </td>

                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", color: "#0F172A", maxWidth: "360px" }}>
                    <div style={{ lineHeight: 1.45 }}>{getSymptomText(patient)}</div>
                    {(patient.bp || patient.temp) && (
                      <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "2px" }}>
                        {patient.bp ? `ความดัน ${patient.bp} mmHg` : ""}
                        {patient.bp && patient.temp ? " · " : ""}
                        {patient.temp ? `อุณหภูมิ ${patient.temp}°C` : ""}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {renderRiskBadge(patient.severity)}
                  </td>

                  <td style={{ padding: "0.85rem 1.25rem", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <button
                        onClick={() => onInspectPatient(patient)}
                        style={{
                          backgroundColor: "#FFFFFF",
                          color: "#0F172A",
                          border: "1px solid #CBD5E1",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ดูข้อมูล
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`ยืนยันการลบข้อมูลผู้ป่วย ${patient.firstName}?`)) {
                            onDeletePatient(patient.dbId || patient.id);
                          }
                        }}
                        style={{
                          backgroundColor: "#F8FAFC",
                          color: "#64748B",
                          border: "1px solid #E2E8F0",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── APPOINTMENTS PAGE (STAFF) ────────────────────────────────────────────────
function AppointmentsPage({ appointments, onUpdateAppointment }) {
  const nextStatusMap = {
    "นัดหมายแล้ว": "ลงทะเบียนแล้ว",
    "ลงทะเบียนแล้ว": "รอพบแพทย์",
    "รอพบแพทย์": "กำลังตรวจ",
    "กำลังตรวจ": "เสร็จสิ้น",
    "เสร็จสิ้น": "เสร็จสิ้น",
  };

  function advanceStatus(id) {
    if (!onUpdateAppointment) return;
    const patient = appointments.find((item) => item.id === id);
    if (!patient) return;

    const next = nextStatusMap[patient.status] || "เสร็จสิ้น";
    onUpdateAppointment(id, next);
  }

  const activeCount = appointments.filter((item) => item.status !== "เสร็จสิ้น").length;
  const checkedIn = appointments.filter((item) => item.status === "ลงทะเบียนแล้ว").length;
  const waiting = appointments.filter((item) => item.status === "รอพบแพทย์" || item.status === "กำลังตรวจ").length;

  return (
    <div style={{ maxWidth: "1200px", margin: "2rem auto", padding: "0 1.5rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748B" }}>นัดหมายวันนี้ทั้งหมด</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.35rem" }}>{appointments.length}</div>
        </div>
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748B" }}>ลงทะเบียนแล้ว</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.35rem" }}>{checkedIn}</div>
        </div>
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748B" }}>รอพบแพทย์</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.35rem" }}>{waiting}</div>
        </div>
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748B" }}>คิวที่ดำเนินการอยู่</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#0F172A", marginTop: "0.35rem" }}>{activeCount}</div>
        </div>
      </div>

      <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748B" }}>รายการคิวนัดหมาย</div>
            <h2 style={{ margin: "0.25rem 0 0", fontSize: "1.35rem", fontWeight: 700, color: "#0F172A" }}>ผู้ป่วยที่มีนัดหมายแล้ว</h2>
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          {appointments.map((appointment, index) => (
            <div
              key={appointment.id}
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "1rem",
                backgroundColor: "#F8FAFC",
                display: "grid",
                gridTemplateColumns: "auto 1.2fr 1fr auto",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  color: "#0F172A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {index + 1}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F172A" }}>{appointment.patientName}</div>
                  <span
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: "#0F172A",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                    }}
                  >
                    {appointment.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#64748B" }}>
                  <span>เวลา: {appointment.time}</span>
                  <span>แผนก: {appointment.department}</span>
                  <span>สิทธิ์: {appointment.benefitType}</span>
                  <span>รหัส: #{appointment.id}</span>
                </div>
                {appointment.note && <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: "#64748B" }}>{appointment.note}</div>}
              </div>

              <div style={{ display: "grid", gap: "0.25rem", color: "#64748B", fontSize: "0.82rem" }}>
                <div><strong style={{ color: "#0F172A" }}>แผนกตรวจ:</strong> {appointment.department}</div>
                <div><strong style={{ color: "#0F172A" }}>เวลานัด:</strong> {appointment.time}</div>
                <div><strong style={{ color: "#0F172A" }}>ประเภท:</strong> ตรวจติดตามอาการ / คัดกรอง</div>
              </div>

              <button
                onClick={() => advanceStatus(appointment.id)}
                disabled={appointment.status === "เสร็จสิ้น"}
                style={{
                  border: "1px solid #0F172A",
                  cursor: appointment.status === "เสร็จสิ้น" ? "not-allowed" : "pointer",
                  borderRadius: "6px",
                  padding: "0.55rem 0.9rem",
                  backgroundColor: appointment.status === "เสร็จสิ้น" ? "#F1F5F9" : "#0F172A",
                  borderColor: appointment.status === "เสร็จสิ้น" ? "#E2E8F0" : "#0F172A",
                  color: appointment.status === "เสร็จสิ้น" ? "#64748B" : "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "0.825rem",
                  minWidth: "130px",
                }}
              >
                {appointment.status === "เสร็จสิ้น" ? "เสร็จสิ้นแล้ว" : "อัปเดตสถานะ"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── INTAKE PAGE (PATIENT SELF-SCREENING) ─────────────────────────────────────
function IntakePage({ onSubmit, isSpeaking, onSpeak, onStopSpeech }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSymptom = (s) =>
    set("symptoms", form.symptoms.includes(s) ? form.symptoms.filter((x) => x !== s) : [...form.symptoms, s]);

  const bmi = form.weight && form.height
    ? (parseFloat(form.weight) / Math.pow(parseFloat(form.height) / 100, 2)).toFixed(1)
    : "";

  async function analyzeSymptoms() {
    setAiLoading(true);
    setAiResult(null);
    const prompt = formatPatientPrompt(form, bmi);
    const result = await callAI(prompt, form);
    setAiResult(result);
    setAiLoading(false);
  }

  async function submit() {
    setSaving(true);
    const finalAI = aiResult || generateClinicalTriage(form);
    await onSubmit(form, finalAI);
    setSaving(false);
    setStep(0);
    setForm({ ...BLANK_FORM });
    setAiResult(null);
  }

  const canNext = [
    !!(form.firstName && form.lastName && form.age && form.gender),
    true,
    !!(form.symptoms.length > 0 && form.severity),
    true,
  ];

  const STEPS = ["ข้อมูลผู้ป่วย", "ข้อมูลสุขภาพเบื้องต้น", "ระบุอาการ", "สรุปผลและรับบัตรคิว"];
  const STEP_SPEECH = [
    "ขั้นตอนที่ 1 ข้อมูลผู้ป่วย กรุณากรอก ชื่อ นามสกุล อายุ เพศ และเลือกสิทธิ์การรักษาพยาบาล จากนั้นกดปุ่ม ถัดไป",
    "ขั้นตอนที่ 2 ข้อมูลสุขภาพเบื้องต้น กรอกความดันโลหิต ชีพจร อุณหภูมิ และน้ำหนักส่วนสูง หากไม่ได้วัดไว้ สามารถกดปุ่ม ถัดไป เพื่อข้ามขั้นตอนนี้ได้ทันที",
    "ขั้นตอนที่ 3 ระบุอาการ กรุณากดเลือกอาการที่ท่านเป็น เลือกระดับความรุนแรงของอาการ และอธิบายอาการสำคัญเพิ่มเติม",
    "ขั้นตอนที่ 4 สรุปผลและรับบัตรคิว ท่านสามารถกดปุ่ม วิเคราะห์อาการด้วย เอไอ เพื่อดูแผนกที่แนะนำ หรือกดปุ่ม ยืนยันข้อมูลและรับบัตรคิว ได้ทันที",
  ];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="page" style={{ maxWidth: "860px" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="section-title" style={{ marginBottom: 0 }}>
          แบบประเมินอาการเบื้องต้นสำหรับผู้ป่วย
        </div>
        {onSpeak && (
          <button
            type="button"
            onClick={isSpeaking ? onStopSpeech : () => onSpeak(STEP_SPEECH[step])}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-red-600" />
                <span>หยุดเสียงอ่าน</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                <span>ฟังคำแนะนำขั้นตอนที่ {step + 1}</span>
              </>
            )}
          </button>
        )}
      </div>
      <div className="intake-card">
        <div className="intake-steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`intake-step${i === step ? " active" : ""}${i < step ? " done" : ""}`} onClick={() => i < step && setStep(i)}>
              <div className="step-num">{i < step ? "✓" : i + 1}</div>
              {s}
            </div>
          ))}
        </div>

        <div className="intake-body">
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

          <div key={step} className="step-transition">
            {step === 0 && (
            <>
              <div className="field-row">
                <div className="field"><label>ชื่อ *</label><input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="ชื่อจริง" /></div>
                <div className="field"><label>นามสกุล *</label><input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="นามสกุล" /></div>
              </div>
              <div className="field-row three">
                <div className="field"><label>อายุ (ปี) *</label><input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="อายุ" /></div>
                <div className="field"><label>เพศ *</label>
                  <select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">เลือก</option>
                    <option>ชาย</option><option>หญิง</option><option>ไม่ระบุ</option>
                  </select>
                </div>
                <div className="field"><label>เบอร์โทรศัพท์ติดต่อ</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08x-xxx-xxxx" /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>รหัสผู้ป่วย (HN) หากเคยมีประวัติ</label><input value={form.hn} onChange={(e) => set("hn", e.target.value)} placeholder="เว้นว่างได้หากเป็นผู้ป่วยใหม่" /></div>
                <div className="field">
                  <label>สิทธิ์การรักษาพยาบาล</label>
                  <select value={form.benefitType} onChange={(e) => set("benefitType", e.target.value)}>
                    <option value="">เลือกสิทธิ์การรักษา</option>
                    <option value="ประกันสังคม">ประกันสังคม</option>
                    <option value="สิทธิสวัสดิการ">สิทธิสวัสดิการข้าราชการ</option>
                    <option value="บัตรทอง / สวัสดิการรัฐ">บัตรทอง / สวัสดิการรัฐ</option>
                    <option value="เบิกตรง / จ่ายเอง">ชำระเงินเอง / เบิกตรง</option>
                    <option value="ประกันภาคเอกชน">ประกันสุขภาพเอกชน</option>
                    <option value="ไม่มีสิทธิ์">ยังไม่แน่ใจสิทธิ์</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field"><label>ประวัติการแพ้ยา / แพ้อาหาร</label><input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="ระบุชื่อยาที่แพ้ หรือเว้นว่างหากไม่มี" /></div>
                <div className="field"><label>สิทธิ์ที่เลือก</label><input value={form.benefitType || "ยังไม่ได้เลือก"} readOnly style={{ background: "#F8FAFC" }} /></div>
              </div>
              <div className="field-row full">
                <div className="field"><label>โรคประจำตัวและยาที่ทานอยู่ปัจจุบัน</label><textarea value={form.medHistory} onChange={(e) => set("medHistory", e.target.value)} placeholder="เช่น เบาหวาน, ความดันโลหิตสูง หรือไม่มีโรคประจำตัว" /></div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ marginBottom: 16, fontSize: 13, color: "#64748B" }}>
                ข้อมูลสุขภาพและสัญญาณชีพเบื้องต้น (หากท่านไม่ได้วัดไว้ สามารถกด &ldquo;ถัดไป&rdquo; เพื่อข้ามขั้นตอนนี้ได้)
              </div>
              <div className="vitals-grid">
                {[["bp", "ความดันโลหิต", "mmHg"], ["pulse", "ชีพจร", "ครั้ง/นาที"], ["temp", "อุณหภูมิร่างกาย", "°C"], ["weight", "น้ำหนักตัว", "กิโลกรัม"]].map(([k, l, u]) => (
                  <div className="vital-card" key={k}>
                    <input
                      className="vital-val"
                      style={{ border: "none", outline: "none", width: "100%", background: "transparent" }}
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                      placeholder="—"
                    />
                    <div className="vital-unit">{u}</div>
                    <div className="vital-label">{l}</div>
                  </div>
                ))}
              </div>
              <div className="field-row">
                <div className="field"><label>ส่วนสูง (เซนติเมตร)</label><input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="เช่น 165" /></div>
                <div className="field"><label>ดัชนีมวลกาย (BMI อัตโนมัติ)</label><input readOnly value={bmi} placeholder="คำนวณอัตโนมัติ" style={{ background: "#F8FAFC" }} /></div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="field-row full" style={{ marginBottom: 16 }}>
                <div className="field"><label>อธิบายอาการสำคัญที่มาพบแพทย์</label><textarea value={form.chiefComplaint} onChange={(e) => set("chiefComplaint", e.target.value)} placeholder="ระบุอาการ เริ่มเป็นตั้งแต่เมื่อไหร่ หรืออาการร่วมอื่นๆ..." /></div>
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 8 }}>เลือกอาการที่ท่านพบ (เลือกได้มากกว่า 1 ข้อ) *</label>
              <div className="symptom-grid">
                {SYMPTOMS.map((s) => (
                  <div key={s.id} className={`symptom-chip${form.symptoms.includes(s.id) ? " selected" : ""}`} onClick={() => toggleSymptom(s.id)}>
                    {s.label}
                  </div>
                ))}
              </div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 8 }}>ระดับความรุนแรงของอาการที่ท่านรู้สึก *</label>
              <div className="severity-row">
                {[["low", "อาการเล็กน้อย (พอยืน/เดินได้ปกติ)"], ["mid", "อาการปานกลาง (รบกวนชีวิตประจำวัน)"], ["high", "อาการรุนแรง (เคสความเสี่ยงสูง)"]].map(([v, l]) => (
                  <button key={v} className={`sev-btn ${v}${form.severity === v ? " sel" : ""}`} onClick={() => set("severity", v)}>{l}</button>
                ))}
              </div>
              <div className="field" style={{ marginTop: 16 }}>
                <label>แผนกที่ต้องการเข้ารับการตรวจ (หากไม่ทราบ ให้ระบบแนะนำได้)</label>
                <select value={form.department} onChange={(e) => set("department", e.target.value)}>
                  <option value="">ให้ระบบ AI ช่วยแนะนำแผนกที่เหมาะสม</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "1rem", border: "1px solid #E2E8F0", marginBottom: "1rem" }}>
                <div style={{ marginBottom: "0.6rem", fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>ตรวจสอบข้อมูลก่อนรับบัตรคิว</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
                  {[
                    ["ชื่อ-สกุล", `${form.firstName} ${form.lastName}`],
                    ["อายุ / เพศ", `${form.age} ปี / ${form.gender}`],
                    ["อาการ", form.symptoms.map((s) => SYMPTOMS.find((x) => x.id === s)?.label).join(", ") || "-"],
                    ["ความรุนแรง", form.severity === "high" ? "รุนแรง (ความเสี่ยงสูง)" : form.severity === "mid" ? "ปานกลาง" : "เล็กน้อย"],
                    ["สิทธิ์การรักษา", form.benefitType || "ยังไม่ได้เลือก"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span style={{ fontSize: "0.8rem", color: "#64748B" }}>{k}: </span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0F172A" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {!aiResult && !aiLoading && (
                <button
                  className="btn"
                  style={{
                    width: "100%",
                    marginBottom: "1rem",
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    border: "1px solid #0F172A",
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                  onClick={analyzeSymptoms}
                >
                  ✦ วิเคราะห์อาการและแนะนำแผนกด้วย AI
                </button>
              )}
              {aiLoading && (
                <div className="ai-loading">กำลังวิเคราะห์อาการเบื้องต้น...</div>
              )}
              {aiResult && aiResult.status === "error" && (
                <div className="ai-result" style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}>
                  <div className="ai-result-header">หมายเหตุระบบวิเคราะห์ AI</div>
                  <div className="ai-text" style={{ whiteSpace: "pre-line", color: "#64748B" }}>
                    {aiResult.message} (ท่านสามารถกดปุ่ม &ldquo;ยืนยันและรับบัตรคิว&rdquo; ด้านล่างได้ทันที)
                  </div>
                </div>
              )}
              {aiResult && aiResult.status === "success" && aiResult.mode === "question_mode" && (
                <div className="ai-result">
                  <div className="ai-result-header">คำถามเพิ่มเติมเพื่อความแม่นยำ</div>
                  <div className="ai-question-list">
                    {aiResult.questions.map((question, index) => (
                      <div key={index} className="ai-question-card">
                        <div className="ai-question-index">{index + 1}</div>
                        <div className="ai-question-copy">{question}</div>
                      </div>
                    ))}
                  </div>
                  <div className="ai-result-note">ท่านสามารถกลับไปเพิ่มรายละเอียดอาการ หรือกดยืนยันรับบัตรคิวได้ทันที</div>
                  <button className="btn btn-ghost" style={{ marginTop: "0.75rem", fontSize: 13 }} onClick={() => setStep(2)}>กลับไปเพิ่มข้อมูลอาการ</button>
                </div>
              )}
              {aiResult && aiResult.status === "success" && aiResult.mode === "result_mode" && (
                <div className="ai-result">
                  <div className="ai-result-header">ผลการประเมินเบื้องต้นจาก AI</div>
                  <div className="ai-metrics-grid">
                    <div className="ai-metric-card">
                      <div className="ai-metric-label">ระดับความเสี่ยง</div>
                      <div className="ai-metric-value">{aiResult.risk_level}</div>
                    </div>
                    <div className="ai-metric-card">
                      <div className="ai-metric-label">แผนกที่แนะนำ</div>
                      <div className="ai-metric-value">{aiResult.recommended_specialty}</div>
                    </div>
                    <div className="ai-metric-card">
                      <div className="ai-metric-label">คะแนนความเร่งด่วน</div>
                      <div className="ai-metric-value">{aiResult.urgency_score}</div>
                    </div>
                  </div>
                  <div className="ai-summary-card">
                    <div className="ai-summary-title">คำแนะนำเบื้องต้น</div>
                    <div className="ai-summary-text">{aiResult.summary}</div>
                  </div>
                  <div className="ai-step-card">
                    <div className="ai-summary-title">การปฏิบัติตัวก่อนพบแพทย์</div>
                    <ul className="ai-step-list">
                      {aiResult.next_steps.map((stepText, index) => (
                        <li key={index}>{stepText}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
          </div>

          <div className="btn-row">
            {step > 0 && <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>← ย้อนกลับ</button>}
            {step < 3 && (
              <button className="btn btn-primary" disabled={!canNext[step]} onClick={() => setStep((s) => s + 1)}>ถัดไป →</button>
            )}
            {step === 3 && (
              <button className="btn btn-success" disabled={saving} onClick={submit}>
                {saving ? "กำลังออกบัตรคิว..." : "✓ ยืนยันข้อมูลและรับบัตรคิว"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE (STAFF FULL ROSTER) ───────────────────────────────────────
function DashboardPage({ patients, selected, onSelect, onDelete, onRefresh, dbStatus }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? patients : patients.filter((p) => p.severity === filter);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 8 }}>
        <div className="section-title" style={{ margin: 0 }}>ผู้ป่วยทั้งหมด ({patients.length})</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={onRefresh}>↻ รีเฟรช</button>
          {[["all", "ทั้งหมด"], ["high", "รุนแรง"], ["mid", "ปานกลาง"], ["low", "เล็กน้อย"]].map(([v, l]) => (
            <button key={v} className={`nav-tab${filter === v ? " active" : ""}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="patients-table">
        <div className="table-head">
          <span>ผู้ป่วย</span>
          <span>อายุ/เพศ</span>
          <span>ความรุนแรง</span>
          <span>อาการหลัก</span>
          <span>สิทธิ์</span>
          <span>เวลา</span>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <p>{dbStatus === "loading" ? "กำลังโหลด..." : "ยังไม่มีข้อมูลผู้ป่วย"}</p>
          </div>
        )}

        {filtered.map((p) => (
          <PatientRow key={p.dbId || p.id} p={p} selected={selected} onSelect={onSelect} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function PatientRow({ p, selected, onSelect, onDelete }) {
  const isOpen = selected?.dbId === p.dbId || selected?.id === p.id;
  const symShort = p.symptoms?.slice(0, 3).map((s) => SYMPTOMS.find((x) => x.id === s)?.label).join(", ") || "—";
  const aiResult = parseAIResult(p.aiAnalysis ?? p.ai_result);
  const aiData = aiResult?.status === "success" ? aiResult : aiResult;
  const riskLevel = aiData?.risk_level || "ไม่ระบุ";
  const isHighRisk = riskLevel === "ฉุกเฉิน" || p.severity === "high";
  const riskStyle = isHighRisk
    ? { color: "#991B1B", backgroundColor: "#FEF2F2", borderColor: "#FECACA" }
    : { color: "#0F172A", backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" };

  return (
    <>
      <div className="table-row" onClick={() => onSelect(isOpen ? null : p)}>
        <div>
          <div className="row-name">{p.firstName} {p.lastName}</div>
          <div className="row-sub">คิว {p.queueNumber || "—"} · {p.patientId || p.id}</div>
        </div>
        <div className="row-cell">{p.age} ปี / {p.gender}</div>
        <div>
          <span className={`sev-tag ${p.severity}`}>
            {p.severity === "high" ? "รุนแรง" : p.severity === "mid" ? "ปานกลาง" : "เล็กน้อย"}
          </span>
        </div>
        <div className="row-cell" style={{ fontSize: 13, color: "#64748B" }}>{symShort}</div>
        <div className="row-cell" style={{ fontSize: 12, color: "#0F172A", fontWeight: 500 }}>{p.benefitType || "—"}</div>
        <div className="row-cell" style={{ fontSize: 12, color: "#64748B" }}>{p.time}</div>
      </div>

      {isOpen && (
        <div style={{ padding: "0 1rem 1rem" }}>
          <div className="detail-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>รายละเอียดผู้ป่วย</div>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "4px 10px", color: "#64748B", borderColor: "#CBD5E1" }}
                onClick={() => { if (window.confirm(`ลบข้อมูล ${p.firstName}?`)) onDelete(p.dbId || p.id); }}
              >
                ✕ ลบข้อมูล
              </button>
            </div>
            <div className="detail-grid">
              {[
                ["ชื่อเต็ม", `${p.firstName} ${p.lastName}`],
                ["หมายเลขคิว", p.queueNumber || "—"],
                ["เบอร์โทร", p.phone || "—"],
                ["ความดัน", p.bp ? `${p.bp} mmHg` : "—"],
                ["ชีพจร", p.pulse ? `${p.pulse} bpm` : "—"],
                ["อุณหภูมิ", p.temp ? `${p.temp}°C` : "—"],
                ["น้ำหนัก/สูง", p.weight && p.height ? `${p.weight}kg / ${p.height}cm` : "—"],
                ["แผนก", p.department || "ยังไม่ระบุ"],
                ["สิทธิ์ผู้ป่วย", p.benefitType || "ยังไม่ระบุ"],
                ["แพ้ยา", p.allergies || "ไม่มี"],
              ].map(([k, v]) => (
                <div className="detail-item" key={k}><label>{k}</label><span>{v}</span></div>
              ))}
            </div>
            {p.chiefComplaint && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: 600 }}>อาการหลัก</div>
                <div style={{ fontSize: 14, color: "#0F172A" }}>{p.chiefComplaint}</div>
              </div>
            )}
            {aiResult ? (
              <div className="ai-result" style={{ marginTop: 0, backgroundColor: "#FFFFFF" }}>
                <div className="ai-result-header">ผลวิเคราะห์ AI <span className="ai-badge">AI คัดกรอง</span></div>
                {aiData.mode === "result_mode" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>ระดับความเสี่ยง</span>
                      <span style={{ ...riskStyle, border: "1px solid", borderRadius: 4, padding: "3px 8px", fontSize: 12, fontWeight: 700 }}>{riskLevel}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748B", marginBottom: 2 }}>แผนกที่แนะนำ</div>
                      <strong style={{ fontSize: 13, color: "#0F172A" }}>{aiData.recommended_specialty || "ไม่ระบุ"}</strong>
                    </div>
                    <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>สรุปอาการ</div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#0F172A" }}>{aiData.summary || "ไม่มีข้อมูลสรุป"}</p>
                    </div>
                    <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>ขั้นตอนต่อไป</div>
                      {Array.isArray(aiData.next_steps) && aiData.next_steps.length > 0 ? (
                        <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "#0F172A", fontSize: 13, lineHeight: 1.6 }}>
                          {aiData.next_steps.map((stepText, index) => <li key={index}>{stepText}</li>)}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>ไม่มีคำแนะนำเพิ่มเติม</p>
                      )}
                    </div>
                  </div>
                ) : aiData.mode === "question_mode" ? (
                  <div style={{ fontSize: 13, color: "#0F172A" }}>AI ต้องการข้อมูลเพิ่มเติมก่อนสรุปผล</div>
                ) : (
                  <div style={{ fontSize: 13, color: "#64748B" }}>ไม่พบข้อมูลวิเคราะห์ที่สามารถแสดงได้</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#64748B", padding: "4px 0" }}>ไม่มีผลวิเคราะห์ AI</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
