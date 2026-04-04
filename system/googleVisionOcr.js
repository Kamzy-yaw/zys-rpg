async function googleVisionOcrFromBuffer(imageBuffer, apiKey) {
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY belum diset.")
  }
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error("Buffer gambar tidak valid.")
  }

  const base64 = imageBuffer.toString("base64")
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
      }
    ]
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })

  const raw = await res.text()
  let data = null
  try {
    data = JSON.parse(raw)
  } catch (_) {
    data = null
  }

  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.responses?.[0]?.error?.message ||
      raw ||
      `HTTP ${res.status}`
    throw new Error(`Google Vision error: ${message}`)
  }

  const fullText = data?.responses?.[0]?.fullTextAnnotation?.text
  const fallbackText = data?.responses?.[0]?.textAnnotations?.[0]?.description
  return String(fullText || fallbackText || "").trim()
}

module.exports = {
  googleVisionOcrFromBuffer
}
