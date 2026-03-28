module.exports = function levelUp(player) {
const MAX_LEVEL = 150

if (typeof player.level !== 'number') player.level = 1
if (typeof player.exp !== 'number') player.exp = 0

if (player.level >= MAX_LEVEL) {
player.level = MAX_LEVEL
let capNeed = MAX_LEVEL * 100
if (player.exp >= capNeed) player.exp = capNeed - 1
return false
}

let need = player.level * 100

if (player.exp >= need) {

player.level += 1
player.exp -= need

let hpGain = 20
if (player.level >= 120) hpGain = 8
else if (player.level >= 80) hpGain = 10
else if (player.level >= 40) hpGain = 14

player.maxhp += hpGain
player.hp = player.maxhp

if (typeof player.str !== 'number') player.str = 5
if (typeof player.agi !== 'number') player.agi = 5
if (typeof player.int !== 'number') player.int = 5
if (typeof player.toughness !== 'number') player.toughness = 0

let pool = ['str', 'agi', 'int', 'toughness']
let gains = { str: 0, agi: 0, int: 0, toughness: 0 }

let gainRoll = 4
if (player.level >= 130) gainRoll = 1
else if (player.level >= 90) gainRoll = 2
else if (player.level >= 50) gainRoll = 3

for (let i = 0; i < gainRoll; i++) {
let stat = pool[Math.floor(Math.random() * pool.length)]
player[stat] += 1
gains[stat] += 1
}

return {
level: player.level,
gains
}
}

return false
}
