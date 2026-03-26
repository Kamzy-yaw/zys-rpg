const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureDurabilityState, getDurability } = require('../system/equipment')

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.gold !== 'number') player.gold = 0
ensureDurabilityState(player)

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
if (!itemId || !itemDB[itemId]) {
return m.reply("Pilih item gear di inventory. Contoh: .fix 1")
}

let data = itemDB[itemId]
if (data.type !== 'weapon' && data.type !== 'armor') return m.reply("Item ini tidak bisa di-fix.")

let d = getDurability(player, itemId)
if (!d) return m.reply("Item ini tidak punya durability.")
if (d.current >= d.max) return m.reply("Durability item ini sudah penuh.")

let missing = d.max - d.current
let cost = Math.max(20, missing * 2)
if (player.gold < cost) return m.reply(`Gold tidak cukup. Fix butuh ${cost} Gold.`)

player.gold -= cost
player.durability[itemId] = d.max

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(`🔧 ${data.name} diperbaiki.\nDurability: ${d.max}/${d.max}\n-${cost} Gold`)
}
