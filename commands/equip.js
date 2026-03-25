const fs = require('fs')
const itemDB = require('../database/item.json')

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Bikin karakter dulu pakai .start")
}

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null

let unique = []
let seen = {}
for (let itemId of player.inventory) {
if (!seen[itemId]) {
seen[itemId] = true
unique.push(itemId)
}
}

let index = parseInt(args[0]) - 1
let item = unique[index]

if (!item) {
return m.reply("Item tidak ada.")
}
let data = itemDB[item]

if (!data) {
return m.reply("Data item tidak ditemukan.")
}

if (data.type !== "weapon" && data.type !== "armor") {
return m.reply("Item ini tidak bisa dipasang.")
}

if (data.type === "weapon") {
player.weapon = item
}

if (data.type === "armor") {
player.armor = item
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

if (data.type === "weapon") {
return m.reply(`\u2694\uFE0F ${data.name} berhasil dipasang.`)
}

m.reply(`\uD83E\uDEE1 ${data.name} berhasil dipasang.`)

}
