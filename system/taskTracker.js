const { askAI } = require("./aiClient")
const { googleVisionOcrFromBuffer } = require("./googleVisionOcr")
const fs = require("fs")
const os = require("os")
const path = require("path")
const { execFile } = require("child_process")

let localConfig = {}
try {
  localConfig = require("./localConfig")
} catch (_) {
  localConfig = {}
}

const TARGET_GROUPS = [
  "120363045027977168@g.us",
  "120363376523030607@g.us",
  "120363418536610998@g.us"
]

const KEYWORDS = [
  "tugas",
  "pr",
  "deadline",
  "dikumpulkan",
  "kumpul",
  "kerjakan",
  "soal",
  "halaman"
]

const OWNER_JID = "6285722929429@s.whatsapp.net"
const GOOGLE_VISION_API_KEY =
  process.env.GOOGLE_VISION_API_KEY || localConfig.GOOGLE_VISION_API_KEY || ""
const OCR_ENGINE =
  process.env.OCR_ENGINE ||
  localConfig.OCR_ENGINE ||
  (GOOGLE_VISION_API_KEY ? "google" : "tesseract")

function chunkText(text, size = 3000) {
  const out = []
  let start = 0
  while (start < text.length) {
    out.push(text.slice(start, start + size))
    start += size
  }
  return out
}

async function sendLongText(sock, jid, text) {
  for (const part of chunkText(String(text || ""))) {
    if (!part) continue
    await sock.sendMessage(jid, { text: part })
  }
}

function getMessageContent(msg) {
  return msg?.message?.ephemeralMessage?.message || msg?.message || {}
}

async function downloadImageBuffer(sock, msg, content) {
  const mediaMsg = { ...msg, message: content }
  try {
    return await sock.downloadMediaMessage(
      mediaMsg,
      "buffer",
      {},
      { reuploadRequest: sock.updateMediaMessage }
    )
  } catch (_) {
    return sock.downloadMediaMessage(mediaMsg, "buffer", {})
  }
}

async function runTesseract(imagePath, lang) {
  return new Promise((resolve, reject) => {
    const args = [imagePath, "stdout"]
    if (lang) {
      args.push("-l", lang)
    }
    args.push("--psm", "6")

    execFile("tesseract", args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr || err.message))
      }
      resolve(String(stdout || "").trim())
    })
  })
}

async function extractImageText(sock, msg, content) {
  if (!content?.imageMessage) return ""

  try {
    const buffer = await downloadImageBuffer(sock, msg, content)
    if (!buffer || !buffer.length) return ""

    if (OCR_ENGINE === "google") {
      if (!GOOGLE_VISION_API_KEY) {
        return ""
      }
      const extracted = await googleVisionOcrFromBuffer(buffer, GOOGLE_VISION_API_KEY)
      return String(extracted || "").trim()
    }

    if (OCR_ENGINE !== "tesseract") return ""

    const ext = (content.imageMessage?.mimetype || "image/jpeg").includes("png") ? "png" : "jpg"
    const tmpPath = path.join(os.tmpdir(), `ocr_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
    fs.writeFileSync(tmpPath, buffer)

    const lang = process.env.OCR_LANG || "ind"
    let extracted = ""
    try {
      extracted = await runTesseract(tmpPath, lang)
    } finally {
      try { fs.unlinkSync(tmpPath) } catch (_) {}
    }

    return String(extracted || "").trim()
  } catch (err) {
    console.log("TaskTracker OCR Error:", err?.message || err)
    return ""
  }
}

module.exports = async function taskTracker(sock, msg) {
  try {
    const from = msg?.key?.remoteJid
    if (!from || !TARGET_GROUPS.includes(from)) return

    const content = getMessageContent(msg)
    const text =
      content.conversation ||
      content.extendedTextMessage?.text ||
      content.imageMessage?.caption ||
      content.videoMessage?.caption ||
      ""

    const hasImage = Boolean(content.imageMessage)
    if (!text && !hasImage) return

    const ocrText = hasImage ? await extractImageText(sock, msg, content) : ""
    const combinedText = [text, ocrText].filter(Boolean).join("\n")
    if (!combinedText) return

    const lower = combinedText.toLowerCase()
    const detected = KEYWORDS.some((k) => lower.includes(k))
    if (!detected) return

    let groupName = from
    try {
      const metadata = await sock.groupMetadata(from)
      groupName = metadata?.subject || from
    } catch (_) {
      groupName = from
    }

    const alert = `TUGAS TERDETEKSI\n\n${text || "(pesan berbentuk gambar)"}\n\nGrup:\n${groupName}${ocrText ? `\n\nTeks dari gambar:\n${ocrText}` : ""}`
    await sendLongText(sock, OWNER_JID, alert)

    try {
      const aiPrompt = `Kamu adalah asisten belajar.
Jawab pesan tugas berikut dengan bahasa Indonesia yang ringkas dan mudah dipahami siswa.
Kalau bentuknya pertanyaan, beri jawaban langsung.
Kalau bentuknya instruksi tugas (bukan pertanyaan), bantu buatkan penjelasan materi singkat + langkah mengerjakan.

Pesan tugas:
${combinedText}`

      const answer = await askAI(aiPrompt, {
        user: msg?.key?.participant || from
      })

      const aiReply = `JAWABAN AI TUGAS\n\n${answer}`
      await sendLongText(sock, OWNER_JID, aiReply)
    } catch (aiErr) {
      console.log("TaskTracker AI Error:", aiErr?.message || aiErr)
      await sock.sendMessage(OWNER_JID, {
        text: `AI gagal menjawab tugas dari grup ${groupName}\n${aiErr?.message || aiErr}`
      })
    }
  } catch (err) {
    console.log("TaskTracker Error:", err)
  }
}
