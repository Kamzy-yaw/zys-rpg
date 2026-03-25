module.exports = function levelUp(player) {

let need = player.level * 100

if (player.exp >= need) {

player.level += 1
player.exp -= need

player.maxhp += 20
player.hp = player.maxhp

player.str += 2
player.agi += 1
player.int += 1

return true
}

return false
}
