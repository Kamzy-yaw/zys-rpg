const fs = require('fs')
const itemDB = require('../database/item.json')
const levelUp = require('../system/level')
const { ensureDurabilityState, ensureItemDurability, useDurability } = require('../system/equipment')
const { ensureEnhanceState, getWeaponAtk, getArmorDef, getAccessoryBonuses, normalizeAccessories } = require('../system/gearstats')
const { ensureRoleState, getRoleBonuses, applyExpRoleBonus } = require('../system/role')
const { ensurePetState, getActivePetBonus } = require('../system/pet')

const RAID_SALVAGE_POOL = ['crystal_shard', 'ore_mythril', 'ore_titanium', 'shadow_crystal', 'spirit_gem']

const bosses = {
0: { name: "Training Titan", minLevel: 1, hp: 5000, atk: 18, def: 10, critRes: 20, rewardGold: 80, rewardExp: 120 },
1: { name: "Ancient Colossus", minLevel: 20, hp: 700, atk: 36, def: 2, critRes: 4, rewardGold: 500, rewardExp: 500 },
2: { name: "Void Tyrant", minLevel: 24, hp: 1050, atk: 48, def: 4, critRes: 7, rewardGold: 750, rewardExp: 1000 },
3: { name: "Abyss Behemoth", minLevel: 28, hp: 1450, atk: 58, def: 6, critRes: 10, rewardGold: 1100, rewardExp: 1600 },
4: { name: "Hellfire Warden", minLevel: 33, hp: 1900, atk: 70, def: 8, critRes: 12, rewardGold: 1500, rewardExp: 2400 },
5: { name: "World Eater", minLevel: 40, hp: 2600, atk: 85, def: 12, critRes: 15, rewardGold: 2100, rewardExp: 3400 },
6: { name: "Chrono Ravager", minLevel: 45, hp: 3300, atk: 98, def: 15, critRes: 17, rewardGold: 2800, rewardExp: 4600 },
7: { name: "Nether Leviathan", minLevel: 50, hp: 4200, atk: 112, def: 18, critRes: 20, rewardGold: 3600, rewardExp: 6200 },
8: { name: "Astral Juggernaut", minLevel: 55, hp: 5200, atk: 127, def: 22, critRes: 23, rewardGold: 4600, rewardExp: 8200 },
9: { name: "Eclipse Monarch", minLevel: 60, hp: 6400, atk: 145, def: 26, critRes: 26, rewardGold: 5800, rewardExp: 10800 },
10: { name: "Origin Devourer", minLevel: 65, hp: 7800, atk: 165, def: 30, critRes: 30, rewardGold: 7200, rewardExp: 14000 }
}

function formatRaidList() {
return Object.keys(bosses).map((id) => {
let b = bosses[id]
return `Lv.${id} - ${b.name}\nReq Lv ${b.minLevel} | HP ${b.hp} | ATK ${b.atk} | DEF ${b.def} | CritRes ${b.critRes}%\nReward: +${b.rewardGold} Gold | +${b.rewardExp} EXP`
}).join('\n\n')
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let player = db[sender]
if (typeof player.level !== 'number') player.level = 1
if (typeof player.lastRaid !== 'number') player.lastRaid = 0
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.str !== 'number') player.str = 5
if (typeof player.agi !== 'number') player.agi = 5
if (typeof player.int !== 'number') player.int = 5
if (typeof player.toughness !== 'number') player.toughness = 0
if (typeof player.gold !== 'number') player.gold = 0
if (typeof player.exp !== 'number') player.exp = 0
if (!Array.isArray(player.inventory)) player.inventory = []
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
if (player.accessory === undefined) player.accessory = null
if (!player.maid || typeof player.maid !== 'object') player.maid = { owned: false, active: false, autoFix: true, autoHeal: true }
if (typeof player.maid.owned !== 'boolean') player.maid.owned = false
if (typeof player.maid.active !== 'boolean') player.maid.active = false
ensureDurabilityState(player)
ensureEnhanceState(player)
normalizeAccessories(player)
ensureRoleState(player)
ensurePetState(player)

