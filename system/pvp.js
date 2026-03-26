const itemDB = require('../database/item.json')

function normalizePvp(player) {
if (typeof player.hp !== 'number') player.hp = player.maxhp || 100
if (typeof player.maxhp !== 'number') player.maxhp = 100
if (typeof player.gold !== 'number') player.gold = 0
if (typeof player.level !== 'number') player.level = 1
if (typeof player.str !== 'number') player.str = 5
if (typeof player.agi !== 'number') player.agi = 5
if (typeof player.int !== 'number') player.int = 5
if (typeof player.toughness !== 'number') player.toughness = 0
if (typeof player.pvpWins !== 'number') player.pvpWins = 0
if (typeof player.pvpLosses !== 'number') player.pvpLosses = 0
if (typeof player.weapon === 'undefined') player.weapon = null
if (typeof player.armor === 'undefined') player.armor = null
}

function weaponAtk(player) {
if (!player.weapon) return 0
if (!itemDB[player.weapon]) return 0
return Number(itemDB[player.weapon].atk || 0)
}

function armorStats(player) {
if (!player.armor) return { def: 0, tough: 0 }
if (!itemDB[player.armor]) return { def: 0, tough: 0 }
return {
def: Number(itemDB[player.armor].def || 0),
tough: Number(itemDB[player.armor].tough || 0)
}
}

function battleScore(player) {
let wAtk = weaponAtk(player)
let a = armorStats(player)
let totalTough = player.toughness + a.tough
let base = (player.level * 3) + (player.str * 2) + player.agi + Math.floor(player.int / 2) + (wAtk * 3) + (a.def * 2) + totalTough
let luck = Math.floor(Math.random() * 16) + 1
return base + luck
}

function getRankGrade(player) {
let wins = Number(player.pvpWins || 0)
if (wins >= 35) return { grade: 'S', wins }
if (wins >= 20) return { grade: 'A', wins }
if (wins >= 10) return { grade: 'B', wins }
if (wins >= 5) return { grade: 'C', wins }
return { grade: 'D', wins }
}

function runPvp(p1, p2) {
let hp1 = p1.maxhp
let hp2 = p2.maxhp
let rounds = 0
let score1 = battleScore(p1)
let score2 = battleScore(p2)
let p1Armor = armorStats(p1)
let p2Armor = armorStats(p2)

let p1CritChance = Math.min(50, Number(p1.int || 0) * 0.1)
let p2CritChance = Math.min(50, Number(p2.int || 0) * 0.1)
let p1DodgeChance = Math.min(50, Number(p1.agi || 0) * 0.1)
let p2DodgeChance = Math.min(50, Number(p2.agi || 0) * 0.1)
let p1ReductionChance = Math.min(25, (Number(p1.toughness || 0) + p1Armor.tough) * 0.1)
let p2ReductionChance = Math.min(25, (Number(p2.toughness || 0) + p2Armor.tough) * 0.1)

while (hp1 > 0 && hp2 > 0 && rounds < 12) {
rounds += 1

let crit1 = Math.random() * 100 < p1CritChance
let dodge2 = Math.random() * 100 < p2DodgeChance
if (!dodge2) {
let atk1 = weaponAtk(p1)
let dmg1 = Math.max(1, (p1.str + atk1 + Math.floor(Math.random() * 4)) - p2Armor.def)
if (Math.random() * 100 < p2ReductionChance) dmg1 = Math.max(1, Math.floor(dmg1 * 0.7))
if (crit1) dmg1 = Math.floor(dmg1 * 1.5)
hp2 -= dmg1
score1 += dmg1
}
if (hp2 <= 0) break

let crit2 = Math.random() * 100 < p2CritChance
let dodge1 = Math.random() * 100 < p1DodgeChance
if (!dodge1) {
let atk2 = weaponAtk(p2)
let dmg2 = Math.max(1, (p2.str + atk2 + Math.floor(Math.random() * 4)) - p1Armor.def)
if (Math.random() * 100 < p1ReductionChance) dmg2 = Math.max(1, Math.floor(dmg2 * 0.7))
if (crit2) dmg2 = Math.floor(dmg2 * 1.5)
hp1 -= dmg2
score2 += dmg2
}
}

if (hp1 === hp2) score1 += 1
if (hp1 > hp2) return { winner: p1, loser: p2, sWinner: score1, sLoser: score2 }
return { winner: p2, loser: p1, sWinner: score2, sLoser: score1 }
}

function applyPvpResult(winner, loser) {
let statPool = ['str', 'agi', 'int']
let picked = statPool[Math.floor(Math.random() * statPool.length)]

winner.gold += 50
winner[picked] += 1
winner.pvpWins += 1

loser.gold = Math.max(0, loser.gold - 50)
loser.hp = 1
loser.pvpLosses += 1

return picked
}

module.exports = {
normalizePvp,
getRankGrade,
runPvp,
applyPvpResult
}
