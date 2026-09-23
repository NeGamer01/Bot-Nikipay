const { toRupiah } = require('../../lib/digiflazz')

function detectProvider(nomor) {
  const n = nomor.replace(/^(\+62|62|0)/, '0')
  const prefixes = {
    TELKOMSEL: ['0811','0812','0813','0821','0822','0823','0852','0853'],
    'by.U': ['0851'],
    XL: ['0817','0818','0819','0859','0877','0878'],
    AXIS: ['0831','0832','0833','0838'],
    INDOSAT: ['0814','0815','0816','0855','0856','0857','0858'],
    TRI: ['0895','0896','0897','0898','0899'],
    SMARTFREN: ['0881','0882','0883','0884','0885','0886','0887','0888','0889']
  }
  const matched = []
  for (const [provider, list] of Object.entries(prefixes)) {
    if (list.some(p => n.startsWith(p))) matched.push(provider)
  }
  return matched.length > 0 ? matched : null
}

module.exports = {
  command: ['kuota', 'data'],
  category: 'topup',
  desc: 'Beli kuota internet',
  async run({ conn, msg, text, db, config, prefix }) {
    const nomor = text.trim()
    if (!nomor) return conn.sendMessage(msg.from, {
      text: `❌ Masukkan nomor HP!\nContoh: *${prefix}kuota 08123456789*`
    }, { quoted: msg.original })

    const providers = detectProvider(nomor)
    if (!providers) return conn.sendMessage(msg.from, {
      text: `❌ Provider tidak dikenali untuk nomor *${nomor}*.\nPastikan nomor valid.`
    }, { quoted: msg.original })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'

    if (providers.length > 1) {
      const pilihanTeks = providers.map((p, i) => `*${i+1}.* ${p} → ketik *${prefix}kuota${p.toLowerCase().replace(/[^a-z]/g,'')} ${nomor}*`).join('\n')
      return conn.sendMessage(msg.from, {
        text: `⚠️ Nomor *${nomor}* bisa dari beberapa provider:\n\n${pilihanTeks}\n\nPilih sesuai kartu SIM kamu.`
      }, { quoted: msg.original })
    }

    const provider = providers[0]
    const { getProdukByBrand, calculateProfit } = require('../../lib/digiflazz')
    const produkList = getProdukByBrand(provider)
      .filter(p => p.category === 'Data' && p.type !== 'Cek Paket')

    if (!produkList.length) return conn.sendMessage(msg.from, {
      text: `❌ Produk kuota ${provider} tidak tersedia. Owner jalankan *.getdigi* dulu.`
    }, { quoted: msg.original })

    const grouped = {}
    for (const p of produkList) {
      const type = p.type || 'Umum'
      if (!grouped[type]) grouped[type] = []
      grouped[type].push(p)
    }

    if (device === 'android') {
      const sections = []
      for (const [type, prods] of Object.entries(grouped)) {
        if (sections.length >= 5) break
        const rows = prods.slice(0, 10).map(p => {
          const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
          return {
            id: `order_dg_${p.buyer_sku_code}|${nomor}`,
            title: p.product_name,
            description: `Rp ${toRupiah(hargaJual)} | SKU: ${p.buyer_sku_code}`
          }
        })
        sections.push({ title: `📶 ${type}`, rows })
      }
      await conn.sendList(msg.from, `📶 Kuota ${provider}`, `Nomor: *${nomor}*\nProvider: *${provider}*\n\nPilih paket:`, `${config.botName} | ${prefix}buy <sku> ${nomor}`, `📋 Pilih Kuota`, sections, msg)
    } else {
      let teks = `📶 *Kuota ${provider}*\n\nNomor: *${nomor}*\n\n_Ketik *${prefix}buy <sku> ${nomor}* untuk order_\n\n`
      for (const [type, prods] of Object.entries(grouped)) {
        teks += `*— ${type} —*\n`
        prods.forEach(p => {
          const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
          teks += `• ${p.product_name}\n  💰 Rp ${toRupiah(hargaJual)} | ➡️ *${prefix}buy ${p.buyer_sku_code} ${nomor}*\n`
        })
        teks += '\n'
      }
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
