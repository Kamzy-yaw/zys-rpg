function getQuestDailyKeyWIB() {
const now = new Date()
const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000)
const wib = new Date(utcMs + (7 * 3600000))

// Kalau belum jam 07:00 WIB, masih dianggap hari reset sebelumnya.
if (wib.getHours() < 7) {
wib.setDate(wib.getDate() - 1)
}

const y = wib.getFullYear()
const m = String(wib.getMonth() + 1).padStart(2, '0')
const d = String(wib.getDate()).padStart(2, '0')
return `${y}-${m}-${d}`
}

module.exports = {
getQuestDailyKeyWIB
}
