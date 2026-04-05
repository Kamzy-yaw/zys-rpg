const fs = require('fs')
const itemDB = require('../database/item.json')
const levelUp = require('../system/level')
const { ensureDurabilityState, ensureItemDurability, useDurability } = require('../system/equipment')
const { ensureEnhanceState, getWeaponAtk, getArmorDef, getAccessoryBonuses, normalizeAccessories } = require('../system/gearstats')
const { getQuestDailyKeyWIB } = require('../system/questreset')
const { ensureAchievementState, incrementStat, evaluateAchievements } = require('../system/achievement')
const { ensureRoleState, getRoleBonuses, applyExpRoleBonus } = require('../system/role')
const { ensurePetState, getActivePetBonus } = require('../system/pet')
const achievementDB = require('../database/achievement.json')
const DUNGEON_SALVAGE_POOL = ['hp_potion', 'big_hp_potion', 'crystal_shard', 'ore_gold', 'fisherman_thread']

function rand(min, max) {
return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatCooldown(seconds) {
let s = Math.max(0, Number(seconds || 0))
let h = Math.floor(s / 3600)
let m = Math.floor((s % 3600) / 60)
let r = s % 60
if (h > 0) return `${h} jam ${m} menit`
if (m > 0) return `${m} menit ${r} detik`
return `${r} detik`
}

function getExpDungeonConfig(level) {
if (level >= 60) {
return {
cooldownMs: 70000,
floors: 5,
hpScale: 8.0,
atkScale: 0.75,
defScale: 0.16,
rewardExpBase: 340,
rewardExpScale: 15,
rewardGoldBase: 36,
rewardGoldScale: 2
}
}
if (level >= 40) {
return {
cooldownMs: 60000,
floors: 4,
hpScale: 7.0,
atkScale: 0.65,
defScale: 0.14,
rewardExpBase: 260,
rewardExpScale: 12,
rewardGoldBase: 30,
rewardGoldScale: 1.8
}
}
return {
cooldownMs: 45000,
floors: 3,
hpScale: 6.0,
atkScale: 0.55,
defScale: 0.12,
rewardExpBase: 190,
rewardExpScale: 9,
rewardGoldBase: 24,
rewardGoldScale: 1.4
}
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Karakter belum ada.\nKetik .start dulu ya.')

let player = db[sender]
if (typeof player.level !== 'number') player.level = 1
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.str !== 'number') player.str = 5
if (typeof player.agi !== 'number') player.agi = 5
if (typeof player.int !== 'number') player.int = 5
if (typeof player.toughness !== 'number') player.toughness = 0
if (typeof player.gold !== 'number') player.gold = 0
if (typeof player.exp !== 'number') player.exp = 0
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.lastDungeon !== 'number') player.lastDungeon = 0
if (typeof player.lastExpDungeon !== 'number') player.lastExpDungeon = 0
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
if (!player.maid || typeof player.maid !== 'object') player.maid = { owned: false, active: false, autoFix: true, autoHeal: true }
if (typeof player.maid.owned !== 'boolean') player.maid.owned = false
if (typeof player.maid.active !== 'boolean') player.maid.active = false
if (!player.dungeon || typeof player.dungeon !== 'object') player.dungeon = { dailyKey: '', cleared: false, expCleared: false }
if (typeof player.dungeon.expCleared !== 'boolean') player.dungeon.expCleared = false

ensureDurabilityState(player)
ensureEnhanceState(player)
normalizeAccessories(player)
ensureAchievementState(player)
ensureRoleState(player)
ensurePetState(player)

let key = getQuestDailyKeyWIB()
if (player.dungeon.dailyKey !== key) {
player.dungeon.dailyKey = key
player.dungeon.cleared = false
}

let mode = (args && args[0] ? String(args[0]).toLowerCase() : '')
if (mode && !['exp', 'daily'].includes(mode)) {
return m.reply('Mode dungeon tidak valid.\nPakai: .dungeon (harian) atau .dungeon exp')
}
let isExpMode = mode === 'exp'
let expCfg = getExpDungeonConfig(player.level)

