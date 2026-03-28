const fs = require('fs')

function getQuestDailyKey() {
let d = new Date()
if (d.getHours() < 7) d.setDate(d.getDate() - 1)
d.setHours(7, 0, 0, 0)
let y = d.getFullYear()
let m = String(d.getMonth() + 1).padStart(2, '0')
let day = String(d.getDate()).padStart(2, '0')
return `${y}-${m}-${day}`
}

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
pickaxe: null,
durability: {},
inventory: [],
area: "field",
quest: {
active: null,
 progress: 0,
 claimable: false,
 completed: {},
 dailyKey: getQuestDailyKey()
},
lastTrain: 0,
lastFish: 0,
lastMine: 0,
lastGacha: 0,
lastExplore: 0,
pvpCooldown: 0,
lastRaid: 0,
miningExp: 0,
miningLevel: 1,
farm: {
crop: null,
plantedAt: 0
},
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
