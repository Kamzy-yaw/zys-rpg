const fs = require('fs')
const itemDB = require('../database/item.json')
const levelUp = require('../system/level')
const { ensureDurabilityState, ensureItemDurability, useDurability } = require('../system/equipment')
const { ensureEnhanceState, getWeaponAtk, getArmorDef, getAccessoryBonuses, normalizeAccessories } = require('../system/gearstats')
const { getQuestDailyKeyWIB } = require('../system/questreset')
const { ensureAchievementState, incrementStat, evaluateAchievements } = require('../system/achievement')
const achievementDB = require('../database/achievement.json')

function rand(min, max) {
return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Karakter belum ada.\nKetik .start dulu ya.")

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
if (typeof player.lastDungeon !== 'number') player.lastDungeon = 0
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
if (!player.maid || typeof player.maid !== 'object') player.maid = { owned: false, active: false, autoFix: true, autoHeal: true }
if (typeof player.maid.owned !== 'boolean') player.maid.owned = false
if (typeof player.maid.active !== 'boolean') player.maid.active = false
if (!player.dungeon || typeof player.dungeon !== 'object') player.dungeon = { dailyKey: '', cleared: false }

ensureDurabilityState(player)
ensureEnhanceState(player)
normalizeAccessories(player)
ensureAchievementState(player)

let key = getQuestDailyKeyWIB()
if (player.dungeon.dailyKey !== key) {
player.dungeon.dailyKey = key
player.dungeon.cleared = false
}

if (player.dungeon.cleared) {
return m.reply("Dungeon harian sudah kamu clear.\nReset tiap hari jam 07:00 WIB.")
}

let now = Date.now()
let cooldown = 30000
if (now - player.lastDungeon < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastDungeon)) / 1000)
return m.reply(`Dungeon cooldown, tunggu ${sisa} detik lagi.`)
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
let effectiveStr = Number(player.str || 0) + Number(acc.str || 0) + maidBuff
let effectiveAgi = Number(player.agi || 0) + Number(acc.agi || 0) + maidBuff
let effectiveInt = Number(player.int || 0) + Number(acc.int || 0) + maidBuff
let effectiveTough = Number(player.toughness || 0) + Number(acc.tough || 0) + armorTough + maidBuff
let critChance = Math.min(50, (effectiveInt * 0.1) + Number(acc.crit || 0))
let dodgeChance = Math.min(50, (effectiveAgi * 0.1) + Number(acc.dodge || 0))
let reduceChance = Math.min(25, (effectiveTough * 0.1) + Number(acc.reduce || 0))

incrementStat(player, 'dungeonRuns', 1)

let floors = 3
let logs = []
let cleared = true

for (let floor = 1; floor <= floors; floor++) {
let enemyName = `Guardian Lantai ${floor}`
let enemyHp = 70 + (floor * 45) + Math.floor(player.level * 6.5)
let enemyAtk = 10 + (floor * 6) + Math.floor(player.level * 0.6)
let enemyDef = 1 + floor + Math.floor(player.level * 0.12)
let turn = 0

logs.push(`Lantai ${floor}: ${enemyName} (HP ${enemyHp} | ATK ${enemyAtk} | DEF ${enemyDef})`)

while (enemyHp > 0 && player.hp > 0 && turn < 20) {
turn += 1
let crit = Math.random() * 100 < critChance
let base = weaponAtk > 0
? Math.max(1, Math.floor(weaponAtk * (1 + (effectiveStr / 120))))
: Math.max(1, Math.floor(1 + (effectiveStr * 0.3)))
let dmg = Math.max(1, base - enemyDef)
if (crit) dmg = Math.floor(dmg * 1.5)
enemyHp -= dmg
if (turn <= 2) logs.push(`- Kamu hit ${enemyName} -${dmg}${crit ? ' (CRIT)' : ''}`)
if (enemyHp <= 0) break

let dodged = Math.random() * 100 < dodgeChance
if (dodged) {
if (turn <= 2) logs.push(`- Kamu menghindar`)
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
logs.push(`❌ Gagal di lantai ${floor}.`)
break
}

logs.push(`✅ Lantai ${floor} clear.`)
}

let text = `🏰 Dungeon Harian\n\n${logs.slice(0, 12).join('\n')}`
if (logs.length > 12) text += `\n...`

if (cleared) {
let rewardGold = 120 + (player.level * 8)
let rewardExp = 150 + (player.level * 10)
player.gold += rewardGold
player.exp += rewardExp
player.dungeon.cleared = true
incrementStat(player, 'dungeonClears', 1)

text += `\n\n🎉 Dungeon clear!\nReward:\n+${rewardExp} EXP\n+${rewardGold} Gold`
let lvResult = levelUp(player)
if (lvResult) {
let g = lvResult.gains
let gainText = []
if (g.str) gainText.push(`STR +${g.str}`)
if (g.agi) gainText.push(`AGI +${g.agi}`)
if (g.int) gainText.push(`INT +${g.int}`)
if (g.toughness) gainText.push(`TOUGH +${g.toughness}`)
text += `\n\n✨ LEVEL UP!\nLevel: ${player.level}\nBonus: ${gainText.join(', ')}`
}
} else {
player.hp = 1
let penalty = Math.min(player.gold, Math.floor(player.gold * 0.03))
player.gold -= penalty
text += `\n\n💀 Dungeon gagal.\nPenalty: -${penalty} Gold\nHP jadi 1`
}

if (player.weapon) useDurability(player, player.weapon, 2)
if (player.armor) useDurability(player, player.armor, 2)

let unlocked = evaluateAchievements(player, achievementDB)
if (unlocked.length) {
let unlockText = unlocked.map((x) => `- ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`).join('\n')
text += `\n\n🏆 Achievement Unlocked:\n${unlockText}`
}

player.lastDungeon = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(text)
}
