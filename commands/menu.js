module.exports = async (m) => {
let text = `*RPG v2 MENU*

Mulai cepat:
1) .start
2) .hunt
3) .profile
4) .inventory

*BASIC*
.start
.profile
.ach
.title
.menu
.channel
.maid

*COMBAT*
.hunt
.explore
.heal [big/full]
.train str|agi|int|random
.travel <area>
.raid <1-10> (Lv20+)
.raid test
.raid list
.dungeon
.dungeon exp

*PVP*
.duel @user
.duel accept
.duel decline
.arena join
.arena leave
.arena list
.arena (fight)
.rank
.party

*LOOT & ECONOMY*
.shop
.buy <no> [jumlah]
.gacha
.fish
.open [jumlah]
.mine
.mining
.craft
.enhance <weapon|armor|pickaxe>
.sell <no> [jumlah]
.fix <no>
.market

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
Quest reset: tiap hari jam 07:00

*LEADERBOARD*
.top
.topgold
.toplevel

*SEASON RESET (ADMIN)*
.seasonreset confirm

*GUILD*
.guild
.guild list
.guild create <nama>
.guild join <nama>
.guild leave
.guild upgrade
.guild promote @user
.guild demote @user
.guild kick @user
.guild contrib
.guildraid

Tips:
- .buy ada di .shop
- .equip/.sell/.fix ada di .inventory
- aksesori 2 slot: .equip <nomor> 1 atau .equip <nomor> 2
- title: .title | achievement: .ach
- party: .party | market: .market
- market cancel: .market cancel <id>
Format kategori: .sell equipment|resource|consumable <no> [jumlah]
.fix equipment <no>`

m.reply(text)
}
