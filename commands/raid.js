const fs = require('fs')
const itemDB = require('../database/item.json')
const levelUp = require('../system/level')
const { ensureDurabilityState, ensureItemDurability, useDurability } = require('../system/equipment')

const bosses = {
0: { name: "Training Titan", minLevel: 1, hp: 5000, atk: 18, def: 10, critRes: 20, rewardGold: 80, rewardExp: 120 },
1: { name: "Ancient Colossus", minLevel: 20, hp: 700, atk: 36, def: 2, critRes: 4, rewardGold: 500, rewardExp: 500 },
2: { name: "Void Tyrant", minLevel: 24, hp: 1050, atk: 48, def: 4, critRes: 7, rewardGold: 750, rewardExp: 1000 },
3: { name: "Abyss Behemoth", minLevel: 28, hp: 1450, atk: 58, def: 6, critRes: 10, rewardGold: 1100, rewardExp: 1600 },
4: { name: "Hellfire Warden", minLevel: 33, hp: 1900, atk: 70, def: 8, critRes: 12, rewardGold: 1500, rewardExp: 2400 },
5: { name: "World Eater", minLevel: 40, hp: 2600, atk: 85, def: 12, critRes: 15, rewardGold: 2100, rewardExp: 3400 }
}

function formatRaidList() {
return Object.keys(bosses).map((id) => {
let b = bosses[id]
return `Lv.${id} - ${b.name}\nReq Level: ${b.minLevel}\nHP: ${b.hp} | ATK: ${b.atk} | DEF: ${b.def} | CritRes: ${b.critRes}%\nReward: +${b.rewardGold} Gold, +${b.rewardExp} EXP`
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
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
ensureDurabilityState(player)

let firstArg = (args[0] || '').toLowerCase()
if (firstArg === 'list') {
return m.reply(`RAID LIST\n\n${formatRaidList()}\n\nPakai: .raid <level>\nTips: .raid test untuk test damage.`)
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

if (player.weapon && itemDB[player.weapon]) {
ensureItemDurability(player, player.weapon)
weaponAtk = Number(itemDB[player.weapon].atk || 0)
}
if (player.armor && itemDB[player.armor]) {
ensureItemDurability(player, player.armor)
armorDef = Number(itemDB[player.armor].def || 0)
armorTough = Number(itemDB[player.armor].tough || 0)
}

let bossHp = boss.hp
let rounds = 0
let logs = []

let critChance = Math.min(50, Number(player.int || 0) * 0.1)
let dodgeChance = Math.min(50, Number(player.agi || 0) * 0.1)
let reductionChance = Math.min(25, (Number(player.toughness || 0) + armorTough) * 0.1)

while (bossHp > 0 && player.hp > 0 && rounds < 25) {
rounds += 1

let crit = Math.random() * 100 < Math.max(0, critChance - Number(boss.critRes || 0))
let strValue = Number(player.str || 0)
let weaponBase = weaponAtk > 0
? (weaponAtk * (1 + (Math.min(strValue, 180) / 220)))
: (1 + (strValue * 0.5))
let statBonus = Math.floor(Math.max(0, strValue - 20) * 0.08)
let dmg = Math.max(1, Math.floor(weaponBase) + statBonus + Math.floor(Math.random() * 5) - Number(boss.def || 0))
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

let text = `Raid Lv.${lv}: ${boss.name}\nHP Boss: ${boss.hp}\nHP Kamu: ${Math.max(0, player.hp)}/${player.maxhp}\nStats: Weapon ATK ${weaponAtk} | Armor DEF ${armorDef}\n\n${logs.slice(0, 8).join('\n')}${logs.length > 8 ? '\n...' : ''}`

if (bossHp <= 0) {
player.gold += boss.rewardGold
player.exp += boss.rewardExp
text += `\n\nBoss tumbang!\nReward:\n+${boss.rewardGold} Gold\n+${boss.rewardExp} EXP\nDrop:\nTidak ada`
let lvResult = levelUp(player)
if (lvResult) {
let g = lvResult.gains
let gainText = []
if (g.str) gainText.push(`STR +${g.str}`)
if (g.agi) gainText.push(`AGI +${g.agi}`)
if (g.int) gainText.push(`INT +${g.int}`)
if (g.toughness) gainText.push(`TOUGH +${g.toughness}`)
text += `\n\nLEVEL UP!\nLevel sekarang: ${player.level}\nBonus stat: ${gainText.join(', ')}`
}
} else {
let penalty = Math.min(player.gold, 80)
player.gold -= penalty
player.hp = 1
text += `\n\nRaid gagal.\nReward:\n-${penalty} Gold\nHP jadi 1\nDrop:\nTidak ada`
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
