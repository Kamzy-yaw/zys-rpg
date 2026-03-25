module.exports = function dropItem(mob) {

if (!mob.drops) return null

for (let drop of mob.drops) {

let roll = Math.random() * 100

if (roll < drop.chance) {
return drop.item
}

}

return null
}