let firstArg = (args[0] || '').toLowerCase()
if (firstArg === 'list') {
return m.reply(`=== RAID LIST ===\n\n${formatRaidList()}\n\nGunakan: .raid <level>\nTips: .raid test untuk test damage.`)
}
if (firstArg === 'test') firstArg = '0'

if (player.level < 20 && firstArg !== '0') return m.reply("Raid hanya untuk level 20+ (kecuali .raid test).")

let now = Date.now()
let cooldown = firstArg === '0' ? (2 * 60 * 1000) : (15 * 60 * 1000)
if (now - player.lastRaid < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastRaid)) / 1000)
let menit = Math.ceil(sisa / 60)
return m.reply(`Raid cooldown, tunggu ${menit} menit lagi.`)
}

let lv = parseInt(firstArg || "1")
if (!bosses[lv]) {
return m.reply(`Pilih level raid yang valid.\n\n${formatRaidList()}\n\nTips: .raid test untuk test damage.`)
}

let boss = bosses[lv]
if (player.level < boss.minLevel) {
return m.reply(`Raid Lv.${lv} butuh minimal level ${boss.minLevel}.`)
}

let weaponAtk = 0
let armorDef = 0
let armorTough = 0
let accessoryBonus = getAccessoryBonuses(player)

if (player.weapon && itemDB[player.weapon]) {
ensureItemDurability(player, player.weapon)
weaponAtk = getWeaponAtk(player)
}
if (player.armor && itemDB[player.armor]) {
ensureItemDurability(player, player.armor)
armorDef = getArmorDef(player)
armorTough = Number(itemDB[player.armor].tough || 0)
}

let bossHp = boss.hp
let rounds = 0
let logs = []
let roleBonus = getRoleBonuses(player)
let petBonus = getActivePetBonus(player)

let maidStatBuff = (player.maid.owned && player.maid.active) ? 10 : 0
let effectiveStr = Number(player.str || 0) + Number(accessoryBonus.str || 0) + maidStatBuff + Number(petBonus.str || 0)
let effectiveAgi = Number(player.agi || 0) + Number(accessoryBonus.agi || 0) + maidStatBuff + Number(petBonus.agi || 0)
let effectiveInt = Number(player.int || 0) + Number(accessoryBonus.int || 0) + maidStatBuff + Number(petBonus.int || 0)
let effectiveTough = Number(player.toughness || 0) + Number(accessoryBonus.tough || 0) + armorTough + maidStatBuff + Number(roleBonus.toughBonus || 0) + Number(petBonus.tough || 0)
let critChance = Math.min(50, (effectiveInt * 0.1) + Number(accessoryBonus.crit || 0))
let dodgeChance = Math.min(50, (effectiveAgi * 0.1) + Number(accessoryBonus.dodge || 0) + Number(roleBonus.dodgeBonus || 0) + Number(petBonus.dodge || 0))
let reductionChance = Math.min(30, (effectiveTough * 0.1) + Number(accessoryBonus.reduce || 0) + Number(roleBonus.reduceChanceBonus || 0) + Number(petBonus.reduce || 0))

while (bossHp > 0 && player.hp > 0 && rounds < 25) {
rounds += 1

let crit = Math.random() * 100 < Math.max(0, critChance - Number(boss.critRes || 0))
let base = weaponAtk > 0
? Math.max(1, Math.floor(weaponAtk * (1 + (effectiveStr / 120))))
: Math.max(1, Math.floor(1 + (effectiveStr * 0.3)))
if (Number(roleBonus.damageMult || 0) > 0) base = Math.max(1, Math.floor(base * (1 + Number(roleBonus.damageMult))))
let dmg = Math.max(1, base - Number(boss.def || 0))
if (crit) dmg = Math.floor(dmg * 1.5)
bossHp -= dmg
logs.push(`Ronde ${rounds}: kamu hit boss -${dmg}${crit ? " (CRIT)" : ""}`)
if (bossHp <= 0) break

let dodge = Math.random() * 100 < dodgeChance
if (dodge) {
logs.push(`Ronde ${rounds}: kamu dodge serangan boss`)
} else {
let reduced = Math.random() * 100 < reductionChance
let rawTaken = Math.max(1, boss.atk + Math.floor(Math.random() * 5))
let taken = Math.max(1, rawTaken - armorDef)
if (reduced) taken = Math.max(1, Math.floor(taken * 0.7))
player.hp -= taken
logs.push(`Ronde ${rounds}: boss hit kamu -${taken}${reduced ? " (REDUCE 30%)" : ""}${armorDef > 0 ? ` (DEF -${armorDef})` : ""}`)
}
}

