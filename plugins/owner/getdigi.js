const { getProdukDigi } = require('../../lib/digiflazz')
const { cekSebelumUpdate, kirimInfoPerubahan } = require('../../lib/priceChange')
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', '..', 'database', 'datadigiflaz.json')

module.exports = {
  command: ['getdigi', 'updatedigi'],
  category: 'owner',
  desc: 'Update database produk Digiflazz',
  isOwner: true,
  async run({ conn, msg, db }) {
    await conn.sendMessage(msg.from, { text: '⏳ Mengambil produk dari Digiflazz...' }, { quoted: msg.original })

    // Simpan data lama SEBELUM ditimpa, untuk deteksi perubahan harga
    const produkLama = cekSebelumUpdate()

    try {
      const count = await getProdukDigi()
      let teks = `✅ Berhasil mengambil *${count} produk* dari Digiflazz!`

      // Kirim info perubahan harga ke grup promosi
      try {
        const produkBaru = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
        const hasil = await kirimInfoPerubahan(produkBaru, produkLama, conn)
        if (hasil.dikirim) {
          const bagian = []
          if (hasil.turun) bagian.push(`${hasil.turun} turun`)
          if (hasil.naik) bagian.push(`${hasil.naik} naik`)
          if (hasil.baru) bagian.push(`${hasil.baru} baru`)
          teks += `\n\n📢 Info update harga terkirim ke grup promosi (${bagian.join(', ')}).`
        } else {
          teks += `\n\nℹ️ Tidak ada perubahan harga signifikan.`
        }
      } catch (e) {
        teks += `\n\n⚠️ Info perubahan harga gagal dikirim: ${e.message}`
      }

      await conn.sendMessage(msg.from, { text: teks }, { quoted: msg.original })
    } catch (e) {
      await conn.sendMessage(msg.from, { text: `❌ Gagal: ${e.message}` }, { quoted: msg.original })
    }
  }
}
