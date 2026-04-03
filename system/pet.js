const PETS = {
none: {
name: 'No Pet',
desc: 'Tidak ada bonus.',
bonus: { str: 0, agi: 0, int: 0, tough: 0, crit: 0, dodge: 0, reduce: 0 }
},
flame_fox: {
name: 'Flame Fox',
desc: 'STR +6, Crit +2%',
bonus: { str: 6, agi: 0, int: 0, tough: 0, crit: 2, dodge: 0, reduce: 0 }
},
storm_wolf: {
name: 'Storm Wolf',
desc: 'AGI +6, Dodge +2%',
bonus: { str: 0, agi: 6, int: 0, tough: 0, crit: 0, dodge: 2, reduce: 0 }
},
void_owl: {
name: 'Void Owl',
desc: 'INT +6, Crit +2%',
bonus: { str: 0, agi: 0, int: 6, tough: 0, crit: 2, dodge: 0, reduce: 0 }
},
iron_turtle: {
name: 'Iron Turtle',
desc: 'TOUGH +8, Reduce +2%',
bonus: { str: 0, agi: 0, int: 0, tough: 8, crit: 0, dodge: 0, reduce: 2 }
}
}

function ensurePetState(player) {
if (!player || typeof player !== 'object') return
if (typeof player.pet !== 'string') player.pet = 'none'
if (!Array.isArray(player.pets)) player.pets = []
if (!PETS[player.pet]) player.pet = 'none'
player.pets = player.pets.filter((id) => PETS[id] && id !== 'none')
}

function hasPet(player, petId) {
ensurePetState(player)
if (petId === 'none') return true
return player.pets.includes(petId)
}

function addPet(player, petId) {
ensurePetState(player)
if (!PETS[petId] || petId === 'none') return false
if (player.pets.includes(petId)) return false
player.pets.push(petId)
return true
}

function getActivePet(player) {
ensurePetState(player)
return PETS[player.pet] ? player.pet : 'none'
}

function getActivePetBonus(player) {
let id = getActivePet(player)
return PETS[id].bonus
}

function getPetData(petId) {
return PETS[petId] || PETS.none
}

module.exports = {
PETS,
ensurePetState,
hasPet,
addPet,
getActivePet,
getActivePetBonus,
getPetData
}
