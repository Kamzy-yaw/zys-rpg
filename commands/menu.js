module.exports = async (m) => {

let text = `*╔═══ RPG v2 COMMAND CENTER ═══╗*
*╚═ update terbaru: pvp, raid, farm, craft ═╝*

*🎮 BASIC*
• .start
• .profile
• .menu

*⚔️ COMBAT*
• .hunt
• .explore
• .heal [big/full]
• .train str|agi|int
• .travel <area>
• .raid [1/2] (Lv20+)

*🏟️ PVP*
• .duel @user
• .duel accept
• .duel decline
• .arena join
• .arena leave
• .arena list
• .arena (fight)
• .rank

*🎲 LOOT & ECONOMY*
• .shop
• .gacha
• .fish
• .mine
• .craft
• .sell <no> [jumlah]
• .fix <no>

*🌾 FARMING*
• .plant <wheat|berry|magic_herb>
• .harvest

*🎒 INVENTORY*
• .inventory

*📌 QUEST*
• .quest
• .accept <id_quest>
• .claim

*🏆 LEADERBOARD*
• .top
• .topgold
• .toplevel

*🗓 WEEKLY*
• .weeklyreset confirm

_Tips: .buy ada di .shop, .equip/.sell/.fix ada di .inventory._`

m.reply(text)

}
