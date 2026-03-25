const fs = require('fs')
const { normalizePvp, getRankGrade } = require('../system/pvp')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let p = db[sender]
normalizePvp(p)
let r = getRankGrade(p)

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`🛡️ Adventurer Rank\n\nGrade: ${r.grade}\nWins: ${r.wins}\nWin/Lose: ${p.pvpWins}/${p.pvpLosses}\n\nTier:\nD: 0 win\nC: 5 win\nB: 10 win\nA: 20 win`)

}
