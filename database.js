const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const cron = require('node-cron')
const { MongoClient } = require('mongodb')

const SAVE_DELAY_MS = Number(process.env.DB_SAVE_DELAY_MS || 5000)
const BACKUP_CRON = process.env.DB_BACKUP_CRON || '0 * * * *'
const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'rpg_backup'
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'snapshots'

const FILES = {
players: path.resolve(process.cwd(), 'database/player.json'),
guilds: path.resolve(process.cwd(), 'database/guild.json'),
market: path.resolve(process.cwd(), 'database/market.json'),
party: path.resolve(process.cwd(), 'database/party.json')
}

const PATH_TO_KEY = Object.fromEntries(
Object.entries(FILES).map(([key, filePath]) => [filePath, key])
)

const originalReadFileSync = fs.readFileSync.bind(fs)
const originalWriteFileSync = fs.writeFileSync.bind(fs)

let saveTimer = null
let isFlushing = false
let flushRequestedWhileBusy = false
let dirtyKeys = new Set()
let mongoClient = null
let backupJob = null
let backupRunning = false
let backupQueued = false
let dbInitialized = false
let shutdownHooksInstalled = false
let mongoConnectedLogged = false
let schedulerLogged = false

function getErrorMessage(err) {
if (!err) return 'unknown error'
if (typeof err.message === 'string' && err.message.trim()) return err.message.trim()
return String(err)
}

function getEmptyDB() {
return {
players: {},
guilds: {},
market: {},
party: {}
}
}

function getResolvedFile(filePath) {
if (!filePath) return ''
return path.resolve(process.cwd(), String(filePath))
}

async function loadJsonFile(filePath, fallback = {}) {
try {
const raw = await fsp.readFile(filePath, 'utf8')
return raw.trim() ? JSON.parse(raw) : fallback
} catch (err) {
if (err.code === 'ENOENT') return fallback
console.error(`[database] gagal load ${filePath}:`, err)
return fallback
}
}

async function writeJsonAtomic(filePath, data) {
const tmpPath = `${filePath}.tmp`
const text = JSON.stringify(data, null, 2)
await fsp.writeFile(tmpPath, text, 'utf8')
await fsp.rename(tmpPath, filePath)
}

function getSnapshot() {
return JSON.parse(JSON.stringify(global.db || getEmptyDB()))
}

function getCollection(key) {
if (!global.db) global.db = getEmptyDB()
if (!global.db[key] || typeof global.db[key] !== 'object') global.db[key] = {}
return global.db[key]
}

function scheduleSave(keys = Object.keys(FILES)) {
const targetKeys = Array.isArray(keys) ? keys : [keys]
for (const key of targetKeys) {
if (FILES[key]) dirtyKeys.add(key)
}

if (saveTimer) clearTimeout(saveTimer)
saveTimer = setTimeout(() => {
flushDirty().catch((err) => console.error('[database] flush error:', err))
}, SAVE_DELAY_MS)
}

async function flushDirty() {
if (isFlushing) {
flushRequestedWhileBusy = true
return
}

if (!dirtyKeys.size) return

if (saveTimer) {
clearTimeout(saveTimer)
saveTimer = null
}

isFlushing = true
const keysToWrite = Array.from(dirtyKeys)
dirtyKeys.clear()

try {
await Promise.all(
keysToWrite.map((key) => writeJsonAtomic(FILES[key], getCollection(key)))
)
  } finally {
isFlushing = false
if (flushRequestedWhileBusy || dirtyKeys.size) {
flushRequestedWhileBusy = false
scheduleSave(Array.from(dirtyKeys))
}
}
}

async function flushAll() {
scheduleSave(Object.keys(FILES))
await flushDirty()
}

function toReadReturnValue(text, options) {
if (typeof options === 'string') return text
if (options && typeof options === 'object' && typeof options.encoding === 'string') return text
return Buffer.from(text)
}

