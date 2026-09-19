const { toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['ownermenu', 'omenu'],
  category: 'owner',
  desc: 'Menu khusus owner',
  isOwner: true,
  async run({ conn, msg, config, prefix }) {
    const menu = `
╭─❒ *${config.botName} — Owner Menu*
│
├─❒ *💰 Saldo & Produk*
│ • ${prefix}ceksaldo — Cek saldo Digiflazz
│ • ${prefix}cekpay — Cek koneksi NikiPay
│ • ${prefix}getdigi — Update produk Digiflazz
│
├─❒ *👤 User Management*
│ • ${prefix}addsaldo @user/nomor <nominal> — Tambah saldo user
│ • ${prefix}minsaldo @user/nomor <nominal> — Kurangi saldo user
│ • ${prefix}digilog — Log Digiflazz terakhir
│ • ${prefix}ceklid — Cek LID/JID sender
│
├─❒ *📊 Laporan*
│ • ${prefix}laporan — Laporan hari ini
│ • ${prefix}laporan minggu — Laporan minggu ini
│ • ${prefix}laporan bulan — Laporan bulan ini
│
├─❒ *📢 Broadcast*
│ • ${prefix}bc <pesan> — Broadcast ke semua chat
│
├─❒ *🔧 Developer*
│ • ${prefix}eval <code> — Eval JavaScript
│ • ${prefix}exec <cmd> — Execute shell command
│
╰─────────────
_Semua command ini hanya bisa dipakai oleh owner_
    `.trim()

    await conn.sendMessage(msg.from, { text: menu }, { quoted: msg.original })
  }
}
