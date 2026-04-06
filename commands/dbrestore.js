const { restoreLatestMongoBackup } = require('../database')
const { isOwner } = require('../system/admin')

module.exports = async (m, ctx) => {
if (!isOwner(ctx)) {
return m.reply('Command ini khusus owner.')
}

let sub = String(ctx.args[0] || '').toLowerCase()
if (sub !== 'latest') {
return m.reply('Pakai: .dbrestore latest')
}

try {
const restored = await restoreLatestMongoBackup()
if (!restored) return m.reply('Belum ada snapshot backup di MongoDB.')

const ts = restored.timestamp
? new Date(restored.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
: '-'

return m.reply(
`=== DB RESTORE ===
Status : sukses
Source : latest backup
Time   : ${ts} WIB
Players: ${restored.players}
Guilds : ${restored.guilds}
Market : ${restored.market}
Party  : ${restored.party}`
)
  } catch (err) {
return m.reply(`Restore gagal: ${err && err.message ? err.message : String(err)}`)
}
}
