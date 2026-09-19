const { getProdukByBrand, calculateProfit, toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['tv', 'nexparabola', 'nex'],
  category: 'topup',
  desc: 'Top up Nex Parabola',
  async run({ conn, msg, text, db, config, prefix }) {
    const idPelanggan = text.trim()
    if (!idPelanggan) return conn.sendMessage(msg.from, { text: `❌ Masukkan ID pelanggan Nex Parabola!\nContoh: *${prefix}tv 123456789*` }, { quoted: msg.original })

    const produkList = getProdukByBrand('Nex Parabola')
    if (!produkList.length) return conn.sendMessage(msg.from, { text: '❌ Produk Nex Parabola belum tersedia. Owner jalankan *.getdigi* dulu.' }, { quoted: msg.original })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'
    const allRows = produkList.map(p => {
      const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
      return { id: `order_dg_${p.buyer_sku_code}|${idPelanggan}`, title: p.product_name, description: `Rp ${toRupiah(hargaJual)} | SKU: ${p.buyer_sku_code}` }
    })

    if (device === 'android') {
      const sections = []
      const chunkSize = 10
      const maxSections = 5
      for (let i = 0; i < Math.min(allRows.length, chunkSize * maxSections); i += chunkSize) {
        const chunk = allRows.slice(i, i + chunkSize)
        sections.push({ title: `📺 Nex Parabola (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(msg.from, `📺 Nex Parabola`, `ID: *${idPelanggan}*\n\nPilih paket:`, `${config.botName} | ${prefix}buy <sku> ${idPelanggan}`, `📋 Pilih Paket`, sections, msg)
    } else {
      let teks = `📺 *Nex Parabola*\n\nID: *${idPelanggan}*\n\n_Ketik *${prefix}buy <sku> ${idPelanggan}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        const sku = r.id.replace('order_dg_', '').split('|')[0]
        teks += `*${i+1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku} ${idPelanggan}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
