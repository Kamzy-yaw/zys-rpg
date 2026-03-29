const fs = require('fs')
const areaDB = require('../database/area.json')
const itemDB = require('../database/item.json')
const achievementDB = require('../database/achievement.json')
const { normalizePvp, getRankGrade } = require('../system/pvp')
const { getDurability, ensureDurabilityState } = require('../system/equipment')
const { ensureEnhanceState, getWeaponAtk, getArmorDef, getPickaxePower, getAccessoryBonuses, normalizeAccessories } = require('../system/gearstats')
const { ensureAchievementState, evaluateAchievements } = require('../system/achievement')

function accessoryLine(id) {
if (!id || !itemDB[id] || itemDB[id].type !== 'accessory') return ''
let a = itemDB[id]
let parts = []
if (a.str) parts.push(`STR +${a.str}`)
if (a.agi) parts.push(`AGI +${a.agi}`)
if (a.int) parts.push(`INT +${a.int}`)
if (a.tough) parts.push(`TOUGH +${a.tough}`)
if (a.crit) parts.push(`CRIT +${a.crit}%`)
if (a.dodge) parts.push(`DODGE +${a.dodge}%`)
if (a.reduce) parts.push(`REDUCE +${a.reduce}%`)
return parts.join(' | ')
}

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Karakter belum ada.\nKetik .start dulu ya.')

let p = db[sender]
if (!p.area || !areaDB[p.area]) p.area = 'field'
normalizePvp(p)
ensureDurabilityState(p)
ensureEnhanceState(p)
normalizeAccessories(p)
ensureAchievementState(p)
evaluateAchievements(p, achievementDB)

let rank = getRankGrade(p)
let need = p.level * 100
let achTotal = Object.keys(achievementDB).length
let achDone = p.achievements.completed.length

let armorTough = (p.armor && itemDB[p.armor]) ? Number(itemDB[p.armor].tough || 0) : 0
let accessoryBonus = getAccessoryBonuses(p)
let armorDef = getArmorDef(p)
let effectiveWeaponAtk = getWeaponAtk(p)
let effectivePickaxe = getPickaxePower(p)
let effectiveTough = Number(p.toughness || 0) + armorTough + Number(accessoryBonus.tough || 0)
let totalStr = Number(p.str || 0) + Number(accessoryBonus.str || 0)
let totalAgi = Number(p.agi || 0) + Number(accessoryBonus.agi || 0)
let totalInt = Number(p.int || 0) + Number(accessoryBonus.int || 0)
let critChance = Math.min(50, (totalInt * 0.1) + Number(accessoryBonus.crit || 0))
let dodgeChance = Math.min(50, (totalAgi * 0.1) + Number(accessoryBonus.dodge || 0))
let reductionChance = Math.min(25, (effectiveTough * 0.1) + Number(accessoryBonus.reduce || 0))

let weaponName = (p.weapon && itemDB[p.weapon]) ? itemDB[p.weapon].name : 'None'
let armorName = (p.armor && itemDB[p.armor]) ? itemDB[p.armor].name : 'None'
let acc1Name = (p.accessories[0] && itemDB[p.accessories[0]]) ? itemDB[p.accessories[0]].name : 'None'
let acc2Name = (p.accessories[1] && itemDB[p.accessories[1]]) ? itemDB[p.accessories[1]].name : 'None'
let pickaxeName = (p.pickaxe && itemDB[p.pickaxe]) ? itemDB[p.pickaxe].name : 'None'

let wD = p.weapon ? getDurability(p, p.weapon) : null
let aD = p.armor ? getDurability(p, p.armor) : null
let pD = p.pickaxe ? getDurability(p, p.pickaxe) : null
if (typeof p.miningExp !== 'number') p.miningExp = 0
if (typeof p.miningLevel !== 'number') p.miningLevel = 1

let text = `?? Profile Player
Title: ${p.titles.equipped}
Level: ${p.level}
EXP: ${p.exp} / ${need}
HP: ${p.hp} / ${p.maxhp}
Gold: ${p.gold}
Area: ${areaDB[p.area].name}

? Stats
STR: ${p.str}
AGI: ${p.agi}
INT: ${p.int}
TOUGH: ${p.toughness} + ${armorTough} (armor) + ${Number(accessoryBonus.tough || 0)} (acc) = ${effectiveTough}
Crit Chance: ${critChance.toFixed(1)}%
Dodge Chance: ${dodgeChance.toFixed(1)}%
Damage Reduction: ${reductionChance.toFixed(1)}%
Bonus Accessory:
STR +${Number(accessoryBonus.str || 0)} | AGI +${Number(accessoryBonus.agi || 0)} | INT +${Number(accessoryBonus.int || 0)}
Crit +${Number(accessoryBonus.crit || 0)}% | Dodge +${Number(accessoryBonus.dodge || 0)}% | Reduce +${Number(accessoryBonus.reduce || 0)}%

?? Equipment
Weapon: ${weaponName}
Armor: ${armorName}
Accessory 1: ${acc1Name}
${accessoryLine(p.accessories[0]) || '-'}
Accessory 2: ${acc2Name}
${accessoryLine(p.accessories[1]) || '-'}

? Tools
Pickaxe: ${pickaxeName}
Pickaxe Power: ${effectivePickaxe}
Enhance:
Weapon +${p.enhance.weapon} | Armor +${p.enhance.armor} | Pickaxe +${p.enhance.pickaxe}
Durability:
Weapon ${wD ? `${wD.current} / ${wD.max}` : '-'}
Armor ${aD ? `${aD.current} / ${aD.max}` : '-'}
Pickaxe ${pD ? `${pD.current} / ${pD.max}` : '-'}

?? Progress
Mining: Lv.${p.miningLevel} (${p.miningExp} EXP)
Rank: ${rank.grade} (${rank.wins} win)
PVP: ${p.pvpWins}W / ${p.pvpLosses}L
Achievement: ${achDone} / ${achTotal}
Effective Combat:
STR ${totalStr} | AGI ${totalAgi} | INT ${totalInt}
Weapon ATK ${effectiveWeaponAtk} | Armor DEF ${armorDef}`

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)
}
