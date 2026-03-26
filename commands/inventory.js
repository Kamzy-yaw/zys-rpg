const fs = require('fs')
const itemDB = require('../database/item.json')
const alias = {
fish: "Ikan Segar",
ore_iron: "Iron Ore",
ore_gold: "Gold Ore",
ore_diamond: "Diamond Ore",
ore_mythril: "Mythril Ore",
ore_titanium: "Titanium Ore"
}

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Bikin karakter dulu pakai .start")
}

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []

if (player.inventory.length == 0) {
return m.reply("Inventory kosong.")
}

let text = "\uD83C\uDF92 Inventory\n\n"
let counts = {}
let order = []

for (let item of player.inventory) {
if (!counts[item]) {
counts[item] = 0
order.push(item)
}
counts[item] += 1
}

order.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}\n`
})

text += "\nPakai .equip <nomor> untuk pasang gear."
text += "\nPakai .sell <nomor> [jumlah] untuk jual item."
text += "\nPakai .craft untuk lihat resep crafting."
text += "\nPakai .fix <nomor> untuk repair gear."

m.reply(text)

}
