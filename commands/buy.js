const fs = require('fs')
const itemDB = require('../database/item.json')
const { ensureItemDurability } = require('../system/equipment')

module.exports = async (m,{sender,args})=>{

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if(!db[sender]) return m.reply("Buat karakter dulu pakai .start")

let player = db[sender]
if(!Array.isArray(player.inventory)) player.inventory = []

let items = Object.keys(itemDB).filter((id) => typeof itemDB[id].price === 'number')

let index = parseInt(args[0])-1

let id = items[index]

if(!id) return m.reply("Item tidak ada")

let item = itemDB[id]

if(player.gold < item.price) return m.reply("Gold tidak cukup")

player.gold -= item.price

player.inventory.push(id)
ensureItemDurability(player, id)

fs.writeFileSync('./database/player.json',JSON.stringify(db,null,2))

m.reply(`\uD83D\uDED2 Kamu membeli ${item.name}`)
}