function patchLegacyFs() {
if (fs.__rpgDbPatched) return

fs.readFileSync = function patchedReadFileSync(filePath, options) {
const resolved = getResolvedFile(filePath)
const key = PATH_TO_KEY[resolved]
if (!key) return originalReadFileSync(filePath, options)
const text = JSON.stringify(getCollection(key), null, 2)
return toReadReturnValue(text, options)
}

fs.writeFileSync = function patchedWriteFileSync(filePath, data, options) {
const resolved = getResolvedFile(filePath)
const key = PATH_TO_KEY[resolved]
if (!key) return originalWriteFileSync(filePath, data, options)

const raw = Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
global.db[key] = raw.trim() ? JSON.parse(raw) : {}
scheduleSave(key)
return undefined
}

fs.__rpgDbPatched = true
}

async function connectMongo() {
if (!MONGODB_URI) return null
if (mongoClient) return mongoClient
mongoClient = new MongoClient(MONGODB_URI, {
maxPoolSize: 3
})
await mongoClient.connect()
if (!mongoConnectedLogged) {
console.log('[database] mongo connected')
mongoConnectedLogged = true
}
return mongoClient
}

async function runMongoBackup() {
if (!MONGODB_URI) return
if (backupRunning) {
backupQueued = true
return
}

backupRunning = true
try {
const client = await connectMongo()
const collection = client.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION)
const snapshot = getSnapshot()
await collection.insertOne({
timestamp: new Date(),
players: snapshot.players,
guilds: snapshot.guilds,
market: snapshot.market,
party: snapshot.party
})
} catch (err) {
console.error(`[database] mongo backup gagal: ${getErrorMessage(err)}`)
  } finally {
backupRunning = false
if (backupQueued) {
backupQueued = false
setImmediate(() => {
runMongoBackup().catch((err) => console.error('[database] mongo backup queued error:', err))
})
}
}
}

function startBackupCron() {
if (!MONGODB_URI || backupJob) return null
backupJob = cron.schedule(BACKUP_CRON, () => {
runMongoBackup().catch((err) => console.error(`[database] mongo backup cron error: ${getErrorMessage(err)}`))
}, {
scheduled: true
})
if (!schedulerLogged) {
console.log('[database] backup scheduler started')
schedulerLogged = true
}
return backupJob
}

async function closeMongo() {
if (!mongoClient) return
await mongoClient.close()
mongoClient = null
}

async function initDatabase() {
if (dbInitialized && global.db) return global.db
global.db = {
players: await loadJsonFile(FILES.players, {}),
guilds: await loadJsonFile(FILES.guilds, {}),
market: await loadJsonFile(FILES.market, {}),
party: await loadJsonFile(FILES.party, {})
}

patchLegacyFs()
if (MONGODB_URI) {
try {
await connectMongo()
} catch (err) {
console.error(`[database] mongo connect gagal: ${getErrorMessage(err)}`)
}
}
startBackupCron()
dbInitialized = true
return global.db
}

function setupShutdownHooks() {
if (shutdownHooksInstalled) return
let shuttingDown = false

async function shutdown(label) {
if (shuttingDown) return
shuttingDown = true
try {
await flushAll()
await closeMongo()
      } catch (err) {
console.error(`[database] shutdown error (${label}):`, err)
      } finally {
if (label === 'SIGINT' || label === 'SIGTERM') process.exit(0)
}
}

process.on('SIGINT', () => {
shutdown('SIGINT').catch(() => {})
})

process.on('SIGTERM', () => {
shutdown('SIGTERM').catch(() => {})
})

process.on('beforeExit', () => {
shutdown('beforeExit').catch(() => {})
})

shutdownHooksInstalled = true
}

module.exports = {
FILES,
initDatabase,
scheduleSave,
flushDirty,
flushAll,
runMongoBackup,
startBackupCron,
setupShutdownHooks
}
