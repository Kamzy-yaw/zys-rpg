module.exports = async (m) => {
let text = `*RPG v2 COMMAND CENTER*

*BASIC*
.start
.profile
.menu
.channel

*COMBAT*
.hunt
.explore
.heal [big/full]
.train str|agi|int
.travel <area>
.raid <1-5> (Lv20+)
.raid list

*PVP*
.duel @user
.duel accept
.duel decline
.arena join
.arena leave
.arena list
.arena (fight)
.rank

*LOOT & ECONOMY*
.shop
.gacha
.fish
.mine
.mining
.craft
.sell <no> [jumlah]
.fix <no>

*FARMING*
.plant <wheat|berry|magic_herb>
.harvest

*INVENTORY*
.inventory

*QUEST*
.quest
.accept <id_quest>
.claim
.cancel / .cancelquest

*LEADERBOARD*
.top
.topgold
.toplevel

*WEEKLY*
.weeklyreset confirm

Tips: .buy ada di .shop, .equip/.sell/.fix ada di .inventory.`

m.reply(text)
}
