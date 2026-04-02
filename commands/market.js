const fs = require('fs')
const itemDB = require('../database/item.json')
const { normalizeAccessories } = require('../system/gearstats')

const PLAYER_PATH = './database/player.json'
const MARKET_PATH = './database/market.json'
const MAX_LISTINGS_PER_PLAYER = 5
const TAX_RATE = 0.05
const EXPIRE_MS = 24 * 60 * 60 * 1000

function readPlayers() {
if (!fs.existsSync(PLAYER_PATH)) return {}
return JSON.parse(fs.readFileSync(PLAYER_PATH))
}

function savePlayers(data) {
fs.writeFileSync(PLAYER_PATH, JSON.stringify(data, null, 2))
}

function readMarket() {
if (!fs.existsSync(MARKET_PATH)) return { nextId: 1, listings: [] }
let data = JSON.parse(fs.readFileSync(MARKET_PATH))
if (typeof data.nextId !== 'number') data.nextId = 1
if (!Array.isArray(data.listings)) data.listings = []
return data
}

function saveMarket(data) {
fs.writeFileSync(MARKET_PATH, JSON.stringify(data, null, 2))
}

function digits(v) {
return String(v || '').replace(/\D/g, '')
}

function asTag(id, fallback) {
let num = digits(id)
if (!num) return fallback || String(id || 'Unknown')
return `@${num}`
}

function buildUniqueOrder(inv) {
let seen = {}
let out = []
for (let id of inv) {
if (!seen[id]) {
seen[id] = true
out.push(id)
}
}
return out
}

function ensurePlayerState(player) {
if (!player || typeof player !== 'object') return
if (!Array.isArray(player.inventory)) player.inventory = []
if (typeof player.gold !== 'number') player.gold = 0
normalizeAccessories(player)
}

function collectExpiredListings(market, players) {
let now = Date.now()
let expired = []
let keep = []
for (let x of market.listings) {
if (!x || typeof x !== 'object') continue
let age = now - Number(x.createdAt || now)
if (age >= EXPIRE_MS && Number(x.qty || 0) > 0) expired.push(x)
else keep.push(x)
}

for (let x of expired) {
if (!players[x.seller]) continue
ensurePlayerState(players[x.seller])
players[x.seller].inventory.push(...Array(Number(x.qty || 0)).fill(x.itemId))
}

market.listings = keep
return expired
}

function timeLeftText(createdAt) {
let left = EXPIRE_MS - (Date.now() - Number(createdAt || Date.now()))
if (left < 0) left = 0
let h = Math.floor(left / 3600000)
let m = Math.floor((left % 3600000) / 60000)
return `${h}j ${m}m`
}

