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
hp: 8200,
atk: 165,
def: 28,
critRes: 24,
rewardGold: 6800,
rewardExp: 11800
}

const MAIN_LOOT_TABLE = [
{ id: 'voidbreaker_sword', weight: 10 },
{ id: 'celestial_reaver', weight: 6 },
{ id: 'eternal_guard_armor', weight: 10 },
{ id: 'titan_warden_armor', weight: 6 },
{ id: 'astral_sigil', weight: 8 },
{ id: 'eclipse_charm', weight: 7 },
{ id: 'titan_core', weight: 8 },
{ id: 'phantom_feather', weight: 8 }
]

const PET_TABLE = [
{ id: 'flame_fox', chance: 4 },
{ id: 'storm_wolf', chance: 4 },
{ id: 'void_owl', chance: 3 },
{ id: 'iron_turtle', chance: 3 }
]

const SHARD_REDEEM = {
astral_sigil: 18,
phantom_feather: 18,
titan_core: 20,
eclipse_charm: 20,
voidbreaker_sword: 32,
eternal_guard_armor: 32,
celestial_reaver: 42,
titan_warden_armor: 42
}

function rollWeightedLoot(table, chance) {
if (Math.random() * 100 >= chance) return null
let totalWeight = table.reduce((sum, item) => sum + Number(item.weight || 0), 0)
if (totalWeight <= 0) return null
let roll = Math.random() * totalWeight
for (let item of table) {
roll -= Number(item.weight || 0)
if (roll < 0) return item.id
}
return table[table.length - 1].id
}

function rollPet(table) {
let got = []
for (let x of table) {
if (Math.random() * 100 < x.chance) got.push(x.id)
}
return got
}

module.exports = async (m, { sender, args }) => {
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
if (typeof p.legendShard !== 'number') p.legendShard = 0
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

let sub = String(args[0] || '').toLowerCase()
if (sub === 'shard' || sub === 'redeem') {
let list = Object.keys(SHARD_REDEEM).map((id) => `- ${id}: ${SHARD_REDEEM[id]} Shard`).join('\n')
let picked = String(args[1] || '').toLowerCase()
if (!picked) {
return m.reply(`Legend Shard: ${p.legendShard}\n\nRedeem List:\n${list}\n\nPakai: .legendboss redeem <item_id>`)
}
if (!SHARD_REDEEM[picked] || !itemDB[picked]) {
return m.reply(`Item redeem tidak valid.\n\nRedeem List:\n${list}`)
}
let cost = SHARD_REDEEM[picked]
if (p.legendShard < cost) return m.reply(`Legend Shard kurang. Butuh ${cost}, kamu punya ${p.legendShard}.`)
p.legendShard -= cost
p.inventory.push(picked)
ensureItemDurability(p, picked)
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`Redeem sukses: ${itemDB[picked].name}\nBiaya: ${cost} Legend Shard\nSisa Shard: ${p.legendShard}`)
}

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
 p.legendShard += 1
p.lastLegendBoss = now
fs.writeFileSync('./database/player.json', JSON.stringify(db, null, 2))
return m.reply(`${text}\n\nBoss belum tumbang.\nPenalty: -${penalty} Gold\nHP jadi 1\nShard: +1 Legend Shard (Total ${p.legendShard})`) 
}

let rewardExp = applyExpRoleBonus(BOSS.rewardExp, p)
p.gold += BOSS.rewardGold
p.exp += rewardExp
p.legendShard += 3

let mainLoot = rollWeightedLoot(MAIN_LOOT_TABLE, 24)
let loot = []
if (mainLoot) {
loot.push(mainLoot)
p.inventory.push(mainLoot)
ensureItemDurability(p, mainLoot)
}

let petDrop = rollPet(PET_TABLE)
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

let msg = `${text}\n\nBOSS TUMBANG!\nReward:\n+${BOSS.rewardGold} Gold\n+${rewardExp} EXP\n+3 Legend Shard (Total ${p.legendShard})\n\nDrop Legendary:\n${lootTxt}\n\nPet Unlock:\n${petTxt}${lvText}\n\nPity Shop: .legendboss redeem`
// Announcement removed to avoid global mention risks
return m.reply(msg)
}
