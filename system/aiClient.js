const DEFAULT_MODEL = "gpt-oss-120b"

let localConfig = {}
try {
  localConfig = require("./localConfig")
} catch (_) {
  localConfig = {}
}

function pickApiKey() {
  return (
    process.env.AI_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    localConfig.AI_API_KEY ||
    ""
  )
}

function pickBaseUrl() {
  if (process.env.AI_BASE_URL) return process.env.AI_BASE_URL
  if (localConfig.AI_BASE_URL) return localConfig.AI_BASE_URL
  if (process.env.GROQ_API_KEY) return "https://api.groq.com/openai/v1"
  if (localConfig.AI_API_KEY) return "https://api.groq.com/openai/v1"
  return "https://api.x.ai/v1"
}

function normalizeContent(content) {
  if (!content) return ""
  if (typeof content === "string") return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part.text === "string") return part.text
        return ""
      })
      .join("\n")
      .trim()
  }
  return String(content).trim()
}

async function askAI(prompt, opts = {}) {
  const apiKey = pickApiKey()
  if (!apiKey) {
    throw new Error("API key belum diset. Isi AI_API_KEY (atau GROK_API_KEY/XAI_API_KEY/GROQ_API_KEY).")
  }

  const baseUrl = pickBaseUrl().replace(/\/+$/, "")
  const model = process.env.AI_MODEL || localConfig.AI_MODEL || DEFAULT_MODEL
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "Kamu asisten AI yang bantu pengguna WhatsApp dengan jawaban ringkas, jelas, dan akurat."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        user: opts.user || "whatsapp-user"
      }),
      signal: controller.signal
    })

    const raw = await response.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch (_) {
      data = null
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        raw ||
        `HTTP ${response.status}`
      throw new Error(`AI request gagal: ${message}`)
    }

    const content = normalizeContent(data?.choices?.[0]?.message?.content)
    if (!content) {
      throw new Error("Respons AI kosong.")
    }

    return content
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`AI timeout setelah ${timeoutMs}ms.`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function askAIMessages(messages, opts = {}) {
  const apiKey = pickApiKey()
  if (!apiKey) {
    throw new Error("API key belum diset. Isi AI_API_KEY (atau GROK_API_KEY/XAI_API_KEY/GROQ_API_KEY).")
  }

  const baseUrl = pickBaseUrl().replace(/\/+$/, "")
  const model =
    opts.model ||
    process.env.AI_VISION_MODEL ||
    localConfig.AI_VISION_MODEL ||
    process.env.AI_MODEL ||
    localConfig.AI_MODEL ||
    DEFAULT_MODEL
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages,
        user: opts.user || "whatsapp-user"
      }),
      signal: controller.signal
    })

    const raw = await response.text()
    let data = null
    try {
      data = JSON.parse(raw)
    } catch (_) {
      data = null
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        raw ||
        `HTTP ${response.status}`
      throw new Error(`AI request gagal: ${message}`)
    }

    const content = normalizeContent(data?.choices?.[0]?.message?.content)
    if (!content) {
      throw new Error("Respons AI kosong.")
    }

    return content
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`AI timeout setelah ${timeoutMs}ms.`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function askAIVisionFromImageBuffer(imageBuffer, prompt, opts = {}) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("Buffer gambar tidak valid.")
  }

  const mimeType = opts.mimeType || "image/jpeg"
  const imageBase64 = imageBuffer.toString("base64")
  const messages = [
    {
      role: "system",
      content: "Kamu asisten OCR. Ekstrak teks dari gambar dengan akurat dan rapi."
    },
    {
      role: "user",
      content: [
        { type: "text", text: prompt || "Ekstrak semua teks di gambar ini." },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`
          }
        }
      ]
    }
  ]

  return askAIMessages(messages, opts)
}

module.exports = {
  askAI,
  askAIMessages,
  askAIVisionFromImageBuffer
}
