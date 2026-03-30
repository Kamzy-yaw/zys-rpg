const fs = require('fs')
const monster = require('../database/monster.json')
const areaDB = require('../database/area.json')
const itemDB = require('../database/item.json')
const questDB = require('../database/quest.json')
const achievementDB = require('../database/achievement.json')
const levelUp = require('../system/level')
const dropItem = require('../system/drop')
const { ensureDurabilityState, ensureItemDurability, useDurability, getDurability } = require('../system/equipment')
const { ensureEnhanceState, getWeaponAtk, getArmorDef, getAccessoryBonuses, normalizeAccessories } = require('../system/gearstats')
const { getQuestDailyKeyWIB } = require('../system/questreset')
const { ensureAchievementState, incrementStat, evaluateAchievements } = require('../system/achievement')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (!db[sender]) {
return m.reply("Bikin karakter dulu pakai .start")
}

let player = db[sender]
if (typeof player.lastHunt !== 'number') player.lastHunt = 0
if (!Array.isArray(player.inventory)) player.inventory = []
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
if (player.accessory === undefined) player.accessory = null
if (typeof player.toughness !== 'number') player.toughness = 0
ensureEnhanceState(player)
normalizeAccessories(player)
ensureAchievementState(player)
if (!player.maid || typeof player.maid !== 'object') {
player.maid = { owned: false, active: false, autoFix: true, autoHeal: true }
}
if (typeof player.maid.owned !== 'boolean') player.maid.owned = false
if (typeof player.maid.active !== 'boolean') player.maid.active = false
if (typeof player.maid.autoFix !== 'boolean') player.maid.autoFix = true
if (typeof player.maid.autoHeal !== 'boolean') player.maid.autoHeal = true
ensureDurabilityState(player)
if (!player.area || !areaDB[player.area]) player.area = "field"
if (!player.quest || typeof player.quest !== 'object') player.quest = {}
// migrate format lama -> format quest baru
if (player.quest.id && !player.quest.active) {
player.quest.active = player.quest.id
if (typeof player.quest.completed === 'number') {
player.quest.completed = { [player.quest.id]: player.quest.completed }
}
delete player.quest.id
}
if (typeof player.quest.completed !== 'object' || player.quest.completed === null || Array.isArray(player.quest.completed)) {
player.quest.completed = {}
}
if (player.quest.active && !questDB[player.quest.active]) player.quest.active = null
let questDailyKey = getQuestDailyKeyWIB()
if (player.quest.dailyKey !== questDailyKey) {
player.quest.completed = {}
player.quest.dailyKey = questDailyKey
}
if (typeof player.quest.progress !== 'number') player.quest.progress = 0
if (typeof player.quest.claimable !== 'boolean') player.quest.claimable = false
let now = Date.now()
let cooldown = 20000

if (now - player.lastHunt < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastHunt)) / 1000)
return m.reply(`Kamu capek, tunggu ${sisa} detik lagi.`)
}

let area = areaDB[player.area]
let monsterList = area.monsters
let pick = monsterList[Math.floor(Math.random() * monsterList.length)]
let mob = monster[pick]
incrementStat(player, 'hunts', 1)

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

if (typeof player.hp !== 'number') player.hp = player.maxhp

let mobHP = mob.hp
let rounds = 0
let battleLog = []

let maidStatBuff = (player.maid.owned && player.maid.active) ? 10 : 0
let effectiveStr = Number(player.str || 0) + Number(accessoryBonus.str || 0) + maidStatBuff
let effectiveAgi = Number(player.agi || 0) + Number(accessoryBonus.agi || 0) + maidStatBuff
let effectiveInt = Number(player.int || 0) + Number(accessoryBonus.int || 0) + maidStatBuff
let effectiveTough = Number(player.toughness || 0) + Number(accessoryBonus.tough || 0) + armorTough + maidStatBuff

let critChance = Math.min(50, (effectiveInt * 0.1) + Number(accessoryBonus.crit || 0))
let dodgeChance = Math.min(50, (effectiveAgi * 0.1) + Number(accessoryBonus.dodge || 0))
let reductionChance = Math.min(25, (effectiveTough * 0.1) + Number(accessoryBonus.reduce || 0))

