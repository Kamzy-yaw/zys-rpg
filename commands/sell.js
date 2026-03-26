const fs = require('fs')
const itemDB = require('../database/item.json')

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.gold !== 'number') player.gold = 0

let unique = []
let seen = {}
for (let item of player.inventory) {
if (!seen[item]) {
seen[item] = true
unique.push(item)
}
}

let index = parseInt(args[0]) - 1
let itemId = unique[index]
if (isNaN(index) || !itemId) {
return m.reply("Pilih item di inventory dulu. Contoh: .sell 1")
}

let qty = parseInt(args[1] || "1")
if (isNaN(qty) || qty < 1) qty = 1
let have = player.inventory.filter((x) => x === itemId).length
if (qty > have) qty = have

let data = itemDB[itemId]
if (!data || typeof data.sellPrice !== 'number') {
return m.reply("Item ini tidak bisa dijual.")
}
if (player.weapon === itemId || player.armor === itemId || player.pickaxe === itemId) {
return m.reply("Lepas dulu item yang sedang dipakai sebelum dijual.")
}

for (let i = 0; i < qty; i++) {
let rm = player.inventory.indexOf(itemId)
if (rm !== -1) player.inventory.splice(rm, 1)
}
player.gold += data.sellPrice * qty

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`💸 Terjual: ${data.name} x${qty}\n+${data.sellPrice * qty} Gold`)

}
