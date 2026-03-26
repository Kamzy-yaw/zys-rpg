const fs = require('fs')
const monster = require('../database/monster.json')
const areaDB = require('../database/area.json')
const itemDB = require('../database/item.json')
const questDB = require('../database/quest.json')
const levelUp = require('../system/level')
const dropItem = require('../system/drop')
const { ensureDurabilityState, ensureItemDurability, useDurability, getDurability } = require('../system/equipment')

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
if (typeof player.maidOwned !== 'boolean') player.maidOwned = false
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
let baseLevel = Number(mob.level ?? area.level ?? 1)
let playerLevel = Number(player.level || 1)
let scaledLevel = baseLevel
let levelDiff = 0

// Scaling hanya aktif kalau level player lebih tinggi dari base monster.
if (playerLevel > baseLevel) {
scaledLevel = Math.floor(baseLevel + (playerLevel - baseLevel) * 0.6)
levelDiff = Math.max(0, scaledLevel - baseLevel)
}
let mobHPMax = Math.max(1, Math.floor((Number(mob.hp || 1)) * (1 + levelDiff * 0.12)))
let mobAtkScaled = Math.max(1, Math.floor((Number(mob.atk || 1)) * (1 + levelDiff * 0.08)))
// DEF monster dibuat lebih ringan agar tidak men-lock damage player di 1.
let mobDefense = Math.max(1, Math.floor((scaledLevel * 0.25) + (mobHPMax / 260)))

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

let mobHP = mobHPMax
let rounds = 0
let battleLog = []

let critChance = Math.min(50, Number(player.int || 0) * 0.1)
let dodgeChance = Math.min(50, Number(player.agi || 0) * 0.1)
let reductionChance = Math.min(25, (Number(player.toughness || 0) + armorTough) * 0.1)

while (mobHP > 0 && player.hp > 0 && rounds < 20) {
rounds += 1

let isCrit = Math.random() * 100 < critChance
let strValue = Number(player.str || 0)
let baseFromWeapon = weaponAtk > 0
? (weaponAtk * (1 + (Math.min(strValue, 220) / 220)))
: (1 + (strValue * 0.25))
let strBonus = Math.floor(Math.min(strValue, 250) * 0.12)
let rawPlayerDamage = Math.max(1, Math.floor(baseFromWeapon) + strBonus + Math.floor(Math.random() * 4))
let playerDamage = Math.max(1, rawPlayerDamage - mobDefense)
if (isCrit) playerDamage = Math.floor(playerDamage * 1.35)
mobHP -= playerDamage
battleLog.push(`Ronde ${rounds}: kamu hit ${mob.name} -${playerDamage} HP${isCrit ? " (CRIT!)" : ""}`)

if (mobHP <= 0) break

let dodged = Math.random() * 100 < dodgeChance

if (dodged) {
battleLog.push(`Ronde ${rounds}: kamu menghindar! (${mob.name} miss)`)
} else {
let reduced = Math.random() * 100 < reductionChance
let mobDamage = Math.max(1, mobAtkScaled + Math.floor(Math.random() * 4) - 1 - armorDef)
if (reduced) mobDamage = Math.max(1, Math.floor(mobDamage * 0.7))
player.hp -= mobDamage
battleLog.push(`Ronde ${rounds}: ${mob.name} balas hit kamu -${mobDamage} HP${reduced ? " (REDUCE 30%)" : ""}${!reduced && armorDef > 0 ? ` (DEF -${armorDef})` : ""}`)
}
}

let text = `\u2694\uFE0F Kamu bertemu ${mob.name} di ${area.name}
Lv Monster: ${scaledLevel}
HP Monster: ${mobHPMax}
DEF Monster: ${mobDefense}
HP Kamu: ${player.hp < 0 ? 0 : player.hp}/${player.maxhp}
`

let shortLog = battleLog.slice(0, 6).join("\n")
if (shortLog) {
text += `\n\n${shortLog}`
if (battleLog.length > 6) text += "\n..."
}

if (mobHP <= 0) {

let rewardExp = Number(mob.exp || 0) + Math.max(0, Math.floor(levelDiff * 4))
let rewardGold = Number(mob.gold || 0) + Math.max(0, Math.floor(levelDiff * 1))
player.exp += rewardExp
player.gold += rewardGold

text += `

\uD83C\uDF89 Monster kalah!
Reward:
+${rewardExp} EXP
+${rewardGold} Gold`

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
let w = { broken: false }
if (Math.random() < 0.75) w = useDurability(player, activeWeapon, 1)
if (w.broken) text += `\n\n\u26A0\uFE0F Senjatamu rusak dan terlepas!`
else {
let wd = getDurability(player, activeWeapon)
if (wd) text += `\n\nDurability senjata: ${wd.current}/${wd.max}`
}
}

if (player.armor) {
let activeArmor = player.armor
let a = { broken: false }
if (Math.random() < 0.75) a = useDurability(player, activeArmor, 1)
if (a.broken) text += `\n\n\u26A0\uFE0F Armor-mu rusak dan terlepas!`
else {
let ad = getDurability(player, activeArmor)
if (ad) text += `\nDurability armor: ${ad.current}/${ad.max}`
}
}

if (player.maidOwned) {
let maidCost = 100
if (player.gold >= maidCost) {
player.gold -= maidCost
player.hp = player.maxhp
if (player.weapon && itemDB[player.weapon] && itemDB[player.weapon].durability) {
player.durability[player.weapon] = Number(itemDB[player.weapon].durability)
}
if (player.armor && itemDB[player.armor] && itemDB[player.armor].durability) {
player.durability[player.armor] = Number(itemDB[player.armor].durability)
}
text += `\n\nMaid service aktif: -${maidCost} Gold`
text += `\nHP dipulihkan penuh & gear aktif diperbaiki.`
} else {
text += `\n\nMaid standby: Gold kurang (butuh 100).`
}
}

player.lastHunt = now

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(text)

}
