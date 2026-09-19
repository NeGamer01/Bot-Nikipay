const { cekSaldoDigi } = require('../../lib/digiflazz')
const { toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['ceksaldo', 'saldodigi'],
  category: 'owner',
  desc: 'Cek saldo Digiflazz',
  isOwner: true,
  async run({ conn, msg, config }) {
    await conn.sendMessage(msg.from, { text: '⏳ Mengecek saldo Digiflazz...' }, { quoted: msg.original })
    try {
      const saldo = await cekSaldoDigi()
      await conn.sendMessage(msg.from, {
        text: `💰 *Saldo Digiflazz*\n\nRp ${toRupiah(saldo)}`
      }, { quoted: msg.original })
    } catch (e) {
      await conn.sendMessage(msg.from, { text: `❌ Gagal: ${e.message}` }, { quoted: msg.original })
    }
  }
}
