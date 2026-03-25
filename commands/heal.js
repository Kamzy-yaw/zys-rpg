const fs = require('fs')
const itemDB = require('../database/item.json')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Bikin karakter dulu pakai .start")
}

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.hp !== 'number') player.hp = player.maxhp

if (player.hp >= player.maxhp) {
return m.reply("HP kamu sudah penuh.")
}

let potionIndex = player.inventory.indexOf('hp_potion')
if (potionIndex === -1) {
return m.reply("Kamu tidak punya HP Potion.")
}

let healValue = itemDB.hp_potion?.heal || 50
let before = player.hp
player.hp = Math.min(player.maxhp, player.hp + healValue)
player.inventory.splice(potionIndex, 1)

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`\uD83E\uDEA8 Kamu pakai HP Potion.\nHP: ${before} -> ${player.hp}/${player.maxhp}`)

}
