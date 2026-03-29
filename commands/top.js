const fs = require('fs')
const { ensureEnhanceState, getWeaponAtk, getArmorDef } = require('../system/gearstats')

function asTag(id, fallback) {
let num = String(id || '').replace(/\D/g, '')
if (!num) return fallback || String(id || 'Unknown')
return `@${num}`
}

module.exports = async (m) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
let entries = Object.entries(db)

if (entries.length === 0) return m.reply("Belum ada player.")

let ranked = entries.map(([id, p]) => {
let level = Number(p.level) || 1
let str = Number(p.str) || 0
let agi = Number(p.agi) || 0
let intel = Number(p.int) || 0
let gold = Number(p.gold) || 0
ensureEnhanceState(p)
let weaponAtk = getWeaponAtk(p)
let armorDef = getArmorDef(p)
let score =
(level * 20) +
(weaponAtk * 40) +
(armorDef * 30) +
(str * 2) +
(agi * 2) +
(intel * 2)
return { id, name: p.name || id, score, level, gold, weaponAtk, armorDef }
}).sort((a, b) => b.score - a.score).slice(0, 10)

let text = "🏆 Leaderboard Power\n\n"
let mentions = []

ranked.forEach((u, i) => {
let tag = asTag(u.id, u.name)
if (String(u.id).includes('@')) mentions.push(u.id)
text += `${i + 1}. ${tag}\n   Score: ${u.score} | Lv.${u.level} | Gold ${u.gold}\n`
text += `   WAtk ${u.weaponAtk} | ADef ${u.armorDef}\n`
})

m.reply({ text, mentions })

}
