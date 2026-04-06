module.exports = async (m) => {
let text = `╔══ RPG v2 MENU ══

🚀 QUICK START
1. .start
2. .hunt
3. .profile
4. .inventory

══════════════

📘 BASIC
.start
.profile
.role [nama]
.ach
.title
.menu
.channel
.maid
.pet

⚔ COMBAT
.hunt
.explore
.heal [big/full]
.train str|agi|int|random
.travel <area>
.raid <1-10> (Lv20+)
.raid test
.raid list
.legendboss
.legendboss shard
.legendboss redeem <item_id>
.dungeon
.dungeon exp

🏆 PVP
.duel @user
.duel accept
.duel decline
.arena join
.arena leave
.arena list
.arena
.rank
.party

💰 LOOT & ECONOMY
.shop
.buy <no> [jumlah]
.gacha
.fish
.open [jumlah]
.mine
.mining
.craft
.enhance <weapon|armor|pickaxe|rod|accessory>
.sell <no> [jumlah]
.fix <armor|pickaxe|rod|sword>
.market

🌱 FARMING
.plant <wheat|berry|magic_herb>
.harvest

🎒 INVENTORY
.inventory

📜 QUEST
.quest
.accept <id_quest>
.claim
.cancel / .cancelquest
Reset quest: tiap hari jam 07:00

📊 LEADERBOARD
.top
.topgold
.toplevel

🛠 ADMIN
.seasonreset confirm
.dbbackup
.dbstatus
.dblatest
.dbrestore latest
.gold @pemain 1000

🏰 GUILD
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

💡 Tips
.buy ada di .shop
.equip/.sell/.fix ada di .inventory
aksesori 2 slot: .equip <nomor> 1 atau 2
market cancel: .market cancel <id>`

m.reply(text)
}
