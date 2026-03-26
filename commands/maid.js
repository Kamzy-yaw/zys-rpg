const fs = require('fs')

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let p = db[sender]
if (typeof p.gold !== 'number') p.gold = 0
if (typeof p.maidOwned !== 'boolean') p.maidOwned = false

let sub = (args[0] || '').toLowerCase()
let buyPrice = 10000
let servicePrice = 100

if (!sub || sub === 'status') {
let status = p.maidOwned ? "Sudah dibeli" : "Belum dibeli"
return m.reply(`Maid Service\nStatus: ${status}\nHarga beli: ${buyPrice} Gold\nBiaya service: ${servicePrice} Gold per battle\nEfek: auto heal full + auto fix gear aktif setelah battle.\n\nPakai: .maid buy`)
}

if (sub === 'buy') {
if (p.maidOwned) return m.reply("Maid sudah kamu miliki.")
if (p.gold < buyPrice) return m.reply(`Gold tidak cukup. Butuh ${buyPrice} Gold.`)
p.gold -= buyPrice
p.maidOwned = true
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`Maid berhasil direkrut!\n-${buyPrice} Gold\nService otomatis aktif di .hunt dan .raid.`)
}

m.reply("Subcommand tidak dikenal. Pakai: .maid status atau .maid buy")
}
