const fs = require('fs')
const path = require('path')
const { normalizePvp, runPvp, applyPvpResult, getRankGrade } = require('../system/pvp')
const { useDurability } = require('../system/equipment')
const achievementDB = require('../database/achievement.json')
const { ensureAchievementState, evaluateAchievements } = require('../system/achievement')

const duelPath = path.join(__dirname, '..', 'database', 'duel.json')

function readPending() {
if (!fs.existsSync(duelPath)) return {}
return JSON.parse(fs.readFileSync(duelPath))
}

function savePending(data) {
fs.writeFileSync(duelPath, JSON.stringify(data, null, 2))
}

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

function runAndApplyDuel(db, challenger, defender) {
let p1 = db[challenger]
let p2 = db[defender]
normalizePvp(p1)
normalizePvp(p2)
ensureAchievementState(p1)
ensureAchievementState(p2)

let result = runPvp(p1, p2)
let statUp = applyPvpResult(result.winner, result.loser)

let winnerId = result.winner === p1 ? challenger : defender
let loserId = result.loser === p1 ? challenger : defender

if (db[winnerId].weapon) useDurability(db[winnerId], db[winnerId].weapon, 1)
if (db[winnerId].armor) useDurability(db[winnerId], db[winnerId].armor, 1)
if (db[loserId].weapon) useDurability(db[loserId], db[loserId].weapon, 1)
if (db[loserId].armor) useDurability(db[loserId], db[loserId].armor, 1)

let winnerRank = getRankGrade(result.winner)
let winnerUnlocked = evaluateAchievements(db[winnerId], achievementDB)
let loserUnlocked = evaluateAchievements(db[loserId], achievementDB)

return { winnerId, loserId, statUp, winnerRank, winnerUnlocked, loserUnlocked }
}

module.exports = async (m, { sender, args, mentionedJid }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Bikin karakter dulu pakai .start')

if (typeof db[sender].pvpCooldown !== 'number') db[sender].pvpCooldown = 0
let now = Date.now()
let cooldown = 45000

let action = (args[0] || '').toLowerCase()
let pending = readPending()

if (action === 'accept') {
let req = pending[sender]
if (!req) return m.reply('Tidak ada duel challenge yang pending.')
let challenger = req.from
if (!db[challenger]) {
delete pending[sender]
savePending(pending)
return m.reply('Challenger tidak ditemukan.')
}

if (typeof db[challenger].pvpCooldown !== 'number') db[challenger].pvpCooldown = 0
if (now - db[sender].pvpCooldown < cooldown || now - db[challenger].pvpCooldown < cooldown) {
delete pending[sender]
savePending(pending)
return m.reply('Salah satu player masih cooldown duel.')
}

let result = runAndApplyDuel(db, challenger, sender)
db[challenger].pvpCooldown = now
db[sender].pvpCooldown = now

delete pending[sender]
savePending(pending)
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

let winnerName = asTag(result.winnerId, db[result.winnerId].name || result.winnerId)
let loserName = asTag(result.loserId, db[result.loserId].name || result.loserId)
let mentions = [result.winnerId, result.loserId].filter((id, i, arr) => String(id).includes('@') && arr.indexOf(id) === i)

let text = `Duel dimulai!\n\nWinner: ${winnerName}\nLoser: ${loserName}\n\nWinner: +50 Gold, +1 ${result.statUp.toUpperCase()}\nLoser: -50 Gold, HP jadi 1\n\nRank winner: ${result.winnerRank.grade} (${result.winnerRank.wins} win)`
let unlockLines = []
for (let x of result.winnerUnlocked || []) unlockLines.push(`- ${winnerName}: ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`)
for (let x of result.loserUnlocked || []) unlockLines.push(`- ${loserName}: ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`)
if (unlockLines.length) text += `\n\nAchievement Unlocked:\n${unlockLines.join('\n')}`

return m.reply({ text, mentions })
}

if (action === 'decline') {
if (!pending[sender]) return m.reply('Tidak ada duel challenge yang pending.')
delete pending[sender]
savePending(pending)
return m.reply('Duel challenge ditolak.')
}

if (now - db[sender].pvpCooldown < cooldown) {
let sisa = Math.ceil((cooldown - (now - db[sender].pvpCooldown)) / 1000)
return m.reply(`Duel cooldown. Tunggu ${sisa} detik.`)
}

let targetRaw = (mentionedJid && mentionedJid[0]) || args[0]
if (!targetRaw) return m.reply('Tag lawan dulu. Contoh: .duel @user\nAtau: .duel accept / .duel decline')

let targetNorm = normalizeTarget(targetRaw)
let targetId = findPlayerKey(db, targetNorm)
if (!targetId || !db[targetId]) return m.reply('Player target belum punya karakter.')
if (targetId === sender) return m.reply('Ngelawan diri sendiri? cari musuh lain.')

pending[targetId] = { from: sender, at: now }
savePending(pending)

let senderTag = asTag(sender, db[sender].name || sender)
let targetTag = asTag(targetId, db[targetId].name || targetId)
let mentions = [sender, targetId].filter((id, i, arr) => String(id).includes('@') && arr.indexOf(id) === i)

m.reply({
text: `Duel challenge!\n${senderTag} menantang ${targetTag}\n\nTarget, ketik:\n.duel accept\natau\n.duel decline`,
mentions
})
}
