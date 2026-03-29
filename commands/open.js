const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureDurabilityState, ensureItemDurability } = require('../system/equipment')

const COMMON = [
'old_coin',
'broken_arrow',
'wood_fragment',
'tiny_shell',
'herb',
'fish',
'ore_stone',
'ore_coal',
'ore_copper',
'hp_potion'
]

const MID = [
'silver_coin',
'ancient_coin',
'gold_nugget',
'hunter_ring',
'lucky_charm',
'ore_iron',
'ore_silver',
'ore_gold',
'crystal_shard',
'big_hp_potion'
]

const RARE = [
'ore_mythril',
'ore_adamantite',
'ore_dragon_steel',
'ore_titanium',
'shadow_crystal',
'spirit_gem',
'full_hp_potion',
'iron_sword',
'iron_armor',
'hunter_earring'
]

const LEGENDARY = [
'ancient_crystal',
'dragon_heart_ore',
'celestial_gem',
'void_stone',
'voidblade',
'void_armor',
'void_emblem'
]

function pick(list) {
return list[Math.floor(Math.random() * list.length)]
}

function pickTier() {
let roll = Math.random() * 100
if (roll < 60) return 'COMMON'
if (roll < 88) return 'MID'
if (roll < 98) return 'RARE'
return 'LEGENDARY'
}

function tierData(tier) {
if (tier === 'COMMON') return { list: COMMON, min: 1, max: 3, goldMin: 12, goldMax: 35 }
if (tier === 'MID') return { list: MID, min: 1, max: 2, goldMin: 25, goldMax: 70 }
if (tier === 'RARE') return { list: RARE, min: 1, max: 1, goldMin: 60, goldMax: 140 }
return { list: LEGENDARY, min: 1, max: 1, goldMin: 120, goldMax: 260 }
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Karakter belum ada.\nKetik .start dulu ya.")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.gold !== 'number') player.gold = 0
ensureDurabilityState(player)

let chestId = 'treasure_chest'
let have = player.inventory.filter((x) => x === chestId).length
if (have <= 0) {
return m.reply("Kamu tidak punya Treasure Chest.\nCari dari .fish atau event.")
}

let qty = parseInt(args[0] || '1')
if (!Number.isFinite(qty) || qty < 1) qty = 1
if (qty > have) qty = have

let summary = {}
let goldTotal = 0
let tierCount = { COMMON: 0, MID: 0, RARE: 0, LEGENDARY: 0 }

for (let i = 0; i < qty; i++) {
let pos = player.inventory.indexOf(chestId)
if (pos !== -1) player.inventory.splice(pos, 1)

let tier = pickTier()
tierCount[tier] += 1
let t = tierData(tier)
let itemId = pick(t.list)
let data = itemDB[itemId]
if (!data) continue

let amount = Math.floor(Math.random() * (t.max - t.min + 1)) + t.min
if (['weapon', 'armor', 'pickaxe', 'accessory'].includes(data.type)) {
amount = 1
}

for (let x = 0; x < amount; x++) player.inventory.push(itemId)
if (['weapon', 'armor', 'pickaxe'].includes(data.type)) {
ensureItemDurability(player, itemId)
}

if (!summary[itemId]) summary[itemId] = 0
summary[itemId] += amount

let g = Math.floor(Math.random() * (t.goldMax - t.goldMin + 1)) + t.goldMin
goldTotal += g
}

player.gold += goldTotal
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

let lines = Object.keys(summary).map((id) => {
let name = itemDB[id] ? itemDB[id].name : id
return `- ${name} x${summary[id]}`
})

let text = `🧰 Buka Treasure Chest x${qty}\n\nTier hasil:\n- Common: ${tierCount.COMMON}\n- Mid: ${tierCount.MID}\n- Rare: ${tierCount.RARE}\n- Legendary: ${tierCount.LEGENDARY}\n\nLoot:\n${lines.join('\n') || '- Tidak ada'}\n\nGold bonus: +${goldTotal}\nSisa chest: ${have - qty}`
return m.reply(text)
}