if (!isExpMode && player.dungeon.cleared) {
return m.reply('Dungeon harian sudah kamu clear.\nReset tiap hari jam 07:00 WIB.')
}
let now = Date.now()
let cooldown = isExpMode ? (2 * 60 * 60 * 1000) : 30000
let lastRun = isExpMode ? player.lastExpDungeon : player.lastDungeon
if (now - lastRun < cooldown) {
let sisa = Math.ceil((cooldown - (now - lastRun)) / 1000)
return m.reply(`Dungeon cooldown, tunggu ${formatCooldown(sisa)} lagi.`)
}

let weaponAtk = 0
let armorDef = 0
let armorTough = 0
if (player.weapon && itemDB[player.weapon]) {
ensureItemDurability(player, player.weapon)
weaponAtk = getWeaponAtk(player)
}
if (player.armor && itemDB[player.armor]) {
ensureItemDurability(player, player.armor)
armorDef = getArmorDef(player)
armorTough = Number(itemDB[player.armor].tough || 0)
}
let acc = getAccessoryBonuses(player)
let maidBuff = (player.maid.owned && player.maid.active) ? 10 : 0
let roleBonus = getRoleBonuses(player)
let petBonus = getActivePetBonus(player)
let effectiveStr = Number(player.str || 0) + Number(acc.str || 0) + maidBuff + Number(petBonus.str || 0)
let effectiveAgi = Number(player.agi || 0) + Number(acc.agi || 0) + maidBuff + Number(petBonus.agi || 0)
let effectiveInt = Number(player.int || 0) + Number(acc.int || 0) + maidBuff + Number(petBonus.int || 0)
let effectiveTough = Number(player.toughness || 0) + Number(acc.tough || 0) + armorTough + maidBuff + Number(roleBonus.toughBonus || 0) + Number(petBonus.tough || 0)
let critChance = Math.min(50, (effectiveInt * 0.1) + Number(acc.crit || 0))
let dodgeChance = Math.min(50, (effectiveAgi * 0.1) + Number(acc.dodge || 0) + Number(roleBonus.dodgeBonus || 0) + Number(petBonus.dodge || 0))
let reduceChance = Math.min(30, (effectiveTough * 0.1) + Number(acc.reduce || 0) + Number(roleBonus.reduceChanceBonus || 0) + Number(petBonus.reduce || 0))

incrementStat(player, 'dungeonRuns', 1)

let floors = isExpMode ? expCfg.floors : 3
let logs = []
let cleared = true

for (let floor = 1; floor <= floors; floor++) {
let enemyName = isExpMode ? `Echo Warden ${floor}` : `Guardian Lantai ${floor}`
let enemyHp = isExpMode
? 90 + (floor * 58) + Math.floor(player.level * expCfg.hpScale)
: 70 + (floor * 45) + Math.floor(player.level * 6.5)
let enemyAtk = isExpMode
? 13 + (floor * 8) + Math.floor(player.level * expCfg.atkScale)
: 10 + (floor * 6) + Math.floor(player.level * 0.6)
let enemyDef = isExpMode
? 2 + floor + Math.floor(player.level * expCfg.defScale)
: 1 + floor + Math.floor(player.level * 0.12)
let turn = 0

logs.push(`Lantai ${floor}: ${enemyName} (HP ${enemyHp} | ATK ${enemyAtk} | DEF ${enemyDef})`)

while (enemyHp > 0 && player.hp > 0 && turn < 20) {
turn += 1
let crit = Math.random() * 100 < critChance
let base = weaponAtk > 0
? Math.max(1, Math.floor(weaponAtk * (1 + (effectiveStr / 120))))
: Math.max(1, Math.floor(1 + (effectiveStr * 0.3)))
if (Number(roleBonus.damageMult || 0) > 0) base = Math.max(1, Math.floor(base * (1 + Number(roleBonus.damageMult))))
let dmg = Math.max(1, base - enemyDef)
if (crit) dmg = Math.floor(dmg * 1.5)
enemyHp -= dmg
if (turn <= 2) logs.push(`- Kamu hit ${enemyName} -${dmg}${crit ? ' (CRIT)' : ''}`)
if (enemyHp <= 0) break

let dodged = Math.random() * 100 < dodgeChance
if (dodged) {
if (turn <= 2) logs.push('- Kamu menghindar')
continue
}
let reduced = Math.random() * 100 < reduceChance
let enemyDmg = Math.max(1, enemyAtk + rand(0, 3) - armorDef)
if (reduced) enemyDmg = Math.max(1, Math.floor(enemyDmg * 0.7))
player.hp -= enemyDmg
if (turn <= 2) logs.push(`- ${enemyName} hit kamu -${enemyDmg}${reduced ? ' (REDUCE)' : ''}`)
}

if (player.hp <= 0) {
cleared = false
logs.push(`Gagal di lantai ${floor}.`)
break
}

logs.push(`Lantai ${floor} clear.`)
}

