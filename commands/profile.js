const fs = require('fs')
const areaDB = require('../database/area.json')
const itemDB = require('../database/item.json')
const achievementDB = require('../database/achievement.json')
const { normalizePvp, getRankGrade } = require('../system/pvp')
const { getDurability, ensureDurabilityState } = require('../system/equipment')
const { ensureEnhanceState, getWeaponAtk, getArmorDef, getPickaxePower, getRodPower, getAccessoryBonuses, normalizeAccessories } = require('../system/gearstats')
const { ensureAchievementState, evaluateAchievements } = require('../system/achievement')
const { ensureRoleState, getRoleData, getRoleKey } = require('../system/role')
const { ensurePetState, getPetData, getActivePetBonus } = require('../system/pet')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Karakter belum ada.\nKetik .start dulu ya.")
}

let p = db[sender]
if (!p.area || !areaDB[p.area]) p.area = "field"
normalizePvp(p)
ensureDurabilityState(p)
ensureEnhanceState(p)
normalizeAccessories(p)
ensureAchievementState(p)
ensureRoleState(p)
ensurePetState(p)
evaluateAchievements(p, achievementDB)
let roleKey = getRoleKey(p)
let roleData = getRoleData(roleKey)
let petData = getPetData(p.pet)
let rank = getRankGrade(p)
let weaponName = (p.weapon && itemDB[p.weapon]) ? itemDB[p.weapon].name : (p.weapon ? p.weapon : "None")
let armorName = (p.armor && itemDB[p.armor]) ? itemDB[p.armor].name : (p.armor ? p.armor : "None")
let pickaxeName = (p.pickaxe && itemDB[p.pickaxe]) ? itemDB[p.pickaxe].name : (p.pickaxe ? p.pickaxe : "None")
let rodName = (p.rod && itemDB[p.rod]) ? itemDB[p.rod].name : (p.rod ? p.rod : "None")
let accessory1 = (p.accessories[0] && itemDB[p.accessories[0]]) ? itemDB[p.accessories[0]].name : (p.accessories[0] ? p.accessories[0] : "None")
let accessory2 = (p.accessories[1] && itemDB[p.accessories[1]]) ? itemDB[p.accessories[1]].name : (p.accessories[1] ? p.accessories[1] : "None")
let accessory1Detail = ''
let accessory2Detail = ''
if (p.accessories[0] && itemDB[p.accessories[0]] && itemDB[p.accessories[0]].type === 'accessory') {
let a = itemDB[p.accessories[0]]
let parts = []
if (a.str) parts.push(`STR +${a.str}`)
if (a.agi) parts.push(`AGI +${a.agi}`)
if (a.int) parts.push(`INT +${a.int}`)
if (a.tough) parts.push(`TOUGH +${a.tough}`)
if (a.crit) parts.push(`CRIT +${a.crit}%`)
if (a.dodge) parts.push(`DODGE +${a.dodge}%`)
if (a.reduce) parts.push(`REDUCE +${a.reduce}%`)
accessory1Detail = parts.length ? ` (${parts.join(' | ')})` : ''
}
if (p.accessories[1] && itemDB[p.accessories[1]] && itemDB[p.accessories[1]].type === 'accessory') {
let a = itemDB[p.accessories[1]]
let parts = []
if (a.str) parts.push(`STR +${a.str}`)
if (a.agi) parts.push(`AGI +${a.agi}`)
if (a.int) parts.push(`INT +${a.int}`)
if (a.tough) parts.push(`TOUGH +${a.tough}`)
if (a.crit) parts.push(`CRIT +${a.crit}%`)
if (a.dodge) parts.push(`DODGE +${a.dodge}%`)
if (a.reduce) parts.push(`REDUCE +${a.reduce}%`)
accessory2Detail = parts.length ? ` (${parts.join(' | ')})` : ''
}
let wD = p.weapon ? getDurability(p, p.weapon) : null
let aD = p.armor ? getDurability(p, p.armor) : null
let pD = p.pickaxe ? getDurability(p, p.pickaxe) : null
let rD = p.rod ? getDurability(p, p.rod) : null
if (typeof p.miningExp !== 'number') p.miningExp = 0
if (typeof p.miningLevel !== 'number') p.miningLevel = 1
let armorTough = (p.armor && itemDB[p.armor]) ? Number(itemDB[p.armor].tough || 0) : 0
let accessoryBonus = getAccessoryBonuses(p)
let petBonus = getActivePetBonus(p)
let armorDef = getArmorDef(p)
let effectiveWeaponAtk = getWeaponAtk(p)
let effectivePickaxe = getPickaxePower(p)
let effectiveRod = getRodPower(p)
let effectiveTough = Number(p.toughness || 0) + armorTough + Number(accessoryBonus.tough || 0) + Number(petBonus.tough || 0)
let totalStr = Number(p.str || 0) + Number(accessoryBonus.str || 0) + Number(petBonus.str || 0)
let totalAgi = Number(p.agi || 0) + Number(accessoryBonus.agi || 0) + Number(petBonus.agi || 0)
let totalInt = Number(p.int || 0) + Number(accessoryBonus.int || 0) + Number(petBonus.int || 0)
let critChance = Math.min(50, (totalInt * 0.1) + Number(accessoryBonus.crit || 0) + Number(petBonus.crit || 0))
let dodgeChance = Math.min(50, (totalAgi * 0.1) + Number(accessoryBonus.dodge || 0) + Number(petBonus.dodge || 0))
let reductionChance = Math.min(25, (effectiveTough * 0.1) + Number(accessoryBonus.reduce || 0) + Number(petBonus.reduce || 0))

