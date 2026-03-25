module.exports = async (m) => {

let text = `*╔═══ RPG v2 COMMAND CENTER ═══╗*
*╚═ Petualangan, economy, leaderboard ═╝*

*🎮 BASIC*
• .start
• .profile
• .menu

*⚔️ COMBAT*
• .hunt
• .explore
• .heal
• .train str|agi|int
• .travel <area>
• .duel @user
• .arena
• .rank

*🎲 LOOT & ECONOMY*
• .shop
• .gacha
• .fish
• .mine
• .craft
• .sell <no>

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

_Tips: .buy ada di .shop, .equip/.sell ada di .inventory._`

m.reply(text)

}
