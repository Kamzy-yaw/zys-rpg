const fs = require('fs')
const itemDB = require('../database/item.json')
const achievementDB = require('../database/achievement.json')
const { ensureDurabilityState, ensureItemDurability, useDurability, getDurability } = require('../system/equipment')
const { ensureEnhanceState, getPickaxePower } = require('../system/gearstats')
const { ensureAchievementState, incrementStat, evaluateAchievements } = require('../system/achievement')

const ORES = [
{ id: 'ore_stone', name: 'Stone', tier: 'COMMON', minLevel: 1, maxLevel: 3, minDrop: 1, maxDrop: 3, weight: 26 },
{ id: 'ore_coal', name: 'Coal', tier: 'COMMON', minLevel: 2, maxLevel: 4, minDrop: 1, maxDrop: 2, weight: 22 },
{ id: 'ore_copper', name: 'Copper Ore', tier: 'COMMON', minLevel: 3, maxLevel: 5, minDrop: 1, maxDrop: 2, weight: 20 },
{ id: 'ore_tin', name: 'Tin Ore', tier: 'COMMON', minLevel: 3, maxLevel: 5, minDrop: 1, maxDrop: 2, weight: 18 },
{ id: 'ore_iron', name: 'Iron Ore', tier: 'COMMON', minLevel: 4, maxLevel: 6, minDrop: 1, maxDrop: 2, weight: 16 },

{ id: 'ore_silver', name: 'Silver Ore', tier: 'RARE', minLevel: 7, maxLevel: 10, minDrop: 1, maxDrop: 2, weight: 12 },
{ id: 'ore_gold', name: 'Gold Ore', tier: 'RARE', minLevel: 8, maxLevel: 12, minDrop: 1, maxDrop: 2, weight: 11 },
{ id: 'ore_platinum', name: 'Platinum Ore', tier: 'RARE', minLevel: 10, maxLevel: 14, minDrop: 1, maxDrop: 1, weight: 8 },
{ id: 'ore_diamond', name: 'Diamond Ore', tier: 'RARE', minLevel: 11, maxLevel: 15, minDrop: 1, maxDrop: 1, weight: 7 },
{ id: 'crystal_shard', name: 'Crystal Shard', tier: 'RARE', minLevel: 11, maxLevel: 15, minDrop: 1, maxDrop: 1, weight: 7 },
{ id: 'magic_crystal', name: 'Magic Crystal', tier: 'RARE', minLevel: 12, maxLevel: 16, minDrop: 1, maxDrop: 1, weight: 6 },

{ id: 'ore_mythril', name: 'Mythril Ore', tier: 'EPIC', minLevel: 17, maxLevel: 22, minDrop: 1, maxDrop: 1, weight: 5 },
{ id: 'ore_adamantite', name: 'Adamantite Ore', tier: 'EPIC', minLevel: 18, maxLevel: 23, minDrop: 1, maxDrop: 1, weight: 4 },
{ id: 'ore_dragon_steel', name: 'Dragon Steel Ore', tier: 'EPIC', minLevel: 20, maxLevel: 25, minDrop: 1, maxDrop: 1, weight: 3 },
{ id: 'ore_titanium', name: 'Titanium Ore', tier: 'EPIC', minLevel: 23, maxLevel: 28, minDrop: 1, maxDrop: 1, weight: 2 },
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

function adjustedWeight(ore, miningLevel, pickaxePower, effectiveLevel) {
let w = Number(ore.weight || 1)
let lv = Number(miningLevel || 1)
let power = Number(pickaxePower || 0)
let eff = Number(effectiveLevel || 1)
if (ore.tier === 'COMMON') w *= Math.max(0.45, 1 - (lv * 0.01))
if (ore.tier === 'RARE') w *= (1 + Math.min(0.8, lv * 0.02))
if (ore.tier === 'EPIC') w *= (1 + Math.min(1.2, lv * 0.025))
if (ore.tier === 'LEGENDARY') w *= (1 + Math.min(1.6, lv * 0.03))
if (ore.tier === 'RARE') w *= (1 + Math.min(0.6, power * 0.03))
if (ore.tier === 'EPIC') w *= (1 + Math.min(0.9, power * 0.04))
if (ore.tier === 'LEGENDARY') w *= (1 + Math.min(1.1, power * 0.05))
if (eff >= 20 && ore.tier === 'COMMON') w *= 0.85
if (eff >= 30 && ore.tier === 'COMMON') w *= 0.8
return Math.max(1, Math.floor(w))
}

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.lastMine !== 'number') player.lastMine = 0
if (typeof player.level !== 'number') player.level = 1
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.miningExp !== 'number') player.miningExp = 0
if (typeof player.miningLevel !== 'number') player.miningLevel = 1
if (player.pickaxe === undefined) player.pickaxe = null
if (!player.maid || typeof player.maid !== 'object') player.maid = { owned: false, active: false, autoFix: true, autoHeal: true }
if (typeof player.maid.owned !== 'boolean') player.maid.owned = false
if (typeof player.maid.active !== 'boolean') player.maid.active = false
if (typeof player.maid.autoFix !== 'boolean') player.maid.autoFix = true
if (typeof player.maid.autoHeal !== 'boolean') player.maid.autoHeal = true
ensureDurabilityState(player)
ensureEnhanceState(player)
ensureAchievementState(player)

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
pickaxePower = getPickaxePower(player)
pickaxeName = itemDB[player.pickaxe].name
}
}

