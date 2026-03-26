const fs = require('fs')
const recipeDB = require('../database/recipe.json')
const itemDB = require('../database/item.json')
const { ensureItemDurability } = require('../system/equipment')

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (!Array.isArray(player.inventory)) player.inventory = []

let ids = Object.keys(recipeDB)
let input = (args[0] || '').toLowerCase()

if (!input) {
let text = "\uD83D\uDEE0\uFE0F Crafting Bench\n\n"
ids.forEach((id, i) => {
let r = recipeDB[id]
let out = itemDB[r.output] ? itemDB[r.output].name : r.output
let req = Object.entries(r.materials).map(([k, v]) => `${itemDB[k] ? itemDB[k].name : k} x${v}`).join(', ')
text += `${i + 1}. ${out}\n   Need: ${req}\n`
})
text += "\nKetik .craft <id/no>"
return m.reply(text)
}

let picked = input
if (!recipeDB[picked]) {
let idx = parseInt(input) - 1
if (!isNaN(idx) && ids[idx]) picked = ids[idx]
}

if (!recipeDB[picked]) return m.reply("Resep tidak ditemukan.")

let r = recipeDB[picked]

for (let mat in r.materials) {
let need = r.materials[mat]
let have = player.inventory.filter((x) => x === mat).length
if (have < need) {
let matName = itemDB[mat] ? itemDB[mat].name : mat
return m.reply(`Material kurang: ${matName} butuh ${need}, kamu punya ${have}`)
}
}

for (let mat in r.materials) {
let need = r.materials[mat]
for (let i = 0; i < need; i++) {
let idx = player.inventory.indexOf(mat)
if (idx !== -1) player.inventory.splice(idx, 1)
}
}

player.inventory.push(r.output)
ensureItemDurability(player, r.output)

let outName = itemDB[r.output] ? itemDB[r.output].name : r.output
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`\u2705 Craft berhasil: ${outName}`)

}
