const itemDB = require('../database/item.json')

function ensureEnhanceState(player) {
if (!player.enhance || typeof player.enhance !== 'object' || Array.isArray(player.enhance)) {
player.enhance = { weapon: 0, armor: 0, pickaxe: 0, rod: 0, accessory1: 0, accessory2: 0 }
}
if (typeof player.enhance.weapon !== 'number') player.enhance.weapon = 0
if (typeof player.enhance.armor !== 'number') player.enhance.armor = 0
if (typeof player.enhance.pickaxe !== 'number') player.enhance.pickaxe = 0
if (typeof player.enhance.rod !== 'number') player.enhance.rod = 0
if (typeof player.enhance.accessory1 !== 'number') player.enhance.accessory1 = 0
if (typeof player.enhance.accessory2 !== 'number') player.enhance.accessory2 = 0
}

function normalizeAccessories(player) {
if (!player || typeof player !== 'object') return [null, null]
if (!Array.isArray(player.accessories)) player.accessories = []

if (player.accessories.length < 2) {
while (player.accessories.length < 2) player.accessories.push(null)
}
if (player.accessories.length > 2) {
player.accessories = player.accessories.slice(0, 2)
}

for (let i = 0; i < 2; i++) {
if (typeof player.accessories[i] === 'undefined') player.accessories[i] = null
}

if (player.accessory && !player.accessories[0]) {
player.accessories[0] = player.accessory
}

if (typeof player.accessory === 'undefined') player.accessory = null
return player.accessories
}

function getAccessoryBonuses(player) {
ensureEnhanceState(player)
let slots = normalizeAccessories(player)
let out = { str: 0, agi: 0, int: 0, tough: 0, crit: 0, dodge: 0, reduce: 0 }
for (let i = 0; i < slots.length; i++) {
let id = slots[i]
if (!id || !itemDB[id]) continue
let a = itemDB[id]
let lv = Math.max(0, Number(player.enhance[`accessory${i + 1}`] || 0))
let flatBonus = Math.floor(lv / 5)
let rateBonus = Math.floor(lv / 10)
out.str += Number(a.str || 0)
out.agi += Number(a.agi || 0)
out.int += Number(a.int || 0)
out.tough += Number(a.tough || 0)
out.crit += Number(a.crit || 0)
out.dodge += Number(a.dodge || 0)
out.reduce += Number(a.reduce || 0)
if (a.str) out.str += flatBonus
if (a.agi) out.agi += flatBonus
if (a.int) out.int += flatBonus
if (a.tough) out.tough += flatBonus
if (a.crit) out.crit += rateBonus
if (a.dodge) out.dodge += rateBonus
if (a.reduce) out.reduce += rateBonus
}
return out
}

function getWeaponAtk(player) {
ensureEnhanceState(player)
if (!player.weapon || !itemDB[player.weapon]) return 0
let baseRaw = Number(itemDB[player.weapon].atk || 0)
let base = Math.max(1, Math.floor(baseRaw * 1.2))
let lv = Math.max(0, Number(player.enhance.weapon || 0))
let bonus = Math.floor(base * (lv * 0.15))
return base + bonus
}

function getArmorDef(player) {
ensureEnhanceState(player)
if (!player.armor || !itemDB[player.armor]) return 0
let baseRaw = Number(itemDB[player.armor].def || 0)
let base = Math.max(1, Math.floor(baseRaw * 1.25))
let lv = Math.max(0, Number(player.enhance.armor || 0))
let bonus = Math.max(0, Math.floor(lv * 0.8))
return base + bonus
}

function getPickaxePower(player) {
ensureEnhanceState(player)
if (!player.pickaxe || !itemDB[player.pickaxe]) return 0
let base = Number(itemDB[player.pickaxe].miningPower || 0)
let lv = Math.max(0, Number(player.enhance.pickaxe || 0))
let bonus = Math.floor(lv / 3)
return base + bonus
}

function getRodPower(player) {
ensureEnhanceState(player)
if (!player.rod || !itemDB[player.rod]) return 0
let base = Number(itemDB[player.rod].fishingPower || 0)
let lv = Math.max(0, Number(player.enhance.rod || 0))
let bonus = Math.floor(lv / 3)
return base + bonus
}

module.exports = {
ensureEnhanceState,
getWeaponAtk,
getArmorDef,
getPickaxePower,
getRodPower,
normalizeAccessories,
getAccessoryBonuses
}
