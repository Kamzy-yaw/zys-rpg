const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureDurabilityState, ensureItemDurability, getDurability } = require('../system/equipment')
const { normalizeAccessories } = require('../system/gearstats')

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Karakter belum ada.\nKetik .start dulu ya.")
}

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
if (player.accessory === undefined) player.accessory = null
if (player.pickaxe === undefined) player.pickaxe = null
normalizeAccessories(player)
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
return m.reply("Nomor item tidak valid.\nCek list item dulu pakai .inventory")
}
let data = itemDB[item]

if (!data) {
return m.reply("Data item tidak ditemukan.")
}

if (data.type !== "weapon" && data.type !== "armor" && data.type !== "pickaxe" && data.type !== "accessory") {
return m.reply("Item ini tidak bisa di-equip.")
}

if (data.type === "weapon") {
ensureItemDurability(player, item)
if (player.durability[item] === 0) return m.reply("Item ini rusak.\nPerbaiki dulu pakai .fix <nomor>.")
player.weapon = item
}

if (data.type === "armor") {
ensureItemDurability(player, item)
if (player.durability[item] === 0) return m.reply("Item ini rusak.\nPerbaiki dulu pakai .fix <nomor>.")
player.armor = item
}

if (data.type === "pickaxe") {
ensureItemDurability(player, item)
if (player.durability[item] === 0) return m.reply("Item ini rusak.\nPerbaiki dulu pakai .fix <nomor>.")
player.pickaxe = item
}

if (data.type === "accessory") {
let slotArg = String(args[1] || '').toLowerCase()
let slotIndex = -1
if (slotArg === '1' || slotArg === 'acc1' || slotArg === 'slot1') slotIndex = 0
if (slotArg === '2' || slotArg === 'acc2' || slotArg === 'slot2') slotIndex = 1
if (slotIndex === -1) {
if (!player.accessories[0]) slotIndex = 0
else if (!player.accessories[1]) slotIndex = 1
else slotIndex = 0
}
player.accessories[slotIndex] = item
player.accessory = player.accessories[0] || null
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
if (data.type === "accessory") {
let slot1 = player.accessories[0] && itemDB[player.accessories[0]] ? itemDB[player.accessories[0]].name : 'None'
let slot2 = player.accessories[1] && itemDB[player.accessories[1]] ? itemDB[player.accessories[1]].name : 'None'
return m.reply(`\uD83D\uDC8D ${data.name} berhasil dipasang.\nAccessory Slot 1: ${slot1}\nAccessory Slot 2: ${slot2}\nTips: .equip <nomor> 1 atau .equip <nomor> 2\nLihat daftar item: .inventory`)
}
m.reply(`\u26CF\uFE0F ${data.name} berhasil dipasang.${info}`)

}