let text = `=== RAID RESULT ===
Boss  : Lv.${lv} ${boss.name}
HP Boss: ${boss.hp}
HP You : ${Math.max(0, player.hp)}/${player.maxhp}
ATK ${weaponAtk} | DEF ${armorDef}
Acc1 ${player.accessories[0] && itemDB[player.accessories[0]] ? itemDB[player.accessories[0]].name : 'None'}
Acc2 ${player.accessories[1] && itemDB[player.accessories[1]] ? itemDB[player.accessories[1]].name : 'None'}
Maid Buff: ${maidStatBuff > 0 ? '+10 ALL' : 'OFF'}

--------------
Battle Log:
${logs.slice(0, 8).join('\n')}${logs.length > 8 ? '\n...' : ''}`

if (bossHp <= 0) {
player.gold += boss.rewardGold
let rewardExp = applyExpRoleBonus(boss.rewardExp, player)
player.exp += rewardExp
text += `\n\n--------------\nWIN\n+${boss.rewardGold} Gold\n+${rewardExp} EXP\nDrop: Tidak ada`
let lvResult = levelUp(player)
if (lvResult) {
let g = lvResult.gains
let gainText = []
if (g.str) gainText.push(`STR +${g.str}`)
if (g.agi) gainText.push(`AGI +${g.agi}`)
if (g.int) gainText.push(`INT +${g.int}`)
if (g.toughness) gainText.push(`TOUGH +${g.toughness}`)
text += `\nLEVEL UP\nLevel: ${player.level}\nBonus: ${gainText.join(', ')}`
}
} else {
let penalty = Math.min(player.gold, 80)
player.gold -= penalty
player.hp = 1
text += `\n\n--------------\nLOSE\nPenalty: -${penalty} Gold\nHP jadi 1\nDrop: Tidak ada`

if (Math.random() * 100 < 55) {
let salvageRoll = Math.random() * 100
if (salvageRoll < 40) {
let salvageExp = applyExpRoleBonus(Math.max(12, Math.floor((Number(boss.rewardExp || 0) || 100) * 0.2)), player)
player.exp += salvageExp
text += `\nSalvage: +${salvageExp} EXP`
let lvResult = levelUp(player)
if (lvResult) {
let g = lvResult.gains
let gainText = []
if (g.str) gainText.push(`STR +${g.str}`)
if (g.agi) gainText.push(`AGI +${g.agi}`)
if (g.int) gainText.push(`INT +${g.int}`)
if (g.toughness) gainText.push(`TOUGH +${g.toughness}`)
text += `\nLEVEL UP!\nLevel sekarang: ${player.level}\nBonus stat: ${gainText.join(', ')}`
}
} else if (salvageRoll < 75) {
let salvageGold = Math.max(15, Math.floor((Number(boss.rewardGold || 0) || 100) * 0.2))
player.gold += salvageGold
text += `\nSalvage: +${salvageGold} Gold`
} else {
let salvageItem = RAID_SALVAGE_POOL[Math.floor(Math.random() * RAID_SALVAGE_POOL.length)]
player.inventory.push(salvageItem)
let itemName = itemDB[salvageItem] ? itemDB[salvageItem].name : salvageItem
text += `\nSalvage: +1 ${itemName}`
}
}
}

if (player.weapon) {
let w = useDurability(player, player.weapon, 2)
if (w.broken) text += `\nSenjata rusak!`
}
if (player.armor) {
let a = useDurability(player, player.armor, 2)
if (a.broken) text += `\nArmor rusak!`
}

player.lastRaid = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)
}
