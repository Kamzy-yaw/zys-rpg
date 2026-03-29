const fs = require('fs')
const achievementDB = require('../database/achievement.json')
const { ensureAchievementState, evaluateAchievements, getProgress } = require('../system/achievement')

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply("Karakter belum ada.\nKetik .start dulu ya.")

let player = db[sender]
ensureAchievementState(player)
let newlyUnlocked = evaluateAchievements(player, achievementDB)

let completed = new Set(player.achievements.completed)
let lines = []
let i = 1
for (let id of Object.keys(achievementDB)) {
let a = achievementDB[id]
let progress = getProgress(player, a)
let target = Number(a.target || 0)
if (progress > target) progress = target
let done = completed.has(id)
lines.push(`${i}. ${done ? '✅' : '⬜'} ${a.name}`)
lines.push(`   ${a.desc}`)
lines.push(`   Progress: ${progress}/${target}${a.rewardTitle ? ` | Title: ${a.rewardTitle}` : ''}`)
  i += 1
}

let text = `🏆 Achievement Board\n\nTitle aktif: ${player.titles.equipped}\nTotal selesai: ${completed.size}/${Object.keys(achievementDB).length}\n\n${lines.join('\n')}`

if (newlyUnlocked.length) {
let unlockLines = newlyUnlocked.map((x) => {
if (x.rewardTitle) return `- ${x.name} (Title unlocked: ${x.rewardTitle})`
return `- ${x.name}`
})
text += `\n\n✨ Baru terbuka:\n${unlockLines.join('\n')}`
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(text)
}
