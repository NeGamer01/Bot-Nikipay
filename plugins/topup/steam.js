const { getProdukByBrand, calculateProfit, toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['steam'],
  category: 'topup',
  desc: 'Top up Steam Wallet',
  async run({ conn, msg, text, db, config, prefix }) {
    const idGame = text.trim()
    if (!idGame) return conn.sendMessage(msg.from, { text: `❌ Masukkan Steam ID!\nContoh: *${prefix}steam 123456789*` }, { quoted: msg.original })

    const produkList = getProdukByBrand('Steam Wallet (IDR)')
    if (!produkList.length) return conn.sendMessage(msg.from, { text: '❌ Produk Steam belum tersedia. Owner jalankan *.getdigi* dulu.' }, { quoted: msg.original })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'
    const allRows = produkList.map(p => {
      const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
      return { id: `order_dg_${p.buyer_sku_code}|${idGame}`, title: p.product_name, description: `Rp ${toRupiah(hargaJual)} | SKU: ${p.buyer_sku_code}` }
    })

    if (device === 'android') {
      const sections = []
      const chunkSize = 10
      const maxSections = 5
      for (let i = 0; i < Math.min(allRows.length, chunkSize * maxSections); i += chunkSize) {
        const chunk = allRows.slice(i, i + chunkSize)
        sections.push({ title: `🎮 Steam Wallet (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(msg.from, `🎮 Steam Wallet`, `ID: *${idGame}*\n\nPilih nominal:`, `${config.botName} | ${prefix}buy <sku> ${idGame}`, `💎 Pilih Nominal`, sections, msg)
    } else {
      let teks = `🎮 *Steam Wallet*\n\nID: *${idGame}*\n\n_Ketik *${prefix}buy <sku> ${idGame}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        const sku = r.id.replace('order_dg_', '').split('|')[0]
        teks += `*${i+1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku} ${idGame}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
