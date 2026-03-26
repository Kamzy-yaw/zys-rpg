const fs = require('fs')
const path = require('path')
const { getRankGrade, normalizePvp } = require('../system/pvp')

const rewards = { D: 100, C: 200, B: 300, A: 400, S: 500 }

module.exports = async (m, { args }) => {
if ((args[0] || '').toLowerCase() !== 'confirm') {
return m.reply("Command ini reset rank mingguan dan bagi reward.\nKetik: .weeklyreset confirm")
}

let db = JSON.parse(fs.readFileSync('./database/player.json'))
let ids = Object.keys(db)
if (ids.length === 0) return m.reply("Belum ada player.")

let text = "🔄 Weekly Rank Reset\n\n"
for (let id of ids) {
let p = db[id]
normalizePvp(p)
let grade = getRankGrade(p).grade
let reward = rewards[grade] || 100
if (typeof p.gold !== 'number') p.gold = 0
p.gold += reward
text += `- ${id}: Rank ${grade} +${reward} Gold\n`
p.pvpWins = 0
p.pvpLosses = 0
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
fs.writeFileSync(path.join(__dirname, '..', 'database', 'arena.json'), JSON.stringify({ members: [] }, null, 2))
fs.writeFileSync(path.join(__dirname, '..', 'database', 'duel.json'), JSON.stringify({}, null, 2))
m.reply(text)
}
