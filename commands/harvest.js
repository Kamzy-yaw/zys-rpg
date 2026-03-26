const fs = require('fs')
const farmDB = require('../database/farm.json')

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let p = db[sender]
if (!p.farm || typeof p.farm !== 'object') p.farm = { crop: null, plantedAt: 0 }
if (!Array.isArray(p.inventory)) p.inventory = []

if (!p.farm.crop) return m.reply("Ladang kosong. Pakai .plant dulu.")
let crop = p.farm.crop
let data = farmDB[crop]
if (!data) {
p.farm = { crop: null, plantedAt: 0 }
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply("Tanaman invalid, ladang direset.")
}

let now = Date.now()
let readyAt = p.farm.plantedAt + data.growMs
if (now < readyAt) {
let sisa = Math.ceil((readyAt - now) / 1000)
return m.reply(`Belum siap panen. Tunggu ${sisa} detik lagi.`)
}

let amount = Math.floor(Math.random() * (data.yieldMax - data.yieldMin + 1)) + data.yieldMin
for (let i = 0; i < amount; i++) p.inventory.push(crop)

p.farm = { crop: null, plantedAt: 0 }
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`Panen berhasil!\nReward: Tidak ada\nDrop: + ${amount} ${data.name}`)
}
