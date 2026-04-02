const fs = require('fs')
const itemDB = require('../database/item.json')
const { normalizeAccessories } = require('../system/gearstats')
const alias = {
fish: "Ikan Segar",
ore_iron: "Iron Ore",
ore_gold: "Gold Ore",
ore_diamond: "Diamond Ore",
ore_mythril: "Mythril Ore",
ore_titanium: "Titanium Ore"
}
function formatAccessoryStats(id) {
let d = itemDB[id]
if (!d || d.type !== 'accessory') return ''
let parts = []
if (d.str) parts.push(`STR +${d.str}`)
if (d.agi) parts.push(`AGI +${d.agi}`)
if (d.int) parts.push(`INT +${d.int}`)
if (d.tough) parts.push(`TOUGH +${d.tough}`)
if (d.crit) parts.push(`CRIT +${d.crit}%`)
if (d.dodge) parts.push(`DODGE +${d.dodge}%`)
if (d.reduce) parts.push(`REDUCE +${d.reduce}%`)
return parts.length ? ` [${parts.join(' | ')}]` : ''
}

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Karakter belum ada.\nKetik .start dulu ya.")
}

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
normalizeAccessories(player)

if (player.inventory.length == 0) {
return m.reply("Inventory masih kosong.\nCoba cari item lewat .hunt, .mine, .fish, atau .shop")
}

let text = "Inventory\n\n"
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
})

let equipment = []
let resources = []
let consumables = []

for (let item of order) {
let data = itemDB[item] || {}
let type = data.type || 'resource'
if (type === 'weapon' || type === 'armor' || type === 'pickaxe' || type === 'rod' || type === 'accessory') equipment.push(item)
else if (type === 'potion') consumables.push(item)
else resources.push(item)
}

text += `Equipment (yang dipakai)\n`
text += `Weapon: ${player.weapon && itemDB[player.weapon] ? itemDB[player.weapon].name : 'None'}\n`
text += `Armor: ${player.armor && itemDB[player.armor] ? itemDB[player.armor].name : 'None'}\n`
text += `Accessory 1: ${player.accessories[0] && itemDB[player.accessories[0]] ? itemDB[player.accessories[0]].name + formatAccessoryStats(player.accessories[0]) : 'None'}\n`
text += `Accessory 2: ${player.accessories[1] && itemDB[player.accessories[1]] ? itemDB[player.accessories[1]].name + formatAccessoryStats(player.accessories[1]) : 'None'}\n`
text += `Pickaxe: ${player.pickaxe && itemDB[player.pickaxe] ? itemDB[player.pickaxe].name : 'None'}\n\n`
text += `Rod: ${player.rod && itemDB[player.rod] ? itemDB[player.rod].name : 'None'}\n\n`

if (equipment.length) {
text += "List Equipment (koleksi)\n"
equipment.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
let extra = formatAccessoryStats(item)
text += `${i + 1}. ${name} x${counts[item]}${extra}\n`
})
text += "\n"
}

text += "Resource (bahan)\n"
if (!resources.length) text += "- Tidak ada\n"
resources.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}\n`
})
text += "\n"

text += "Consumable (sekali pakai)\n"
if (!consumables.length) text += "- Tidak ada\n"
consumables.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}\n`
})

text += "\nIndex Global (untuk .equip / .sell / .fix)\n"
order.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}\n`
})

text += "\nContoh cepat:"
text += "\n- Equip senjata/armor/pickaxe/rod: .equip 5"
text += "\n- Equip aksesoris slot 1/2: .equip 8 1"
text += "\n- Jual item: .sell 3 10"
text += "\n- Repair gear: .fix armor | .fix pickaxe | .fix rod | .fix sword"
text += "\n- Lihat resep crafting: .craft"
text += "\n- Buka treasure chest: .open 1"

m.reply(text)

}
