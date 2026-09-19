const { getProdukByBrand, calculateProfit, toRupiah } = require('../../lib/digiflazz')
const { cekId } = require('../../lib/cekid')

module.exports = {
  command: ['freefire', 'ff'],
  category: 'topup',
  desc: 'Top up Free Fire',
  async run({ conn, msg, text, db, config, prefix }) {
    const idGame = text.trim()
    if (!idGame) return conn.sendMessage(msg.from, { text: `❌ Masukkan ID Free Fire!\nContoh: *${prefix}ff 123456789*` }, { quoted: msg.original })

    await conn.sendMessage(msg.from, { text: '🔍 Mengecek ID...' }, { quoted: msg.original })

    let namaAkun = idGame
    const cek = await cekId('FREE FIRE', idGame)
    if (cek.ok) namaAkun = cek.nickname
    else if (cek.final) return conn.sendMessage(msg.from, { text: `❌ ID Free Fire *${idGame}* tidak ditemukan. Cek lagi ID-nya.` }, { quoted: msg.original })
    else console.log('[freefire] cek ID gagal, lanjut tanpa nickname:', cek.reason)

    const produkList = getProdukByBrand('FREE FIRE')
    if (!produkList.length) return conn.sendMessage(msg.from, { text: '❌ Produk FF belum tersedia. Owner jalankan *.getdigi* dulu.' }, { quoted: msg.original })

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
        sections.push({ title: `💎 Diamond FF (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(
        msg.from,
        `🎮 Free Fire`,
        `ID: *${idGame}*\nNama: *${namaAkun}*\n\nPilih nominal diamond:`,
        `${config.botName} | ${prefix}buy <sku> ${idGame}`,
        `💎 Pilih Diamond`,
        sections,
        msg
      )
    } else {
      let teks = `🎮 *Free Fire*\n\nID: *${idGame}*\nNama: *${namaAkun}*\n\n_Ketik *${prefix}buy <sku> ${idGame}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        const sku = r.id.replace('order_dg_', '').split('|')[0]
        teks += `*${i+1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku} ${idGame}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
