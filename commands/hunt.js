const fs = require('fs')
const monster = require('../database/monster.json')
const areaDB = require('../database/area.json')
const itemDB = require('../database/item.json')
const questDB = require('../database/quest.json')
const levelUp = require('../system/level')
const dropItem = require('../system/drop')
const { ensureDurabilityState, ensureItemDurability, useDurability, getDurability } = require('../system/equipment')

function getQuestDailyKey() {
let d = new Date()
if (d.getHours() < 7) d.setDate(d.getDate() - 1)
d.setHours(7, 0, 0, 0)
let y = d.getFullYear()
let m = String(d.getMonth() + 1).padStart(2, '0')
let day = String(d.getDate()).padStart(2, '0')
return `${y}-${m}-${day}`
}

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
if (typeof player.toughness !== 'number') player.toughness = 0
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
let questDailyKey = getQuestDailyKey()
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

let weaponAtk = 0
let armorDef = 0
let armorTough = 0

if (player.weapon && itemDB[player.weapon]) {
ensureItemDurability(player, player.weapon)
weaponAtk = itemDB[player.weapon].atk
}
if (player.armor && itemDB[player.armor]) {
ensureItemDurability(player, player.armor)
armorDef = Number(itemDB[player.armor].def || 0)
armorTough = Number(itemDB[player.armor].tough || 0)
}

if (typeof player.hp !== 'number') player.hp = player.maxhp

let mobHP = mob.hp
let rounds = 0
let battleLog = []

let critChance = Math.min(50, Number(player.int || 0) * 0.1)
let dodgeChance = Math.min(50, Number(player.agi || 0) * 0.1)
let reductionChance = Math.min(25, (Number(player.toughness || 0) + armorTough) * 0.1)

while (mobHP > 0 && player.hp > 0 && rounds < 20) {
rounds += 1

let isCrit = Math.random() * 100 < critChance
let strValue = Number(player.str || 0)
let weaponBase = weaponAtk > 0
? (weaponAtk * (1 + (Math.min(strValue, 180) / 220)))
: (1 + (strValue * 0.5))
let statBonus = Math.floor(Math.max(0, strValue - 20) * 0.08)
let basePlayerDamage = Math.max(1, Math.floor(weaponBase) + statBonus + Math.floor(Math.random() * 4))
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
`

let shortLog = battleLog.slice(0, 6).join("\n")
if (shortLog) {
text += `\n\n${shortLog}`
if (battleLog.length > 6) text += "\n..."
}

if (mobHP <= 0) {

player.exp += mob.exp
player.gold += mob.gold

text += `

\uD83C\uDF89 Monster kalah!
Reward:
+${mob.exp} EXP
+${mob.gold} Gold`

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

player.lastHunt = now

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(text)

}
