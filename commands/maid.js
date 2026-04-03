const fs = require('fs')
const itemDB = require('../database/item.json')

function ensureMaid(player) {
if (!player.maid || typeof player.maid !== 'object') {
player.maid = { owned: false, active: false, autoFix: true, autoHeal: true }
}
if (typeof player.maid.owned !== 'boolean') player.maid.owned = false
if (typeof player.maid.active !== 'boolean') player.maid.active = false
if (typeof player.maid.autoFix !== 'boolean') player.maid.autoFix = true
if (typeof player.maid.autoHeal !== 'boolean') player.maid.autoHeal = true
if (typeof player.gold !== 'number') player.gold = 0
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.weapon === 'undefined') player.weapon = null
if (typeof player.armor === 'undefined') player.armor = null
if (typeof player.pickaxe === 'undefined') player.pickaxe = null
if (typeof player.rod === 'undefined') player.rod = null
if (!player.durability || typeof player.durability !== 'object') player.durability = {}
}

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Bikin karakter dulu pakai .start")

let p = db[sender]
ensureMaid(p)

let sub = (args[0] || 'status').toLowerCase()

if (sub === 'buy') {
if (p.maid.owned) return m.reply("Maid sudah kamu miliki.")
let price = 10000
if (p.gold < price) return m.reply(`Gold kurang. Butuh ${price} Gold.`)
p.gold -= price
p.maid.owned = true
p.maid.active = false
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply("Maid berhasil direkrut.\nPakai .maid on untuk aktifkan service.")
}

if (!p.maid.owned) {
return m.reply("Kamu belum punya maid.\nPakai .maid buy (10.000 Gold).")
}

if (sub === 'on') p.maid.active = true
if (sub === 'off') p.maid.active = false

if (sub === 'fix' && args[1]) {
let mode = args[1].toLowerCase()
if (mode === 'on') p.maid.autoFix = true
if (mode === 'off') p.maid.autoFix = false
}

if (sub === 'heal' && args[1]) {
let mode = args[1].toLowerCase()
if (mode === 'on') p.maid.autoHeal = true
if (mode === 'off') p.maid.autoHeal = false
}

if (sub === 'now') {
let logs = []
let hpLow = p.hp <= Math.floor(p.maxhp * 0.5)
let weaponNeedFix = !!(p.weapon && itemDB[p.weapon] && itemDB[p.weapon].durability && p.durability[p.weapon] < Number(itemDB[p.weapon].durability))
let armorNeedFix = !!(p.armor && itemDB[p.armor] && itemDB[p.armor].durability && p.durability[p.armor] < Number(itemDB[p.armor].durability))
let pickaxeNeedFix = !!(p.pickaxe && itemDB[p.pickaxe] && itemDB[p.pickaxe].durability && p.durability[p.pickaxe] < Number(itemDB[p.pickaxe].durability))
let rodNeedFix = false
if (p.rod && itemDB[p.rod] && itemDB[p.rod].durability) {
let rodMax = Number(itemDB[p.rod].durability)
let rodCurrent = Number(p.durability[p.rod] ?? rodMax)
rodNeedFix = rodCurrent <= Math.floor(rodMax * 0.5)
}
let gearNeedFix = weaponNeedFix || armorNeedFix || pickaxeNeedFix || rodNeedFix

// Manual override: .maid now akan langsung coba fix semua equipment yang perlu
if (p.maid.autoFix && gearNeedFix && p.gold >= 100) {
let fixedAny = false
if (weaponNeedFix && p.weapon && itemDB[p.weapon] && itemDB[p.weapon].durability) {
p.durability[p.weapon] = Number(itemDB[p.weapon].durability)
fixedAny = true
}
if (armorNeedFix && p.armor && itemDB[p.armor] && itemDB[p.armor].durability) {
p.durability[p.armor] = Number(itemDB[p.armor].durability)
fixedAny = true
}
if (pickaxeNeedFix && p.pickaxe && itemDB[p.pickaxe] && itemDB[p.pickaxe].durability) {
p.durability[p.pickaxe] = Number(itemDB[p.pickaxe].durability)
fixedAny = true
}
if (rodNeedFix && p.rod && itemDB[p.rod] && itemDB[p.rod].durability) {
p.durability[p.rod] = Number(itemDB[p.rod].durability)
fixedAny = true
}
if (fixedAny) {
p.gold -= 100
logs.push("Fix gear/rod: -100 Gold")
}
} else if (p.maid.autoFix && gearNeedFix && p.gold < 100) {
logs.push("Gold kurang untuk fix gear/rod (butuh 100 Gold)")
} else if (p.maid.autoFix && !gearNeedFix) {
logs.push("Semua gear/rod sudah full durability")
}
if (p.maid.autoHeal && hpLow && p.gold >= 150) {
p.gold -= 150
p.hp = p.maxhp
logs.push("Heal full: -150 Gold")
}
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(logs.length ? `Maid service:\n${logs.join('\n')}` : "Tidak ada aksi maid sekarang.")
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(
`Maid Status
Owned: ${p.maid.owned ? 'Yes' : 'No'}
Active: ${p.maid.active ? 'ON' : 'OFF'}
Buff: +10 ALL STAT saat Active ON
Auto Fix: ${p.maid.autoFix ? 'ON' : 'OFF'} (100 Gold)
Auto Heal: ${p.maid.autoHeal ? 'ON' : 'OFF'} (150 Gold)
Trigger Service: HP <= 50% (fix/heal), atau Rod durability <= 50% (fix)

Command:
.maid buy
.maid on / .maid off
.maid fix on|off
.maid heal on|off
.maid now`
)
}
