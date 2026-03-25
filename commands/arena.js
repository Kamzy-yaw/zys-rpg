const fs = require('fs')
const { normalizePvp, runPvp, applyPvpResult, getRankGrade } = require('../system/pvp')

function asTag(id, fallback) {
let num = String(id || '').replace(/\D/g, '')
if (!num) return fallback || String(id || 'Unknown')
return `@${num}`
}

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let candidates = Object.keys(db).filter((id) => id !== sender)
if (candidates.length === 0) return m.reply("Belum ada lawan di arena.")

let enemyId = candidates[Math.floor(Math.random() * candidates.length)]
let me = db[sender]
let enemy = db[enemyId]

normalizePvp(me)
normalizePvp(enemy)

let result = runPvp(me, enemy)
let statUp = applyPvpResult(result.winner, result.loser)

let winnerId = result.winner === me ? sender : enemyId
let loserId = result.loser === me ? sender : enemyId
let winnerName = asTag(winnerId, db[winnerId].name || winnerId)
let loserName = asTag(loserId, db[loserId].name || loserId)
let enemyName = asTag(enemyId, db[enemyId].name || enemyId)
let winnerRank = getRankGrade(result.winner)
let mentions = []
if (String(winnerId).includes('@')) mentions.push(winnerId)
if (String(loserId).includes('@') && loserId !== winnerId) mentions.push(loserId)

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply({
text: `🏟️ Arena Battle!\n\nLawan: ${enemyName}\nWinner: ${winnerName}\nLoser: ${loserName}\n\n🎁 Winner: +50 Gold, +1 ${statUp.toUpperCase()}\n💀 Loser: -50 Gold, HP jadi 1\n\nRank winner: ${winnerRank.grade} (${winnerRank.wins} win)`,
mentions
})

}
