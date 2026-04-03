const fs = require('fs')
const { PETS, ensurePetState, hasPet, getPetData } = require('../system/pet')

module.exports = async (m, { sender, args }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Bikin karakter dulu pakai .start')

let p = db[sender]
ensurePetState(p)

let sub = String(args[0] || '').toLowerCase().trim()
if (!sub || sub === 'list' || sub === 'status') {
let active = getPetData(p.pet)
let owned = p.pets.length ? p.pets.map((id) => `- ${id}: ${getPetData(id).desc}`).join('\n') : '- Belum punya pet'
return m.reply(`Pet Status\n\nActive: ${p.pet} (${active.name})\nBonus aktif: ${active.desc}\n\nOwned Pets:\n${owned}\n\nCommand:\n.pet equip <id_pet>\nContoh: .pet equip flame_fox`)
}

if (sub === 'equip') {
let id = String(args[1] || '').toLowerCase().trim()
if (!id || !PETS[id] || id === 'none') {
let list = Object.keys(PETS).filter((x) => x !== 'none').join(', ')
return m.reply(`Pet tidak valid. Pilih: ${list}`)
}
if (!hasPet(p, id)) return m.reply('Kamu belum punya pet ini.')
p.pet = id
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
let data = getPetData(id)
return m.reply(`Pet aktif: ${id} (${data.name})\nBonus: ${data.desc}`)
}

return m.reply('Pakai: .pet atau .pet equip <id_pet>')
}
