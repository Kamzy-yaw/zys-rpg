const fs = require('fs')
const questDB = require('../database/quest.json')

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
}

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
normalizeQuest(player)

let text = "\uD83D\uDCDC Quest Board\n\n"

if (player.quest.active && questDB[player.quest.active]) {
let q = questDB[player.quest.active]
text += `Quest aktif: ${q.name}\nTarget: ${q.target}\nProgress: ${player.quest.progress}/${q.amount}\nReward: ${q.rewardExp} EXP | ${q.rewardGold} Gold\n`
if (player.quest.claimable) {
text += "\nStatus: SIAP CLAIM\nKetik .claim untuk ambil reward.\n"
} else {
text += "\nStatus: ON GOING\n"
}
text += "\n"
} else {
text += "Belum ada quest aktif. Ketik .accept <id_quest> untuk ambil quest.\n\n"
}

text += "Daftar quest:\n"
for (let id of Object.keys(questDB)) {
let q = questDB[id]
let done = Number(player.quest.completed[id] || 0)
let repeatMax = Number(q.repeat || 1)
let remain = Math.max(0, repeatMax - done)
text += `- ${id}: ${q.name} (${q.amount} ${q.target}) | ${q.rewardExp} EXP + ${q.rewardGold} Gold | selesai ${done}/${repeatMax}x | sisa ${remain}\n`
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)

}