let text = `${isExpMode ? '=== DUNGEON EXP ===' : '=== DUNGEON HARIAN ==='}\n\nBattle Log:\n${logs.slice(0, 12).join('\n')}`
if (logs.length > 12) text += '\n...'

if (cleared) {
let rewardGold = isExpMode
? Math.floor(expCfg.rewardGoldBase + (player.level * expCfg.rewardGoldScale))
: (120 + (player.level * 8))
let rewardExp = isExpMode
? Math.floor(expCfg.rewardExpBase + (player.level * expCfg.rewardExpScale))
: (150 + (player.level * 10))
rewardExp = applyExpRoleBonus(rewardExp, player)
player.gold += rewardGold
player.exp += rewardExp
if (!isExpMode) player.dungeon.cleared = true
incrementStat(player, 'dungeonClears', 1)

text += `\n\n--------------\nCLEAR\n+${rewardExp} EXP\n+${rewardGold} Gold`
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
player.hp = 1
let penalty = isExpMode
? Math.min(player.gold, Math.floor(player.gold * 0.01))
: Math.min(player.gold, Math.floor(player.gold * 0.03))
player.gold -= penalty
text += `\n\n--------------\nFAILED\nPenalty: -${penalty} Gold\nHP jadi 1`

if (Math.random() * 100 < 60) {
let salvageRoll = Math.random() * 100
if (salvageRoll < 45) {
let salvageExp = isExpMode
? Math.max(8, Math.floor((expCfg.rewardExpBase + (player.level * expCfg.rewardExpScale)) * 0.18))
: Math.max(10, Math.floor((150 + (player.level * 10)) * 0.2))
salvageExp = applyExpRoleBonus(salvageExp, player)
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
text += `\nLEVEL UP!\nLevel: ${player.level}\nBonus: ${gainText.join(', ')}`
}
} else if (salvageRoll < 80) {
let salvageGold = isExpMode
? Math.max(8, Math.floor((expCfg.rewardGoldBase + (player.level * expCfg.rewardGoldScale)) * 0.25))
: Math.max(12, Math.floor((120 + (player.level * 8)) * 0.2))
player.gold += salvageGold
text += `\nSalvage: +${salvageGold} Gold`
} else {
let salvageItem = DUNGEON_SALVAGE_POOL[Math.floor(Math.random() * DUNGEON_SALVAGE_POOL.length)]
player.inventory.push(salvageItem)
let itemName = itemDB[salvageItem] ? itemDB[salvageItem].name : salvageItem
text += `\nSalvage: +1 ${itemName}`
}
}
}

if (player.weapon) useDurability(player, player.weapon, 2)
if (player.armor) useDurability(player, player.armor, 2)

let unlocked = evaluateAchievements(player, achievementDB)
if (unlocked.length) {
let unlockText = unlocked.map((x) => `- ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`).join('\n')
text += `\n\n--------------\nAchievement Unlocked:\n${unlockText}`
}

if (isExpMode) player.lastExpDungeon = now
else player.lastDungeon = now

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(text)
}
