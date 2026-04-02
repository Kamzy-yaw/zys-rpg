const fs = require('fs')
const { getQuestDailyKeyWIB } = require('../system/questreset')

module.exports = async (m, { sender }) => {

let db = JSON.parse(fs.readFileSync('./database/player.json'))

if (db[sender]) {
return m.reply("Kamu sudah punya karakter.\nCek status pakai .profile")
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
accessory: null,
accessories: [null, null],
pickaxe: null,
rod: null,
durability: {},
enhance: {
weapon: 0,
armor: 0,
pickaxe: 0,
rod: 0
},
inventory: [],
area: "field",
quest: {
active: null,
progress: 0,
claimable: false,
completed: {},
dailyKey: getQuestDailyKeyWIB()
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
stats: {
hunts: 0,
monstersKilled: 0,
mineRuns: 0,
fishRuns: 0,
dungeonRuns: 0,
dungeonClears: 0,
maxGold: 100
},
achievements: {
completed: []
},
titles: {
unlocked: ['Novice'],
equipped: 'Novice'
},
dungeon: {
dailyKey: '',
cleared: false
},
guildId: null,
maid: {
owned: false,
active: false,
autoFix: true,
autoHeal: true
},
lastHunt: 0
}

fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

m.reply(`Selamat datang, petualang!

Karakter berhasil dibuat.
Level: 1
Gold: 100
HP: 100

Langkah awal:
1) .hunt
2) .profile
3) .menu`)

}
