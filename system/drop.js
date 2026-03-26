module.exports = function dropItem(mob) {

if (!mob.drops) return null

for (let drop of mob.drops) {

let roll = Math.random() * 100
let chance = Number(drop.chance || 0)

// Nerf global untuk item langka agar progression economy lebih panjang.
if (chance >= 25) chance *= 0.9
if (chance >= 15 && chance < 25) chance *= 0.75
if (chance < 15) chance *= 0.6

if (roll < chance) {
return drop.item
}

}

return null
}
