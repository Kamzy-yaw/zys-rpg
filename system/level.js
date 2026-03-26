module.exports = function levelUp(player) {

let need = player.level * 100

if (player.exp >= need) {

player.level += 1
player.exp -= need

player.maxhp += 20
player.hp = player.maxhp

if (typeof player.str !== 'number') player.str = 5
if (typeof player.agi !== 'number') player.agi = 5
if (typeof player.int !== 'number') player.int = 5
if (typeof player.toughness !== 'number') player.toughness = 0

let pool = ['str', 'agi', 'int', 'toughness']
let gains = { str: 0, agi: 0, int: 0, toughness: 0 }

for (let i = 0; i < 4; i++) {
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
