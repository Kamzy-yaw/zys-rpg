const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} = require("@whiskeysockets/baileys")
const P = require("pino")

async function startBot() {
const { state, saveCreds } = await useMultiFileAuthState("./session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
logger: P({ level: "error" }),
auth: state,
version,
browser: ["Windows", "Chrome", "122.0.0.0"],
markOnlineOnConnect: false,
syncFullHistory: false
})

sock.ev.on("creds.update", saveCreds)
sock.ev.on("connection.update", (update) => {
const { connection, qr, lastDisconnect } = update

if (qr) {
const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`
console.log("\nScan QR di link ini:")
console.log(qrLink)
}

if (connection === "open") {
console.log("Bot connected.")
}

if (connection === "close") {
const statusCode = lastDisconnect?.error?.output?.statusCode
const reason = lastDisconnect?.error?.message || "unknown"
console.log(`Connection closed: ${reason}`)
console.log(`Status code: ${statusCode || "n/a"}`)

if (statusCode === DisconnectReason.loggedOut) {
console.log("Session logout. Hapus folder session lalu scan ulang.")
return
}

setTimeout(() => {
startBot().catch((err) => console.error("Reconnect gagal:", err))
}, 5000)
}
})

sock.ev.on("messages.upsert", async ({ messages, type }) => {
if (type !== "notify") return
let msg = messages[0]
if (!msg?.message) return
if (msg.key?.fromMe) return

let content = msg.message.ephemeralMessage?.message || msg.message
let text = content.conversation || content.extendedTextMessage?.text
if (!text) return
let mentionedJid = content.extendedTextMessage?.contextInfo?.mentionedJid || []

let parsed = text.trim()
if (!parsed.startsWith(".")) return

let sender = msg.key.participant || msg.key.remoteJid

let parts = parsed.slice(1).trim().split(/\s+/)
let command = (parts[0] || "").toLowerCase().replace(/[^a-z0-9_-]/g, "")
if (!command) return
let args = parts.slice(1)

try {
const cmd = require(`./commands/${command}.js`)

await cmd({
reply: (payload) => {
if (typeof payload === 'string') {
return sock.sendMessage(msg.key.remoteJid, { text: payload }, { quoted: msg })
}

if (payload && typeof payload === 'object') {
let message = { text: payload.text || '' }
if (Array.isArray(payload.mentions)) message.mentions = payload.mentions
return sock.sendMessage(msg.key.remoteJid, message, { quoted: msg })
}

return sock.sendMessage(msg.key.remoteJid, { text: String(payload || '') }, { quoted: msg })
}
}, {
sender,
args,
mentionedJid
})
} catch (e) {
sock.sendMessage(msg.key.remoteJid, { text: "Command tidak ditemukan" }, { quoted: msg })
}
})
}

startBot().catch((err) => {
console.error("Gagal start bot:", err)
})
