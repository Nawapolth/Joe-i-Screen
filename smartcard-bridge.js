/* global process, Buffer */
/**
 * JOE's i-MED — Thai National ID Smart Card Bridge (PC/SC APDU + SSE Server)
 * --------------------------------------------------------------------------
 * Connects a physical USB Smart Card Reader (ISO-7816 / PC/SC) to the web app
 * at http://127.0.0.1:8088.
 *
 * Usage:
 *   npm run bridge
 *   (or double-click start-smartcard.bat)
 *
 * Optional Hardware Driver for Real USB Card Reader:
 *   npm install pcsclite
 */

import http from "node:http";
import readline from "node:readline";

const PORT = 8088;
const clients = new Set();
let latestCard = null;
let readerHardwareName = null;

// Demo profiles that can also be triggered from terminal keys [1], [2], [3]
const DEMO_CARDS = {
  "1": {
    citizenId: "1-1004-00842-19-4",
    firstName: "สมศรี",
    lastName: "สุขสวัสดิ์",
    age: "72",
    gender: "หญิง",
    benefitType: "บัตรทอง / สวัสดิการรัฐ",
    hn: "HN-670811",
    medHistory: "ความดันโลหิตสูง, เบาหวาน",
    allergies: "ไม่มี",
    source: "smartcard-bridge",
  },
  "2": {
    citizenId: "3-1012-01928-55-1",
    firstName: "ประเสริฐ",
    lastName: "เกียรติไพศาล",
    age: "68",
    gender: "ชาย",
    benefitType: "สิทธิสวัสดิการ",
    hn: "HN-670920",
    medHistory: "โรคหัวใจขาดเลือด, ไขมันในเลือดสูง",
    allergies: "แอสไพริน (Aspirin)",
    source: "smartcard-bridge",
  },
  "3": {
    citizenId: "1-5099-02341-12-8",
    firstName: "กมลวรรณ",
    lastName: "รัตนโชติ",
    age: "34",
    gender: "หญิง",
    benefitType: "ประกันสังคม",
    hn: "HN-671045",
    medHistory: "ไม่มี",
    allergies: "เพนิซิลลิน (Penicillin)",
    source: "smartcard-bridge",
  },
};

function broadcastCard(cardData) {
  const payload = {
    ...cardData,
    timestamp: new Date().toISOString(),
  };
  latestCard = payload;
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(msg);
    } catch {
      clients.delete(res);
    }
  }
  console.log(
    `\n✅ [SMART CARD READ] ${payload.firstName} ${payload.lastName} (อายุ ${payload.age} ปี | สิทธิ: ${payload.benefitType})`
  );
}

