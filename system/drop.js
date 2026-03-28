const itemDB = require('../database/item.json')

function adjustedChance(baseChance, itemId, mob) {
let chance = Number(baseChance || 0)
let data = itemDB[itemId] || {}
let type = data.type || ''
let sell = Number(data.sellPrice || 0)
let rarity = Number(mob.rarity || 0)

// Rework economy: item langka diturunkan drop rate-nya secara global.
if (type === 'weapon' || type === 'armor') chance *= 0.45
else if (type === 'potion') chance *= 0.85
else if (type === 'resource' && sell >= 120) chance *= 0.5
else if (type === 'resource' && sell >= 60) chance *= 0.75

// Monster langka tidak otomatis bikin drop item terlalu sering.
if (rarity > 0 && rarity <= 3) chance *= 0.8

return chance
}

module.exports = function dropItem(mob) {

if (!mob.drops) return null

for (let drop of mob.drops) {

let roll = Math.random() * 100
let chance = adjustedChance(drop.chance, drop.item, mob)

if (roll < chance) {
return drop.item
}

}

return null
}