while (mobHP > 0 && player.hp > 0 && rounds < 20) {
rounds += 1

let isCrit = Math.random() * 100 < critChance
let strValue = effectiveStr
let basePlayerDamage = weaponAtk > 0
? Math.max(1, Math.floor(weaponAtk * (1 + (strValue / 120))))
: Math.max(1, Math.floor(1 + (strValue * 0.3)))
let playerDamage = isCrit ? Math.floor(basePlayerDamage * 1.5) : basePlayerDamage
mobHP -= playerDamage
battleLog.push(`Ronde ${rounds}: kamu hit ${mob.name} -${playerDamage} HP${isCrit ? " (CRIT!)" : ""}`)

if (mobHP <= 0) break

let dodged = Math.random() * 100 < dodgeChance

if (dodged) {
battleLog.push(`Ronde ${rounds}: kamu menghindar! (${mob.name} miss)`)
} else {
let reduced = Math.random() * 100 < reductionChance
let rawMobDamage = Math.max(1, mob.atk + Math.floor(Math.random() * 4) - 1)
let mobDamage = Math.max(1, rawMobDamage - armorDef)
if (reduced) mobDamage = Math.max(1, Math.floor(mobDamage * 0.7))
player.hp -= mobDamage
battleLog.push(`Ronde ${rounds}: ${mob.name} balas hit kamu -${mobDamage} HP${reduced ? " (REDUCE 30%)" : ""}${armorDef > 0 ? ` (DEF -${armorDef})` : ""}`)
}
}

let text = `\u2694\uFE0F Kamu bertemu ${mob.name} di ${area.name}
HP Monster: ${mob.hp}
HP Kamu: ${player.hp < 0 ? 0 : player.hp}/${player.maxhp}
Combat Stats:
ATK Senjata: ${weaponAtk}
DEF Armor: ${armorDef}
Crit: ${critChance.toFixed(1)}% | Dodge: ${dodgeChance.toFixed(1)}% | Reduce: ${reductionChance.toFixed(1)}%
Accessory 1: ${player.accessories[0] && itemDB[player.accessories[0]] ? itemDB[player.accessories[0]].name : 'None'}
Accessory 2: ${player.accessories[1] && itemDB[player.accessories[1]] ? itemDB[player.accessories[1]].name : 'None'}
Maid Buff: ${maidStatBuff > 0 ? '+10 ALL STAT' : 'OFF'}
`

let shortLog = battleLog.slice(0, 6).join("\n")
if (shortLog) {
text += `\n\n${shortLog}`
if (battleLog.length > 6) text += "\n..."
}

