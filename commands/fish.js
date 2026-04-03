const fs = require('fs')
const itemDB = require('../database/item.json')
const achievementDB = require('../database/achievement.json')
const { ensureAchievementState, incrementStat, evaluateAchievements } = require('../system/achievement')
const { ensureEnhanceState, getRodPower } = require('../system/gearstats')
const { ensureDurabilityState, ensureItemDurability, useDurability, getDurability } = require('../system/equipment')

const COMMON = [
'old_coin',
'rusty_dagger',
'broken_arrow',
'small_pearl',
'copper_ring',
'old_bottle',
'fishing_hook',
'wood_fragment',
'tiny_shell',
'old_map_piece'
]

const MID = [
'silver_coin',
'ancient_coin',
'iron_dagger',
'hunter_ring',
'magic_pearl',
'treasure_map_fragment',
'gold_nugget',
'crystal_shard',
'silver_necklace',
'lucky_charm',
'fisherman_thread',
'coral_gem'
]

const RARE = [
'golden_crown',
'dragon_scale',
'ancient_relic',
'phoenix_feather',
'mythril_fragment',
'legendary_pearl',
'kings_ring',
'ancient_artifact',
'treasure_chest',
'lost_royal_necklace',
'abyss_pearl'
]

const LEGENDARY = [
'ocean_heart',
'sea_king_crown',
'leviathan_scale',
'ancient_ocean_relic'
]

function pick(list) {
return list[Math.floor(Math.random() * list.length)]
}

function itemName(id) {
return itemDB[id] ? itemDB[id].name : id
}

function getTierQty(tier, rodPower, itemId) {
let data = itemDB[itemId]
if (!data || data.type !== 'resource') return 1
let bonus = Math.floor(Math.max(0, Number(rodPower || 0)) / 6)
if (tier === 'Legendary') return Math.max(1, Math.min(2, 1 + Math.floor(rodPower / 15)))
if (tier === 'Rare') return Math.max(1, Math.min(3, 1 + Math.floor(rodPower / 12)))
if (tier === 'Mid') return Math.max(1, Math.min(4, 1 + bonus + (Math.random() < 0.4 ? 1 : 0)))
return Math.max(1, Math.min(5, 1 + bonus + (Math.random() < 0.6 ? 1 : 0)))
}

function giveItem(player, id, qty) {
for (let i = 0; i < qty; i++) player.inventory.push(id)
if (itemDB[id] && ['weapon', 'armor', 'pickaxe', 'rod'].includes(itemDB[id].type)) {
ensureItemDurability(player, id)
}
}

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.lastFish !== 'number') player.lastFish = 0
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.rod === 'undefined') player.rod = null
ensureAchievementState(player)
ensureEnhanceState(player)
ensureDurabilityState(player)

let rodPower = 0
let rodName = 'Tanpa rod'
if (player.rod && itemDB[player.rod]) {
ensureItemDurability(player, player.rod)
if (Number(player.durability[player.rod] || 0) > 0) {
rodPower = getRodPower(player)
rodName = itemDB[player.rod].name
} else {
player.rod = null
}
}

let now = Date.now()
let cooldown = Math.max(15000, 30000 - (rodPower * 700))
if (now - player.lastFish < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastFish)) / 1000)
return m.reply(`Joran masih basah, tunggu ${sisa} detik lagi.`)
}

let roll = Math.random() * 100
let text = `\uD83C\uDFA3 Kamu melempar pancing...\nRod: ${rodName} (Power +${rodPower})\n\n`
let legendaryDrops = []
incrementStat(player, 'fishRuns', 1)

