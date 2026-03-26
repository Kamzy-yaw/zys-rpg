const fs = require('fs')

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

let roll = Math.random()
let text = "\uD83C\uDFA3 Kamu melempar pancing...\n\n"

if (roll < 0.62) {
player.inventory.push('fish')
text += "Kamu dapat ikan segar!"
} else if (roll < 0.87) {
if (Math.random() < 0.25) player.inventory.push('hp_potion')
if (Math.random() < 0.08) player.inventory.push('big_hp_potion')
if (Math.random() < 0.35) player.inventory.push('crystal_shard')
text += "Kamu dapat treasure!\n+ Resource langka"
} else {
let dmg = Math.floor(Math.random() * 16) + 8
player.hp = Math.max(1, player.hp - dmg)
if (Math.random() < 0.45) player.inventory.push('fish')
if (Math.random() < 0.20) player.inventory.push('magic_crystal')
text += `Monster laut menyerang!\n-${dmg} HP\nKamu selamat dan bawa resource.`
}

player.lastFish = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(text)

}
