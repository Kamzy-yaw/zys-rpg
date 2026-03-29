const fs = require('fs')
const itemDB = require('../database/item.json')
const { getWeaponAtk, getArmorDef, getAccessoryBonuses, normalizeAccessories, ensureEnhanceState } = require('../system/gearstats')

const PARTY_PATH = './database/party.json'
const PLAYER_PATH = './database/player.json'

function readPartyDB() {
if (!fs.existsSync(PARTY_PATH)) return { parties: {} }
let data = JSON.parse(fs.readFileSync(PARTY_PATH))
if (!data.parties || typeof data.parties !== 'object' || Array.isArray(data.parties)) data.parties = {}
return data
}

function savePartyDB(data) {
fs.writeFileSync(PARTY_PATH, JSON.stringify(data, null, 2))
}

function readPlayerDB() {
if (!fs.existsSync(PLAYER_PATH)) return {}
return JSON.parse(fs.readFileSync(PLAYER_PATH))
}

function savePlayerDB(data) {
fs.writeFileSync(PLAYER_PATH, JSON.stringify(data, null, 2))
}

function digits(v) {
return String(v || '').replace(/\D/g, '')
}

function asTag(id, fallback) {
let num = digits(id)
if (!num) return fallback || String(id || 'Unknown')
return `@${num}`
}

function findPlayerKey(db, raw) {
if (!raw) return null
if (db[raw]) return raw
let d = digits(raw)
if (!d) return null
for (let id of Object.keys(db)) {
if (digits(id) === d) return id
}
return null
}

function normalizePlayer(p) {
if (typeof p.level !== 'number') p.level = 1
if (typeof p.hp !== 'number') p.hp = p.maxhp || 100
if (typeof p.maxhp !== 'number') p.maxhp = 100
if (typeof p.gold !== 'number') p.gold = 0
if (typeof p.exp !== 'number') p.exp = 0
if (typeof p.str !== 'number') p.str = 5
if (typeof p.agi !== 'number') p.agi = 5
if (typeof p.int !== 'number') p.int = 5
if (typeof p.toughness !== 'number') p.toughness = 0
if (typeof p.weapon === 'undefined') p.weapon = null
if (typeof p.armor === 'undefined') p.armor = null
if (typeof p.accessory === 'undefined') p.accessory = null
if (!Array.isArray(p.accessories)) p.accessories = []
normalizeAccessories(p)
ensureEnhanceState(p)
}

function findPartyByMember(partyDB, memberId) {
for (let leaderId of Object.keys(partyDB.parties)) {
let party = partyDB.parties[leaderId]
if (!Array.isArray(party.members)) party.members = []
if (party.members.includes(memberId)) return { leaderId, party }
}
return null
}

function calcPower(player) {
normalizePlayer(player)
let wAtk = getWeaponAtk(player)
let aDef = getArmorDef(player)
let acc = getAccessoryBonuses(player)
let str = Number(player.str || 0) + Number(acc.str || 0)
let agi = Number(player.agi || 0) + Number(acc.agi || 0)
let intel = Number(player.int || 0) + Number(acc.int || 0)
let tough = Number(player.toughness || 0) + Number(acc.tough || 0)
return Math.floor((player.level * 4) + (wAtk * 5) + (aDef * 3) + (str * 2.1) + (agi * 1.6) + (intel * 1.6) + (tough * 1.7))
}

