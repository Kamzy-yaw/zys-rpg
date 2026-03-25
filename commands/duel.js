const fs = require('fs')
const { normalizePvp, runPvp, applyPvpResult, getRankGrade } = require('../system/pvp')

function digits(v) {
return String(v || '').replace(/\D/g, '')
}

function normalizeTarget(raw) {
if (!raw) return ''
let t = String(raw).trim()
if (t.startsWith('@')) t = t.slice(1)
if (!t.includes('@')) t = `${digits(t)}@s.whatsapp.net`
return t
}

function findPlayerKey(db, raw) {
if (!raw) return null
if (db[raw]) return raw

let d = digits(raw)
if (!d) return null

for (let id of Object.keys(db)) {
if (digits(id) === d) return id
}
return null
}

function asTag(id, fallback) {
let num = String(id || '').replace(/\D/g, '')
if (!num) return fallback || String(id || 'Unknown')
return `@${num}`
}

module.exports = async (m, { sender, args, mentionedJid }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let targetRaw = (mentionedJid && mentionedJid[0]) || args[0]
if (!targetRaw) return m.reply("Tag lawan dulu. Contoh: .duel @user")

let targetNorm = normalizeTarget(targetRaw)
let targetId = findPlayerKey(db, targetNorm)

if (!targetId || !db[targetId]) {
return m.reply("Player target belum punya karakter.")
}

if (targetId === sender) return m.reply("Ngelawan diri sendiri? cari musuh lain.")

let p1 = db[sender]
let p2 = db[targetId]

normalizePvp(p1)
normalizePvp(p2)

let result = runPvp(p1, p2)
let statUp = applyPvpResult(result.winner, result.loser)

let winnerId = result.winner === p1 ? sender : targetId
let loserId = result.loser === p1 ? sender : targetId
let winnerName = asTag(winnerId, db[winnerId].name || winnerId)
let loserName = asTag(loserId, db[loserId].name || loserId)
let winnerRank = getRankGrade(result.winner)
let mentions = []
if (String(winnerId).includes('@')) mentions.push(winnerId)
if (String(loserId).includes('@') && loserId !== winnerId) mentions.push(loserId)

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply({
text: `⚔️ Duel dimulai!\n\nWinner: ${winnerName}\nLoser: ${loserName}\n\n🎁 Winner: +50 Gold, +1 ${statUp.toUpperCase()}\n💀 Loser: -50 Gold, HP jadi 1\n\nRank winner: ${winnerRank.grade} (${winnerRank.wins} win)`,
mentions
})

}
