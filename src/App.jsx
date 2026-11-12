import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Accessibility,
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Database,
  Eye,
  Lock,
  LogOut,
  Mic,
  MicOff,
  MousePointerClick,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Ticket,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import {
  callScreeningAPI,
  formatPatientPrompt,
  generateClinicalTriage,
  parseVoicePatientTranscript,
} from "./api";

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

function generateQueueNumber(severity, existingPatients = []) {
  const prefix = severity === "high" ? "ER" : severity === "mid" ? "A" : "B";

  // Find all existing queue numbers matching this prefix (e.g. "A-041", "A-042", "ER-041")
  const numbers = existingPatients
    .map((p) => {
      const q = String(p.queueNumber || "").trim();
      const match = q.match(new RegExp(`^${prefix}-(\\d+)`, "i"));
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => Number.isInteger(n));

  // Determine the highest number ever assigned to this prefix, or start at 40
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 40;
  const nextNum = maxNumber + 1;

  return `${prefix}-${String(nextNum).padStart(3, "0")}`;
}

function getAssignedRoom(department = "", severity = "low") {
  const dept = String(department || "");
  if (severity === "high" || dept.includes("ฉุกเฉิน") || dept.includes("ER")) {
    return "ห้องฉุกเฉิน ER-1 (ชั้น 1)";
  }
  if (dept.includes("กุมาร") || dept.includes("เด็ก")) return "ห้องตรวจกุมารเวช 1 (ชั้น 2)";
  if (dept.includes("ออร์โธ") || dept.includes("กระดูก")) return "ห้องตรวจกระดูกและข้อ 3 (ชั้น 1)";
  if (dept.includes("โสต") || dept.includes("หู")) return "ห้องตรวจ หู คอ จมูก 5 (ชั้น 2)";
  if (dept.includes("ศัลยกรรม")) return "ห้องตรวจศัลยกรรม 4 (ชั้น 2)";
  if (dept.includes("จักษุ") || dept.includes("ตา")) return "ห้องตรวจจักษุ 6 (ชั้น 2)";
  if (dept.includes("ทันตกรรม") || dept.includes("ฟัน")) return "ห้องทันตกรรม 2 (ชั้น 3)";
  return "ห้องตรวจอายุรกรรม 2 (ชั้น 2)";
}

const SMARTCARD_PROFILES = [
  {
    id: "elderly-gold",
    label: "ผู้สูงอายุ (สิทธิบัตรทอง 30 บาท)",
    citizenId: "1-1004-00842-XX-X",
    firstName: "สมศรี",
    lastName: "สุขสวัสดิ์",
    age: "72",
    gender: "หญิง",
    phone: "081-890-4421",
    hn: "HN-670811",
    benefitType: "บัตรทอง / สวัสดิการรัฐ",
    medHistory: "ความดันโลหิตสูง, เบาหวาน",
    allergies: "ไม่มี",
  },
  {
    id: "chronic-gov",
    label: "ผู้ป่วยโรคเรื้อรัง / มีประวัติแพ้ยา (สิทธิข้าราชการ)",
    citizenId: "3-1012-01928-XX-X",
    firstName: "ประเสริฐ",
    lastName: "เกียรติไพศาล",
    age: "68",
    gender: "ชาย",
    phone: "089-215-7733",
    hn: "HN-670920",
    benefitType: "สิทธิสวัสดิการ",
    medHistory: "โรคหัวใจขาดเลือด, ไขมันในเลือดสูง",
    allergies: "แอสไพริน (Aspirin)",
  },
  {
    id: "general-sso",
    label: "ผู้ป่วยทั่วไป (สิทธิประกันสังคม)",
    citizenId: "1-5099-02341-XX-X",
    firstName: "กมลวรรณ",
    lastName: "รัตนโชติ",
    age: "34",
    gender: "หญิง",
    phone: "086-543-9900",
    hn: "HN-671045",
    benefitType: "ประกันสังคม",
    medHistory: "ไม่มี",
    allergies: "เพนิซิลลิน (Penicillin)",
  },
];

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

function fromRow(row, index = 0, allRows = []) {
  const benefitType = extractBenefitType(row.med_history);
  const queueNumber = generateQueueNumber(row.severity, allRows.slice(0, index));
  return {
    id:             row.id,
    dbId:           row.id,
    queueNumber,
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
    return "ยินดีต้อนรับสู่ระบบคัดกรองผู้ป่วย โจ ไอเมด หากมีอาการฉุกเฉินวิกฤต เช่น แน่นหน้าอกรุนแรง หรือหมดสติเฉียบพลัน ให้กดปุ่มสีแดง เอสโอเอส เรียกพยาบาลด่วน ด้านบนค่ะ สำหรับผู้สูงอายุ สามารถกดปุ่มไมโครโฟนสีดำตรงกลางเพื่อพูดบอกอาการและรับบัตรคิวได้ทันที หรือท่านสามารถกดปุ่มสีขาวด้านล่างเพื่อเริ่มทำแบบประเมินอาการ 4 ขั้นตอนด้วยตนเองค่ะ";
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
  const [currentAudio, setCurrentAudio] = useState(null);
  const [activeHighlightSection, setActiveHighlightSection] = useState(null);
  const activeTimersRef = useRef([]);
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
  const [smartCardData, setSmartCardData] = useState(null);
  const [showSmartCardModal, setShowSmartCardModal] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);

  function handleSelectSmartCard(profile) {
    const payload = { ...profile, timestamp: Date.now() };
    setSmartCardData(payload);
    setShowSmartCardModal(false);
    setPage("intake");
    showToast(`อ่านบัตรประชาชนสำเร็จ: คุณ${profile.firstName} ${profile.lastName} (${profile.benefitType})`);
    speakThai(
      `อ่านข้อมูลบัตรประชาชนของ คุณ ${profile.firstName} ${profile.lastName} สิทธิ ${profile.benefitType} เรียบร้อยแล้ว กรุณาเลือกอาการที่มาพบแพทย์ค่ะ`,
      "intake-2"
    );
  }

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    let es;
    try {
      es = new EventSource("http://127.0.0.1:8088/events");
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "connected") {
            setBridgeConnected(true);
            return;
          }
          if (payload.firstName) {
            setBridgeConnected(true);
            setSmartCardData({ ...payload, timestamp: Date.now() });
            setShowSmartCardModal(false);
            setPage("intake");
            showToast(
              `อ่านบัตรประชาชน USB สำเร็จ: คุณ${payload.firstName} ${payload.lastName} (${payload.benefitType})`
            );
          }
        } catch {
          // Ignore malformed event
        }
      };
      es.onerror = () => {
        setBridgeConnected(false);
      };
    } catch {
      // Optional bridge service not running
    }
    return () => {
      if (es) es.close();
    };
  }, []);

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
    if (activeTimersRef.current && activeTimersRef.current.length > 0) {
      activeTimersRef.current.forEach((t) => clearTimeout(t));
      activeTimersRef.current = [];
    }
    setActiveHighlightSection(null);
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  function startKaraokeIndicator(mode = "home") {
    // Clear any previous active timers
    if (activeTimersRef.current && activeTimersRef.current.length > 0) {
      activeTimersRef.current.forEach((t) => clearTimeout(t));
      activeTimersRef.current = [];
    }

    const addTimer = (fn, delay) => {
      const id = setTimeout(fn, delay);
      activeTimersRef.current.push(id);
    };

    if (mode === "home" || mode === true) {
      // PatientHomePage Sequence:
      // Stage 1: Welcome Header / Read Aloud (0 - 3.5s)
      setActiveHighlightSection("home-header");
      // Stage 2: Red SOS Emergency Button (3.5s - 8s)
      addTimer(() => setActiveHighlightSection("home-sos"), 3500);
      // Stage 3: Elderly Voice-to-Queue Mic Button (8s - 14s)
      addTimer(() => setActiveHighlightSection("home-voice"), 8000);
      // Stage 4: 4-Step Intake Button (14s - 19.5s)
      addTimer(() => setActiveHighlightSection("home-form"), 14000);
      addTimer(() => setActiveHighlightSection(null), 19500);
    } else if (mode === "ticket") {
      // PatientTicketPage Sequence:
      // Stage 1: Giant Queue Number (0 - 4s)
      setActiveHighlightSection("ticket-queue");
      // Stage 2: Department & Estimated Doctor Time (4s - 8.5s)
      addTimer(() => setActiveHighlightSection("ticket-dept"), 4000);
      // Stage 3: Print Slip Button (8.5s - 13s)
      addTimer(() => setActiveHighlightSection("ticket-print"), 8500);
      // Stage 4: Smiley Satisfaction Rating Box (13s - 18s)
      addTimer(() => setActiveHighlightSection("ticket-rating"), 13000);
      addTimer(() => setActiveHighlightSection(null), 18000);
    } else if (typeof mode === "string" && mode.startsWith("intake")) {
      // IntakePage Sequence:
      const isStep3 = mode === "intake-3";
      // Stage 1: Active Form Fields / Inputs (0 - 5.5s)
      setActiveHighlightSection("intake-fields");
      // Stage 2: Next button or Submit button (5.5s - 11s)
      addTimer(() => setActiveHighlightSection(isStep3 ? "intake-submit" : "intake-next"), 5500);
      addTimer(() => setActiveHighlightSection(null), 11000);
    }

    return () => {
      if (activeTimersRef.current) {
        activeTimersRef.current.forEach((t) => clearTimeout(t));
        activeTimersRef.current = [];
      }
    };
  }

  async function speakThai(text, withKaraoke = false) {
    if (!text || typeof text !== "string") return;
    stopSpeech();

    let cleanupKaraoke = null;
    if (withKaraoke) {
      const mode = typeof withKaraoke === "string" ? withKaraoke : "home";
      cleanupKaraoke = startKaraokeIndicator(mode);
    }

    // 1. Primary: Hospital Cloud TTS MP3 Audio (Google Cloud Neural2 / Fallback)
    try {
      setIsSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          setActiveHighlightSection(null);
          if (cleanupKaraoke) cleanupKaraoke();
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          setActiveHighlightSection(null);
          if (cleanupKaraoke) cleanupKaraoke();
          URL.revokeObjectURL(audioUrl);
        };

        setCurrentAudio(audio);
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn("Cloud TTS playback failed, attempting browser fallback:", e);
    }

    // 2. Secondary: Browser SpeechSynthesis fallback
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "th-TH";
        utterance.rate = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes("th"));
        if (thaiVoice) utterance.voice = thaiVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          setActiveHighlightSection(null);
          if (cleanupKaraoke) cleanupKaraoke();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setActiveHighlightSection(null);
          if (cleanupKaraoke) cleanupKaraoke();
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        setIsSpeaking(false);
        setActiveHighlightSection(null);
        if (cleanupKaraoke) cleanupKaraoke();
      }
    }

    setIsSpeaking(false);
    setActiveHighlightSection(null);
    if (cleanupKaraoke) cleanupKaraoke();
    showToast("ไม่สามารถเล่นเสียงอ่านได้ในขณะนี้", "error");
  }

  function navigatePage(nextPage, ticketOverride = activeTicket) {
    setPage(nextPage);
    if (a11y.autoRead) {
      const mode = nextPage === "home" ? "home" : nextPage === "ticket" ? "ticket" : nextPage === "intake" ? "intake-0" : false;
      speakThai(getPageSpeechSummary(nextPage, ticketOverride), mode);
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
    const queueNumber = generateQueueNumber(form.severity, patients);
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
                onSpeakCurrentPage={() => {
                  const mode = page === "home" ? "home" : page === "ticket" ? "ticket" : page === "intake" ? "intake-0" : false;
                  speakThai(getPageSpeechSummary(page, activeTicket), mode);
                }}
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
                onSpeakCurrentPage={() => {
                  const mode = page === "home" ? "home" : page === "ticket" ? "ticket" : page === "intake" ? "intake-0" : false;
                  speakThai(getPageSpeechSummary(page, activeTicket), mode);
                }}
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
            onQuickVoiceSubmit={addPatient}
            onOpenSmartCard={() => setShowSmartCardModal(true)}
            bridgeConnected={bridgeConnected}
            isSpeaking={isSpeaking}
            activeHighlightSection={activeHighlightSection}
            onSpeak={speakThai}
            onSpeakPage={() => speakThai(getPageSpeechSummary("home", activeTicket), true)}
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
            key={smartCardData?.timestamp || "blank"}
            onSubmit={addPatient}
            smartCardData={smartCardData}
            onClearSmartCard={() => setSmartCardData(null)}
            onOpenSmartCard={() => setShowSmartCardModal(true)}
            isSpeaking={isSpeaking}
            activeHighlightSection={activeHighlightSection}
            onSpeak={(text, flow) => speakThai(text, flow || "intake-0")}
            onStopSpeech={stopSpeech}
          />
        )}
        {page === "ticket" && (
          <PatientTicketPage
            ticket={activeTicket}
            isSpeaking={isSpeaking}
            activeHighlightSection={activeHighlightSection}
            onSpeakTicket={() => speakThai(getPageSpeechSummary("ticket", activeTicket), "ticket")}
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

      {/* ─── SUBTLE CLINICAL DISCLAIMER & PDPA COMPLIANCE FOOTER ─── */}
      <footer className="no-print border-t border-slate-200 bg-white/80 py-3 px-4 text-center text-[11px] sm:text-xs text-slate-500 mt-8">
        <span className="inline-flex items-center justify-center gap-1.5 flex-wrap">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>มาตรฐานคุ้มครองข้อมูลส่วนบุคคลด้านสุขภาพ (PDPA) · ระบบนี้เป็นเครื่องมือช่วยคัดกรองเบื้องต้น (Clinical Decision Support) ไม่ใช่การวินิจฉัยโรคขั้นสุดท้าย</span>
        </span>
      </footer>

      {/* ─── THAI SMART CARD READER MODAL (USB BRIDGE + DEMO SIMULATION) ─── */}
      {showSmartCardModal && (
        <SmartCardModal
          onClose={() => setShowSmartCardModal(false)}
          onSelectCard={handleSelectSmartCard}
          bridgeConnected={bridgeConnected}
        />
      )}

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

// ─── PATIENT PORTAL: HOME PAGE (DE-CLUTTERED + VOICE AI KIOSK) ────────────────
function PatientHomePage({
  setPage,
  activeTicket,
  onLookupTicket,
  onQuickVoiceSubmit,
  onOpenSmartCard,
  bridgeConnected,
  onTriggerSOS,
  isSpeaking,
  activeHighlightSection,
  onSpeak,
  onSpeakPage,
  onStopSpeech,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  function handleSearchSubmit(e) {
    e.preventDefault();
    onLookupTicket(searchQuery);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header with High-Prominence Read Aloud & SOS Buttons */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            ระบบคัดกรองผู้ป่วย JOE&apos;s i-MED
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            พูดแจ้งอาการหรือกดทำแบบประเมิน เพื่อรับบัตรคิวเข้าพบแพทย์ทันที
          </p>
        </div>

        {/* Highlighted Important Buttons: Read Aloud & SOS Nurse */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {onSpeakPage && (
            <div className="relative">
              {(activeHighlightSection === "header" || activeHighlightSection === "home-header") && (
                <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-bounce flex items-center gap-1.5 z-30">
                  <ArrowUp className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
                  <span>กดปุ่มนี้เพื่อฟังเสียงอ่านแนะนำ</span>
                </div>
              )}
              <button
                type="button"
                onClick={isSpeaking ? onStopSpeech : onSpeakPage}
                className={`inline-flex items-center gap-2.5 rounded-lg border-2 px-5 py-3 text-sm sm:text-base font-extrabold shadow-sm transition-all ${
                  isSpeaking
                    ? "border-slate-900 bg-slate-900 text-white"
                    : (activeHighlightSection === "header" || activeHighlightSection === "home-header")
                    ? "border-slate-950 bg-amber-400 text-slate-950 ring-4 ring-amber-300 ring-offset-2 scale-105"
                    : "border-slate-900 bg-amber-300 text-slate-950 hover:bg-amber-400"
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-7 h-7 text-white shrink-0" />
                    <span>หยุดเสียงอ่าน</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-7 h-7 text-slate-950 shrink-0" />
                    <span>ฟังเสียงแนะนำ (กดฟัง)</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="relative">
            {(activeHighlightSection === "sos" || activeHighlightSection === "home-sos") && (
              <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 bg-red-700 text-white border-2 border-white text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-bounce flex items-center gap-1.5 z-30">
                <ArrowUp className="w-4 h-4 text-white shrink-0 stroke-[3]" />
                <span>กดปุ่มนี้เมื่อฉุกเฉินวิกฤต</span>
              </div>
            )}
            <button
              type="button"
              onClick={onTriggerSOS}
              className={`inline-flex items-center gap-2.5 rounded-lg border-2 px-5 py-3 text-sm sm:text-base font-extrabold text-white transition-all shadow-sm ${
                (activeHighlightSection === "sos" || activeHighlightSection === "home-sos")
                  ? "border-red-950 bg-red-700 scale-105 ring-4 ring-red-400 ring-offset-2 animate-pulse"
                  : "border-red-800 bg-red-600 hover:bg-red-700"
              }`}
            >
              <Bell className="w-5 h-5 text-white shrink-0 animate-pulse" />
              <span>SOS เรียกพยาบาลด่วน</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sleek Single-Line Horizontal Emergency Alert Ribbon */}
      <div className="mb-5 flex items-center gap-2.5 rounded-md border border-red-200 bg-red-50/90 px-3.5 py-2 text-xs sm:text-sm text-red-900">
        <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-normal">
          <strong className="font-semibold text-red-950">กรณีฉุกเฉินวิกฤต:</strong>
          <span className="text-red-800">
            แน่นหน้าอกรุนแรง หายใจไม่ออก หรือหน้ามืดหมดสติ โปรดกดปุ่ม{" "}
            <strong className="font-semibold text-red-950">SOS เรียกพยาบาลด่วน</strong> ด้านบนทันที
          </span>
        </div>
      </div>

      {/* Clean, De-cluttered Two-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left: Primary Self-Screening & Voice-to-Queue Container (md:col-span-7) */}
        <div className="md:col-span-7 flex flex-col justify-between rounded-md border border-slate-200 bg-white p-5 sm:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>จุดออกบัตรคิวอัตโนมัติ</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
              รับบัตรคิวและประเมินอาการเบื้องต้น
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-5">
              เลือกวิธีที่สะดวกสำหรับท่าน — ผู้สูงอายุสามารถกดปุ่มไมโครโฟนแล้วพูดบอกอาการเพื่อรับบัตรคิวได้ทันที
            </p>

            {/* Elderly Voice-to-Queue Highlight Box */}
            <div
              className={`relative rounded-lg border-2 p-4 sm:p-5 mb-4 transition-all ${
                (activeHighlightSection === "voice" || activeHighlightSection === "home-voice")
                  ? "border-amber-500 bg-amber-50/80 ring-4 ring-amber-300 ring-offset-2 scale-[1.02]"
                  : "border-slate-900 bg-slate-50"
              }`}
            >
              {(activeHighlightSection === "voice" || activeHighlightSection === "home-voice") && (
                <div className="absolute -top-12 left-4 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 animate-bounce z-20">
                  <ArrowDown className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
                  <span>ผู้สูงอายุกดปุ่มไมค์นี้เพื่อพูดแจ้งอาการ</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    สำหรับผู้สูงอายุ / ไม่สะดวกพิมพ์
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    พูดแจ้งอาการด้วยเสียง (AI ออกบัตรคิวอัตโนมัติ)
                  </div>
                </div>
                <div className="rounded-full bg-amber-200 p-2 text-slate-950 border border-amber-300 shrink-0">
                  <Mic className="w-6 h-6 text-slate-900" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                เพียงพูดชื่อ อายุ อาการป่วย และสิทธิการรักษา ระบบ AI จะกรอกข้อมูลและออกบัตรคิวให้ทันที
              </p>
              <button
                type="button"
                onClick={() => setShowVoiceModal(true)}
                className={`w-full inline-flex items-center justify-center gap-3 rounded-lg py-4 px-5 text-base sm:text-lg font-black transition-all shadow-md active:scale-98 ${
                  (activeHighlightSection === "voice" || activeHighlightSection === "home-voice")
                    ? "bg-amber-400 text-slate-950 border-2 border-slate-950 ring-4 ring-amber-300"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                <Mic className="w-8 h-8 text-amber-300 shrink-0" />
                <span>กดเพื่อพูดแจ้งอาการ (รับบัตรคิวทันที)</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {onOpenSmartCard && (
              <button
                type="button"
                onClick={onOpenSmartCard}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg border-2 border-slate-900 bg-white py-3 px-4 text-sm sm:text-base font-bold text-slate-900 hover:bg-slate-100 transition-all shadow-sm"
              >
                <CreditCard className="w-5 h-5 text-slate-900 shrink-0" />
                <span>เสียบบัตรประชาชน (Smart Card)</span>
                {bridgeConnected && (
                  <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    เชื่อมต่อเครื่องอ่านแล้ว
                  </span>
                )}
              </button>
            )}

            <div className="relative">
              {(activeHighlightSection === "form" || activeHighlightSection === "home-form") && (
                <div className="absolute -top-12 left-4 bg-slate-900 text-white border-2 border-amber-400 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 animate-bounce z-20">
                  <ArrowDown className="w-4 h-4 text-amber-400 shrink-0 stroke-[3]" />
                  <span>กดปุ่มนี้หากต้องการพิมพ์แบบประเมินเอง</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPage("intake")}
                className={`w-full rounded-lg border-2 py-3 px-4 text-sm sm:text-base font-bold transition-all text-center ${
                  (activeHighlightSection === "form" || activeHighlightSection === "home-form")
                    ? "border-slate-900 bg-slate-100 ring-4 ring-slate-400 text-slate-900"
                    : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                }`}
              >
                + กรอกแบบประเมินอาการด้วยตนเอง (4 ขั้นตอน) →
              </button>
            </div>
          </div>
        </div>

        {/* Right: Search Stack + Compact Guidance Card (md:col-span-5) */}
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
            <p className="text-xs text-slate-600 mb-3">
              ค้นหาด้วยชื่อ เบอร์โทรศัพท์ หรือรหัสผู้ป่วย (HN)
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
                className="w-full rounded-md bg-slate-900 py-2 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                ค้นหาบัตรคิว
              </button>
            </form>
          </div>

          {/* Compact Guidance Card */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 flex-1 flex flex-col justify-center">
            <div className="text-xs font-bold text-slate-900 mb-1">
              คำแนะนำสำหรับผู้รับบริการ
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              นำสลิปบัตรคิวที่ได้ไปแสดงที่จุดซักประวัติของแผนกตรวจตามเวลาที่ระบุในบัตรคิว
            </p>
          </div>
        </div>
      </div>

      {showVoiceModal && (
        <VoiceIntakeModal
          onClose={() => setShowVoiceModal(false)}
          onSpeak={onSpeak}
          onSubmitVoicePatient={async (parsedForm, aiResult) => {
            setShowVoiceModal(false);
            await onQuickVoiceSubmit(parsedForm, aiResult);
          }}
        />
      )}
    </div>
  );
}

// ─── THAI NATIONAL ID SMART CARD MODAL (USB BRIDGE + DEMO SIMULATION) ─────────
function SmartCardModal({ onClose, onSelectCard, bridgeConnected }) {
  const [readingId, setReadingId] = useState(null);

  function handleSimulateRead(profile) {
    setReadingId(profile.id);
    setTimeout(() => {
      onSelectCard(profile);
    }, 650);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="อ่านข้อมูลบัตรประจำตัวประชาชน Smart Card"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-300 bg-white p-5 sm:p-6 text-slate-900 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-slate-100 p-2 text-slate-900 border border-slate-300">
              <CreditCard className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                อ่านบัตรประจำตัวประชาชน (Smart Card)
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${bridgeConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                <span>
                  {bridgeConnected
                    ? "เชื่อมต่อเครื่องอ่านบัตร USB แล้ว — พร้อมเสียบบัตร"
                    : "โหมดพร้อมใช้งาน — รองรับเครื่องอ่าน USB หรือเลือกบัตรจำลองด้านล่าง"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2.5 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mb-4">
          สอดบัตรประชาชนเข้าเครื่องอ่านเพื่อดึงข้อมูลผู้ป่วยและตรวจสอบสิทธิการรักษาอัตโนมัติ (หรือคลิกเลือกบัตรตัวอย่างเพื่อทดสอบ):
        </p>

        <div className="space-y-2.5 mb-4">
          {SMARTCARD_PROFILES.map((profile) => {
            const isReading = readingId === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                disabled={!!readingId}
                onClick={() => handleSimulateRead(profile)}
                className={`w-full text-left rounded-lg border-2 p-3.5 transition-all ${
                  isReading
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-900 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-900">
                    {profile.label}
                  </span>
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                    {isReading ? "กำลังอ่านชิป..." : "กดเพื่อดึงข้อมูล"}
                  </span>
                </div>
                <div className="text-xs text-slate-700 font-semibold">
                  ชื่อ: คุณ{profile.firstName} {profile.lastName} ({profile.gender}, อายุ {profile.age} ปี)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3 items-center">
                  <span>เลขบัตร: {profile.citizenId}</span>
                  <span>สิทธิ: {profile.benefitType}</span>
                  {profile.allergies && profile.allergies !== "ไม่มี" && (
                    <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px]">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span>แพ้ยา: {profile.allergies}</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>ข้อมูลถูกเข้ารหัสตามมาตรฐาน PDPA</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ELDERLY VOICE-TO-QUEUE AI MODAL ──────────────────────────────────────────
function VoiceIntakeModal({ onClose, onSpeak, onSubmitVoicePatient }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  const samplePhrases = [
    "ยายชื่อสมศรี ใจดี อายุ 72 ปี มีไข้ ไอ ปวดหัว มา 2 วัน ใช้สิทธิบัตรทองผู้สูงอายุ",
    "ลุงชื่อสมหมาย รักไทย อายุ 68 ปี ปวดหลัง ปวดเข่า อ่อนเพลีย สิทธิเบิกตรงข้าราชการ",
    "ชื่อกานดา สุขใจ อายุ 58 ปี แน่นหน้าอก หายใจลำบาก เวียนหัวมาก สิทธิประกันสังคม",
  ];

  function startListening() {
    setErrorMsg("");
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setErrorMsg(
        "เบราว์เซอร์นี้ไม่รองรับการรับเสียงพูดโดยตรง ท่านสามารถกดปุ่มตัวอย่างประโยคด้านล่าง หรือพิมพ์ข้อความแทนได้"
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "th-TH";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i += 1) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setErrorMsg("ไม่ได้ยินเสียงพูดชัดเจน กรุณาลองกดไมโครโฟนพูดอีกครั้ง หรือเลือกประโยคตัวอย่างด้านล่าง");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognitionInstance(recognition);
      recognition.start();
    } catch {
      setIsListening(false);
      setErrorMsg("ไม่สามารถเปิดไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์ไมโครโฟนของเบราว์เซอร์");
    }
  }

  function stopListening() {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch {
        // Ignore stop error
      }
    }
    setIsListening(false);
  }

  async function handleProcessVoice() {
    const clean = transcript.trim();
    if (!clean) {
      setErrorMsg("กรุณากดปุ่มไมโครโฟนเพื่อพูดแจ้งอาการ หรือเลือกประโยคตัวอย่างด้านล่าง");
      return;
    }

    stopListening();
    setProcessing(true);
    setErrorMsg("");

    const parsedForm = parseVoicePatientTranscript(clean);
    const prompt = formatPatientPrompt(parsedForm);
    const aiResult = await callAI(prompt, parsedForm);

    if (onSpeak) {
      onSpeak(
        `ระบบรับข้อมูลของ ${parsedForm.firstName} อายุ ${parsedForm.age} ปี เรียบร้อยแล้ว กำลังออกบัตรคิวให้ท่านค่ะ`
      );
    }

    await onSubmitVoicePatient(parsedForm, aiResult);
    setProcessing(false);
  }

  const previewParsed = transcript.trim() ? parseVoicePatientTranscript(transcript) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ระบบรับแจ้งอาการด้วยเสียงสำหรับผู้สูงอายุ"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-lg rounded-md border border-slate-300 bg-white p-5 sm:p-6 text-slate-900">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-amber-200 p-1.5 text-slate-900">
              <Mic className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              พูดแจ้งอาการด้วยเสียง (AI ออกบัตรคิวอัตโนมัติ)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="rounded px-2.5 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mb-4">
          กดปุ่มไมโครโฟนด้านล่าง แล้วพูดบอก <strong>ชื่อ อายุ อาการที่เป็น และสิทธิการรักษา</strong>{" "}
          (เช่น &ldquo;ยายชื่อสมศรี อายุ 72 ปี มีไข้ ไอ ปวดหัว สิทธิบัตรทอง&rdquo;)
        </p>

        {/* Big Microphone Action Button */}
        <div className="flex flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-5 mb-4 text-center">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`inline-flex items-center justify-center gap-3 rounded-lg px-7 py-4 text-base sm:text-lg font-black text-white transition-all shadow-md active:scale-98 ${
              isListening
                ? "bg-red-600 hover:bg-red-700 border-2 border-red-800 animate-pulse"
                : "bg-slate-900 hover:bg-slate-800 border-2 border-slate-900"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-8 h-8 text-white shrink-0" />
                <span>กำลังฟังเสียงของท่าน... (กดเพื่อหยุด)</span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 text-amber-300 shrink-0" />
                <span>กดปุ่มนี้เพื่อเริ่มพูด</span>
              </>
            )}
          </button>
          <span className="mt-2 text-xs text-slate-500">
            {isListening
              ? "กรุณาพูดใกล้ไมโครโฟนด้วยน้ำเสียงปกติ..."
              : "รองรับภาษาไทย — ระบบจะแปลงเสียงพูดเป็นข้อมูลผู้ป่วยโดยอัตโนมัติ"}
          </span>
        </div>

        {/* Recognized Speech Box */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ข้อความที่ระบบได้ยิน (สามารถแก้ไขหรือพิมพ์เพิ่มได้):
          </label>
          <textarea
            rows={2}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="ข้อความเสียงพูดของท่านจะปรากฏที่นี่..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
          />
        </div>

        {/* Live AI Auto-Extracted Preview */}
        {previewParsed && (
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="font-bold text-slate-900 mb-1">
              ข้อมูลที่ AI กรอกให้อัตโนมัติ:
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700">
              <div>
                <strong>ชื่อผู้ป่วย:</strong> {previewParsed.firstName} {previewParsed.lastName}
              </div>
              <div>
                <strong>อายุ / เพศ:</strong> {previewParsed.age} ปี ({previewParsed.gender})
              </div>
              <div>
                <strong>สิทธิการรักษา:</strong> {previewParsed.benefitType}
              </div>
              <div>
                <strong>ความเร่งด่วน:</strong>{" "}
                {previewParsed.severity === "high"
                  ? "ฉุกเฉิน / ความเสี่ยงสูง"
                  : previewParsed.severity === "mid"
                    ? "ปานกลาง"
                    : "ทั่วไป"}
              </div>
            </div>
          </div>
        )}

        {/* Quick Demo Phrases for Classroom / Professor Testing */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
            หรือกดเลือกประโยคเสียงจำลองของผู้สูงอายุ (สำหรับทดสอบระบบ):
          </div>
          <div className="flex flex-col gap-1.5">
            {samplePhrases.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTranscript(phrase);
                  setErrorMsg("");
                }}
                className="text-left rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors"
              >
                &ldquo;{phrase}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={processing}
            onClick={handleProcessVoice}
            className="rounded-md bg-slate-900 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {processing ? "กำลังออกบัตรคิว..." : "ยืนยันและออกบัตรคิวทันที →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PATIENT PORTAL: REALISTIC 80MM THERMAL QUEUE SLIP PAGE ───────────────────
function PatientTicketPage({
  ticket,
  onStartNew,
  onGoToIntake,
  onLookupTicket,
  onTriggerSOS,
  isSpeaking,
  activeHighlightSection,
  onSpeakTicket,
  onStopSpeech,
}) {
  const [lookupInput, setLookupInput] = useState("");
  const [rating, setRating] = useState(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const satisfactionOptions = [
    { score: 1, label: "ไม่พอใจมาก", color: "hover:border-red-500 hover:bg-red-50 text-red-700 border-slate-200" },
    { score: 2, label: "ไม่พอใจ", color: "hover:border-orange-500 hover:bg-orange-50 text-orange-700 border-slate-200" },
    { score: 3, label: "ปานกลาง", color: "hover:border-amber-500 hover:bg-amber-50 text-amber-700 border-slate-200" },
    { score: 4, label: "พอใจ", color: "hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 border-slate-200" },
    { score: 5, label: "พอใจมาก", color: "hover:border-green-600 hover:bg-green-50 text-green-700 border-slate-200" },
  ];

  function handleRate(score) {
    setRating(score);
    setRatingSubmitted(true);
    try {
      const existing = JSON.parse(localStorage.getItem("joe_imed_ratings") || "[]");
      existing.push({
        score,
        ticket: ticket?.queueNumber || "UNKNOWN",
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("joe_imed_ratings", JSON.stringify(existing));
    } catch {
      // Ignore localStorage errors
    }
  }

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
  const departmentName =
    ticket.department || aiResult?.recommended_specialty || "อายุรกรรม";
  const assignedRoom = getAssignedRoom(departmentName, ticket.severity);
  const hasAllergy = Boolean(
    ticket.allergies && ticket.allergies !== "ไม่มี" && ticket.allergies !== "-"
  );
  const buildingLocation = isHighRisk
    ? "อาคารอุบัติเหตุ-ฉุกเฉิน ชั้น 1"
    : "อาคารผู้ป่วยนอก (OPD) ชั้น 2";

  // Calculate realistic estimated doctor consultation time (+15 mins from ticket time, or immediate for ER)
  const todayThaiDate = ticket.dateLabel || "วันนี้ (เฉพาะวันที่ออกบัตร)";
  const timeMatch = String(ticket.time || "").match(/(\d{1,2}):(\d{2})/);
  let computedEstTime = "ภายใน 15 นาที";
  if (timeMatch) {
    const totalMins = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10) + 15;
    const estH = String(Math.floor(totalMins / 60) % 24).padStart(2, "0");
    const estM = String(totalMins % 60).padStart(2, "0");
    computedEstTime = `${estH}:${estM} น.`;
  }
  const estDoctorTime = isHighRisk ? "เข้าพบแพทย์ทันที (ฉุกเฉิน)" : computedEstTime;

  const qnShort = String(ticket.id || "1827").slice(-4).padStart(4, "0");
  const refShort = String(ticket.dbId || ticket.id || "199").slice(-3).padStart(3, "0");

  return (
    <div className="print-wrapper max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* High-Risk Alert Banner (Screen Only) */}
      {isHighRisk && (
        <div className="no-print mb-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-900 flex-wrap">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="font-semibold text-red-950">เคสความเสี่ยงสูง: </span>
              <span className="text-red-800">
                กรุณาติดต่อเคาน์เตอร์พยาบาลฉุกเฉินทันทีโดยไม่ต้องรอเรียกคิวปกติ
              </span>
            </div>
          </div>
          <button
            onClick={onTriggerSOS}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-700 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
          >
            <Bell className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />
            <span>SOS เรียกพยาบาลฉุกเฉิน</span>
          </button>
        </div>
      )}

      {/* Top Action Bar for Read Aloud & Print (Screen Only) */}
      <div className="no-print mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs sm:text-sm font-bold text-slate-700">
          ตัวอย่างสลิปบัตรคิว
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onSpeakTicket && (
            <button
              type="button"
              onClick={isSpeaking ? onStopSpeech : onSpeakTicket}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-amber-300 px-4 py-2 text-xs sm:text-sm font-extrabold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-5 h-5 text-red-700 shrink-0" />
                  <span>หยุดเสียงอ่าน</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>อ่านบัตรคิวให้ฟัง</span>
                </>
              )}
            </button>
          )}

          <div className="relative">
            {activeHighlightSection === "ticket-print" && (
              <div className="absolute top-full mt-2.5 right-0 sm:left-1/2 sm:-translate-x-1/2 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-bounce flex items-center gap-1.5 z-30">
                <ArrowUp className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
                <span>กดปุ่มนี้เพื่อพิมพ์สลิปบัตรคิว</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-extrabold text-white transition-all shadow-sm ${
                activeHighlightSection === "ticket-print"
                  ? "bg-slate-900 ring-4 ring-amber-400 ring-offset-2 scale-105"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์สลิปบัตรคิว</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── AUTHENTIC 80MM HOSPITAL THERMAL SLIP (PRINTED & SCREEN) ─── */}
      <div className="thermal-slip">
        <div className="text-center border-b border-black pb-2 mb-2">
          <div className="text-[11px] font-bold tracking-tight">
            ***ใบสำคัญโปรดเก็บไว้จนกว่าจะตรวจเสร็จ***
          </div>
          <div className="text-base font-extrabold mt-0.5">
            คลินิก{departmentName}
          </div>
          <div className="text-xs font-medium text-slate-800">
            {buildingLocation}
          </div>
        </div>

        {/* Giant Queue Number */}
        <div
          className={`relative text-center py-2 border-b border-black mb-2 transition-all ${
            activeHighlightSection === "ticket-queue"
              ? "bg-amber-100/70 ring-4 ring-amber-400 rounded"
              : ""
          }`}
        >
          {activeHighlightSection === "ticket-queue" && (
            <div className="no-print absolute -top-11 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-bounce flex items-center gap-1.5 z-30">
              <ArrowDown className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
              <span>หมายเลขคิวรับบริการของคุณ</span>
            </div>
          )}
          <div className="text-xs font-bold">หมายเลขคิวรับบริการ / Queue No.</div>
          <div className="text-4xl font-black tracking-wider my-1">
            {ticket.queueNumber || "A-045"}
          </div>
          <div className="text-[11px] font-semibold">
            ใช้ได้เฉพาะวันที่ {todayThaiDate}
          </div>
        </div>

        {/* Essential Patient & Appointment Details */}
        <div
          className={`relative text-xs space-y-1 border-b border-black pb-2.5 mb-2.5 transition-all ${
            activeHighlightSection === "ticket-dept"
              ? "bg-amber-100/70 ring-4 ring-amber-400 rounded p-1.5"
              : ""
          }`}
        >
          {activeHighlightSection === "ticket-dept" && (
            <div className="no-print absolute -top-11 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-bounce flex items-center gap-1.5 z-30">
              <ArrowDown className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
              <span>แผนกตรวจและเวลาเข้าพบแพทย์</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-bold">ชื่อ-สกุล:</span>
            <span className="font-semibold text-right">
              {ticket.firstName} {ticket.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">อายุ / เพศ:</span>
            <span>
              {ticket.age || "—"} ปี / {ticket.gender || "ไม่ระบุ"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">สิทธิการรักษา:</span>
            <span className="font-bold">
              {ticket.benefitType || "แจ้งที่จุดลงทะเบียน"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">แผนกตรวจ:</span>
            <span className="font-semibold">{departmentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">จุดบริการ / ห้องตรวจ:</span>
            <span className="font-extrabold">{assignedRoom}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">เวลาพบแพทย์โดยประมาณ:</span>
            <span className="font-extrabold">{estDoctorTime}</span>
          </div>
          {hasAllergy && (
            <div className="flex justify-between pt-0.5 text-red-700 font-bold">
              <span>ประวัติแพ้ยา (สำคัญ):</span>
              <span>{ticket.allergies}</span>
            </div>
          )}
        </div>

        {/* QN, Reference Number & Simulated Hospital QR Code */}
        <div className="flex items-center justify-between gap-2 border-b border-black pb-2.5 mb-2">
          <div className="text-xs space-y-0.5">
            <div className="text-base font-black">QN: {qnShort}</div>
            <div>เลขอ้างอิง: {refShort}</div>
            <div className="text-[11px]">
              HN: {ticket.hn || ticket.patientId || "OPD-NEW"}
            </div>
            <div className="text-[11px]">เวลารับคิว: {ticket.time}</div>
          </div>

          {/* Crisp SVG QR Code for slip authenticity */}
          <svg
            viewBox="0 0 36 36"
            className="w-16 h-16 shrink-0 border border-black p-1 bg-white"
            aria-label="QR Code สำหรับตรวจสอบคิว"
          >
            <path
              fill="#000"
              d="M2 2h10v10H2V2zm2 2v6h6V4H4zm2 2h2v2H6V6zm18-4h10v10H24V2zm2 2v6h6V4h-6zm2 2h2v2h-2V6zM2 24h10v10H2V24zm2 2v6h6v-6H4zm2 2h2v2H6v-2zm10-24h2v4h-2V4zm4 0h2v2h-2V4zm-4 6h4v2h-4v-2zm6 2h2v4h-2v-4zm-8 4h2v4h-2v-4zm4 2h4v4h-4v-4zm-12 2h4v2H4v-2zm6 0h4v2h-4v-2zm14-4h4v2h-4v-2zm6 2h2v4h-2v-4zm-8 4h2v6h-2v-6zm4 2h6v2h-6v-2zm-10 4h4v4h-4v-4zm6 4h4v2h-4v-2zm6-2h4v4h-4v-4z"
            />
          </svg>
        </div>

        {/* Footer Instruction matching Pathum Thani Hospital Slip */}
        <div className="text-center">
          <div className="text-sm font-extrabold">พบแพทย์</div>
          <div className="text-[11px] mt-0.5">
            ไม่ต้องติดต่อฝ่ายการเงิน โปรดรอฟังเรียกคิวหน้าห้องตรวจ
          </div>
        </div>
      </div>

      {/* ─── SCREEN-ONLY AUXILIARY SECTIONS (HIDDEN ON PRINT) ─── */}
      <div className="no-print mt-6">
        {/* Smiley Satisfaction Rating Box (Hospital Kiosk Feedback Terminal) */}
        <div
          className={`relative mb-5 rounded-lg border-2 p-4 text-center transition-all ${
            activeHighlightSection === "ticket-rating"
              ? "border-amber-500 bg-amber-50/80 ring-4 ring-amber-300 ring-offset-2 scale-[1.01]"
              : "border-slate-200 bg-white"
          }`}
        >
          {activeHighlightSection === "ticket-rating" && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-bounce flex items-center gap-1.5 z-30">
              <ArrowDown className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
              <span>กดเลือกระดับความพึงพอใจการบริการ</span>
            </div>
          )}
          <div className="text-xs sm:text-sm font-bold text-slate-900 mb-1">
            ประเมินความพึงพอใจการใช้บริการตู้คัดกรองอัตโนมัติ
          </div>
          <p className="text-xs text-slate-500 mb-3">
            ความคิดเห็นของท่านช่วยพัฒนาการบริการของโรงพยาบาลให้ดียิ่งขึ้น
          </p>

          {ratingSubmitted ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>ขอบพระคุณสำหรับข้อเสนอแนะในการรับบริการ (คะแนน: {rating}/5)</span>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 max-w-md mx-auto">
              {satisfactionOptions.map((opt) => (
                <button
                  key={opt.score}
                  type="button"
                  onClick={() => handleRate(opt.score)}
                  className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-md border bg-slate-50 transition-all transform active:scale-95 ${opt.color}`}
                >
                  <span className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center text-sm font-extrabold text-slate-900 mb-1.5 shadow-sm">
                    {opt.score}
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-700 leading-tight">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สลิปบัตรคิว</span>
          </button>

          <button
            type="button"
            onClick={onStartNew}
            className="rounded-md bg-slate-900 px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            เสร็จสิ้น (กลับสู่หน้าหลัก)
          </button>
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
            <Bell className="w-4 h-4 text-white shrink-0 animate-pulse" />
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
          ESI-2 · เคสความเสี่ยงสูง
        </span>
      );
    }

    if (severity === "mid") {
      return (
        <span
          style={{
            display: "inline-block",
            backgroundColor: "#FFFBEB",
            color: "#92400E",
            border: "1px solid #FDE68A",
            borderRadius: "4px",
            padding: "3px 8px",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          ESI-3 · ความเสี่ยงปานกลาง
        </span>
      );
    }

    return (
      <span
        style={{
          display: "inline-block",
          backgroundColor: "#F0FDF4",
          color: "#166534",
          border: "1px solid #BBF7D0",
          borderRadius: "4px",
          padding: "3px 8px",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        ESI-4 · ทั่วไป
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "#0F172A" }}>
                        {patient.firstName} {patient.lastName}
                      </span>
                      {patient.allergies && patient.allergies !== "ไม่มี" && patient.allergies !== "-" && (
                        <span
                          style={{
                            backgroundColor: "#DC2626",
                            color: "#FFFFFF",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "4px",
                          }}
                        >
                          แพ้ยา: {patient.allergies}
                        </span>
                      )}
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
function IntakePage({ onSubmit, smartCardData, onClearSmartCard, onOpenSmartCard, isSpeaking, activeHighlightSection, onSpeak, onStopSpeech }) {
  const [step, setStep] = useState(() => (smartCardData?.firstName ? 2 : 0));
  const [form, setForm] = useState(() =>
    smartCardData?.firstName
      ? {
          ...BLANK_FORM,
          firstName: smartCardData.firstName || "",
          lastName: smartCardData.lastName || "",
          age: smartCardData.age || "",
          gender: smartCardData.gender || "",
          phone: smartCardData.phone || "",
          hn: smartCardData.hn || "",
          benefitType: smartCardData.benefitType || "",
          allergies: smartCardData.allergies || "",
          medHistory: smartCardData.medHistory || "",
        }
      : { ...BLANK_FORM }
  );
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSymptom = (s) =>
    set("symptoms", form.symptoms.includes(s) ? form.symptoms.filter((x) => x !== s) : [...form.symptoms, s]);

  const bmi = form.weight && form.height
    ? (parseFloat(form.weight) / Math.pow(parseFloat(form.height) / 100, 2)).toFixed(1)
    : "";

  const vitalAlert = (() => {
    const sys = parseInt(String(form.bp || "").split("/")[0], 10);
    const pulse = parseInt(form.pulse, 10);
    const temp = parseFloat(form.temp);
    if (!Number.isNaN(sys) && (sys >= 180 || (sys > 0 && sys < 90))) {
      return `ความดันโลหิตอยู่ในเกณฑ์เฝ้าระวัง (${form.bp} mmHg) — แนะนำแจ้งพยาบาลจุดคัดกรองทันที`;
    }
    if (!Number.isNaN(pulse) && (pulse > 120 || (pulse > 0 && pulse < 50))) {
      return `อัตราชีพจรผิดปกติ (${pulse} ครั้ง/นาที) — แนะนำแจ้งพยาบาลจุดคัดกรอง`;
    }
    if (!Number.isNaN(temp) && temp >= 38.5) {
      return `ตรวจพบไข้สูง (${temp} °C) — ระบบบันทึกข้อมูลเฝ้าระวังในใบคัดกรอง`;
    }
    return null;
  })();

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
    if (onClearSmartCard) onClearSmartCard();
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
          <div className="relative">
            <button
              type="button"
              onClick={isSpeaking ? onStopSpeech : () => onSpeak(STEP_SPEECH[step], `intake-${step}`)}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-amber-300 px-4 py-2 text-xs sm:text-sm font-extrabold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-5 h-5 text-red-700 shrink-0" />
                  <span>หยุดเสียงอ่าน</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>ฟังคำแนะนำขั้นตอนที่ {step + 1}</span>
                </>
              )}
            </button>
          </div>
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

          <div className="relative">
            {activeHighlightSection === "intake-fields" && (
              <div className="absolute -top-10 left-4 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 animate-bounce z-20">
                <ArrowDown className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
                <span>
                  {step === 0 && "กรุณากรอกข้อมูลส่วนตัวและสิทธิการรักษา"}
                  {step === 1 && "กรอกสัญญาณชีพ หรือกดข้ามได้หากไม่ได้วัด"}
                  {step === 2 && "เลือกอาการที่ท่านเป็น และระดับความรุนแรง"}
                  {step === 3 && "ตรวจสอบความถูกต้องของข้อมูลก่อนรับบัตรคิว"}
                </span>
              </div>
            )}
            <div
              key={step}
              className={`step-transition ${
                activeHighlightSection === "intake-fields"
                  ? "ring-4 ring-amber-300 rounded-lg p-2 bg-amber-50/40 border border-amber-300 transition-all"
                  : ""
              }`}
            >
            {step === 0 && (
            <>
              {onOpenSmartCard && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>มีบัตรประชาชนหรือไม่? สามารถเสียบบัตรเพื่อดึงชื่อ อายุ และสิทธิรักษาอัตโนมัติ</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSmartCard}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    อ่านบัตรประชาชน
                  </button>
                </div>
              )}
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
              {vitalAlert && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{vitalAlert}</span>
                </div>
              )}
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
              {smartCardData?.firstName && (
                <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs sm:text-sm text-emerald-900">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>ดึงข้อมูลบัตรประชาชนสำเร็จ: <strong>{form.firstName} {form.lastName}</strong> ({form.age} ปี · {form.benefitType || "ตรวจสอบสิทธิ์แล้ว"})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="text-xs font-bold underline text-emerald-800 hover:text-emerald-950 shrink-0"
                  >
                    แก้ไขข้อมูลส่วนตัว
                  </button>
                </div>
              )}
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
                  วิเคราะห์อาการและแนะนำแผนกด้วย AI
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
          </div>

          <div className="btn-row relative">
            {step > 0 && <button className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>← ย้อนกลับ</button>}
            {step < 3 && (
              <div className="relative inline-block">
                {activeHighlightSection === "intake-next" && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 border-2 border-slate-950 text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-bounce z-20">
                    <ArrowDown className="w-4 h-4 text-slate-950 shrink-0 stroke-[3]" />
                    <span>กรอกเรียบร้อยแล้ว กดปุ่มถัดไปตรงนี้</span>
                  </div>
                )}
                <button
                  className={`btn btn-primary ${
                    activeHighlightSection === "intake-next"
                      ? "ring-4 ring-amber-400 ring-offset-2 animate-pulse font-bold"
                      : ""
                  }`}
                  disabled={!canNext[step]}
                  onClick={() => setStep((s) => s + 1)}
                >
                  ถัดไป →
                </button>
              </div>
            )}
            {step === 3 && (
              <div className="relative inline-block">
                {activeHighlightSection === "intake-submit" && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-600 text-white border-2 border-white text-sm sm:text-base font-extrabold px-3.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-bounce z-20">
                    <ArrowDown className="w-4 h-4 text-white shrink-0 stroke-[3]" />
                    <span>กดปุ่มสีเขียวนี้เพื่อรับบัตรคิวทันที</span>
                  </div>
                )}
                <button
                  className={`btn btn-success ${
                    activeHighlightSection === "intake-submit"
                      ? "ring-4 ring-emerald-400 ring-offset-2 animate-pulse font-black"
                      : ""
                  }`}
                  disabled={saving}
                  onClick={submit}
                >
                  {saving ? "กำลังออกบัตรคิว..." : "ยืนยันข้อมูลและรับบัตรคิว"}
                </button>
              </div>
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
          <div className="row-name flex items-center gap-1.5 flex-wrap">
            <span>{p.firstName} {p.lastName}</span>
            {p.allergies && p.allergies !== "ไม่มี" && p.allergies !== "-" && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                แพ้ยา: {p.allergies}
              </span>
            )}
          </div>
          <div className="row-sub">คิว {p.queueNumber || "—"} · {p.patientId || p.id}</div>
        </div>
        <div className="row-cell">{p.age} ปี / {p.gender}</div>
        <div>
          <span className={`sev-tag ${p.severity}`}>
            {p.severity === "high" ? "ESI-2 · รุนแรง" : p.severity === "mid" ? "ESI-3 · ปานกลาง" : "ESI-4 · ทั่วไป"}
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
                ลบข้อมูล
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
