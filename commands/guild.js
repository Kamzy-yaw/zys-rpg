const fs = require('fs')
const path = './database/guild.json'

function loadGuild() {
if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}, null, 2))
return JSON.parse(fs.readFileSync(path))
}

function saveGuild(db) {
fs.writeFileSync(path, JSON.stringify(db, null, 2))
}

function slugName(name) {
return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function findGuildIdByMember(gdb, jid) {
for (let gid of Object.keys(gdb)) {
if (Array.isArray(gdb[gid].members) && gdb[gid].members.includes(jid)) return gid
}
return null
}

function ensureGuildMeta(g) {
if (!g.roles || typeof g.roles !== 'object') g.roles = {}
if (!g.contribution || typeof g.contribution !== 'object') g.contribution = {}
for (let jid of g.members) {
if (!g.roles[jid]) g.roles[jid] = (jid === g.leader ? 'leader' : 'member')
if (typeof g.contribution[jid] !== 'number') g.contribution[jid] = 0
}
}

function targetFromMention(args, mentionedJid) {
if (Array.isArray(mentionedJid) && mentionedJid.length) return mentionedJid[0]
let raw = (args[0] || '').replace(/[^\d]/g, '')
if (raw) return `${raw}@s.whatsapp.net`
return null
}

module.exports = async (m, { sender, args, mentionedJid }) => {
let pdb = JSON.parse(fs.readFileSync('./database/player.json'))
if (!pdb[sender]) return m.reply("Bikin karakter dulu pakai .start")

let p = pdb[sender]
if (typeof p.gold !== 'number') p.gold = 0
if (p.guildId === undefined) p.guildId = null

let gdb = loadGuild()
let sub = (args[0] || 'info').toLowerCase()

if (sub === 'create') {
if (p.guildId) return m.reply("Kamu sudah punya guild. Keluar dulu kalau mau bikin baru.")
let raw = args.slice(1).join(' ').trim()
if (!raw) return m.reply("Contoh: .guild create Nama Guild")
let gid = slugName(raw)
if (!gid) return m.reply("Nama guild tidak valid.")
if (gdb[gid]) return m.reply("Nama guild sudah dipakai.")

gdb[gid] = {
id: gid,
name: raw,
leader: sender,
members: [sender],
maxMembers: 5,
createdAt: Date.now(),
roles: { [sender]: 'leader' },
contribution: { [sender]: 0 },
raid: { level: 1, bossName: "Guild Colossus", maxHp: 12000, hp: 12000, lastRaid: 0 }
}
p.guildId = gid
saveGuild(gdb)
fs.writeFileSync('./database/player.json', JSON.stringify(pdb, null, 2))
return m.reply(`Guild berhasil dibuat: ${raw}\nMember: 1/5`)
}

if (sub === 'join') {
if (p.guildId) return m.reply("Kamu sudah join guild. Keluar dulu pakai .guild leave")
let name = args.slice(1).join(' ').trim()
if (!name) return m.reply("Contoh: .guild join nama_guild")

let gid = Object.keys(gdb).find((id) => gdb[id].name.toLowerCase() === name.toLowerCase() || id === slugName(name))
if (!gid) return m.reply("Guild tidak ditemukan.")
let g = gdb[gid]
ensureGuildMeta(g)
if (g.members.length >= g.maxMembers) return m.reply("Guild full. Minta leader upgrade slot.")

g.members.push(sender)
g.roles[sender] = 'member'
g.contribution[sender] = 0
p.guildId = gid
saveGuild(gdb)
fs.writeFileSync('./database/player.json', JSON.stringify(pdb, null, 2))
return m.reply(`Kamu berhasil join guild ${g.name}\nMember: ${g.members.length}/${g.maxMembers}`)
}

if (sub === 'list') {
let ids = Object.keys(gdb)
if (!ids.length) return m.reply("Belum ada guild.")
let txt = "Guild List\n\n"
ids.slice(0, 20).forEach((id, i) => {
let g = gdb[id]
txt += `${i + 1}. ${g.name}\n   Member: ${g.members.length}/${g.maxMembers}\n`
})
return m.reply(txt)
}

let gid = p.guildId || findGuildIdByMember(gdb, sender)
if (!gid || !gdb[gid]) return m.reply("Kamu belum join guild.\nCommand:\n.guild create <nama>\n.guild join <nama>\n.guild list")
let g = gdb[gid]
ensureGuildMeta(g)
let callerRole = g.roles[sender] || (sender === g.leader ? 'leader' : 'member')

if (sub === 'leave') {
if (g.leader === sender) return m.reply("Leader tidak bisa leave langsung. Transfer leader dulu / bubarkan manual.")
g.members = g.members.filter((x) => x !== sender)
delete g.roles[sender]
delete g.contribution[sender]
p.guildId = null
if (g.members.length === 0) delete gdb[gid]
saveGuild(gdb)
fs.writeFileSync('./database/player.json', JSON.stringify(pdb, null, 2))
return m.reply(`Kamu keluar dari guild ${g.name}`)
}

if (sub === 'upgrade') {
if (g.leader !== sender) return m.reply("Hanya leader yang bisa upgrade slot guild.")
let cost = 100000
if (p.gold < cost) return m.reply(`Gold kurang. Butuh ${cost} Gold.`)
p.gold -= cost
g.maxMembers += 5
saveGuild(gdb)
fs.writeFileSync('./database/player.json', JSON.stringify(pdb, null, 2))
return m.reply(`Upgrade guild sukses.\nSlot member sekarang: ${g.maxMembers}`)
}

if (sub === 'promote') {
if (g.leader !== sender) return m.reply("Hanya leader yang bisa promote.")
let target = targetFromMention(args.slice(1), mentionedJid)
if (!target || !g.members.includes(target)) return m.reply("Target member tidak valid.")
if (target === g.leader) return m.reply("Leader sudah rank tertinggi.")
g.roles[target] = 'officer'
saveGuild(gdb)
return m.reply({ text: `Promote berhasil: @${target.split('@')[0]} jadi OFFICER`, mentions: [target] })
}

if (sub === 'demote') {
if (g.leader !== sender) return m.reply("Hanya leader yang bisa demote.")
let target = targetFromMention(args.slice(1), mentionedJid)
if (!target || !g.members.includes(target)) return m.reply("Target member tidak valid.")
if (target === g.leader) return m.reply("Leader tidak bisa didemote.")
g.roles[target] = 'member'
saveGuild(gdb)
return m.reply({ text: `Demote berhasil: @${target.split('@')[0]} jadi MEMBER`, mentions: [target] })
}

if (sub === 'kick') {
if (!['leader', 'officer'].includes(callerRole)) return m.reply("Hanya leader/officer yang bisa kick.")
let target = targetFromMention(args.slice(1), mentionedJid)
if (!target || !g.members.includes(target)) return m.reply("Target member tidak valid.")
if (target === g.leader) return m.reply("Leader tidak bisa dikick.")
let targetRole = g.roles[target] || 'member'
if (callerRole === 'officer' && targetRole !== 'member') return m.reply("Officer hanya bisa kick member biasa.")

g.members = g.members.filter((x) => x !== target)
delete g.roles[target]
delete g.contribution[target]
if (pdb[target]) pdb[target].guildId = null
saveGuild(gdb)
fs.writeFileSync('./database/player.json', JSON.stringify(pdb, null, 2))
return m.reply({ text: `Member dikeluarkan: @${target.split('@')[0]}`, mentions: [target] })
}

if (sub === 'contrib') {
let ranking = Object.keys(g.contribution)
.map((jid) => ({ jid, value: Number(g.contribution[jid] || 0), role: g.roles[jid] || 'member' }))
.sort((a, b) => b.value - a.value)

let txt = `Guild Contribution - ${g.name}\n\n`
if (!ranking.length) txt += "Belum ada data kontribusi."
ranking.slice(0, 15).forEach((r, i) => {
txt += `${i + 1}. @${r.jid.split('@')[0]} [${r.role}] - ${r.value}\n`
})
return m.reply({ text: txt, mentions: ranking.slice(0, 15).map((x) => x.jid) })
}

let leaderTag = '@' + String(g.leader).split('@')[0]
let topContrib = Object.keys(g.contribution)
.map((jid) => ({ jid, value: Number(g.contribution[jid] || 0) }))
.sort((a, b) => b.value - a.value)[0]

let txt = `Guild Info
Nama: ${g.name}
Leader: ${leaderTag}
Member: ${g.members.length}/${g.maxMembers}
Role kamu: ${callerRole}
Raid Boss: ${g.raid.bossName} (Lv.${g.raid.level})
HP Boss: ${g.raid.hp}/${g.raid.maxHp}
Top Contribution: ${topContrib ? `@${topContrib.jid.split('@')[0]} (${topContrib.value})` : '-'}

Command:
.guild list
.guild create <nama>
.guild join <nama>
.guild leave
.guild upgrade
.guild promote @user
.guild demote @user
.guild kick @user
.guild contrib
.guildraid`
let mentions = [g.leader]
if (topContrib) mentions.push(topContrib.jid)
return m.reply({ text: txt, mentions })
}
