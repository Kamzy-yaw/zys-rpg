const fs = require('fs')
const questDB = require('../database/quest.json')
const { getQuestDailyKeyWIB } = require('../system/questreset')

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
let dailyKey = getQuestDailyKeyWIB()
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

if (!player.quest.active) {
return m.reply("Tidak ada quest aktif yang bisa dibatalkan.")
}

let qid = player.quest.active
let q = questDB[qid]
let qName = q ? q.name : qid

player.quest.active = null
player.quest.progress = 0
player.quest.claimable = false

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(`Quest dibatalkan: ${qName}\nReward tidak diberikan.`)
}
