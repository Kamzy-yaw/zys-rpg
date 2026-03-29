const fs = require('fs')
const itemDB = require('../database/item.json')
const { normalizeAccessories } = require('../system/gearstats')

const alias = {
fish: 'Ikan Segar',
ore_iron: 'Iron Ore',
ore_gold: 'Gold Ore',
ore_diamond: 'Diamond Ore',
ore_mythril: 'Mythril Ore',
ore_titanium: 'Titanium Ore'
}

function normalizeSection(raw) {
let x = String(raw || '').toLowerCase()
if (['gear', 'equipment', 'equip'].includes(x)) return 'gear'
if (['resource', 'res', 'material', 'mat'].includes(x)) return 'resource'
if (['consumable', 'consume', 'cons', 'potion'].includes(x)) return 'consumable'
return ''
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

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Karakter belum ada.\nKetik .start dulu ya.')

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
normalizeAccessories(player)

if (player.inventory.length === 0) {
return m.reply('Inventory masih kosong.\nCoba cari item lewat .hunt, .mine, .fish, atau .shop')
}

let counts = {}
let order = []
for (let item of player.inventory) {
if (!counts[item]) {
counts[item] = 0
order.push(item)
}
counts[item] += 1
}

let gear = []
let resource = []
let consumable = []
for (let item of order) {
let data = itemDB[item] || {}
let type = data.type || 'resource'
if (type === 'weapon' || type === 'armor' || type === 'pickaxe' || type === 'accessory') gear.push(item)
else if (type === 'potion') consumable.push(item)
else resource.push(item)
}

let section = normalizeSection(args && args[0])
if (!section) {
let text = `Inventory Summary

Equipment: ${gear.length} item
Resource: ${resource.length} item
Consumable: ${consumable.length} item

Lihat detail:
.inventory gear
.inventory resource
.inventory consumable`
return m.reply(text)
}

let text = 'Inventory Detail\n\n'
text += 'Equipment (yang dipakai)\n'
text += `Weapon: ${player.weapon && itemDB[player.weapon] ? itemDB[player.weapon].name : 'None'}\n`
text += `Armor: ${player.armor && itemDB[player.armor] ? itemDB[player.armor].name : 'None'}\n`
text += `Accessory 1: ${player.accessories[0] && itemDB[player.accessories[0]] ? itemDB[player.accessories[0]].name + formatAccessoryStats(player.accessories[0]) : 'None'}\n`
text += `Accessory 2: ${player.accessories[1] && itemDB[player.accessories[1]] ? itemDB[player.accessories[1]].name + formatAccessoryStats(player.accessories[1]) : 'None'}\n`
text += `Pickaxe: ${player.pickaxe && itemDB[player.pickaxe] ? itemDB[player.pickaxe].name : 'None'}\n\n`

if (section === 'gear') {
text += 'List Equipment (koleksi)\n'
if (!gear.length) text += '- Tidak ada\n'
gear.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}${formatAccessoryStats(item)}\n`
})
text += '\nTips: .equip <nomor> atau .equip <nomor> 1/2 untuk aksesori.'
}

if (section === 'resource') {
text += 'Resource (bahan)\n'
if (!resource.length) text += '- Tidak ada\n'
resource.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}\n`
})
text += '\nTips: .sell resource <nomor> [jumlah]'
}

if (section === 'consumable') {
text += 'Consumable (sekali pakai)\n'
if (!consumable.length) text += '- Tidak ada\n'
consumable.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}\n`
})
text += '\nTips: potion dipakai pakai .heal / .heal big / .heal full'
}

text += '\n\nIndex Global (untuk .equip / .sell / .fix)\n'
order.forEach((item, i) => {
let name = itemDB[item] ? itemDB[item].name : (alias[item] || item)
text += `${i + 1}. ${name} x${counts[item]}\n`
})

m.reply(text)
}
