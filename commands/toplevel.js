const fs = require('fs')

function asTag(id, fallback) {
let num = String(id || '').replace(/\D/g, '')
if (!num) return fallback || String(id || 'Unknown')
return `@${num}`
}

module.exports = async (m) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))
let entries = Object.entries(db)

if (entries.length === 0) return m.reply("Belum ada player.")

let ranked = entries.map(([id, p]) => {
let level = Number(p.level) || 1
let exp = Number(p.exp) || 0
return { id, name: p.name || id, level, exp }
}).sort((a, b) => {
if (b.level !== a.level) return b.level - a.level
return b.exp - a.exp
}).slice(0, 10)

let text = "📈 Top Level\n\n"
let mentions = []

ranked.forEach((u, i) => {
let tag = asTag(u.id, u.name)
if (String(u.id).includes('@')) mentions.push(u.id)
text += `${i + 1}. ${tag} - Lv.${u.level} (${u.exp} EXP)\n`
})

m.reply({ text, mentions })

}
