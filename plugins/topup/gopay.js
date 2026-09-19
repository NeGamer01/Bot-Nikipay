const { getProdukByBrand, calculateProfit, toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['gopay', 'gp'],
  category: 'topup',
  desc: 'Top up GoPay',
  async run({ conn, msg, text, db, config, prefix }) {
    const nomor = text.trim()
    if (!nomor) return conn.sendMessage(msg.from, { text: `❌ Masukkan nomor GoPay!\nContoh: *${prefix}gopay 08123456789*` }, { quoted: msg.original })

    const produkList = getProdukByBrand('GO PAY')
    if (!produkList.length) return conn.sendMessage(msg.from, { text: '❌ Produk GoPay belum tersedia. Owner jalankan *.getdigi* dulu.' }, { quoted: msg.original })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'
    const allRows = produkList.map(p => {
      const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
      return { id: `order_dg_${p.buyer_sku_code}|${nomor}`, title: p.product_name, description: `Rp ${toRupiah(hargaJual)} | SKU: ${p.buyer_sku_code}` }
    })

    if (device === 'android') {
      const sections = []
      const chunkSize = 10
      const maxSections = 5
      for (let i = 0; i < Math.min(allRows.length, chunkSize * maxSections); i += chunkSize) {
        const chunk = allRows.slice(i, i + chunkSize)
        sections.push({ title: `💚 GoPay (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(msg.from, `💚 GoPay`, `Nomor: *${nomor}*\n\nPilih nominal:`, `${config.botName} | ${prefix}buy <sku> ${nomor}`, `💳 Pilih Nominal`, sections, msg)
    } else {
      let teks = `💚 *GoPay*\n\nNomor: *${nomor}*\n\n_Ketik *${prefix}buy <sku> ${nomor}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        const sku = r.id.replace('order_dg_', '').split('|')[0]
        teks += `*${i+1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku} ${nomor}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
