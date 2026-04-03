const ROLE_DATA = {
none: {
name: 'None',
desc: 'Tanpa bonus role.',
bonus: { damageMult: 0, dodgeBonus: 0, expMult: 0, reduceChanceBonus: 0, toughBonus: 0 }
},
warrior: {
name: 'Warrior',
desc: '+5% damage serangan.',
bonus: { damageMult: 0.05, dodgeBonus: 0, expMult: 0, reduceChanceBonus: 0, toughBonus: 0 }
},
ranger: {
name: 'Ranger',
desc: '+3% dodge chance.',
bonus: { damageMult: 0, dodgeBonus: 3, expMult: 0, reduceChanceBonus: 0, toughBonus: 0 }
},
scholar: {
name: 'Scholar',
desc: '+8% EXP reward.',
bonus: { damageMult: 0, dodgeBonus: 0, expMult: 0.08, reduceChanceBonus: 0, toughBonus: 0 }
},
tanker: {
name: 'Tanker',
desc: '+5% damage reduction chance.',
bonus: { damageMult: 0, dodgeBonus: 0, expMult: 0, reduceChanceBonus: 5, toughBonus: 0 }
}
}

function ensureRoleState(player) {
if (!player || typeof player !== 'object') return
if (typeof player.role !== 'string' || !ROLE_DATA[player.role]) player.role = 'none'
}

function getRoleKey(player) {
ensureRoleState(player)
return player.role
}

function getRoleData(roleKey) {
return ROLE_DATA[roleKey] || ROLE_DATA.none
}

function getRoleBonuses(player) {
let key = getRoleKey(player)
return getRoleData(key).bonus
}

function applyExpRoleBonus(expValue, player) {
let base = Math.max(0, Math.floor(Number(expValue || 0)))
let b = getRoleBonuses(player)
let mult = 1 + Number(b.expMult || 0)
return Math.max(0, Math.floor(base * mult))
}

module.exports = {
ROLE_DATA,
ensureRoleState,
getRoleKey,
getRoleData,
getRoleBonuses,
applyExpRoleBonus
}
