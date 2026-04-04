const { askAI } = require("../system/aiClient")

function chunkText(text, size = 3500) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + size))
    start += size
  }
  return chunks
}

module.exports = async (m, { args, sender }) => {
  const prompt = (args || []).join(" ").trim()
  if (!prompt) {
    return m.reply("Pakai: .ai <pertanyaan>\nContoh: .ai jelasin fotosintesis singkat")
  }

  try {
    await m.reply("🧠 AI lagi mikir...")
    const answer = await askAI(prompt, { user: sender || "whatsapp-user" })
    const chunks = chunkText(answer)
    for (const part of chunks) {
      await m.reply(part)
    }
  } catch (err) {
    return m.reply(`Gagal jalanin AI:\n${err.message}`)
  }
}
