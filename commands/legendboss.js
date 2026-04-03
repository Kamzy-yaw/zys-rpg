const fs = require('fs')
const itemDB = require('../database/item.json')
const levelUp = require('../system/level')
const { ensureDurabilityState, ensureItemDurability, useDurability } = require('../system/equipment')
const { ensureEnhanceState, getWeaponAtk, getArmorDef, getAccessoryBonuses, normalizeAccessories } = require('../system/gearstats')
const { ensureRoleState, getRoleBonuses, applyExpRoleBonus } = require('../system/role')
const { ensurePetState, addPet, getActivePetBonus } = require('../system/pet')

const BOSS = {
name: 'Astra Dreadlord',
minLevel: 60,
hp: 9800,
atk: 185,
def: 34,
critRes: 30,
rewardGold: 8500,
rewardExp: 15000
}

const LOOT_TABLE = [
{ id: 'voidbreaker_sword', chance: 5 },
{ id: 'celestial_reaver', chance: 3 },
{ id: 'eternal_guard_armor', chance: 5 },
{ id: 'titan_warden_armor', chance: 3 }
]

const PET_TABLE = [
{ id: 'flame_fox', chance: 4 },
{ id: 'storm_wolf', chance: 4 },
{ id: 'void_owl', chance: 3 },
{ id: 'iron_turtle', chance: 3 }
]

function rollLoot(table) {
let got = []
for (let x of table) {
if (Math.random() * 100 < x.chance) got.push(x.id)
}
return got
}

module.exports = async (m, { sender }) => {
let db = JSON.parse(fs.readFileSync('./database/player.json'))
if (!db[sender]) return m.reply('Bikin karakter dulu pakai .start')

let p = db[sender]
if (typeof p.level !== 'number') p.level = 1
if (typeof p.hp !== 'number') p.hp = p.maxhp || 100
if (typeof p.maxhp !== 'number') p.maxhp = 100
if (typeof p.str !== 'number') p.str = 5
if (typeof p.agi !== 'number') p.agi = 5
if (typeof p.int !== 'number') p.int = 5
if (typeof p.toughness !== 'number') p.toughness = 0
if (typeof p.gold !== 'number') p.gold = 0
if (typeof p.exp !== 'number') p.exp = 0
if (typeof p.lastLegendBoss !== 'number') p.lastLegendBoss = 0
if (!Array.isArray(p.inventory)) p.inventory = []
if (p.weapon === undefined) p.weapon = null
if (p.armor === undefined) p.armor = null
if (!p.maid || typeof p.maid !== 'object') p.maid = { owned: false, active: false, autoFix: true, autoHeal: true }
if (typeof p.maid.owned !== 'boolean') p.maid.owned = false
if (typeof p.maid.active !== 'boolean') p.maid.active = false

ensureDurabilityState(p)
ensureEnhanceState(p)
normalizeAccessories(p)
ensureRoleState(p)
ensurePetState(p)

if (p.level < BOSS.minLevel) {
return m.reply(`Legend Boss butuh minimal level ${BOSS.minLevel}.`) 
}

let now = Date.now()
let cooldown = 90 * 60 * 1000
if (now - p.lastLegendBoss < cooldown) {
let sisa = Math.ceil((cooldown - (now - p.lastLegendBoss)) / 60000)
return m.reply(`Legend Boss cooldown. Coba lagi ${sisa} menit.`)
}

let weaponAtk = 0
let armorDef = 0
let armorTough = 0
let accessoryBonus = getAccessoryBonuses(p)
let roleBonus = getRoleBonuses(p)
let petBonus = getActivePetBonus(p)

if (p.weapon && itemDB[p.weapon]) {
ensureItemDurability(p, p.weapon)
weaponAtk = getWeaponAtk(p)
}
if (p.armor && itemDB[p.armor]) {
ensureItemDurability(p, p.armor)
armorDef = getArmorDef(p)
armorTough = Number(itemDB[p.armor].tough || 0)
}

let maidBuff = (p.maid.owned && p.maid.active) ? 10 : 0
let effectiveStr = Number(p.str || 0) + Number(accessoryBonus.str || 0) + maidBuff + Number(petBonus.str || 0)
let effectiveAgi = Number(p.agi || 0) + Number(accessoryBonus.agi || 0) + maidBuff + Number(petBonus.agi || 0)
let effectiveInt = Number(p.int || 0) + Number(accessoryBonus.int || 0) + maidBuff + Number(petBonus.int || 0)
let effectiveTough = Number(p.toughness || 0) + Number(accessoryBonus.tough || 0) + armorTough + maidBuff + Number(roleBonus.toughBonus || 0) + Number(petBonus.tough || 0)

let critChance = Math.min(55, (effectiveInt * 0.1) + Number(accessoryBonus.crit || 0) + Number(petBonus.crit || 0))
let dodgeChance = Math.min(55, (effectiveAgi * 0.1) + Number(accessoryBonus.dodge || 0) + Number(roleBonus.dodgeBonus || 0) + Number(petBonus.dodge || 0))
let reduceChance = Math.min(35, (effectiveTough * 0.1) + Number(accessoryBonus.reduce || 0) + Number(roleBonus.reduceChanceBonus || 0) + Number(petBonus.reduce || 0))

let bossHp = BOSS.hp
let rounds = 0
let logs = []

while (bossHp > 0 && p.hp > 0 && rounds < 30) {
rounds += 1
let crit = Math.random() * 100 < Math.max(0, critChance - Number(BOSS.critRes || 0))
let base = weaponAtk > 0
? Math.max(1, Math.floor(weaponAtk * (1 + (effectiveStr / 120))))
: Math.max(1, Math.floor(1 + (effectiveStr * 0.35)))
if (Number(roleBonus.damageMult || 0) > 0) base = Math.max(1, Math.floor(base * (1 + Number(roleBonus.damageMult))))
let dmg = Math.max(1, base - Number(BOSS.def || 0))
if (crit) dmg = Math.floor(dmg * 1.6)

bossHp -= dmg
logs.push(`Ronde ${rounds}: kamu hit boss -${dmg}${crit ? ' (CRIT)' : ''}`)
if (bossHp <= 0) break

let dodged = Math.random() * 100 < dodgeChance
if (dodged) {
logs.push(`Ronde ${rounds}: kamu dodge serangan boss`)
continue
}
let reduced = Math.random() * 100 < reduceChance
let rawTaken = Math.max(1, BOSS.atk + Math.floor(Math.random() * 8))
let taken = Math.max(1, rawTaken - armorDef)
if (reduced) taken = Math.max(1, Math.floor(taken * 0.7))
p.hp -= taken
logs.push(`Ronde ${rounds}: boss hit kamu -${taken}${reduced ? ' (REDUCE)' : ''}`)
}

let text = `LEGEND BOSS: ${BOSS.name}\nHP Boss: ${BOSS.hp}\nHP Kamu: ${Math.max(0, p.hp)}/${p.maxhp}\n\n${logs.slice(0, 10).join('\n')}${logs.length > 10 ? '\n...' : ''}`

if (bossHp > 0) {
let penalty = Math.min(p.gold, 200)
p.gold -= penalty
p.hp = 1
p.lastLegendBoss = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`${text}\n\nBoss belum tumbang.\nPenalty: -${penalty} Gold\nHP jadi 1`) 
}

