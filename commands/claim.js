const fs = require('fs')
const questDB = require('../database/quest.json')
const levelUp = require('../system/level')

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

if (!player.quest.active || !questDB[player.quest.active]) {
return m.reply("Tidak ada quest aktif.")
}

if (!player.quest.claimable) {
let q = questDB[player.quest.active]
return m.reply(`Quest ${q.name} belum selesai.\nProgress: ${player.quest.progress}/${q.amount}`)
}

let qid = player.quest.active
let q = questDB[qid]

player.gold = (player.gold || 0) + q.rewardGold
player.exp = (player.exp || 0) + q.rewardExp
player.quest.completed[qid] = Number(player.quest.completed[qid] || 0) + 1

player.quest.active = null
player.quest.progress = 0
player.quest.claimable = false

let text = `\uD83C\uDFC1 Reward quest di-claim!\n${q.name}\n+${q.rewardExp} EXP\n+${q.rewardGold} Gold`

if (levelUp(player)) {
text += `\n\n\u2728 LEVEL UP!\nLevel sekarang: ${player.level}\nHP: ${player.maxhp}\nSTR: ${player.str}`
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)

}
