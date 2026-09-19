const { getProdukByBrand, calculateProfit, toRupiah } = require('../../lib/digiflazz')
const { cekId } = require('../../lib/cekid')

module.exports = {
  command: ['mobilelegend', 'ml'],
  category: 'topup',
  desc: 'Top up Mobile Legends',
  async run({ conn, msg, args, text, db, config, prefix }) {
    // Format: .ml <userid> <zoneid>
    if (args.length < 2) {
      return conn.sendMessage(msg.from, {
        text: `❌ Format salah!\n\nContoh: *${prefix}ml 123456789 1234*\n\n_userid = ID akun ML_\n_zoneid = Zone ID (angka setelah | di profil)_`
      }, { quoted: msg.original })
    }

    const userId = args[0]
    const zoneId = args[1]
    const tujuan = `${userId}${zoneId}` // gabungan userid+zoneid

    await conn.sendMessage(msg.from, { text: '🔍 Mengecek ID...' }, { quoted: msg.original })

    let namaAkun = userId
    const cek = await cekId('MOBILE LEGENDS', userId, zoneId)
    if (cek.ok) namaAkun = cek.nickname
    else if (cek.final) return conn.sendMessage(msg.from, { text: `❌ ID Mobile Legends *${userId} (${zoneId})* tidak ditemukan. Cek lagi ID & Zone-nya.` }, { quoted: msg.original })
    else console.log('[ml] cek ID gagal, lanjut tanpa nickname:', cek.reason)

    const produkList = getProdukByBrand('MOBILE LEGENDS').filter(p => p.type === 'Umum' && !p.product_name.toLowerCase().includes('cek'))
    if (!produkList.length) return conn.sendMessage(msg.from, { text: '❌ Produk ML belum tersedia. Owner jalankan *.getdigi* dulu.' }, { quoted: msg.original })

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
        sections.push({ title: `💎 Diamond ML (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(
        msg.from,
        `🎮 Mobile Legends`,
        `ID: *${userId}*\nZone: *${zoneId}*\nNama: *${namaAkun}*\n\nPilih nominal diamond:`,
        `${config.botName} | ${prefix}buy <sku> ${tujuan}`,
        `💎 Pilih Diamond`,
        sections,
        msg
      )
    } else {
      let teks = `🎮 *Mobile Legends*\n\nID: *${userId}*\nZone: *${zoneId}*\nNama: *${namaAkun}*\n\n_Ketik *${prefix}buy <sku> ${tujuan}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        const sku = r.id.replace('order_dg_', '').split('|')[0]
        teks += `*${i+1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku} ${tujuan}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
