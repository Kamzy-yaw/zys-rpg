const fs = require('fs')

module.exports = async (m, { sender, args }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Bikin karakter dulu pakai .start")
}

let player = db[sender]
if (typeof player.lastTrain !== 'number') player.lastTrain = 0

let stat = (args[0] || "").toLowerCase()
let validStats = ["str", "agi", "int"]

if (!stat || stat === 'random') {
stat = validStats[Math.floor(Math.random() * validStats.length)]
}

if (!validStats.includes(stat)) {
return m.reply("Pilih stat yang mau dilatih: .train str | .train agi | .train int | .train random")
}

let now = Date.now()
let cooldown = 60 * 60 * 1000

if (now - player.lastTrain < cooldown) {
let sisaMs = cooldown - (now - player.lastTrain)
let menit = Math.ceil(sisaMs / 60000)
return m.reply(`Latihan masih cooldown. Coba lagi ${menit} menit lagi.`)
}

if (typeof player[stat] !== 'number') player[stat] = 0
let gain = Math.floor(Math.random() * 5) + 1
player[stat] += gain
player.lastTrain = now

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`\uD83C\uDFCB\uFE0F Training selesai!\n${stat.toUpperCase()} naik +${gain}\nSekarang: ${player[stat]}`)

}
