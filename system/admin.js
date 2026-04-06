const DEFAULT_ALLOWED_NUMBERS = [
'6281287345836',
'6285871325275'
]

function normalizeDigits(value) {
return String(value || '').replace(/\D/g, '')
}

function getAllowedNumbers() {
let envRaw = String(process.env.OWNER_NUMBERS || '').trim()
let envList = envRaw
? envRaw.split(',').map((x) => normalizeDigits(x)).filter(Boolean)
: []

return new Set([...DEFAULT_ALLOWED_NUMBERS, ...envList].map((x) => normalizeDigits(x)).filter(Boolean))
}

function collectSenderCandidates(ctx = {}) {
let rawMessage = ctx.rawMessage || ctx.msg || null
let key = rawMessage?.key || {}

return [
ctx.sender,
ctx.senderAlt,
ctx.senderPn,
key.participant,
key.participantAlt,
key.remoteJid,
key.remoteJidAlt
].map((x) => normalizeDigits(x)).filter(Boolean)
}

function isOwner(ctx = {}) {
let allowed = getAllowedNumbers()
let candidates = collectSenderCandidates(ctx)
return candidates.some((x) => allowed.has(x))
}

module.exports = {
normalizeDigits,
getAllowedNumbers,
collectSenderCandidates,
isOwner
}
