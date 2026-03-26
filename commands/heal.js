const fs = require('fs')
const itemDB = require('../database/item.json')

module.exports = async (m, { sender, args }) => {

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

let pick = 'hp_potion'
let type = (args[0] || '').toLowerCase()
if (type === 'big') pick = 'big_hp_potion'
if (type === 'full') pick = 'full_hp_potion'

let potionIndex = player.inventory.indexOf(pick)
if (type === '' && potionIndex === -1) {
let fallback = ['big_hp_potion', 'full_hp_potion']
for (let f of fallback) {
let idx = player.inventory.indexOf(f)
if (idx !== -1) {
pick = f
potionIndex = idx
break
}
}
}
if (potionIndex === -1) {
if (pick === 'hp_potion') return m.reply("Kamu tidak punya HP Potion.")
if (pick === 'big_hp_potion') return m.reply("Kamu tidak punya Big HP Potion.")
if (pick === 'full_hp_potion') return m.reply("Kamu tidak punya Full HP Potion.")
}

let before = player.hp
if (itemDB[pick]?.fullHeal) {
player.hp = player.maxhp
} else {
let healValue = itemDB[pick]?.heal || 50
player.hp = Math.min(player.maxhp, player.hp + healValue)
}
player.inventory.splice(potionIndex, 1)

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

let label = itemDB[pick]?.name || "Potion"
m.reply(`\uD83E\uDEA8 Kamu pakai ${label}.\nHP: ${before} -> ${player.hp}/${player.maxhp}`)

}
