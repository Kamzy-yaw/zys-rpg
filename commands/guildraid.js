const fs = require('fs')
const guildPath = './database/guild.json'
const itemDB = require('../database/item.json')
const { ensureEnhanceState, getWeaponAtk, getArmorDef } = require('../system/gearstats')

function loadGuild() {
if (!fs.existsSync(guildPath)) fs.writeFileSync(guildPath, JSON.stringify({}, null, 2))
return JSON.parse(fs.readFileSync(guildPath))
}

function saveGuild(db) {
fs.writeFileSync(guildPath, JSON.stringify(db, null, 2))
}

function memberPower(p) {
ensureEnhanceState(p)
let level = Number(p.level || 1)
let str = Number(p.str || 0)
let agi = Number(p.agi || 0)
let int = Number(p.int || 0)
let tough = Number(p.toughness || 0)
let wAtk = getWeaponAtk(p)
let aDef = getArmorDef(p)
return Math.floor((level * 3) + (wAtk * 6) + (aDef * 3) + (str * 1.2) + agi + (int * 0.8) + (tough * 1.1))
}

module.exports = async (m, { sender }) => {
let pdb = JSON.parse(fs.readFileSync('./database/player.json'))
if (!pdb[sender]) return m.reply("Bikin karakter dulu pakai .start")
let p = pdb[sender]
if (!p.guildId) return m.reply("Kamu belum join guild.")

let gdb = loadGuild()
let g = gdb[p.guildId]
if (!g) return m.reply("Data guild tidak ditemukan.")
if (g.leader !== sender) return m.reply("Hanya guild leader yang bisa memulai .guildraid")

if (!g.raid) g.raid = { level: 1, bossName: "Guild Colossus", maxHp: 12000, hp: 12000, lastRaid: 0 }
if (typeof g.raid.lastRaid !== 'number') g.raid.lastRaid = 0
if (!g.roles || typeof g.roles !== 'object') g.roles = {}
if (!g.contribution || typeof g.contribution !== 'object') g.contribution = {}

let now = Date.now()
let cooldown = 10 * 60 * 1000
if (now - g.raid.lastRaid < cooldown) {
let sisa = Math.ceil((cooldown - (now - g.raid.lastRaid)) / 1000)
return m.reply(`Guild raid cooldown. Tunggu ${sisa} detik lagi.`)
}

let totalPower = 0
let activeMembers = 0
let breakdown = []
for (let jid of g.members) {
if (!pdb[jid]) continue
let power = memberPower(pdb[jid])
totalPower += power
activeMembers += 1
breakdown.push({ jid, power })
if (!g.roles[jid]) g.roles[jid] = (jid === g.leader ? 'leader' : 'member')
if (typeof g.contribution[jid] !== 'number') g.contribution[jid] = 0
}

if (activeMembers === 0) return m.reply("Tidak ada member aktif di database.")

let multiplier = 0.8 + (Math.random() * 0.4)
let damage = Math.max(1, Math.floor(totalPower * multiplier))
g.raid.hp = Math.max(0, g.raid.hp - damage)
g.raid.lastRaid = now

for (let b of breakdown) {
let share = totalPower > 0 ? Math.max(1, Math.floor((b.power / totalPower) * damage)) : 0
g.contribution[b.jid] = Number(g.contribution[b.jid] || 0) + share
}

let text = `Guild Raid dimulai!
Guild: ${g.name}
Boss: ${g.raid.bossName} (Lv.${g.raid.level})
Power Team: ${totalPower}
Damage Deal: ${damage}
HP Boss: ${g.raid.hp}/${g.raid.maxHp}`
let top = breakdown.sort((a, b) => b.power - a.power).slice(0, 3)
if (top.length) {
text += `\nKontributor utama raid ini:\n`
top.forEach((t, i) => {
text += `${i + 1}. @${t.jid.split('@')[0]} (Power ${t.power})\n`
})
}

if (g.raid.hp <= 0) {
let rewardGold = 250 + (g.raid.level * 80)
let rewardExp = 120 + (g.raid.level * 60)
let membersPaid = 0
for (let jid of g.members) {
if (!pdb[jid]) continue
if (typeof pdb[jid].gold !== 'number') pdb[jid].gold = 0
if (typeof pdb[jid].exp !== 'number') pdb[jid].exp = 0
pdb[jid].gold += rewardGold
pdb[jid].exp += rewardExp
membersPaid += 1
}

g.raid.level += 1
g.raid.maxHp = Math.floor(g.raid.maxHp * 1.35)
g.raid.hp = g.raid.maxHp
g.raid.bossName = `Guild Colossus+${g.raid.level - 1}`

text += `\n\nBoss guild tumbang!
Reward/member: +${rewardGold} Gold, +${rewardExp} EXP
Penerima reward: ${membersPaid} member
Boss berikutnya: ${g.raid.bossName}
HP Baru: ${g.raid.maxHp}`
}

saveGuild(gdb)
fs.writeFileSync('./database/player.json', JSON.stringify(pdb, null, 2))
return m.reply({ text, mentions: top.map((t) => t.jid) })
}
