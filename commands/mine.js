const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureDurabilityState, ensureItemDurability, useDurability, getDurability } = require('../system/equipment')

const ORES = [
{ id: 'ore_stone', name: 'Stone', tier: 'COMMON', minLevel: 1, maxLevel: 3, minDrop: 1, maxDrop: 3, weight: 26 },
{ id: 'ore_coal', name: 'Coal', tier: 'COMMON', minLevel: 2, maxLevel: 4, minDrop: 1, maxDrop: 2, weight: 22 },
{ id: 'ore_copper', name: 'Copper Ore', tier: 'COMMON', minLevel: 3, maxLevel: 5, minDrop: 1, maxDrop: 2, weight: 20 },
{ id: 'ore_tin', name: 'Tin Ore', tier: 'COMMON', minLevel: 3, maxLevel: 5, minDrop: 1, maxDrop: 2, weight: 18 },
{ id: 'ore_iron', name: 'Iron Ore', tier: 'COMMON', minLevel: 4, maxLevel: 6, minDrop: 1, maxDrop: 2, weight: 16 },

{ id: 'ore_silver', name: 'Silver Ore', tier: 'RARE', minLevel: 7, maxLevel: 10, minDrop: 1, maxDrop: 2, weight: 12 },
{ id: 'ore_gold', name: 'Gold Ore', tier: 'RARE', minLevel: 8, maxLevel: 12, minDrop: 1, maxDrop: 2, weight: 11 },
{ id: 'ore_platinum', name: 'Platinum Ore', tier: 'RARE', minLevel: 10, maxLevel: 14, minDrop: 1, maxDrop: 1, weight: 8 },
{ id: 'crystal_shard', name: 'Crystal Shard', tier: 'RARE', minLevel: 11, maxLevel: 15, minDrop: 1, maxDrop: 1, weight: 7 },
{ id: 'magic_crystal', name: 'Magic Crystal', tier: 'RARE', minLevel: 12, maxLevel: 16, minDrop: 1, maxDrop: 1, weight: 6 },

{ id: 'ore_mythril', name: 'Mythril Ore', tier: 'EPIC', minLevel: 17, maxLevel: 22, minDrop: 1, maxDrop: 1, weight: 5 },
{ id: 'ore_adamantite', name: 'Adamantite Ore', tier: 'EPIC', minLevel: 18, maxLevel: 23, minDrop: 1, maxDrop: 1, weight: 4 },
{ id: 'ore_dragon_steel', name: 'Dragon Steel Ore', tier: 'EPIC', minLevel: 20, maxLevel: 25, minDrop: 1, maxDrop: 1, weight: 3 },
{ id: 'shadow_crystal', name: 'Shadow Crystal', tier: 'EPIC', minLevel: 21, maxLevel: 26, minDrop: 1, maxDrop: 1, weight: 3 },
{ id: 'spirit_gem', name: 'Spirit Gem', tier: 'EPIC', minLevel: 22, maxLevel: 27, minDrop: 1, maxDrop: 1, weight: 2 },

{ id: 'ancient_crystal', name: 'Ancient Crystal', tier: 'LEGENDARY', minLevel: 30, maxLevel: 99, minDrop: 1, maxDrop: 1, weight: 1 },
{ id: 'dragon_heart_ore', name: 'Dragon Heart Ore', tier: 'LEGENDARY', minLevel: 35, maxLevel: 99, minDrop: 1, maxDrop: 1, weight: 1 },
{ id: 'celestial_gem', name: 'Celestial Gem', tier: 'LEGENDARY', minLevel: 40, maxLevel: 99, minDrop: 1, maxDrop: 1, weight: 1 },
{ id: 'void_stone', name: 'Void Stone', tier: 'LEGENDARY', minLevel: 45, maxLevel: 99, minDrop: 1, maxDrop: 1, weight: 1 }
]

function pickWeighted(list) {
let total = list.reduce((a, b) => a + b.weight, 0)
let roll = Math.random() * total
let acc = 0
for (let x of list) {
acc += x.weight
if (roll <= acc) return x
}
return list[0]
}

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.lastMine !== 'number') player.lastMine = 0
if (typeof player.level !== 'number') player.level = 1
if (typeof player.gold !== 'number') player.gold = 0
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.miningExp !== 'number') player.miningExp = 0
if (typeof player.miningLevel !== 'number') player.miningLevel = 1
if (player.pickaxe === undefined) player.pickaxe = null
ensureDurabilityState(player)

