module.exports = {
  command: ['daftar', 'register'],
  category: 'main',
  desc: 'Daftarkan nomor WhatsApp kamu',
  async run({ conn, msg, text, db, prefix }) {
    const nomor = text.trim()

    if (!nomor) {
      return conn.sendMessage(msg.from, {
        text: `❌ Format salah!\n\nContoh: *${prefix}daftar 6281234567890*\n\nMasukkan nomor WhatsApp kamu dengan kode negara (62 untuk Indonesia).`
      })
    }

    // Validasi format nomor
    if (!/^\d{10,15}$/.test(nomor)) {
      return conn.sendMessage(msg.from, {
        text: `❌ Format nomor tidak valid!\n\nNomor harus 10-15 digit angka tanpa spasi, strip, atau simbol lain.\n\nContoh: *${prefix}daftar 6281234567890*`
      })
    }

    // Normalisasi ke 62xxx
    let nomorNormal = nomor
    if (nomor.startsWith('0')) nomorNormal = '62' + nomor.substring(1)
    else if (!nomor.startsWith('62')) nomorNormal = '62' + nomor

    const nomorJid = nomorNormal + '@s.whatsapp.net'

    // WA modern: identitas asli user adalah LID. Saat daftar kita TAHU
    // keduanya (sender = LID, input = nomor), jadi simpan mapping-nya
    // supaya .transfer <nomor> dll bisa nemu record user ini nantinya.
    if (msg.sender.endsWith('@lid')) {
      try {
        global.lidToNumber.set(msg.sender, nomorNormal)
        const fs = require('fs')
        const path = require('path')
        const p = path.join(__dirname, '..', '..', 'database', 'lid_map.json')
        const map = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {}
        map[msg.sender] = nomorNormal
        fs.writeFileSync(p, JSON.stringify(map, null, 2))
      } catch (e) { /* abaikan */ }
    }

    // Simpan data user ke key NOMOR (canonical), supaya semua command
    // yg pakai input nomor langsung nemu record ini.
    const userData = db.getUser(nomorJid)
    userData.phone = nomorNormal
    userData.registered = true
    if (msg.sender.endsWith('@lid')) userData.lid = msg.sender

    // Pindah saldo/riwayat lama yg tersangkut di key LID (kalau ada)
    if (msg.sender.endsWith('@lid') && msg.sender !== nomorJid) {
      const lama = db.data.users[msg.sender]
      if (lama) {
        userData.saldo = (lama.saldo || 0) + (userData.saldo || 0)
        userData.riwayat = [...(userData.riwayat || []), ...(lama.riwayat || [])].slice(0, 50)
        userData.device = userData.device || lama.device || null
        delete db.data.users[msg.sender]
      }
    }

    db.setUser(nomorJid, userData)

    await conn.sendMessage(msg.from, {
      text: `✅ Nomor berhasil didaftarkan!\n\n*Nomor:* ${nomorNormal}\n\nSekarang kamu bisa menggunakan semua fitur bot.`
    })
  }
}
