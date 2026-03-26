const fs = require('fs')
const areaDB = require('../database/area.json')

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!player.area || !areaDB[player.area]) player.area = "field"

let input = (args.join(" ") || "").toLowerCase().trim()

if (!input) {
let current = areaDB[player.area]
let text = `\uD83D\uDDFA\uFE0F World Map\n\nArea sekarang: ${current.name} (Req Lv.${current.level})\n\nDaftar area:\n`

for (let id of Object.keys(areaDB)) {
let a = areaDB[id]
let lock = player.level >= a.level ? "\u2705" : "\uD83D\uDD12"
text += `${lock} ${id} - ${a.name} (Lv.${a.level})\n`
}

text += `\nBiaya travel: 25 Gold`
text += `\nPakai: .travel <nama_area>\nContoh: .travel forest`
return m.reply(text)
}

let targetId = Object.keys(areaDB).find((id) => {
let n = areaDB[id].name.toLowerCase()
return id === input || n === input || n.replace(/\s+/g, "_") === input
})

if (!targetId) return m.reply("Area tidak ditemukan. Cek daftar area pakai .travel")

let target = areaDB[targetId]
if (player.level < target.level) {
return m.reply(`Level kamu belum cukup. ${target.name} butuh level ${target.level}.`)
}

if (player.area === targetId) {
return m.reply(`Kamu sudah berada di ${target.name}.`)
}

if (typeof player.gold !== 'number') player.gold = 0
let travelCost = 25
if (player.gold < travelCost) {
return m.reply(`Gold tidak cukup. Travel butuh ${travelCost} Gold.`)
}

player.area = targetId
player.gold -= travelCost
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`\uD83D\uDEB6 Kamu pindah ke ${target.name}.\n-${travelCost} Gold\nMonster di area ini sekarang berbeda.`)

}
