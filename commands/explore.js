const fs = require('fs')

module.exports = async (m,{sender})=>{

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if(!db[sender]) return m.reply("Buat karakter dulu pakai .start")

let player = db[sender]
if (typeof player.lastExplore !== 'number') player.lastExplore = 0
let now = Date.now()
let cooldown = 30000

if (now - player.lastExplore < cooldown) {
let sisa = Math.ceil((cooldown - (now - player.lastExplore)) / 1000)
return m.reply(`Explore cooldown, tunggu ${sisa} detik.`)
}

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

player.lastExplore = now
fs.writeFileSync('./database/player.json',JSON.stringify(db,null,2))

m.reply(text)

}
