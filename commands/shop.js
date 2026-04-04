const itemDB = require('../database/item.json')
const { getPetData } = require('../system/pet')

module.exports = async (m)=>{

let text = "╔══ 🏪 ARMORY & SHOP ══\n\n"

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

text += `${i}. ${item.name}\n   ${bonus || '-'}\n   💰 ${item.price} Gold\n`

i++

}

text += "\n══════════════\n💡 Ketik .buy <nomor> [jumlah]"

m.reply(text)

}
