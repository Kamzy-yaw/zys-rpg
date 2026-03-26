const fs = require('fs')
const areaDB = require('../database/area.json')
const itemDB = require('../database/item.json')
const { normalizePvp, getRankGrade } = require('../system/pvp')
const { getDurability, ensureDurabilityState } = require('../system/equipment')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Bikin karakter dulu pakai .start")
}

let p = db[sender]
if (!p.area || !areaDB[p.area]) p.area = "field"
normalizePvp(p)
ensureDurabilityState(p)
let rank = getRankGrade(p)
let weaponName = (p.weapon && itemDB[p.weapon]) ? itemDB[p.weapon].name : (p.weapon ? p.weapon : "None")
let armorName = (p.armor && itemDB[p.armor]) ? itemDB[p.armor].name : (p.armor ? p.armor : "None")
let pickaxeName = (p.pickaxe && itemDB[p.pickaxe]) ? itemDB[p.pickaxe].name : (p.pickaxe ? p.pickaxe : "None")
let wD = p.weapon ? getDurability(p, p.weapon) : null
let aD = p.armor ? getDurability(p, p.armor) : null
let pD = p.pickaxe ? getDurability(p, p.pickaxe) : null
if (typeof p.miningExp !== 'number') p.miningExp = 0
if (typeof p.miningLevel !== 'number') p.miningLevel = 1

let need = p.level * 100

let text = `\uD83D\uDC64 Profile Player

Level: ${p.level}
EXP: ${p.exp}/${need}

HP: ${p.hp}/${p.maxhp}
Gold: ${p.gold}
Area: ${areaDB[p.area].name}

STR: ${p.str}
AGI: ${p.agi}
INT: ${p.int}
TOUGH: ${p.toughness}

Weapon: ${weaponName}
Armor: ${armorName}
Pickaxe: ${pickaxeName}
Durability: ${wD ? `Weapon ${wD.current}/${wD.max}` : "Weapon -"} | ${aD ? `Armor ${aD.current}/${aD.max}` : "Armor -"} | ${pD ? `Pickaxe ${pD.current}/${pD.max}` : "Pickaxe -"}
Mining: Lv.${p.miningLevel} (${p.miningExp} EXP)
Rank: ${rank.grade} (${rank.wins} win)
PVP: ${p.pvpWins}W/${p.pvpLosses}L
`

m.reply(text)

}
