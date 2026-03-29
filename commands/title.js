const fs = require('fs')
const achievementDB = require('../database/achievement.json')
const { ensureAchievementState, evaluateAchievements } = require('../system/achievement')

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Karakter belum ada.\nKetik .start dulu ya.")

let player = db[sender]
ensureAchievementState(player)
evaluateAchievements(player, achievementDB)

let action = String(args[0] || '').toLowerCase()
if (action === 'set' || action === 'equip') action = String(args[1] || '')
if (!action) {
let list = player.titles.unlocked.map((t, i) => `${i + 1}. ${t}${t === player.titles.equipped ? ' (aktif)' : ''}`).join('\n')
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`🎖️ Daftar Title\n\nTitle aktif: ${player.titles.equipped}\n\n${list}\n\nPakai: .title <nomor>\nContoh: .title 2`)
}

let idx = parseInt(action) - 1
if (Number.isNaN(idx) || !player.titles.unlocked[idx]) {
return m.reply("Nomor title tidak valid.\nCek daftar pakai .title")
}

player.titles.equipped = player.titles.unlocked[idx]
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`✅ Title aktif sekarang: ${player.titles.equipped}`)
}