if (mobHP <= 0) {
incrementStat(player, 'monstersKilled', 1)
let rewardExp = Number(mob.exp || 0)
let rewardGold = Number(mob.gold || 0)
let bonusResource = null
if (Number(mob.rarity || 99) <= 3) {
rewardGold = Math.floor(rewardGold * 0.6)
let rarePool = ['ore_mythril', 'ore_adamantite', 'ore_dragon_steel', 'shadow_crystal', 'spirit_gem', 'ancient_crystal', 'void_stone']
bonusResource = rarePool[Math.floor(Math.random() * rarePool.length)]
player.inventory.push(bonusResource)
}

player.exp += rewardExp
player.gold += rewardGold

text += `

\uD83C\uDF89 Monster kalah!
Reward:
+${rewardExp} EXP
+${rewardGold} Gold`

if (bonusResource) {
let resName = itemDB[bonusResource] ? itemDB[bonusResource].name : bonusResource
text += `\nResource Bonus:\n+ 1 ${resName}`
}

let item = dropItem(mob)

if (item) {

player.inventory.push(item)
ensureItemDurability(player, item)
let itemName = itemDB[item] ? itemDB[item].name : item

text += `

\uD83C\uDF81 Kamu mendapatkan item!
Drop:
+ 1 ${itemName}`
} else {
text += `\n\nDrop:\nTidak ada`
}

if (player.quest.active && questDB[player.quest.active]) {
let quest = questDB[player.quest.active]

if (pick === quest.target) {
if (!player.quest.claimable) {
player.quest.progress += 1
if (player.quest.progress > quest.amount) player.quest.progress = quest.amount

text += `

\uD83D\uDCDC Progress Quest:
${quest.name} (${player.quest.progress}/${quest.amount})`

if (player.quest.progress >= quest.amount && !player.quest.claimable) {
player.quest.claimable = true

text += `

\u2705 Quest selesai!
${quest.name}
Ketik .claim untuk ambil reward.`
}
}
}
}

let lvResult = levelUp(player)
if (lvResult) {
let g = lvResult.gains
let gainText = []
if (g.str) gainText.push(`STR +${g.str}`)
if (g.agi) gainText.push(`AGI +${g.agi}`)
if (g.int) gainText.push(`INT +${g.int}`)
if (g.toughness) gainText.push(`TOUGH +${g.toughness}`)

text += `

\u2728 LEVEL UP!

Level sekarang: ${player.level}
HP: ${player.maxhp}
Bonus stat: ${gainText.join(", ")}`
}
} else {
let penalty = Math.min(player.gold, Math.floor(player.gold * 0.1))
player.gold -= penalty
player.hp = player.maxhp

text += `

\uD83D\uDC80 Kamu kalah dari ${mob.name}.
Reward:
-${penalty} Gold
HP dipulihkan ke ${player.maxhp}.`
}

if (player.weapon) {
let activeWeapon = player.weapon
let w = useDurability(player, activeWeapon, 1)
if (w.broken) text += `\n\n\u26A0\uFE0F Senjatamu rusak dan terlepas!`
else {
let wd = getDurability(player, activeWeapon)
if (wd) text += `\n\nDurability senjata: ${wd.current}/${wd.max}`
}
}

if (player.armor) {
let activeArmor = player.armor
let a = useDurability(player, activeArmor, 1)
if (a.broken) text += `\n\n\u26A0\uFE0F Armor-mu rusak dan terlepas!`
else {
let ad = getDurability(player, activeArmor)
if (ad) text += `\nDurability armor: ${ad.current}/${ad.max}`
}
}

if (player.maid.owned && player.maid.active) {
let maidLogs = []
let hpLow = Number(player.hp) <= Math.floor(Number(player.maxhp) * 0.5)
let weaponNeedFix = !!(player.weapon && itemDB[player.weapon] && itemDB[player.weapon].durability && player.durability[player.weapon] < Number(itemDB[player.weapon].durability))
let armorNeedFix = !!(player.armor && itemDB[player.armor] && itemDB[player.armor].durability && player.durability[player.armor] < Number(itemDB[player.armor].durability))
let gearNeedFix = weaponNeedFix || armorNeedFix

if (player.maid.autoFix && hpLow && gearNeedFix && player.gold >= 100) {
let fixedAny = false
if (player.weapon && itemDB[player.weapon] && itemDB[player.weapon].durability) {
player.durability[player.weapon] = Number(itemDB[player.weapon].durability)
fixedAny = true
}
if (player.armor && itemDB[player.armor] && itemDB[player.armor].durability) {
player.durability[player.armor] = Number(itemDB[player.armor].durability)
fixedAny = true
}
if (fixedAny) {
player.gold -= 100
maidLogs.push("Fix gear: -100 Gold")
}
}
if (player.maid.autoHeal && hpLow && player.gold >= 150) {
player.gold -= 150
player.hp = player.maxhp
maidLogs.push("Heal full: -150 Gold")
}
if (maidLogs.length) text += `\n\nMaid Service Aktif:\n${maidLogs.join('\n')}`
}

let unlocked = evaluateAchievements(player, achievementDB)
if (unlocked.length) {
let unlockText = unlocked.map((x) => `- ${x.name}${x.rewardTitle ? ` (Title: ${x.rewardTitle})` : ''}`).join('\n')
text += `\n\n🏆 Achievement Unlocked:\n${unlockText}`
}

player.lastHunt = now

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(text)

}
