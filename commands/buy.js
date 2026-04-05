const itemDB = require('../database/item.json')
const { ensureItemDurability } = require('../system/equipment')
const { ensurePetState, hasPet, addPet, getPetData } = require('../system/pet')
const { scheduleSave } = require('../database')

module.exports = async (m, { sender, args }) => {

let db = global.db.players

if (!db[sender]) return m.reply('Buat karakter dulu pakai .start')

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []
ensurePetState(player)

let items = Object.keys(itemDB).filter((id) => typeof itemDB[id].price === 'number')

let index = parseInt(args[0]) - 1
let qty = parseInt(args[1] || '1')
if (isNaN(qty) || qty < 1) qty = 1

let id = items[index]
if (!id) return m.reply('Item tidak ada')

let item = itemDB[id]
let totalCost = item.price * qty

if (item.type === 'pet') {
let petId = item.unlockPet
if (!petId) return m.reply('Item pet invalid.')
if (hasPet(player, petId)) return m.reply('Kamu sudah punya pet ini.')

let petData = getPetData(petId)
let petCost = item.price
if (player.gold < petCost) return m.reply(`Gold tidak cukup. Butuh ${petCost} Gold.`)

player.gold -= petCost
addPet(player, petId)

scheduleSave('players')
return m.reply(`=== PET PURCHASE ===\nKamu membeli ${petData.name}\nBonus : ${petData.desc}\nTotal : ${petCost} Gold`)
}

if (player.gold < totalCost) return m.reply(`Gold tidak cukup. Butuh ${totalCost} Gold.`)

player.gold -= totalCost

for (let i = 0; i < qty; i++) {
player.inventory.push(id)
ensureItemDurability(player, id)
}

scheduleSave('players')

m.reply(`=== PURCHASE SUCCESS ===\nItem  : ${item.name} x${qty}\nTotal : ${totalCost} Gold`)
}
