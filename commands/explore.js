const fs = require('fs')
const itemDB = require('../database/item.json')

const BIOMES = [
{ id: 'green_plains', icon: '\uD83C\uDF3E', name: 'Green Plains', chance: 25, goldMin: 10, goldMax: 28, loot: ['gold_coin', 'herb', 'rabbit_meat', 'animal_fur', 'wood_stick', 'iron_fragment', 'small_apple'] },
{ id: 'dark_forest', icon: '\uD83C\uDF32', name: 'Dark Forest', chance: 20, goldMin: 14, goldMax: 34, loot: ['gold_coin', 'ancient_wood', 'spider_silk', 'dark_mushroom', 'wolf_fang', 'broken_sword', 'herbal_leaf'] },
{ id: 'rocky_mountain', icon: '\uD83D\uDD3B', name: 'Rocky Mountain', chance: 15, goldMin: 16, goldMax: 38, loot: ['ore_iron', 'stone_fragment', 'ore_silver', 'gold_nugget', 'crystal_shard', 'ancient_fossil'] },
{ id: 'ocean_shore', icon: '\uD83C\uDF0A', name: 'Ocean Shore', chance: 15, goldMin: 15, goldMax: 36, loot: ['pearl', 'sea_shell', 'coral_fragment', 'old_coin', 'treasure_map_fragment', 'golden_pearl'] },
{ id: 'desert_wasteland', icon: '\uD83C\uDFDC', name: 'Desert Wasteland', chance: 10, goldMin: 17, goldMax: 42, loot: ['gold_coin', 'scorpion_tail', 'sand_crystal', 'ancient_coin', 'desert_cloth', 'bone_fragment', 'cactus_juice'] },
{ id: 'frozen_tundra', icon: '\u2744', name: 'Frozen Tundra', chance: 10, goldMin: 18, goldMax: 44, loot: ['ice_crystal', 'frozen_meat', 'snow_wolf_fang', 'silver_coin', 'ice_fragment', 'ancient_ice_relic'] },
{ id: 'volcanic_land', icon: '\uD83C\uDF0B', name: 'Volcanic Land', chance: 5, goldMin: 22, goldMax: 55, loot: ['fire_crystal', 'obsidian', 'lava_stone', 'burning_core', 'flame_essence', 'ancient_fire_relic'] }
]

function pickBiome() {
let roll = Math.random() * 100
let acc = 0
for (let b of BIOMES) {
acc += b.chance
if (roll < acc) return b
}
return BIOMES[0]
}

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Buat karakter dulu pakai .start")

let player = db[sender]
if (typeof player.lastExplore !== 'number') player.lastExplore = 0
if (typeof player.gold !== 'number') player.gold = 0
if (!Array.isArray(player.inventory)) player.inventory = []

let now = Date.now()
let cooldown = 30000
if (now - player.lastExplore < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastExplore)) / 1000)
return m.reply(`Explore cooldown, tunggu ${sisa} detik.`)
}

let biome = pickBiome()
let text = `${biome.icon} Kamu menjelajah ${biome.name}...\n\n`
let roll = Math.random()

if (roll < 0.2) {
text += "Monster liar mengintai...\nReward: Tidak ada\nDrop: Tidak ada\nGunakan .hunt untuk bertarung."
} else if (roll < 0.55) {
let gold = Math.floor(Math.random() * (biome.goldMax - biome.goldMin + 1)) + biome.goldMin
player.gold += gold
text += `Reward: +${gold} Gold\nDrop: Tidak ada`
} else {
let itemId = biome.loot[Math.floor(Math.random() * biome.loot.length)]
player.inventory.push(itemId)
let itemName = itemDB[itemId] ? itemDB[itemId].name : itemId
text += `Reward: Tidak ada\nDrop: + 1 ${itemName}`
}

player.lastExplore = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)
}
