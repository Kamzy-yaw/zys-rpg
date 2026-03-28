const fs = require('fs')
const questDB = require('../database/quest.json')

function getQuestDailyKey() {
let d = new Date()
if (d.getHours() < 7) d.setDate(d.getDate() - 1)
// Quest reset dimulai setiap hari jam 07:00 server time.
d.setHours(7, 0, 0, 0)
let y = d.getFullYear()
let m = String(d.getMonth() + 1).padStart(2, '0')
let day = String(d.getDate()).padStart(2, '0')
return `${y}-${m}-${day}`
}

function normalizeQuest(player) {
if (!player.quest || typeof player.quest !== 'object') player.quest = {}
if (player.quest.id && !player.quest.active) {
player.quest.active = player.quest.id
if (typeof player.quest.completed === 'number') {
player.quest.completed = { [player.quest.id]: player.quest.completed }
}
delete player.quest.id
}
if (typeof player.quest.progress !== 'number') player.quest.progress = 0
if (typeof player.quest.claimable !== 'boolean') player.quest.claimable = false
if (typeof player.quest.completed !== 'object' || player.quest.completed === null || Array.isArray(player.quest.completed)) {
player.quest.completed = {}
}
if (player.quest.active && !questDB[player.quest.active]) player.quest.active = null
let dailyKey = getQuestDailyKey()
if (player.quest.dailyKey !== dailyKey) {
player.quest.completed = {}
player.quest.dailyKey = dailyKey
}
}

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
normalizeQuest(player)

let text = "\uD83D\uDCDC Quest Board\n\n"
let pLevel = Number(player.level || 1)

if (player.quest.active && questDB[player.quest.active]) {
let q = questDB[player.quest.active]
text += `Quest aktif: ${q.name}\nTarget: ${q.target}\nProgress: ${player.quest.progress}/${q.amount}\nReward: ${q.rewardExp} EXP | ${q.rewardGold} Gold\n`
if (player.quest.claimable) {
text += "\nStatus: SIAP CLAIM\nKetik .claim untuk ambil reward.\n"
} else {
text += "\nStatus: ON GOING\nKetik .cancel untuk batalkan quest aktif.\n"
}
text += "\n"
} else {
text += "Belum ada quest aktif. Ketik .accept <id_quest> untuk ambil quest.\n\n"
}

text += "Daftar quest:\n"
text += `Reset repeat harian: jam 07:00 (key: ${player.quest.dailyKey})\n\n`
for (let id of Object.keys(questDB)) {
let q = questDB[id]
let done = Number(player.quest.completed[id] || 0)
let repeatMax = Number(q.repeat || 1)
let remain = Math.max(0, repeatMax - done)
let minLevel = Number(q.minLevel || 1)
let fit = pLevel >= minLevel ? "✅" : "🔒"
text += `${fit} ${id}: ${q.name} (Lv.${minLevel}+)\n   Target: ${q.amount} ${q.target} | Reward: ${q.rewardExp} EXP + ${q.rewardGold} Gold\n   Repeat: ${done}/${repeatMax}x | Sisa: ${remain}\n`
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)

}
