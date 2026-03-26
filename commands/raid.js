const fs = require('fs')
const itemDB = require('../database/item.json')
const levelUp = require('../system/level')
const { ensureDurabilityState, ensureItemDurability, useDurability } = require('../system/equipment')

const bosses = {
1: { name: "Ancient Colossus", hp: 420, atk: 34, rewardGold: 500, rewardExp: 500 },
2: { name: "Void Tyrant", hp: 620, atk: 46, rewardGold: 750, rewardExp: 1000 }
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

if (player.level < 20) return m.reply("Raid hanya untuk level 20+.")

let now = Date.now()
let cooldown = 5 * 60 * 1000
if (now - player.lastRaid < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastRaid)) / 1000)
return m.reply(`Raid cooldown, tunggu ${sisa} detik.`)
}

let lv = parseInt(args[0] || "1")
if (!bosses[lv]) lv = 1
let boss = bosses[lv]

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

while (bossHp > 0 && player.hp > 0 && rounds < 25) {
rounds += 1
let crit = Math.random() * 100 < Math.min(35, Math.floor(player.int * 1.5))
let dmg = Math.max(1, player.str + weaponAtk + Math.floor(Math.random() * 6))
if (crit) dmg = Math.floor(dmg * 1.5)
bossHp -= dmg
logs.push(`Ronde ${rounds}: kamu hit boss -${dmg}${crit ? " (CRIT)" : ""}`)
if (bossHp <= 0) break

let dodge = Math.random() * 100 < Math.min(30, Math.floor(player.agi * 1.2))
if (dodge) {
logs.push(`Ronde ${rounds}: kamu dodge serangan boss`)
} else {
let reduction = Math.floor((player.toughness + armorTough + armorDef) / 2)
let taken = Math.max(1, boss.atk + Math.floor(Math.random() * 5) - reduction)
player.hp -= taken
logs.push(`Ronde ${rounds}: boss hit kamu -${taken}`)
}
}

let text = `👹 Raid Lv.${lv}: ${boss.name}\nHP Boss: ${boss.hp}\nHP Kamu: ${Math.max(0, player.hp)}/${player.maxhp}\n\n${logs.slice(0, 8).join('\n')}${logs.length > 8 ? '\n...' : ''}`

if (bossHp <= 0) {
player.gold += boss.rewardGold
player.exp += boss.rewardExp
text += `\n\n🏆 Boss tumbang!\n+${boss.rewardGold} Gold\n+${boss.rewardExp} EXP`
if (levelUp(player)) {
text += `\n\n✨ LEVEL UP!\nLevel sekarang: ${player.level}`
}
} else {
let penalty = Math.min(player.gold, 80)
player.gold -= penalty
player.hp = 1
text += `\n\n💀 Raid gagal.\n-${penalty} Gold\nHP jadi 1`
}

if (player.weapon) {
let w = useDurability(player, player.weapon, 2)
if (w.broken) text += `\n⚠️ Senjata rusak!`
}
if (player.armor) {
let a = useDurability(player, player.armor, 2)
if (a.broken) text += `\n⚠️ Armor rusak!`
}

player.lastRaid = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
m.reply(text)
}
