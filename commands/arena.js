const fs = require('fs')
const path = require('path')
const { normalizePvp, runPvp, applyPvpResult, getRankGrade } = require('../system/pvp')
const { useDurability } = require('../system/equipment')
const achievementDB = require('../database/achievement.json')
const { ensureAchievementState, evaluateAchievements } = require('../system/achievement')

const arenaPath = path.join(__dirname, '..', 'database', 'arena.json')

function readArena() {
if (!fs.existsSync(arenaPath)) return { members: [] }
let data = JSON.parse(fs.readFileSync(arenaPath))
if (!Array.isArray(data.members)) data.members = []
return data
}

function saveArena(data) {
fs.writeFileSync(arenaPath, JSON.stringify(data, null, 2))
}

function asTag(id, fallback) {
let num = String(id || '').replace(/\D/g, '')
if (!num) return fallback || String(id || 'Unknown')
return `@${num}`
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Bikin karakter dulu pakai .start')

if (typeof db[sender].pvpCooldown !== 'number') db[sender].pvpCooldown = 0
let now = Date.now()
let cooldown = 45000
let action = (args[0] || '').toLowerCase()

let arena = readArena()

if (action === 'join') {
if (!arena.members.includes(sender)) arena.members.push(sender)
saveArena(arena)
return m.reply('Kamu join arena queue.')
}

if (action === 'leave') {
arena.members = arena.members.filter((id) => id !== sender)
saveArena(arena)
return m.reply('Kamu keluar dari arena queue.')
}

if (action === 'list') {
if (arena.members.length === 0) return m.reply('Arena kosong.')
let text = 'Arena Queue\n\n'
let mentions = []
arena.members.forEach((id, i) => {
text += `${i + 1}. ${asTag(id, db[id]?.name || id)}\n`
if (String(id).includes('@')) mentions.push(id)
})
return m.reply({ text, mentions })
}

if (!arena.members.includes(sender)) {
return m.reply('Kamu belum join arena. Pakai .arena join')
}

if (now - db[sender].pvpCooldown < cooldown) {
let sisa = Math.ceil((cooldown - (now - db[sender].pvpCooldown)) / 1000)
return m.reply(`Arena cooldown. Tunggu ${sisa} detik.`)
}

let candidates = arena.members.filter((id) => id !== sender && db[id])
if (candidates.length === 0) {
return m.reply('Belum ada lawan di queue. Ajak teman pakai .arena join')
}

let enemyId = candidates[Math.floor(Math.random() * candidates.length)]
let me = db[sender]
let enemy = db[enemyId]
normalizePvp(me)
normalizePvp(enemy)
ensureAchievementState(me)
ensureAchievementState(enemy)

let result = runPvp(me, enemy)
let statUp = applyPvpResult(result.winner, result.loser)
let winnerId = result.winner === me ? sender : enemyId
let loserId = result.loser === me ? sender : enemyId

db[winnerId].pvpCooldown = now
db[loserId].pvpCooldown = now

if (db[winnerId].weapon) useDurability(db[winnerId], db[winnerId].weapon, 1)
if (db[winnerId].armor) useDurability(db[winnerId], db[winnerId].armor, 1)
if (db[loserId].weapon) useDurability(db[loserId], db[loserId].weapon, 1)
if (db[loserId].armor) useDurability(db[loserId], db[loserId].armor, 1)

let winnerRank = getRankGrade(result.winner)
let winnerUnlocked = evaluateAchievements(db[winnerId], achievementDB)
let loserUnlocked = evaluateAchievements(db[loserId], achievementDB)

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

let winnerName = asTag(winnerId, db[winnerId].name || winnerId)
let loserName = asTag(loserId, db[loserId].name || loserId)
let enemyName = asTag(enemyId, db[enemyId].name || enemyId)
let mentions = [winnerId, loserId].filter((id, i, arr) => String(id).includes('@') && arr.indexOf(id) === i)

let text = `Arena Battle!\n\nLawan: ${enemyName}\nWinner: ${winnerName}\nLoser: ${loserName}\n\nWinner: +50 Gold, +1 ${statUp.toUpperCase()}\nLoser: -50 Gold, HP jadi 1\n\nRank winner: ${winnerRank.grade} (${winnerRank.wins} win)`
let unlockLines = []
for (let x of winnerUnlocked || []) unlockLines.push(`- ${winnerName}: ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`)
for (let x of loserUnlocked || []) unlockLines.push(`- ${loserName}: ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`)
if (unlockLines.length) text += `\n\nAchievement Unlocked:\n${unlockLines.join('\n')}`

m.reply({ text, mentions })
}
