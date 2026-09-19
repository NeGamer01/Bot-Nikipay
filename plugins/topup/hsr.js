const { getProdukByBrand, calculateProfit, toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['hsr', 'honkaistarrail'],
  category: 'topup',
  desc: 'Top up Honkai Star Rail',
  async run({ conn, msg, args, text, db, config, prefix }) {
    // Format: .hsr <uid> <server>
    if (args.length < 2) {
      return conn.sendMessage(msg.from, {
        text: `❌ Format salah!\n\nContoh: *${prefix}hsr 123456789 Asia*\n\n_uid = UID akun HSR_\n_server = Server (Asia/America/Europe/TW_HK_MO)_`
      }, { quoted: msg.original })
    }

    const uid = args[0]
    const server = args[1]
    const tujuan = `${uid}|${server}`

    const produkList = getProdukByBrand('Honkai Star Rail')
    if (!produkList.length) return conn.sendMessage(msg.from, { text: '❌ Produk HSR belum tersedia. Owner jalankan *.getdigi* dulu.' }, { quoted: msg.original })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'

    const allRows = produkList.map(p => {
      const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
      return {
        id: `order_dg_${p.buyer_sku_code}|${tujuan}`,
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
        sections.push({ title: `💎 Oneiric Shard (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(
        msg.from,
        `🎮 Honkai Star Rail`,
        `UID: *${uid}*\nServer: *${server}*\n\nPilih nominal:`,
        `${config.botName} | ${prefix}buy <sku> ${tujuan}`,
        `💎 Pilih Shard`,
        sections,
        msg
      )
    } else {
      let teks = `🎮 *Honkai Star Rail*\n\nUID: *${uid}*\nServer: *${server}*\n\n_Ketik *${prefix}buy <sku> ${tujuan}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        const sku = r.id.replace('order_dg_', '').split('|')[0]
        teks += `*${i+1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku} ${tujuan}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
