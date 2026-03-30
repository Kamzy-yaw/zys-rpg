const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureItemDurability } = require('../system/equipment')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.lastGacha !== 'number') player.lastGacha = 0
if (typeof player.gold !== 'number') player.gold = 0

let now = Date.now()
let cooldown = 60000
let cost = 120

if (now - player.lastGacha < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastGacha)) / 1000)
return m.reply(`Mesin gacha cooldown, tunggu ${sisa} detik.`)
}

if (player.gold < cost) {
return m.reply(`Gold tidak cukup. Gacha butuh ${cost} Gold.`)
}

let pool = [
{ id: 'wood_sword', chance: 42 },
{ id: 'stone_sword', chance: 30 },
{ id: 'iron_sword', chance: 16 },
{ id: 'diamond_sword', chance: 9 },
{ id: 'netherite_sword', chance: 3 }
]

let roll = Math.random() * 100
let total = 0
let picked = pool[0].id
for (let p of pool) {
total += p.chance
if (roll <= total) {
picked = p.id
break
}
}

player.gold -= cost
player.inventory.push(picked)
ensureItemDurability(player, picked)
player.lastGacha = now

let itemName = itemDB[picked] ? itemDB[picked].name : picked

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`\uD83C\uDFB0 Gacha dibuka!\nReward: Tidak ada\nDrop: + 1 ${itemName}\nBiaya: ${cost} Gold`)

}