// Random event block
if (roll < 8) {
let dmg = 8 + Math.floor(Math.random() * 15)
player.hp = Math.max(1, player.hp - dmg)
text += `\uD83D\uDC09 Sesuatu menarik pancingmu...\nMonster muncul!\nReward: HP -${dmg}\nDrop: Tidak ada`
} else if (roll < 15) {
let qty = Math.max(1, 1 + Math.floor(rodPower / 10) + (Math.random() < 0.45 ? 1 : 0))
giveItem(player, 'big_fish', qty)
text += `\uD83D\uDC1F Kamu menangkap ikan besar!\nDrop: + ${qty} ${itemName('big_fish')}`
} else if (roll < 20) {
let qty = 1 + ((rodPower >= 10 && Math.random() < 0.35) ? 1 : 0)
giveItem(player, 'treasure_chest', qty)
text += `\uD83D\uDCE6 Kamu menemukan peti terkubur!\nDrop: + ${qty} ${itemName('treasure_chest')}`
} else {
// Legendary jackpot naik seiring rod power
let luckyChance = Math.min(5, 1 + (rodPower * 0.25))
let lucky = Math.random() * 100 < luckyChance
if (lucky) {
let id = pick(LEGENDARY)
let qty = getTierQty('Legendary', rodPower, id)
giveItem(player, id, qty)
legendaryDrops.push(`${itemName(id)} x${qty}`)
text += `\uD83D\uDC8E Jackpot!\n\nTreasure Tier: Legendary\nItem: ${itemName(id)}\nDrop: + ${qty} ${itemName(id)}`
} else {
// Tier distribution: Common turun jika rod power naik
let commonCap = Math.max(40, 65 - Math.floor(rodPower * 2))
let midCap = Math.min(92, commonCap + 25 + Math.floor(rodPower * 1.2))
let tierRoll = Math.random() * 100
let tier = 'Common'
let list = COMMON
if (tierRoll >= commonCap && tierRoll < midCap) {
tier = 'Mid'
list = MID
}
if (tierRoll >= midCap) {
tier = 'Rare'
list = RARE
}

let id = pick(list)
let qty = getTierQty(tier, rodPower, id)
giveItem(player, id, qty)

if (tier === 'Rare') {
text += `\uD83D\uDC8E Kamu menemukan treasure!\n\nTreasure Tier: ${tier}\nItem: ${itemName(id)}\nDrop: + ${qty} ${itemName(id)}`
} else if (tier === 'Mid') {
text += `\uD83D\uDCB0 Kamu menemukan treasure!\n\nTreasure Tier: ${tier}\nItem: ${itemName(id)}\nDrop: + ${qty} ${itemName(id)}`
} else {
text += `Kamu mendapatkan sesuatu...\n\nTreasure Tier: ${tier}\nItem: ${itemName(id)}\nDrop: + ${qty} ${itemName(id)}`
}

// Bonus resource tambahan dari laut
let bonusChance = Math.min(45, 18 + (rodPower * 2))
if (Math.random() * 100 < bonusChance) {
let bonusPool = ['fisherman_thread', 'coral_gem', 'magic_pearl', 'gold_nugget', 'abyss_pearl']
let bonusId = bonusPool[Math.floor(Math.random() * bonusPool.length)]
let bonusQty = 1 + ((rodPower >= 8 && Math.random() < 0.4) ? 1 : 0)
giveItem(player, bonusId, bonusQty)
text += `\nBonus Laut: + ${bonusQty} ${itemName(bonusId)}`
}
}
}

if (player.rod && itemDB[player.rod]) {
let activeRod = player.rod
let r = useDurability(player, activeRod, 1)
if (r.broken) text += `\n\n\u26A0\uFE0F Rod kamu rusak dan terlepas!`
else {
let rd = getDurability(player, activeRod)
if (rd) text += `\n\nDurability rod: ${rd.current}/${rd.max}`
}
}

let unlocked = evaluateAchievements(player, achievementDB)
if (unlocked.length) {
let unlockText = unlocked.map((x) => `- ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`).join('\n')
text += `\n\n🏆 Achievement Unlocked:\n${unlockText}`
}

player.lastFish = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
if (legendaryDrops.length) {
text += `\n\n[WORLD ANNOUNCEMENT]\n@${String(sender).replace(/\D/g, '')} mendapatkan loot LEGENDARY dari mancing!\nDrop: ${legendaryDrops.join(', ')}`
return m.reply({ text, mentions: [sender] })
}
m.reply(text)
}
