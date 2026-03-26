const itemDB = require('../database/item.json')

function ensureDurabilityState(player) {
if (!player.durability || typeof player.durability !== 'object' || Array.isArray(player.durability)) {
player.durability = {}
}
if (player.weapon === undefined) player.weapon = null
if (player.armor === undefined) player.armor = null
}

function ensureItemDurability(player, itemId) {
ensureDurabilityState(player)
if (!itemId || !itemDB[itemId]) return
let max = Number(itemDB[itemId].durability || 0)
if (!max) return
if (typeof player.durability[itemId] !== 'number') {
player.durability[itemId] = max
}
}

function useDurability(player, itemId, amount = 1) {
ensureDurabilityState(player)
if (!itemId || !itemDB[itemId]) return { broken: false, current: 0, max: 0 }
let max = Number(itemDB[itemId].durability || 0)
if (!max) return { broken: false, current: 0, max: 0 }

ensureItemDurability(player, itemId)
player.durability[itemId] -= amount
if (player.durability[itemId] < 0) player.durability[itemId] = 0

let broken = player.durability[itemId] === 0
if (broken) {
if (player.weapon === itemId) player.weapon = null
if (player.armor === itemId) player.armor = null
}

return { broken, current: player.durability[itemId], max }
}

function getDurability(player, itemId) {
ensureDurabilityState(player)
if (!itemId || !itemDB[itemId]) return null
let max = Number(itemDB[itemId].durability || 0)
if (!max) return null
ensureItemDurability(player, itemId)
return { current: player.durability[itemId], max }
}

module.exports = {
ensureDurabilityState,
ensureItemDurability,
useDurability,
getDurability
}