module.exports = async (m, { sender, args, send }) => {
let players = readPlayers()
if (!players[sender]) return m.reply('Bikin karakter dulu pakai .start')
for (let id of Object.keys(players)) ensurePlayerState(players[id])
let player = players[sender]

let market = readMarket()
let expiredListings = collectExpiredListings(market, players)
let action = String(args[0] || '').toLowerCase()

if (expiredListings.length && typeof send === 'function') {
for (let x of expiredListings) {
if (!players[x.seller]) continue
let name = itemDB[x.itemId] ? itemDB[x.itemId].name : x.itemId
let msg = `? Market Expired\n\nListing #${x.id} sudah lewat 24 jam.\nItem dikembalikan:\n${name} x${x.qty}`
await send(x.seller, msg).catch(() => {})
}
}

if (!action || action === 'help') {
let msg =
`Market Command:
.market list
.market sell <no_inventory> <jumlah> <harga_per_item>
.market buy <listing_id> [jumlah]
.market cancel <listing_id>

Rules:
- Maks 5 listing aktif per player
- Tax transaksi: 5%
- Listing expired 24 jam, item otomatis balik

Contoh:
.market sell 8 5 120
.market buy 3 2
.market cancel 7`
if (expiredListings.length > 0) msg += `\n\n${expiredListings.length} listing expired sudah diproses.`
savePlayers(players)
saveMarket(market)
return m.reply(msg)
}

if (action === 'list') {
if (!market.listings.length) {
let msg = 'Market masih kosong.'
if (expiredListings.length > 0) msg += `\n${expiredListings.length} listing expired sudah diproses.`
savePlayers(players)
saveMarket(market)
return m.reply(msg)
}

let rows = market.listings
.filter((x) => x.qty > 0)
.sort((a, b) => a.id - b.id)
.slice(0, 40)
.map((x) => {
let name = itemDB[x.itemId] ? itemDB[x.itemId].name : x.itemId
return `#${x.id} | ${name}\nQty: ${x.qty} | Harga: ${x.price} Gold/item\nSeller: ${asTag(x.seller, x.seller)} | Expire: ${timeLeftText(x.createdAt)}`
})

let msg = `Market Listing\n(Tax transaksi 5%)\n\n${rows.join('\n\n')}`
if (expiredListings.length > 0) msg += `\n\n${expiredListings.length} listing expired sudah diproses.`
savePlayers(players)
saveMarket(market)
return m.reply(msg)
}

if (action === 'sell') {
let myActive = market.listings.filter((x) => x.seller === sender && x.qty > 0).length
if (myActive >= MAX_LISTINGS_PER_PLAYER) {
savePlayers(players)
saveMarket(market)
return m.reply(`Kamu sudah mencapai batas listing aktif (${MAX_LISTINGS_PER_PLAYER}).\nCancel dulu pakai .market cancel <id>.`)
}

let idx = parseInt(args[1]) - 1
let qty = parseInt(args[2])
let price = parseInt(args[3])
if (Number.isNaN(idx) || Number.isNaN(qty) || Number.isNaN(price)) {
return m.reply('Format salah.\nContoh: .market sell 8 5 120')
}
if (qty < 1 || price < 1) return m.reply('Jumlah dan harga harus >= 1.')

let order = buildUniqueOrder(player.inventory)
let itemId = order[idx]
if (!itemId) return m.reply('Nomor inventory tidak valid. Cek .inventory')

let have = player.inventory.filter((x) => x === itemId).length
if (have < qty) return m.reply(`Jumlah item tidak cukup. Kamu punya ${have}.`)

if (player.weapon === itemId || player.armor === itemId || player.pickaxe === itemId || player.rod === itemId || player.accessories.includes(itemId)) {
return m.reply('Item yang sedang dipakai tidak bisa dijual di market.')
}

let data = itemDB[itemId]
if (!data) return m.reply('Data item tidak ditemukan.')
let blockedType = ['quest', 'key']
if (blockedType.includes(String(data.type || '').toLowerCase())) return m.reply('Item ini tidak boleh dijual di market.')

for (let i = 0; i < qty; i++) {
let pos = player.inventory.indexOf(itemId)
if (pos !== -1) player.inventory.splice(pos, 1)
}

let listing = {
id: market.nextId++,
seller: sender,
itemId,
qty,
price,
createdAt: Date.now()
}
market.listings.push(listing)

savePlayers(players)
saveMarket(market)

let name = data.name || itemId
return m.reply(`Listing dibuat!\nID: #${listing.id}\nItem: ${name}\nQty: ${qty}\nHarga: ${price} Gold/item\nExpire: 24 jam`)
}

if (action === 'cancel') {
let id = parseInt(args[1])
if (Number.isNaN(id)) return m.reply('Masukkan ID listing.\nContoh: .market cancel 7')

let listing = market.listings.find((x) => x.id === id)
if (!listing || listing.qty <= 0) return m.reply('Listing tidak ditemukan.')
if (listing.seller !== sender) return m.reply('Kamu hanya bisa cancel listing milik kamu sendiri.')

player.inventory.push(...Array(listing.qty).fill(listing.itemId))
market.listings = market.listings.filter((x) => x.id !== id)

savePlayers(players)
saveMarket(market)

let name = itemDB[listing.itemId] ? itemDB[listing.itemId].name : listing.itemId
return m.reply(`Listing #${id} dibatalkan.\nItem kembali: ${name} x${listing.qty}`)
}

if (action === 'buy') {
let id = parseInt(args[1])
let qty = parseInt(args[2] || '1')
if (Number.isNaN(id)) return m.reply('Masukkan ID listing.\nContoh: .market buy 3 2')
if (Number.isNaN(qty) || qty < 1) qty = 1

let listing = market.listings.find((x) => x.id === id)
if (!listing || listing.qty <= 0) return m.reply('Listing tidak ditemukan.')
if (listing.seller === sender) return m.reply('Kamu tidak bisa beli listing milik sendiri.')
if (!players[listing.seller]) return m.reply('Seller tidak aktif. Listing ini tidak valid.')

if (qty > listing.qty) qty = listing.qty
let total = qty * listing.price
if (player.gold < total) return m.reply(`Gold tidak cukup. Butuh ${total} Gold.`)

let tax = Math.max(1, Math.floor(total * TAX_RATE))
let sellerReceive = total - tax

player.gold -= total
players[listing.seller].gold = Number(players[listing.seller].gold || 0) + sellerReceive
player.inventory.push(...Array(qty).fill(listing.itemId))

listing.qty -= qty
if (listing.qty <= 0) {
market.listings = market.listings.filter((x) => x.id !== listing.id)
}

let itemName = itemDB[listing.itemId] ? itemDB[listing.itemId].name : listing.itemId
let buyerName = player.name || asTag(sender, sender)
let soldNote = `?? Market Sold!\n\nItem: ${itemName}\nQty: ${qty}\nHarga: ${listing.price} Gold\n\nPembeli: ${buyerName}\nGold diterima: ${sellerReceive}`
if (typeof send === 'function') {
await send(listing.seller, soldNote).catch(() => {})
}

savePlayers(players)
saveMarket(market)

return m.reply(`Berhasil beli ${itemName} x${qty}\n-${total} Gold\nTax market: ${tax} Gold\nSeller menerima: ${sellerReceive} Gold`)
}

savePlayers(players)
saveMarket(market)
return m.reply('Action market tidak dikenal. Cek: .market')
}
