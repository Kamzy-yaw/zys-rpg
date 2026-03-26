module.exports = function levelUp(player) {

let need = player.level * 100

if (player.exp >= need) {

player.level += 1
player.exp -= need

let hpGain = player.level < 20 ? 20 : (player.level < 35 ? 14 : 10)
player.maxhp += hpGain
player.hp = player.maxhp

if (typeof player.str !== 'number') player.str = 5
if (typeof player.agi !== 'number') player.agi = 5
if (typeof player.int !== 'number') player.int = 5
if (typeof player.toughness !== 'number') player.toughness = 0

let pool = ['str', 'agi', 'int', 'toughness']
let gains = { str: 0, agi: 0, int: 0, toughness: 0 }
let gainCount = player.level < 20 ? 4 : (player.level < 35 ? 3 : 2)

for (let i = 0; i < gainCount; i++) {
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
