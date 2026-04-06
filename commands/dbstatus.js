const { getLatestMongoBackupMeta, getDatabaseSizeBytes } = require('../database')
const { isOwner } = require('../system/admin')

function formatSize(bytes) {
let size = Number(bytes || 0)
if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
if (size >= 1024) return `${Math.round(size / 1024)} KB`
return `${size} B`
}

module.exports = async (m, ctx) => {
if (!isOwner(ctx)) {
return m.reply('Command ini khusus owner.')
}

try {
const [meta, sizeBytes] = await Promise.all([
getLatestMongoBackupMeta(),
getDatabaseSizeBytes()
])

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
Party   : ${meta.party}
DB Size : ${formatSize(sizeBytes)}`
)
  } catch (err) {
return m.reply(`Cek status gagal: ${err && err.message ? err.message : String(err)}`)
}
}
