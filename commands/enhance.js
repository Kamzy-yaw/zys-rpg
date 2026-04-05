const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureEnhanceState } = require('../system/gearstats')

const MAX_ENHANCE = 25

function countItem(inv, id) {
return inv.filter((x) => x === id).length
}

function takeItem(inv, id, qty) {
for (let i = 0; i < qty; i++) {
let idx = inv.indexOf(id)
if (idx !== -1) inv.splice(idx, 1)
}
}

function reqByLevel(nextLevel, target) {
if (target === 'accessory') {
if (nextLevel <= 5) return { astral_fragment: 2, rift_crystal: 1 }
if (nextLevel <= 10) return { astral_fragment: 3, rift_crystal: 2, fallen_feather: 1 }
if (nextLevel <= 15) return { rift_crystal: 3, fallen_feather: 2, ancient_crystal: 1 }
if (nextLevel <= 20) return { astral_core: 1, rift_crystal: 3, celestial_gem: 1 }
return { astral_core: 2, fallen_feather: 3, void_stone: 1 }
}
if (target === 'rod') {
if (nextLevel <= 5) return { fishing_hook: 2, tiny_shell: 2 }
if (nextLevel <= 10) return { magic_pearl: 1, silver_coin: 2, fisherman_thread: 1 }
if (nextLevel <= 15) return { legendary_pearl: 1, ancient_relic: 1, coral_gem: 1 }
if (nextLevel <= 20) return { ocean_heart: 1, sea_king_crown: 1, abyss_pearl: 1 }
return { leviathan_scale: 1, ancient_ocean_relic: 1, abyss_pearl: 2 }
}
if (nextLevel <= 4) return { ore_iron: 2 }
if (nextLevel <= 8) return { ore_gold: 2, crystal_shard: 1 }
if (nextLevel <= 12) return { ore_mythril: 2, ore_titanium: 1 }
if (nextLevel <= 15) return { spirit_gem: 1, ancient_crystal: 1 }
if (nextLevel === 16) return { ore_adamantite: 2, ore_dragon_steel: 1, magic_crystal: 2 }
if (nextLevel === 17) return { ore_adamantite: 2, shadow_crystal: 1, dragon_scale: 1 }
if (nextLevel === 18) return { ore_dragon_steel: 2, shadow_crystal: 1, ancient_relic: 1 }
if (nextLevel === 19) return { dragon_heart_ore: 1, shadow_crystal: 2, phoenix_feather: 1 }
if (nextLevel === 20) return { dragon_heart_ore: 1, void_stone: 1, celestial_gem: 1 }
if (nextLevel === 21) return { void_stone: 1, celestial_gem: 1, ocean_heart: 1 }
if (nextLevel === 22) return { void_stone: 2, celestial_gem: 1, sea_king_crown: 1 }
if (nextLevel === 23) return { void_stone: 2, celestial_gem: 2, leviathan_scale: 1 }
if (nextLevel === 24) return { void_stone: 3, celestial_gem: 2, ancient_ocean_relic: 1 }
return { void_stone: 3, celestial_gem: 3, ancient_artifact: 1 }
}

function goldCostByLevel(nextLevel, target) {
if (target === 'accessory') {
if (nextLevel <= 10) return 260 * nextLevel
if (nextLevel <= 15) return 340 * nextLevel
if (nextLevel <= 20) return 430 * nextLevel
return 520 * nextLevel
}
if (target === 'rod') {
if (nextLevel <= 10) return 180 * nextLevel
if (nextLevel <= 15) return 260 * nextLevel
if (nextLevel <= 20) return 320 * nextLevel
return 400 * nextLevel
}
if (nextLevel <= 10) return 220 * nextLevel
if (nextLevel <= 15) return 320 * nextLevel
if (nextLevel <= 20) return 400 * nextLevel
return 480 * nextLevel
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let p = db[sender]
if (!Array.isArray(p.inventory)) p.inventory = []
if (typeof p.gold !== 'number') p.gold = 0
if (typeof p.weapon === 'undefined') p.weapon = null
if (typeof p.armor === 'undefined') p.armor = null
if (typeof p.pickaxe === 'undefined') p.pickaxe = null
if (typeof p.rod === 'undefined') p.rod = null
ensureEnhanceState(p)

let target = (args[0] || '').toLowerCase()
if (!target) {
return m.reply(
`Enhance Gear
Weapon: +${p.enhance.weapon} (${p.weapon ? (itemDB[p.weapon]?.name || p.weapon) : 'None'})
Armor: +${p.enhance.armor} (${p.armor ? (itemDB[p.armor]?.name || p.armor) : 'None'})
Pickaxe: +${p.enhance.pickaxe} (${p.pickaxe ? (itemDB[p.pickaxe]?.name || p.pickaxe) : 'None'})
Rod: +${p.enhance.rod} (${p.rod ? (itemDB[p.rod]?.name || p.rod) : 'None'})
Accessory 1: +${p.enhance.accessory1} (${p.accessories?.[0] ? (itemDB[p.accessories[0]]?.name || p.accessories[0]) : 'None'})
Accessory 2: +${p.enhance.accessory2} (${p.accessories?.[1] ? (itemDB[p.accessories[1]]?.name || p.accessories[1]) : 'None'})

Command:
.enhance weapon
.enhance armor
.enhance pickaxe
.enhance rod
.enhance accessory 1
.enhance accessory 2`
)
}

if (!['weapon', 'armor', 'pickaxe', 'rod', 'accessory'].includes(target)) {
return m.reply("Pilih target: weapon / armor / pickaxe / rod / accessory")
}

let equipped = null
let enhanceKey = target
let targetLabel = target

if (target === 'accessory') {
let slotArg = String(args[1] || '').toLowerCase()
let slotIndex = slotArg === '2' || slotArg === 'acc2' || slotArg === 'slot2' ? 1 : 0
if (slotArg && !['1', '2', 'acc1', 'acc2', 'slot1', 'slot2'].includes(slotArg)) {
return m.reply("Pilih slot aksesori: 1 atau 2")
}
equipped = p.accessories?.[slotIndex] || null
enhanceKey = `accessory${slotIndex + 1}`
targetLabel = `accessory slot ${slotIndex + 1}`
} else {
equipped = p[target]
}

if (!equipped || !itemDB[equipped]) return m.reply(`Kamu belum equip ${targetLabel}.`)
let current = Number(p.enhance[enhanceKey] || 0)
if (current >= MAX_ENHANCE) return m.reply(`${targetLabel} sudah max +${MAX_ENHANCE}.`)

let next = current + 1
let costGold = goldCostByLevel(next, target)
let mats = reqByLevel(next, target)

if (p.gold < costGold) return m.reply(`Gold kurang. Butuh ${costGold} Gold.`)
for (let id of Object.keys(mats)) {
let need = mats[id]
let have = countItem(p.inventory, id)
if (have < need) return m.reply(`Material kurang: ${(itemDB[id]?.name || id)} ${have}/${need}`)
}

p.gold -= costGold
for (let id of Object.keys(mats)) takeItem(p.inventory, id, mats[id])
p.enhance[enhanceKey] = next

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
let matTxt = Object.entries(mats).map(([id, qty]) => `${itemDB[id]?.name || id} x${qty}`).join(', ')
return m.reply(`Enhance sukses: ${itemDB[equipped].name} +${next}\nBiaya: ${costGold} Gold\nMaterial: ${matTxt}`)
}
