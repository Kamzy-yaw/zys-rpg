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
let gold = Number(p.gold) || 0
return { id, name: p.name || id, gold, level: Number(p.level) || 1 }
}).sort((a, b) => b.gold - a.gold).slice(0, 10)

let text = "💰 Top Gold\n\n"
let mentions = []

ranked.forEach((u, i) => {
let tag = asTag(u.id, u.name)
if (String(u.id).includes('@')) mentions.push(u.id)
text += `${i + 1}. ${tag} - ${u.gold} Gold (Lv.${u.level})\n`
})

m.reply({ text, mentions })

}
