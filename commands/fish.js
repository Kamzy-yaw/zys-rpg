const fs = require('fs')
const itemDB = require('../database/item.json')

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
'lucky_charm'
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
'lost_royal_necklace'
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

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.lastFish !== 'number') player.lastFish = 0
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100

let now = Date.now()
let cooldown = 30000
if (now - player.lastFish < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastFish)) / 1000)
return m.reply(`Joran masih basah, tunggu ${sisa} detik lagi.`)
}

let roll = Math.random() * 100
let text = "\uD83C\uDFA3 Kamu melempar pancing...\n\n"

// Random event block
if (roll < 8) {
let dmg = 8 + Math.floor(Math.random() * 15)
player.hp = Math.max(1, player.hp - dmg)
text += `\uD83D\uDC09 Sesuatu menarik pancingmu...\nMonster muncul!\nHP -${dmg}`
} else if (roll < 15) {
player.inventory.push('big_fish')
text += `\uD83D\uDC1F Kamu menangkap ikan besar!\n+ 1 ${itemName('big_fish')}`
} else if (roll < 20) {
player.inventory.push('treasure_chest')
text += `\uD83D\uDCE6 Kamu menemukan peti terkubur!\n+ 1 ${itemName('treasure_chest')}`
} else {
// Legendary jackpot 1%
let lucky = Math.random() * 100 < 1
if (lucky) {
let id = pick(LEGENDARY)
player.inventory.push(id)
text += `\uD83D\uDC8E Jackpot!\n\nTreasure Tier: Legendary\nItem: ${itemName(id)}\n\n+ 1 ${itemName(id)}`
} else {
// Tier distribution: Common 65%, Mid 25%, Rare 10%
let tierRoll = Math.random() * 100
let tier = 'Common'
let list = COMMON
if (tierRoll >= 65 && tierRoll < 90) {
tier = 'Mid'
list = MID
}
if (tierRoll >= 90) {
tier = 'Rare'
list = RARE
}

let id = pick(list)
player.inventory.push(id)

if (tier === 'Rare') {
text += `\uD83D\uDC8E Kamu menemukan treasure!\n\nTreasure Tier: ${tier}\nItem: ${itemName(id)}\n\n+ 1 ${itemName(id)}`
} else if (tier === 'Mid') {
text += `\uD83D\uDCB0 Kamu menemukan treasure!\n\nTreasure Tier: ${tier}\nItem: ${itemName(id)}\n\n+ 1 ${itemName(id)}`
} else {
text += `Kamu mendapatkan sesuatu...\n\nTreasure Tier: ${tier}\nItem: ${itemName(id)}\n\n+ 1 ${itemName(id)}`
}
}
}

player.lastFish = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)
}
