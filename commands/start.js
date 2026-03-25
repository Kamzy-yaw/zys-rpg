const fs = require('fs')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (db[sender]) {
return m.reply("Kamu udah punya karakter.")
}

db[sender] = {
name: sender,
level: 1,
exp: 0,
gold: 100,
hp: 100,
maxhp: 100,
str: 5,
agi: 5,
int: 5,
toughness: 0,
weapon: null,
armor: null,
inventory: [],
area: "field",
quest: {
active: null,
progress: 0,
claimable: false,
completed: {}
},
lastTrain: 0,
lastFish: 0,
lastMine: 0,
lastGacha: 0,
pvpWins: 0,
pvpLosses: 0,
lastHunt: 0
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`🏰 Selamat datang petualang!

Karakter berhasil dibuat.

Level: 1
Gold: 100
HP: 100

Gunakan .hunt untuk berburu monster.`)

}
