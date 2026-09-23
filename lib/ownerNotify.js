// lib/ownerNotify.js — kirim notifikasi ke owner WA
//
// ownerNumber[0] di config.js bisa berupa LID (15 digit, mis. 241862929600639)
// atau nomor WA biasa. Karena LID tidak valid sebagai @s.whatsapp.net,
// JID pengiriman diambil dari database/owner_jid.json (disimpan otomatis
// saat owner chat bot di PM) dengan fallback ke config.

const fs = require('fs')
const path = require('path')

const OWNER_JID_PATH = path.join(__dirname, '..', 'database', 'owner_jid.json')

let cache = null

/** JID tujuan notifikasi owner (dipakai untuk kirim pesan). */
function getOwnerJid() {
  if (cache) return cache
  try {
    if (fs.existsSync(OWNER_JID_PATH)) {
      const data = JSON.parse(fs.readFileSync(OWNER_JID_PATH, 'utf-8'))
      if (data.chatJid) { cache = data.chatJid; return cache }
    }
  } catch (e) { /* abaikan */ }
  const config = require('../config')
  cache = (config.ownerNumber?.[0] || '') + '@s.whatsapp.net'
  return cache
}

/**
 * Kirim pesan ke owner. Tidak throw — hanya log error.
 * @returns true jika terkirim, false jika gagal.
 */
async function sendOwnerNotify(conn, text, mentions = []) {
  try {
    await conn.sendMessage(getOwnerJid(), { text, mentions })
    return true
  } catch (e) {
    console.error('[OWNER-NOTIFY] Gagal kirim ke owner:', e.message)
    return false
  }
}

module.exports = { getOwnerJid, sendOwnerNotify }
