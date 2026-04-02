const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureDurabilityState, getDurability } = require('../system/equipment')

function normalizeTarget(raw) {
let t = String(raw || '').toLowerCase().trim()
if (t === 'sword' || t === 'weapon') return 'weapon'
if (t === 'armor') return 'armor'
if (t === 'pickaxe') return 'pickaxe'
if (t === 'rod') return 'rod'
return null
}

function getEquippedByTarget(player, target) {
if (target === 'weapon') return player.weapon
if (target === 'armor') return player.armor
if (target === 'pickaxe') return player.pickaxe
if (target === 'rod') return player.rod
return null
}

function targetLabel(target) {
if (target === 'weapon') return 'sword'
return target
}

function usageText() {
return `Format fix:\n.fix armor\n.fix pickaxe\n.fix rod\n.fix sword`
}

function isRepairableType(type) {
return ['weapon', 'armor', 'pickaxe', 'rod'].includes(type)
}

function calcFixCost(d) {
let missing = d.max - d.current
return Math.max(20, missing * 2)
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Bikin karakter dulu pakai .start')

let player = db[sender]
if (typeof player.gold !== 'number') player.gold = 0
if (typeof player.weapon === 'undefined') player.weapon = null
if (typeof player.armor === 'undefined') player.armor = null
if (typeof player.pickaxe === 'undefined') player.pickaxe = null
if (typeof player.rod === 'undefined') player.rod = null
ensureDurabilityState(player)

let target = normalizeTarget(args[0])
if (!target) return m.reply(usageText())

let itemId = getEquippedByTarget(player, target)
if (!itemId || !itemDB[itemId]) return m.reply(`${targetLabel(target)} belum kamu equip.`)

let data = itemDB[itemId]
if (!isRepairableType(data.type)) return m.reply('Item ini tidak bisa di-fix.')

let d = getDurability(player, itemId)
if (!d) return m.reply('Item ini tidak punya durability.')
if (d.current >= d.max) return m.reply('Durability item ini sudah penuh.')

let cost = calcFixCost(d)
if (player.gold < cost) return m.reply(`Gold tidak cukup. Fix butuh ${cost} Gold.`)

player.gold -= cost
player.durability[itemId] = d.max

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(`Perbaikan selesai: ${data.name} (${targetLabel(target)})\nDurability: ${d.max}/${d.max}\n-${cost} Gold`)
}
