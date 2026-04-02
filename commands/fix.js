const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureDurabilityState, getDurability } = require('../system/equipment')

function normalizeCategory(raw) {
let c = String(raw || '').toLowerCase()
if (['equip', 'equipment', 'gear'].includes(c)) return 'equipment'
return null
}

function buildUniqueOrder(inv) {
let seen = {}
let out = []
for (let id of inv) {
if (!seen[id]) {
seen[id] = true
out.push(id)
}
}
return out
}

function equipmentOnly(order) {
return order.filter((id) => {
let t = itemDB[id] ? itemDB[id].type : ''
return t === 'weapon' || t === 'armor' || t === 'pickaxe' || t === 'rod'
})
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.gold !== 'number') player.gold = 0
ensureDurabilityState(player)

let order = buildUniqueOrder(player.inventory)
let category = normalizeCategory(args[0])

let source = order
let indexArg = args[0]
if (category === 'equipment') {
source = equipmentOnly(order)
indexArg = args[1]
}

let index = parseInt(indexArg) - 1
let itemId = source[index]
if (!itemId || !itemDB[itemId]) {
if (category) return m.reply("Pilih item equipment dulu. Contoh: .fix equipment 1")
return m.reply("Pilih item gear di inventory. Contoh: .fix 1 atau .fix equipment 1")
}

let data = itemDB[itemId]
if (!['weapon', 'armor', 'pickaxe', 'rod'].includes(data.type)) return m.reply("Item ini tidak bisa di-fix.")

let d = getDurability(player, itemId)
if (!d) return m.reply("Item ini tidak punya durability.")
if (d.current >= d.max) return m.reply("Durability item ini sudah penuh.")

let missing = d.max - d.current
let cost = Math.max(20, missing * 2)
if (player.gold < cost) return m.reply(`Gold tidak cukup. Fix butuh ${cost} Gold.`)

player.gold -= cost
player.durability[itemId] = d.max

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(`Perbaikan selesai: ${data.name}\nDurability: ${d.max}/${d.max}\n-${cost} Gold`)
}
