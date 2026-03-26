const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureDurabilityState, ensureItemDurability, getDurability } = require('../system/equipment')

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Bikin karakter dulu pakai .start")
}

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
if (player.pickaxe === undefined) player.pickaxe = null
ensureDurabilityState(player)

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

if (data.type !== "weapon" && data.type !== "armor" && data.type !== "pickaxe") {
return m.reply("Item ini tidak bisa dipasang.")
}

if (data.type === "weapon") {
ensureItemDurability(player, item)
if (player.durability[item] === 0) return m.reply("Item ini rusak. Perbaiki dulu pakai .fix <nomor>.")
player.weapon = item
}

if (data.type === "armor") {
ensureItemDurability(player, item)
if (player.durability[item] === 0) return m.reply("Item ini rusak. Perbaiki dulu pakai .fix <nomor>.")
player.armor = item
}

if (data.type === "pickaxe") {
ensureItemDurability(player, item)
if (player.durability[item] === 0) return m.reply("Item ini rusak. Perbaiki dulu pakai .fix <nomor>.")
player.pickaxe = item
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

if (data.type === "weapon") {
let d = getDurability(player, item)
let info = d ? `\nDurability: ${d.current}/${d.max}` : ""
return m.reply(`\u2694\uFE0F ${data.name} berhasil dipasang.${info}`)
}

let d = getDurability(player, item)
let info = d ? `\nDurability: ${d.current}/${d.max}` : ""
if (data.type === "armor") return m.reply(`\uD83E\uDEE1 ${data.name} berhasil dipasang.${info}`)
m.reply(`\u26CF\uFE0F ${data.name} berhasil dipasang.${info}`)

}