module.exports = async (m, { sender, args, mentionedJid }) => {
let playerDB = readPlayerDB()
if (!playerDB[sender]) return m.reply("Bikin karakter dulu pakai .start")

let partyDB = readPartyDB()
let action = String(args[0] || '').toLowerCase()

if (!action) {
return m.reply(
`Party Command:
.party create <nama_party>
.party join @leader
.party leave
.party list
.party info
.party start`
)
}

if (action === 'create') {
let existing = findPartyByMember(partyDB, sender)
if (existing) return m.reply("Kamu sudah ada di party. Keluar dulu pakai .party leave")

let name = args.slice(1).join(' ').trim() || `Party-${digits(sender).slice(-4)}`
partyDB.parties[sender] = {
name,
leader: sender,
members: [sender],
maxMembers: 4,
lastRun: 0
}
savePartyDB(partyDB)
return m.reply(`Party dibuat: ${name}\nLeader: ${asTag(sender, sender)}\nAjak teman join: .party join @leader`)
}

if (action === 'join') {
let existing = findPartyByMember(partyDB, sender)
if (existing) return m.reply("Kamu sudah ada di party. Keluar dulu pakai .party leave")

let rawTarget = (mentionedJid && mentionedJid[0]) || args[1]
if (!rawTarget) return m.reply("Tag leader party dulu.\nContoh: .party join @user")
let leaderId = findPlayerKey(playerDB, rawTarget)
if (!leaderId) return m.reply("Leader tidak ditemukan.")
if (!partyDB.parties[leaderId]) return m.reply("Party leader ini tidak ditemukan.")

let party = partyDB.parties[leaderId]
if (!Array.isArray(party.members)) party.members = [leaderId]
if (party.members.length >= Number(party.maxMembers || 4)) {
return m.reply(`Party penuh. Slot maksimal: ${party.maxMembers || 4}`)
}

party.members.push(sender)
party.members = [...new Set(party.members)]
savePartyDB(partyDB)
return m.reply(`Kamu join party: ${party.name}\nMember: ${party.members.length}/${party.maxMembers || 4}`)
}

if (action === 'leave') {
let found = findPartyByMember(partyDB, sender)
if (!found) return m.reply("Kamu belum ada di party.")

if (found.leaderId === sender) {
delete partyDB.parties[sender]
savePartyDB(partyDB)
return m.reply("Kamu membubarkan party karena kamu leader.")
}

found.party.members = found.party.members.filter((id) => id !== sender)
savePartyDB(partyDB)
return m.reply(`Kamu keluar dari party: ${found.party.name}`)
}

if (action === 'list') {
let leaders = Object.keys(partyDB.parties)
if (!leaders.length) return m.reply("Belum ada party aktif.")
let lines = []
let mentions = []
let i = 1
for (let leaderId of leaders) {
let p = partyDB.parties[leaderId]
let members = Array.isArray(p.members) ? p.members : []
lines.push(`${i}. ${p.name}`)
lines.push(`   Leader: ${asTag(leaderId, leaderId)}`)
lines.push(`   Member: ${members.length}/${p.maxMembers || 4}`)
if (String(leaderId).includes('@')) mentions.push(leaderId)
  i += 1
}
return m.reply({ text: `Party List\n\n${lines.join('\n')}`, mentions })
}

if (action === 'info') {
let found = findPartyByMember(partyDB, sender)
if (!found) return m.reply("Kamu belum ada di party.")
let party = found.party
let mentions = []
let lines = []
for (let i = 0; i < party.members.length; i++) {
let id = party.members[i]
let tag = asTag(id, id)
let p = playerDB[id]
let lv = p && typeof p.level === 'number' ? p.level : 1
lines.push(`${i + 1}. ${tag} (Lv.${lv})`)
if (String(id).includes('@')) mentions.push(id)
}
return m.reply({
text: `Party Info\n\nNama: ${party.name}\nLeader: ${asTag(found.leaderId, found.leaderId)}\nSlot: ${party.members.length}/${party.maxMembers || 4}\n\nMember:\n${lines.join('\n')}`,
mentions
})
}

if (action === 'start') {
let found = findPartyByMember(partyDB, sender)
if (!found) return m.reply("Kamu belum ada di party.")
if (found.leaderId !== sender) return m.reply("Hanya leader yang bisa start party run.")

let party = found.party
if (!Array.isArray(party.members)) party.members = [sender]
party.members = party.members.filter((id) => playerDB[id])
if (party.members.length < 2) return m.reply("Minimal 2 member untuk mulai party run.")

let now = Date.now()
if (typeof party.lastRun !== 'number') party.lastRun = 0
let cooldown = 120000
if (now - party.lastRun < cooldown) {
let sisa = Math.ceil((cooldown - (now - party.lastRun)) / 1000)
return m.reply(`Party cooldown, tunggu ${sisa} detik lagi.`)
}

let members = party.members.map((id) => {
normalizePlayer(playerDB[id])
return { id, player: playerDB[id] }
})
let totalPower = members.reduce((a, x) => a + calcPower(x.player), 0)
let avgLevel = Math.floor(members.reduce((a, x) => a + Number(x.player.level || 1), 0) / members.length)

let bossHp = 260 + (avgLevel * 70) + (members.length * 140)
let bossAtk = 16 + (avgLevel * 2)
let logs = [`Party menghadapi Ancient Sentinel (HP ${bossHp})`]
let rounds = 0

while (bossHp > 0 && rounds < 6) {
rounds += 1
let teamDmg = Math.max(30, Math.floor((totalPower * (0.12 + Math.random() * 0.06)) / Math.max(2, members.length)))
bossHp -= teamDmg
logs.push(`Ronde ${rounds}: Team hit boss -${teamDmg}`)
if (bossHp <= 0) break

let target = members[Math.floor(Math.random() * members.length)]
let taken = Math.max(1, bossAtk + Math.floor(Math.random() * 10) - getArmorDef(target.player))
target.player.hp = Math.max(1, Number(target.player.hp || target.player.maxhp || 100) - taken)
logs.push(`Ronde ${rounds}: Boss hit ${asTag(target.id, target.id)} -${taken} HP`)
}

let success = bossHp <= 0
let mentions = members.map((x) => x.id).filter((id, i, arr) => String(id).includes('@') && arr.indexOf(id) === i)
let text = `Party Run: ${party.name}\nMember: ${members.length}\nPower Team: ${totalPower}\n\n${logs.join('\n')}`

if (success) {
let rewardGold = 80 + (members.length * 40) + (avgLevel * 10)
let rewardExp = 100 + (avgLevel * 12)
for (let x of members) {
x.player.gold += rewardGold
x.player.exp += rewardExp
}
text += `\n\n🎉 Boss kalah!\nReward per member:\n+${rewardExp} EXP\n+${rewardGold} Gold`
} else {
for (let x of members) {
let penalty = Math.min(x.player.gold, Math.floor(x.player.gold * 0.05))
x.player.gold -= penalty
x.player.hp = Math.max(1, Math.floor((x.player.maxhp || 100) * 0.25))
}
text += `\n\n💀 Party run gagal.\nPenalty:\n-5% Gold tiap member\nHP jadi 25%`
}

party.lastRun = now
savePartyDB(partyDB)
savePlayerDB(playerDB)
return m.reply({ text, mentions })
}

return m.reply("Action party tidak dikenal. Cek: .party")
}
