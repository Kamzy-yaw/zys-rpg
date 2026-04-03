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

module.exports = async function taskTracker(sock, msg) {
  try {
    const from = msg?.key?.remoteJid
    if (!from || !TARGET_GROUPS.includes(from)) return

    const content = msg.message?.ephemeralMessage?.message || msg.message || {}
    const text =
      content.conversation ||
      content.extendedTextMessage?.text ||
      content.imageMessage?.caption ||
      content.videoMessage?.caption ||
      ""

    if (!text) return

    const lower = text.toLowerCase()
    const detected = KEYWORDS.some((k) => lower.includes(k))
    if (!detected) return

    const alert = `📚 *TUGAS TERDETEKSI*

${text}

📍 Grup:
${from}`

    const owner = "6285722929429@s.whatsapp.net"

    await sock.sendMessage(owner, { text: alert })
  } catch (err) {
    console.log("TaskTracker Error:", err)
  }
}
