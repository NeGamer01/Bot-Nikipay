const { countByCategory, getAvailableGames } = require('../../lib/gameCatalog')
const { toRupiah } = require('../../lib/digiflazz')

// Operator yang punya produk pulsa — urutan tampil di menu
const PULSA_OPS = ['TELKOMSEL', 'XL', 'AXIS', 'INDOSAT', 'TRI', 'SMARTFREN', 'by.U']

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
  command: ['pulsa'],
  category: 'topup',
  desc: 'Beli pulsa',
  async run({ conn, msg, text, db, config, prefix }) {
    const nomor = text.trim()
    if (!nomor) return conn.sendMessage(msg.from, {
      text: `❌ Masukkan nomor HP!\nContoh: *${prefix}pulsa 08123456789*`
    }, { quoted: msg.original })

    const providers = detectProvider(nomor)
    if (!providers) return conn.sendMessage(msg.from, {
      text: `❌ Provider tidak dikenali untuk nomor *${nomor}*.\nPastikan nomor valid.`
    }, { quoted: msg.original })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'

    if (providers.length > 1) {
      const pilihanTeks = providers.map((p, i) => `*${i+1}.* ${p} → ketik *${prefix}pulsa${p.toLowerCase().replace(/[^a-z]/g,'')} ${nomor}*`).join('\n')
      return conn.sendMessage(msg.from, {
        text: `⚠️ Nomor *${nomor}* bisa dari beberapa provider:\n\n${pilihanTeks}\n\nPilih sesuai kartu SIM kamu.`
      }, { quoted: msg.original })
    }

    const provider = providers[0]
    const { getProdukByBrand, calculateProfit } = require('../../lib/digiflazz')
    const produkList = getProdukByBrand(provider).filter(p => p.category === 'Pulsa')

    if (!produkList.length) return conn.sendMessage(msg.from, {
      text: `❌ Produk pulsa ${provider} tidak tersedia. Owner jalankan *.getdigi* dulu.`
    }, { quoted: msg.original })

    const allRows = produkList.map(p => {
      const hargaJual = p.price + calculateProfit(p.price) + config.hargaAdmin
      return {
        id: `order_dg_${p.buyer_sku_code}|${nomor}`,
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
        sections.push({ title: `📱 Pulsa ${provider} (${i+1}-${i+chunk.length})`, rows: chunk })
      }
      await conn.sendList(msg.from, `📱 Pulsa ${provider}`, `Nomor: *${nomor}*\nProvider: *${provider}*\n\nPilih nominal:`, `${config.botName} | ${prefix}buy <sku> ${nomor}`, `📋 Pilih Pulsa`, sections, msg)
    } else {
      let teks = `📱 *Pulsa ${provider}*\n\nNomor: *${nomor}*\n\n_Ketik *${prefix}buy <sku> ${nomor}* untuk order_\n\n`
      allRows.forEach((r, i) => {
        const sku = r.id.replace('order_dg_', '').split('|')[0]
        teks += `*${i+1}.* ${r.title}\n   💰 ${r.description.split('|')[0].trim()}\n   ➡️ *${prefix}buy ${sku} ${nomor}*\n\n`
      })
      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
