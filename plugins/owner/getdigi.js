const { getProdukDigi } = require('../../lib/digiflazz')

module.exports = {
  command: ['getdigi', 'updatedigi'],
  category: 'owner',
  desc: 'Update database produk Digiflazz',
  isOwner: true,
  async run({ conn, msg }) {
    await conn.sendMessage(msg.from, { text: '⏳ Mengambil produk dari Digiflazz...' }, { quoted: msg.original })
    try {
      const count = await getProdukDigi()
      await conn.sendMessage(msg.from, { text: `✅ Berhasil mengambil *${count} produk* dari Digiflazz!` }, { quoted: msg.original })
    } catch (e) {
      await conn.sendMessage(msg.from, { text: `❌ Gagal: ${e.message}` }, { quoted: msg.original })
    }
  }
}
