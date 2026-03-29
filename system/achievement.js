function ensureAchievementState(player) {
if (!player || typeof player !== 'object') return

if (!player.stats || typeof player.stats !== 'object' || Array.isArray(player.stats)) {
player.stats = {}
}
if (typeof player.stats.hunts !== 'number') player.stats.hunts = 0
if (typeof player.stats.monstersKilled !== 'number') player.stats.monstersKilled = 0
if (typeof player.stats.mineRuns !== 'number') player.stats.mineRuns = 0
if (typeof player.stats.fishRuns !== 'number') player.stats.fishRuns = 0
if (typeof player.stats.dungeonRuns !== 'number') player.stats.dungeonRuns = 0
if (typeof player.stats.dungeonClears !== 'number') player.stats.dungeonClears = 0
if (typeof player.stats.maxGold !== 'number') player.stats.maxGold = Number(player.gold || 0)

if (!player.achievements || typeof player.achievements !== 'object' || Array.isArray(player.achievements)) {
player.achievements = {}
}
if (!Array.isArray(player.achievements.completed)) player.achievements.completed = []

if (!player.titles || typeof player.titles !== 'object' || Array.isArray(player.titles)) {
player.titles = { unlocked: ['Novice'], equipped: 'Novice' }
}
if (!Array.isArray(player.titles.unlocked)) player.titles.unlocked = ['Novice']
if (!player.titles.unlocked.includes('Novice')) player.titles.unlocked.unshift('Novice')
if (typeof player.titles.equipped !== 'string' || !player.titles.equipped) {
player.titles.equipped = player.titles.unlocked[0] || 'Novice'
}
if (!player.titles.unlocked.includes(player.titles.equipped)) {
player.titles.equipped = player.titles.unlocked[0] || 'Novice'
}
}

function incrementStat(player, key, amount) {
ensureAchievementState(player)
let add = Number(amount || 1)
if (!Number.isFinite(add)) add = 1
if (typeof player.stats[key] !== 'number') player.stats[key] = 0
player.stats[key] += add
}

function syncDerivedStats(player) {
ensureAchievementState(player)
if (typeof player.gold === 'number' && player.gold > player.stats.maxGold) {
player.stats.maxGold = player.gold
}
}

function getProgress(player, data) {
if (!data || typeof data !== 'object') return 0
if (data.type === 'level') return Number(player.level || 0)
if (data.type === 'pvpWins') return Number(player.pvpWins || 0)
if (data.type === 'gold') return Number(player.stats.maxGold || 0)
if (data.type === 'stat') return Number((player.stats && player.stats[data.stat]) || 0)
return 0
}

function evaluateAchievements(player, achievementDB) {
ensureAchievementState(player)
syncDerivedStats(player)
let unlocked = []
for (let id of Object.keys(achievementDB || {})) {
let data = achievementDB[id]
if (player.achievements.completed.includes(id)) continue
let progress = getProgress(player, data)
if (progress >= Number(data.target || 0)) {
player.achievements.completed.push(id)
let titleUnlocked = null
if (data.rewardTitle) {
if (!player.titles.unlocked.includes(data.rewardTitle)) {
player.titles.unlocked.push(data.rewardTitle)
titleUnlocked = data.rewardTitle
}
}
unlocked.push({ id, name: data.name || id, rewardTitle: titleUnlocked })
}
}
return unlocked
}

module.exports = {
ensureAchievementState,
incrementStat,
syncDerivedStats,
getProgress,
evaluateAchievements
}
