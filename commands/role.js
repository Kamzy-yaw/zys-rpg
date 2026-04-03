const fs = require('fs')
const { ROLE_DATA, ensureRoleState, getRoleData, getRoleKey } = require('../system/role')

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Bikin karakter dulu pakai .start')

let p = db[sender]
ensureRoleState(p)

let pick = String(args[0] || '').toLowerCase().trim()
if (!pick) {
let current = getRoleData(getRoleKey(p))
let list = Object.keys(ROLE_DATA)
.filter((k) => k !== 'none')
.map((k) => `- ${k}: ${ROLE_DATA[k].desc}`)
.join('\n')
return m.reply(`Role saat ini: ${p.role} (${current.name})\nBonus: ${current.desc}\n\nDaftar role:\n${list}\n\nPakai: .role <nama_role>\nContoh: .role tanker`) 
}

if (!ROLE_DATA[pick]) {
let available = Object.keys(ROLE_DATA).filter((k) => k !== 'none').join(', ')
return m.reply(`Role tidak valid. Pilih: ${available}`)
}

p.role = pick
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
let data = getRoleData(pick)
return m.reply(`Role diganti ke ${pick} (${data.name})\nBonus: ${data.desc}`)
}
