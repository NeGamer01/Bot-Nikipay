const { getAccountInfo } = require('../../lib/qris')

module.exports = {
  command: ['cekpay', 'ceknikipay'],
  category: 'owner',
  desc: 'Cek koneksi NikiPay Gateway (API key, GoBiz, QRIS statis)',
  isOwner: true,
  async run({ conn, msg, config }) {
    await conn.sendMessage(msg.from, { text: '⏳ Mengecek NikiPay...' }, { quoted: msg.original })
    try {
      const info = await getAccountInfo()
      const ok = (v) => (v ? '✅' : '❌')
      const sub = info.subscription || {}
      const text =
        `🏦 *NikiPay Gateway*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `${ok(true)} API key valid\n` +
        `${ok(info.qris_configured)} QRIS statis terpasang\n` +
        `${ok(info.gobiz_connected)} GoBiz terhubung (verifikasi ${info.verification_mode})\n` +
        `${ok(sub.active)} Langganan ${sub.unlimited ? 'unlimited (admin)' : sub.active ? `aktif s/d ${sub.ends_at || '-'}` : 'TIDAK AKTIF'}\n\n` +
        `URL: ${config.nikipayUrl}` +
        (!info.gobiz_connected ? `\n\n⚠️ GoBiz belum login → pembayaran tidak terdeteksi otomatis. Login di ${config.nikipayUrl}/app` : '')
      await conn.sendMessage(msg.from, { text }, { quoted: msg.original })
    } catch (e) {
      await conn.sendMessage(msg.from, { text: `❌ Gagal: ${e.message}` }, { quoted: msg.original })
    }
  }
}
