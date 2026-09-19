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

    // Simpan nomor ke database user
    const userData = db.getUser(msg.sender) || {}
    userData.phone = nomor
    db.setUser(msg.sender, userData)

    await conn.sendMessage(msg.from, {
      text: `✅ Nomor berhasil didaftarkan!\n\n*Nomor:* ${nomor}\n\nSekarang kamu bisa menggunakan semua fitur bot.`
    })
  }
}
