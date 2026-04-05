const { getLatestMongoBackupMeta } = require('../database')

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

try {
const meta = await getLatestMongoBackupMeta()

if (!meta) {
return m.reply('Belum ada snapshot backup di MongoDB.')
}

const ts = meta.timestamp ? new Date(meta.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'

return m.reply(
`=== DB STATUS ===
Mongo   : connected
Backup  : available
Last    : ${ts} WIB
Players : ${meta.players}
Guilds  : ${meta.guilds}
Market  : ${meta.market}
Party   : ${meta.party}`
)
  } catch (err) {
return m.reply(`Cek status gagal: ${err && err.message ? err.message : String(err)}`)
}
}