let effectiveLevel = player.level + Math.floor(pickaxePower / 2) + Math.floor(player.miningLevel / 2)
let pool = ORES
.filter((o) => effectiveLevel >= o.minLevel)
.map((o) => ({ ...o, weight: adjustedWeight(o, player.miningLevel, pickaxePower, effectiveLevel) }))
if (pool.length === 0) return m.reply("Kamu belum bisa mining ore apapun.")

let text = "Kamu mulai menambang...\n\n"
let legendaryFound = {}
incrementStat(player, 'mineRuns', 1)
text += `Tool: ${pickaxeName} (Power +${pickaxePower})\n`
if (player.pickaxe) text += `Enhance Pickaxe: +${Number(player.enhance.pickaxe || 0)}\n`

let eventRoll = Math.random()
if (eventRoll < 0.03) {
let dmg = 20 + Math.floor(Math.random() * 11)
player.hp = Math.max(1, player.hp - dmg)
let unlocked = evaluateAchievements(player, achievementDB)
player.lastMine = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
let msg = `Tambang runtuh!\nReward: HP -${dmg}\nHP sekarang: ${player.hp}/${player.maxhp}\nDrop: Tidak ada`
if (unlocked.length) {
let unlockText = unlocked.map((x) => `- ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`).join('\n')
msg += `\n\n🏆 Achievement Unlocked:\n${unlockText}`
}
return m.reply(msg)
}

if (eventRoll >= 0.03 && eventRoll < 0.11) {
let dmg = 10 + Math.floor(Math.random() * 11)
player.hp = Math.max(1, player.hp - dmg)
let bonus = null
if (Math.random() < 0.35) {
bonus = 'ore_iron'
player.inventory.push(bonus)
}
let unlocked = evaluateAchievements(player, achievementDB)
player.lastMine = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
let bonusText = bonus ? `+ 1 ${itemDB[bonus] ? itemDB[bonus].name : bonus}` : "Tidak ada"
let msg = `Monster muncul di tambang!\nReward: HP -${dmg}\nDrop: ${bonusText}`
if (unlocked.length) {
let unlockText = unlocked.map((x) => `- ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`).join('\n')
msg += `\n\n🏆 Achievement Unlocked:\n${unlockText}`
}
return m.reply(msg)
}

