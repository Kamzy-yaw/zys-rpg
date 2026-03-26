const fs = require('fs')
const farmDB = require('../database/farm.json')

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let p = db[sender]
if (!p.farm || typeof p.farm !== 'object') p.farm = { crop: null, plantedAt: 0 }

if (p.farm.crop) {
return m.reply(`Ladang kamu sedang ditanami ${farmDB[p.farm.crop]?.name || p.farm.crop}. Pakai .harvest dulu.`)
}

let crop = (args[0] || '').toLowerCase()
if (!farmDB[crop]) {
let list = Object.keys(farmDB).join(', ')
return m.reply(`Pilih tanaman: ${list}\nContoh: .plant wheat`)
}

p.farm.crop = crop
p.farm.plantedAt = Date.now()
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`🌱 Kamu menanam ${farmDB[crop].name}. Siap panen sekitar ${Math.ceil(farmDB[crop].growMs / 60000)} menit.`)
}
