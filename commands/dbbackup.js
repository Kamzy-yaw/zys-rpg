const { runMongoBackup } = require('../database')

const ALLOWED_NUMBERS = new Set([
'6281287345836',
'6285871325275'
])

function normalizeDigits(value) {
return String(value || '').replace(/\D/g, '')
}

module.exports = async (m, { sender, senderPn }) => {
const senderDigits = normalizeDigits(sender)
const senderPnDigits = normalizeDigits(senderPn)

if (!ALLOWED_NUMBERS.has(senderDigits) && !ALLOWED_NUMBERS.has(senderPnDigits)) {
return m.reply('Command ini khusus owner.')
}

if (!global.db || typeof global.db !== 'object') {
return m.reply('Database memory belum siap. Coba lagi sebentar.')
}

try {
await runMongoBackup()

const players = Object.keys(global.db.players || {}).length
const guilds = Object.keys(global.db.guilds || {}).length
const market = Object.keys(global.db.market || {}).length
const party = Object.keys(global.db.party || {}).length

return m.reply(
`=== MANUAL BACKUP ===
Status : sukses
Players: ${players}
Guilds : ${guilds}
Market : ${market}
Party  : ${party}`
)
  } catch (err) {
return m.reply(`Backup gagal: ${err && err.message ? err.message : String(err)}`)
}
}
