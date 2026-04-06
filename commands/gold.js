const { scheduleSave } = require('../database')
const { isOwner, normalizeDigits } = require('../system/admin')

module.exports = async (m, { args, mentionedJid, rawMessage, ...ctx }) => {
if (!isOwner({ args, mentionedJid, rawMessage, ...ctx })) {
return m.reply('Command ini khusus owner.')
}

let players = global.db?.players || {}
let target = Array.isArray(mentionedJid) && mentionedJid.length ? mentionedJid[0] : ''
let amountArg = ''

if (!target) {
let raw = String(args[0] || '')
let digits = normalizeDigits(raw)
if (digits) target = `${digits}@s.whatsapp.net`
amountArg = String(args[1] || '')
} else {
amountArg = String(args[1] || args[0] || '')
}

if (!target) return m.reply('Pakai: .gold @pemain 1000')
if (!players[target]) return m.reply('Target belum punya karakter.')

let amount = parseInt(amountArg || '1000', 10)
if (!Number.isFinite(amount) || amount <= 0) amount = 1000

players[target].gold = Number(players[target].gold || 0) + amount
scheduleSave('players')

return m.reply(`Gold berhasil ditambah.\nTarget: ${target}\nJumlah: ${amount}`)
}