// Convert TIS-620 buffer from Thai National ID Card chip into UTF-8 string
function decodeTis620(buffer) {
  const chars = [];
  for (let i = 0; i < buffer.length; i++) {
    const b = buffer[i];
    if (b === 0x00 || b === 0xff) continue;
    if (b >= 0xa1 && b <= 0xfb) {
      chars.push(String.fromCharCode(b + 0x0e00 - 0xa0));
    } else if (b >= 0x20 && b <= 0x7e) {
      chars.push(String.fromCharCode(b));
    }
  }
  return chars.join("").replace(/#/g, " ").trim();
}

function formatCitizenId(raw13) {
  const d = String(raw13 || "").replace(/\D/g, "");
  if (d.length !== 13) return raw13;
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
}

// Try initializing real PC/SC hardware reader if `pcsclite` is installed
async function initHardwareReader() {
  try {
    const pcscModule = await import("pcsclite");
    const pcsc = (pcscModule.default || pcscModule)();

    pcsc.on("reader", (reader) => {
      readerHardwareName = reader.name;
      console.log(`🔌 ตรวจพบเครื่องอ่านบัตรประชาชน USB: ${reader.name}`);

      reader.on("status", (status) => {
        const changes = reader.state ^ status.state;
        if (!changes) return;

        if (
          changes & reader.SCARD_STATE_PRESENT &&
          status.state & reader.SCARD_STATE_PRESENT
        ) {
          console.log("💳 ตรวจพบการเสียบบัตรประชาชน กำลังอ่านข้อมูลจากชิป...");
          reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err, protocol) => {
            if (err) return;

            const sendApdu = (cmd) =>
              new Promise((resolve, reject) => {
                reader.transmit(Buffer.from(cmd), 256, protocol, (txErr, data) => {
                  if (txErr) return reject(txErr);
                  resolve(data);
                });
              });

            (async () => {
              try {
                // 1. Select Thai MOI ID Card Applet
                await sendApdu([
                  0x00, 0xa4, 0x04, 0x00, 0x08, 0xa0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01,
                ]);

                const readField = async (p1, p2, len) => {
                  await sendApdu([0x80, 0xb0, p1, p2, 0x02, 0x00, len]);
                  const res = await sendApdu([0x00, 0xc0, 0x00, 0x00, len]);
                  return res.slice(0, -2);
                };

                const cidRaw = decodeTis620(await readField(0x00, 0x04, 0x0d));
                const nameRaw = decodeTis620(await readField(0x00, 0x11, 0x64));
                const dobRaw = decodeTis620(await readField(0x00, 0xd9, 0x08));
                const genderRaw = decodeTis620(await readField(0x00, 0xe1, 0x01));

                const nameParts = nameRaw
                  .replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/, "")
                  .split(/\s+/)
                  .filter(Boolean);
                const firstName = nameParts[0] || "ผู้ป่วย";
                const lastName = nameParts.slice(1).join(" ") || "";

                const birthYearBE = parseInt(dobRaw.slice(0, 4), 10);
                const currentYearBE = new Date().getFullYear() + 543;
                const age =
                  birthYearBE > 2400 && birthYearBE <= currentYearBE
                    ? String(currentYearBE - birthYearBE)
                    : "60";

                const gender = genderRaw === "1" ? "ชาย" : genderRaw === "2" ? "หญิง" : "ไม่ระบุ";

                broadcastCard({
                  citizenId: formatCitizenId(cidRaw),
                  firstName,
                  lastName,
                  age,
                  gender,
                  benefitType: parseInt(age, 10) >= 60 ? "บัตรทอง / สวัสดิการรัฐ" : "ประกันสังคม",
                  hn: `HN-${cidRaw.slice(-6)}`,
                  medHistory: "ไม่มี",
                  allergies: "ไม่มี",
                  source: "usb-hardware",
                });
              } catch (readErr) {
                console.warn("⚠️ อ่านข้อมูลชิปไม่สำเร็จ:", readErr.message);
              }
            })();
          });
        }
      });
    });

    pcsc.on("error", (err) => {
      console.warn("⚠️ PC/SC Error:", err.message);
    });
  } catch {
    console.log(
      "ℹ️  โหมดเตรียมพร้อม (หากเสียบเครื่องอ่านบัตร USB จริง สามารถรัน `npm install pcsclite` เพิ่มได้)"
    );
  }
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "joe-imed-smartcard-bridge",
        reader: readerHardwareName || "Virtual Smart Card Bridge Ready",
        latestCard,
      })
    );
    return;
  }

  if (req.url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ type: "connected", reader: readerHardwareName })}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.url?.startsWith("/simulate")) {
    const urlObj = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const profileKey = urlObj.searchParams.get("profile") || "1";
    const card = DEMO_CARDS[profileKey] || DEMO_CARDS["1"];
    broadcastCard(card);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, card }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("==============================================================");
  console.log("🏥 JOE's i-MED — Thai Smart Card Bridge Server");
  console.log(`🌐 กำลังทำงานที่: http://127.0.0.1:${PORT}`);
  console.log("--------------------------------------------------------------");
  console.log("วิธีใช้งานระหว่างพรีเซนต์:");
  console.log("  • เสียบบัตรประชาชนเข้าเครื่องอ่าน USB ข้อมูลจะเด้งเข้าหน้าเว็บทันที");
  console.log("  • หรือกดปุ่มตัวเลข [1], [2], [3] ในหน้าต่างนี้เพื่อยิงข้อมูลบัตรจำลองเข้าเว็บ");
  console.log("==============================================================");
  initHardwareReader();
});

if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on("keypress", (str, key) => {
    if (key && key.ctrl && key.name === "c") {
      process.exit(0);
    }
    if (str === "1" || str === "2" || str === "3") {
      broadcastCard(DEMO_CARDS[str]);
    }
  });
}
