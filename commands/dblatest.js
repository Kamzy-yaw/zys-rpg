const { getLatestMongoBackupMeta } = require('../database')
const { isOwner } = require('../system/admin')

module.exports = async (m, ctx) => {
if (!isOwner(ctx)) {
return m.reply('Command ini khusus owner.')
}

try {
const meta = await getLatestMongoBackupMeta()
if (!meta) return m.reply('Belum ada snapshot backup di MongoDB.')

const ts = meta.timestamp
? new Date(meta.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
: '-'

return m.reply(
`=== DB LATEST ===
Last    : ${ts} WIB
Players : ${meta.players}
Guilds  : ${meta.guilds}
Market  : ${meta.market}
Party   : ${meta.party}

Restore : .dbrestore latest`
)
  } catch (err) {
return m.reply(`Gagal ambil latest backup: ${err && err.message ? err.message : String(err)}`)
}
}