let rewardExp = applyExpRoleBonus(BOSS.rewardExp, p)
p.gold += BOSS.rewardGold
p.exp += rewardExp

let loot = rollLoot(LOOT_TABLE)
for (let id of loot) {
p.inventory.push(id)
ensureItemDurability(p, id)
}

let petDrop = rollLoot(PET_TABLE)
let unlockedPets = []
for (let petId of petDrop) {
if (addPet(p, petId)) unlockedPets.push(petId)
}

let lvResult = levelUp(p)
let lvText = ''
if (lvResult) {
let g = lvResult.gains
let gainText = []
if (g.str) gainText.push(`STR +${g.str}`)
if (g.agi) gainText.push(`AGI +${g.agi}`)
if (g.int) gainText.push(`INT +${g.int}`)
if (g.toughness) gainText.push(`TOUGH +${g.toughness}`)
lvText = `\nLEVEL UP!\nLevel sekarang: ${p.level}\nBonus: ${gainText.join(', ')}`
}

if (p.weapon) useDurability(p, p.weapon, 2)
if (p.armor) useDurability(p, p.armor, 2)

p.lastLegendBoss = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))

let lootTxt = loot.length ? loot.map((id) => `- ${itemDB[id] ? itemDB[id].name : id}`).join('\n') : '- Tidak ada item legendary'
let petTxt = unlockedPets.length ? unlockedPets.map((id) => `- ${id}`).join('\n') : '- Tidak ada pet baru'

let msg = `${text}\n\nBOSS TUMBANG!\nReward:\n+${BOSS.rewardGold} Gold\n+${rewardExp} EXP\n\nDrop Legendary:\n${lootTxt}\n\nPet Unlock:\n${petTxt}${lvText}`

if (loot.length || unlockedPets.length) {
let ann = []
if (loot.length) ann.push(loot.map((id) => itemDB[id] ? itemDB[id].name : id).join(', '))
if (unlockedPets.length) ann.push(`Pet: ${unlockedPets.join(', ')}`)
msg += `\n\n[WORLD ANNOUNCEMENT]\n@${String(sender).replace(/\D/g, '')} menaklukkan ${BOSS.name}!\nDrop: ${ann.join(' | ')}`
return m.reply({ text: msg, mentions: [sender] })
}

return m.reply(msg)
}