let now = Date.now()
let cooldown = 45000
if (now - player.lastMine < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastMine)) / 1000)
return m.reply(`Tambang lagi istirahat, tunggu ${sisa} detik lagi.`)
}

let pickaxePower = 0
let pickaxeName = "Tangan kosong"
if (player.pickaxe && itemDB[player.pickaxe]) {
ensureItemDurability(player, player.pickaxe)
if (player.durability[player.pickaxe] > 0) {
pickaxePower = Number(itemDB[player.pickaxe].miningPower || 0)
pickaxeName = itemDB[player.pickaxe].name
}
}

let effectiveLevel = player.level + Math.floor(pickaxePower / 2)
let pool = ORES.filter((o) => effectiveLevel >= o.minLevel)
if (pool.length === 0) return m.reply("Kamu belum bisa mining ore apapun.")

let text = "⛏️ Kamu mulai menambang...\n\n"
text += `Tool: ${pickaxeName} (Power +${pickaxePower})\n`

// collapse event
let eventRoll = Math.random()
if (eventRoll < 0.08) {
let dmg = 20 + Math.floor(Math.random() * 11)
player.hp = Math.max(1, player.hp - dmg)
player.lastMine = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`⚠️ Tambang runtuh!\nHP -${dmg}\nHP sekarang: ${player.hp}/${player.maxhp}`)
}

// mine monster event
if (eventRoll >= 0.08 && eventRoll < 0.16) {
let dmg = 10 + Math.floor(Math.random() * 11)
player.hp = Math.max(1, player.hp - dmg)
if (Math.random() < 0.35) player.inventory.push('ore_iron')
player.lastMine = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`👾 Monster muncul di tambang!\nKamu menang tapi HP -${dmg}\n+ Resource tambahan`)
}

let luckyLegendary = eventRoll >= 0.16 && eventRoll < 0.20
if (luckyLegendary) {
let legPool = ORES.filter((o) => o.tier === 'LEGENDARY' && player.level >= o.minLevel)
if (legPool.length > 0) {
let jackpot = legPool[Math.floor(Math.random() * legPool.length)]
player.inventory.push(jackpot.id)
text += "💎 Jackpot!\n"
text += `+ ${jackpot.name} (1)\n`
}
}

let nodes = 1 + Math.floor(Math.random() * 2)
if (pickaxePower >= 6) nodes += 1
let mined = {}

for (let i = 0; i < nodes; i++) {
let ore = pickWeighted(pool)
let minDrop = ore.minDrop
let maxDrop = ore.maxDrop + (pickaxePower >= 10 ? 1 : 0)
let qty = Math.floor(Math.random() * (maxDrop - minDrop + 1)) + minDrop
if (qty < 1) qty = 1

player.inventory.push(...Array(qty).fill(ore.id))
if (!mined[ore.id]) mined[ore.id] = { name: ore.name, qty: 0 }
mined[ore.id].qty += qty
}

for (let id of Object.keys(mined)) {
text += `+ ${mined[id].name} (${mined[id].qty})\n`
}

let expGain = 5 + Math.floor(pickaxePower / 2)
player.miningExp += expGain
let leveled = false
let need = player.miningLevel * 40
while (player.miningExp >= need) {
player.miningExp -= need
player.miningLevel += 1
leveled = true
need = player.miningLevel * 40
}
text += `\nEXP Mining +${expGain}`
if (leveled) text += `\n🎉 Mining Level Up! Lv.${player.miningLevel}`

if (player.pickaxe && itemDB[player.pickaxe] && player.durability[player.pickaxe] > 0) {
let active = player.pickaxe
let d = useDurability(player, active, 1)
if (d.broken) {
text += `\n⚠️ ${itemDB[active].name} rusak!`
} else {
let dv = getDurability(player, active)
if (dv) text += `\nDurability Pickaxe: ${dv.current}/${dv.max}`
}
}

player.lastMine = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)
}
