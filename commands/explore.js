const fs = require('fs')

module.exports = async (m,{sender})=>{

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if(!db[sender]) return m.reply("Buat karakter dulu pakai .start")

let player = db[sender]

let rand = Math.random()

let text = "\uD83C\uDF32 Kamu menjelajah area...\n\n"

if(rand < 0.4){

let gold = Math.floor(Math.random()*30)+10
player.gold += gold

text += `Kamu menemukan ${gold} gold`

}

else if(rand < 0.7){

text += "Monster menyerang!\nGunakan .hunt"

}

else{

text += "Tidak terjadi apa-apa..."

}

fs.writeFileSync('./database/player.json',JSON.stringify(db,null,2))

m.reply(text)

}
