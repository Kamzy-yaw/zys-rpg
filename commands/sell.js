const fs = require('fs')
const itemDB = require('../database/item.json')

function normalizeCategory(raw) {
let c = String(raw || '').toLowerCase()
if (['equip', 'equipment', 'gear', 'equipmet'].includes(c)) return 'equipment'
if (['resource', 'res', 'mat', 'material'].includes(c)) return 'resource'
if (['consumable', 'consume', 'cons', 'potion'].includes(c)) return 'consumable'
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

function splitCategory(order) {
let equipment = []
let resources = []
let consumables = []
for (let id of order) {
let t = (itemDB[id] && itemDB[id].type) || 'resource'
if (t === 'weapon' || t === 'armor' || t === 'pickaxe' || t === 'accessory') equipment.push(id)
else if (t === 'potion') consumables.push(id)
else resources.push(id)
}
return { equipment, resources, consumables }
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.gold !== 'number') player.gold = 0
if (!Array.isArray(player.accessories)) player.accessories = []
if (player.accessories.length < 2) {
while (player.accessories.length < 2) player.accessories.push(null)
}
if (player.accessory && !player.accessories[0]) player.accessories[0] = player.accessory

let order = buildUniqueOrder(player.inventory)
let { equipment, resources, consumables } = splitCategory(order)

let category = normalizeCategory(args[0])
let indexArg = args[0]
let qtyArg = args[1]
let source = order

if (category) {
indexArg = args[1]
qtyArg = args[2]
if (category === 'equipment') source = equipment
if (category === 'resource') source = resources
if (category === 'consumable') source = consumables
}

let index = parseInt(indexArg) - 1
let itemId = source[index]
if (isNaN(index) || !itemId) {
if (category) return m.reply(`Pilih item ${category} dulu.\nContoh: .sell ${category} 1 3`)
return m.reply("Pilih item di inventory dulu. Contoh: .sell 1 atau .sell equipment 1 3")
}

let qty = parseInt(qtyArg || "1")
if (isNaN(qty) || qty < 1) qty = 1

let have = player.inventory.filter((x) => x === itemId).length
if (qty > have) qty = have

let data = itemDB[itemId]
if (!data) return m.reply("Data item tidak ditemukan.")
if (player.weapon === itemId || player.armor === itemId || player.pickaxe === itemId || player.accessory === itemId || player.accessories.includes(itemId)) {
return m.reply("Lepas dulu item yang sedang dipakai sebelum dijual.")
}

let allowedType = ['weapon', 'armor', 'pickaxe', 'accessory', 'potion', 'resource']
if (!allowedType.includes(data.type)) return m.reply("Item ini tidak bisa dijual.")

let sellPrice = Number(data.sellPrice || 0)
if (!sellPrice && typeof data.price === 'number') sellPrice = Math.max(1, Math.floor(data.price * 0.5))
if (!sellPrice) return m.reply("Item ini tidak bisa dijual.")

for (let i = 0; i < qty; i++) {
let rm = player.inventory.indexOf(itemId)
if (rm !== -1) player.inventory.splice(rm, 1)
}
let total = sellPrice * qty
player.gold += total

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(`Terjual: ${data.name} x${qty}\n+${total} Gold`)
}
