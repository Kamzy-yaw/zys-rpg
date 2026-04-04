const itemDB = require('../database/item.json')
const { getPetData } = require('../system/pet')

module.exports = async (m)=>{

let text = "\u2554\u2550\u2550\u2550\u2550\u2550 \uD83C\uDFEA ARMORY & SHOP \u2550\u2550\u2550\u2550\u2550\u2557\n\n"

let i = 1

let ids = Object.keys(itemDB).filter((id) => typeof itemDB[id].price === 'number')

for(let id of ids){

let item = itemDB[id]
let bonus = ""

if (item.type === "weapon") bonus = `ATK +${item.atk}`
if (item.type === "armor") bonus = `DEF +${item.def} | TOUGH +${item.tough || 0}`
if (item.type === "potion") bonus = `Heal ${item.heal} HP`
if (item.type === "pickaxe") bonus = `Mining Power +${item.miningPower}`
if (item.type === "rod") bonus = `Fishing Power +${item.fishingPower}`
if (item.type === "potion" && item.fullHeal) bonus = "Full Heal HP"
if (item.type === "pet") {
let pet = getPetData(item.unlockPet || 'none')
bonus = pet.desc || "Unlock Pet"
}

text += `${i}. ${item.name}\n   ${bonus} | ${item.price} Gold\n`

i++

}

text += "\n\u255A\u2550 Ketik .buy <nomor> [jumlah] untuk beli item \u2550\u255D"

m.reply(text)

}
