const fs = require('fs')
const questDB = require('../database/quest.json')

function getQuestDailyKey() {
let d = new Date()
if (d.getHours() < 7) d.setDate(d.getDate() - 1)
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

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
normalizeQuest(player)
if (typeof player.level !== 'number') player.level = 1

if (player.quest.active && !player.quest.claimable) {
return m.reply("Kamu masih punya quest aktif. Selesaikan dulu, lalu .claim.")
}

let list = Object.keys(questDB)
let input = (args[0] || "").toLowerCase()
if (!input) {
return m.reply(`Pilih quest dulu.\nContoh: .accept ${list[0]}`)
}

let picked = input
if (!questDB[picked]) {
let idx = parseInt(input) - 1
if (!isNaN(idx) && list[idx]) picked = list[idx]
}

if (!questDB[picked]) {
return m.reply("Quest tidak ditemukan. Cek daftar quest pakai .quest")
}

player.quest.active = picked
player.quest.progress = 0
player.quest.claimable = false

let q = questDB[picked]
let minLevel = Number(q.minLevel || 1)
if (player.level < minLevel) {
return m.reply(`Level kamu belum cukup untuk quest ini.\nButuh Lv.${minLevel}+ | Level kamu Lv.${player.level}`)
}
let done = Number(player.quest.completed[picked] || 0)
let repeatMax = Number(q.repeat || 1)
if (done >= repeatMax) {
return m.reply(`Quest ${q.name} sudah mencapai batas repeat (${repeatMax}x).`)
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`\uD83D\uDCE5 Quest diterima: ${q.name}\nTarget: bunuh ${q.amount} ${q.target}\nReward: ${q.rewardExp} EXP + ${q.rewardGold} Gold\nRepeat: ${done}/${repeatMax}`)

}
