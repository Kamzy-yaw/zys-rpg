const fs = require('fs')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.lastMine !== 'number') player.lastMine = 0

let now = Date.now()
let cooldown = 45000
if (now - player.lastMine < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastMine)) / 1000)
return m.reply(`Tambang lagi istirahat, tunggu ${sisa} detik lagi.`)
}

let resources = [
{ id: 'ore_iron', name: 'Iron Ore', chance: 43 },
{ id: 'ore_gold', name: 'Gold Ore', chance: 27 },
{ id: 'ore_diamond', name: 'Diamond Ore', chance: 15 },
{ id: 'ore_mythril', name: 'Mythril Ore', chance: 9 },
{ id: 'ore_titanium', name: 'Titanium Ore', chance: 6 }
]

let roll = Math.random() * 100
let total = 0
let picked = resources[0]
for (let r of resources) {
total += r.chance
if (roll <= total) {
picked = r
break
}
}

player.inventory.push(picked.id)
let bonusGold = Math.floor(Math.random() * 13) + 8
player.gold = (player.gold || 0) + bonusGold
player.lastMine = now

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`\u26CF\uFE0F Hasil mining:\n${picked.name}\n+${bonusGold} Gold`)

}
