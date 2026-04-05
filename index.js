require("dotenv").config()

const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} = require("@whiskeysockets/baileys")
const P = require("pino")
const readline = require("readline")
const { initDatabase, setupShutdownHooks } = require("./database")

function ask(question) {
return new Promise((resolve) => {
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question(question, (answer) => {
rl.close()
resolve(answer)
})
})
}

function normalizePhone(input) {
return String(input || "").replace(/[^\d]/g, "")
}

async function resolveSenderPn(sock, senderJid) {
try {
if (!senderJid || !String(senderJid).endsWith('@lid')) return null
const pn = await sock.signalRepository?.lidMapping?.getPNForLID(senderJid)
return pn || null
  } catch (err) {
return null
}
}

function delay(ms) {
return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForPairingReady(sock, timeoutMs = 20000) {
return new Promise((resolve, reject) => {
let done = false
let timeout = setTimeout(() => {
cleanup()
reject(new Error("Timeout menunggu koneksi pairing siap"))
}, timeoutMs)

function cleanup() {
if (done) return
done = true
clearTimeout(timeout)
sock.ev.off("connection.update", onUpdate)
}

function onUpdate(update) {
const { connection, lastDisconnect } = update
if (connection === "connecting" || connection === "open") {
cleanup()
resolve()
return
}

if (connection === "close") {
cleanup()
const reason = lastDisconnect?.error?.message || "Connection Closed"
reject(new Error(reason))
}
}

sock.ev.on("connection.update", onUpdate)
})
}

async function startBot() {
await initDatabase()
setupShutdownHooks()
const { state, saveCreds } = await useMultiFileAuthState("./session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
logger: P({ level: "error" }),
auth: state,
version,
browser: ["Windows", "Chrome", "122.0.0.0"],
markOnlineOnConnect: false,
syncFullHistory: false,
printQRInTerminal: false
})

sock.ev.on("creds.update", saveCreds)
sock.ev.on("connection.update", (update) => {
const { connection, lastDisconnect } = update

if (connection === "open") {
console.log("Bot connected.")
}

if (connection === "close") {
const statusCode = lastDisconnect?.error?.output?.statusCode
const reason = lastDisconnect?.error?.message || "unknown"
console.log(`Connection closed: ${reason}`)
console.log(`Status code: ${statusCode || "n/a"}`)

if (statusCode === DisconnectReason.loggedOut) {
console.log("Session logout. Hapus folder session lalu pair ulang pakai nomor.")
return
}

setTimeout(() => {
startBot().catch((err) => console.error("Reconnect gagal:", err))
}, 5000)
}
})

if (!state.creds.registered) {
let phoneNumber = normalizePhone(process.env.PHONE_NUMBER)
if (!phoneNumber) {
phoneNumber = normalizePhone(await ask("Masukkan nomor WhatsApp (format 62xxx): "))
}

if (!phoneNumber) {
throw new Error("Nomor tidak valid. Isi PHONE_NUMBER atau input nomor saat start.")
}

await waitForPairingReady(sock)
await delay(1500)
const code = await sock.requestPairingCode(phoneNumber)
console.log("\nPairing code kamu:")
console.log(code?.match(/.{1,4}/g)?.join("-") || code)
console.log("Masukkan code ini di WhatsApp > Linked Devices > Link with phone number.")
}

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
let senderPn = await resolveSenderPn(sock, sender)

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
},
send: (jid, payload) => {
if (!jid) return Promise.resolve()
if (typeof payload === 'string') {
return sock.sendMessage(jid, { text: payload })
}
if (payload && typeof payload === 'object') {
let message = { text: payload.text || '' }
if (Array.isArray(payload.mentions)) message.mentions = payload.mentions
return sock.sendMessage(jid, message)
}
return sock.sendMessage(jid, { text: String(payload || '') })
}
}, {
sender,
senderPn,
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