let luckyLegendary = eventRoll >= 0.11 && eventRoll < 0.15
if (luckyLegendary) {
let legPool = ORES.filter((o) => o.tier === 'LEGENDARY' && player.level >= o.minLevel)
if (legPool.length > 0) {
let jackpot = legPool[Math.floor(Math.random() * legPool.length)]
player.inventory.push(jackpot.id)
legendaryFound[jackpot.id] = (legendaryFound[jackpot.id] || 0) + 1
text += `Jackpot!\nDrop: + 1 ${jackpot.name}\n`
}
}

let nodes = 2 + Math.floor(Math.random() * 2)
nodes += Math.min(3, Math.floor(player.miningLevel / 12))
nodes += Math.min(3, Math.floor(pickaxePower / 5))
if (effectiveLevel >= 25) nodes += 1
if (effectiveLevel >= 40) nodes += 1
let mined = {}

for (let i = 0; i < nodes; i++) {
let ore = pickWeighted(pool)
let bonusQty = Math.min(8, Math.floor(player.miningLevel / 10) + Math.floor(pickaxePower / 4))
let minDrop = ore.minDrop + Math.min(2, Math.floor(player.miningLevel / 30))
let maxDrop = ore.maxDrop + bonusQty
if (ore.tier === 'COMMON') maxDrop += 1
let qty = Math.floor(Math.random() * (maxDrop - minDrop + 1)) + minDrop
if (qty < 1) qty = 1

player.inventory.push(...Array(qty).fill(ore.id))
if (!mined[ore.id]) mined[ore.id] = { name: ore.name, qty: 0 }
mined[ore.id].qty += qty
if (ore.tier === 'LEGENDARY') {
legendaryFound[ore.id] = (legendaryFound[ore.id] || 0) + qty
}
}

for (let id of Object.keys(mined)) {
text += `Drop: + ${mined[id].qty} ${mined[id].name}\n`
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
text += `\nReward: +${expGain} EXP Mining`
text += `\nMining Lv: ${player.miningLevel} | Effective Lv: ${effectiveLevel}`
if (leveled) text += `\nMining Level Up! Lv.${player.miningLevel}`

if (player.pickaxe && itemDB[player.pickaxe] && player.durability[player.pickaxe] > 0) {
let active = player.pickaxe
let d = useDurability(player, active, 1)
if (d.broken) {
text += `\n${itemDB[active].name} rusak!`
} else {
let dv = getDurability(player, active)
if (dv) text += `\nDurability Pickaxe: ${dv.current}/${dv.max}`
}
}

if (player.maid.owned && player.maid.active && player.maid.autoFix && player.pickaxe && itemDB[player.pickaxe] && itemDB[player.pickaxe].durability && player.gold >= 100) {
let maxDur = Number(itemDB[player.pickaxe].durability)
let curDur = Number(player.durability[player.pickaxe] ?? maxDur)
if (curDur <= Math.floor(maxDur * 0.5)) {
player.durability[player.pickaxe] = maxDur
player.gold -= 100
text += `\nMaid Service Aktif:\nFix pickaxe: -100 Gold`
}
}

player.lastMine = now
let unlocked = evaluateAchievements(player, achievementDB)
if (unlocked.length) {
let unlockText = unlocked.map((x) => `- ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`).join('\n')
text += `\n\n🏆 Achievement Unlocked:\n${unlockText}`
}
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
let legendaryLines = Object.keys(legendaryFound).map((id) => {
let name = itemDB[id] ? itemDB[id].name : id
return `${name} x${legendaryFound[id]}`
})
if (legendaryLines.length) {
text += `\n\n[WORLD ANNOUNCEMENT]\n@${String(sender).replace(/\D/g, '')} menemukan loot LEGENDARY dari mining!\nDrop: ${legendaryLines.join(', ')}`
return m.reply({ text, mentions: [sender] })
}
m.reply(text)
}