let need = p.level * 100
let achTotal = Object.keys(achievementDB).length
let achDone = p.achievements.completed.length
let equippedTitle = (p.titles && p.titles.equipped) ? p.titles.equipped : 'Adventurer'
let petLabel = p.pet || 'none'
let roleLabel = roleKey || 'none'
let safeAreaName = (areaDB[p.area] && areaDB[p.area].name) ? areaDB[p.area].name : 'Unknown'
let expNow = Math.max(0, Number(p.exp || 0))
let expNeed = Math.max(1, Number(need || 1))

let text = `╔══ PLAYER PROFILE ══

🏷 Title : ${equippedTitle}
👤 Role  : ${roleLabel}
🐾 Pet   : ${petLabel}

📊 LEVEL
Lv ${p.level}
EXP ${expNow} / ${expNeed}

❤️ HP
${p.hp} / ${p.maxhp}

💰 Gold
${p.gold}

📍 Area
${safeAreaName}

══════════════

⚔ STATS
STR   ${p.str}
AGI   ${p.agi}
INT   ${p.int}
TOUGH ${effectiveTough}

🛡 COMBAT
Crit   ${critChance.toFixed(1)}%
Dodge  ${dodgeChance.toFixed(1)}%
Reduce ${reductionChance.toFixed(1)}%
Armor  ${armorDef}

══════════════

🧰 EQUIPMENT
⚔ ${weaponName} (+${p.enhance.weapon})
🛡 ${armorName} (+${p.enhance.armor})
💍 ${accessory1}${accessory1Detail}
💍 ${accessory2}${accessory2Detail}
⛏ ${pickaxeName} (+${p.enhance.pickaxe})
🎣 ${rodName} (+${p.enhance.rod})

══════════════

⚡ EFFECTIVE
STR ${totalStr} | AGI ${totalAgi} | INT ${totalInt}
ATK ${effectiveWeaponAtk} | DEF ${armorDef}
Pickaxe ${effectivePickaxe} | Rod ${effectiveRod}

🔧 DURABILITY
Weapon ${wD ? `${wD.current}/${wD.max}` : '-'}
Armor ${aD ? `${aD.current}/${aD.max}` : '-'}
Pickaxe ${pD ? `${pD.current}/${pD.max}` : '-'}
Rod ${rD ? `${rD.current}/${rD.max}` : '-'}

══════════════

📈 PROGRESS
Mining Lv.${p.miningLevel}
Rank ${rank.grade} (${rank.wins} win)
PVP ${p.pvpWins}W / ${p.pvpLosses}L
Achievement ${achDone} / ${achTotal}

💡 Tips
.hunt → battle
.menu → command list`

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)

}
