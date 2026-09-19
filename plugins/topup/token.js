const { getProdukByCategory, calculateProfit, toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['token', 'pln', 'listrik'],
  category: 'topup',
  desc: 'Beli token listrik PLN',
  async run({ conn, msg, text, db, config, prefix }) {
    const nomorMeter = text.trim()
    if (!nomorMeter) return conn.sendMessage(msg.from, { text: `❌ Masukkan nomor meter/ID pelanggan!\nContoh: *${prefix}token 123456789012*` }, { quoted: msg.original })

    await conn.sendMessage(msg.from, { text: '🔍 Mengambil daftar produk...' }, { quoted: msg.original })

    const produkList = getProdukByCategory('PLN')
    if (!produkList.length) return conn.sendMessage(msg.from, { text: '❌ Produk token PLN tidak tersedia. Jalankan *.getdigi* dulu.' }, { quoted: msg.original })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'

    const allRows = produkList.map(p => {
      const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
      return {
        id: `order_dg_${p.buyer_sku_code}|${nomorMeter}`,
        title: p.product_name,
        description: `Rp ${toRupiah(hargaJual)} | SKU: ${p.buyer_sku_code}`
      }
    })

    if (device === 'android') {
      const sections = []
      const chunkSize = 10
      const maxSections = 5
      for (let i = 0; i < Math.min(allRows.length, chunkSize * maxSections); i += chunkSize) {
        const chunk = allRows.slice(i, i + chunkSize)
        sections.push({ title: `⚡ Token PLN (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(
        msg.from,
        `⚡ Token PLN`,
        `No. Meter: *${nomorMeter}*\n\nPilih nominal:`,
        `${config.botName} | Atau ketik: ${prefix}buy <sku> ${nomorMeter}`,
        `📋 Pilih Token`,
        sections,
        msg
      )
    } else {
      let teks = `⚡ *Token PLN*\n\nNo. Meter: *${nomorMeter}*\n\n`
      teks += `_Ketik *${prefix}buy <sku> ${nomorMeter}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        teks += `*${i + 1}.* ${r.title}\n`
        teks += `   💰 ${r.description.split('|')[0].trim()}\n`
        teks += `   📦 SKU: *${r.id.replace('order_dg_', '').split('|')[0]}*\n`
        teks += `   ➡️ Ketik: *${prefix}buy ${r.id.replace('order_dg_', '').split('|')[0]} ${nomorMeter}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
