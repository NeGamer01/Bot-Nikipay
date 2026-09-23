const { calculateProfit, toRupiah, prosesTransaksiDigiflazz } = require('../../lib/digiflazz')
const { createQris, getQrisImage, generateUniqueNominal, checkStatus } = require('../../lib/qris')
const { getGame, filterProducts } = require('../../lib/gameCatalog')
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', '..', 'database', 'datadigiflaz.json')

module.exports = {
  command: ['buy', 'beli', 'order'],
  category: 'topup',
  desc: 'Beli produk dengan kode SKU',
  async run({ conn, msg, args, db, config, prefix }) {
    if (!args.length) {
      return conn.sendMessage(msg.from, {
        text: `❌ Format salah!\nContoh: *${prefix}buy ml5*\n\n_ID akan otomatis dipakai dari ${prefix}ml / ${prefix}ff / dll_\n_Atau ketik manual: *${prefix}buy ml5 123456789 1234*_`
      }, { quoted: msg.original })
    }

    if (!fs.existsSync(DB_PATH)) {
      return conn.sendMessage(msg.from, { text: '❌ Database produk belum ada. Owner jalankan *.getdigi* dulu.' }, { quoted: msg.original })
    }

    const products = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    const kode = args[0].toLowerCase()
    const produk = products.find(p => p.buyer_sku_code?.toLowerCase() === kode && p.seller_product_status === true)

    if (!produk) {
      return conn.sendMessage(msg.from, {
        text: `❌ Kode produk *${kode}* tidak ditemukan.\n\nGunakan ${prefix}ml, ${prefix}ff, ${prefix}pulsa, dll untuk lihat daftar produk & kode SKU.`
      }, { quoted: msg.original })
    }

    // Deteksi game (untuk tahu format ID: zone atau biasa)
    const game = getGameByBrand(products, produk)

    let tujuan = null
    let dariLastId = false

    if (args.length >= 2) {
      // Prioritas 1: ID diketik manual
      tujuan = args[1]
      // Game zone (ML dll): ID + Zone digabung jadi satu tujuan
      if (game && game.idFormat === 'zone' && args.length >= 3) {
        tujuan = `${args[1]}${args[2]}`
      }
    } else {
      // Prioritas 2: ambil ID yang sudah diketik di .ml / .ff / dll
      const lastId = db.getUser(msg.sender).lastId
      if (lastId && lastId.tujuan) {
        // ID tersimpan harus dari brand yang sama
        if (game && lastId.brand !== game.brand) {
          return conn.sendMessage(msg.from, {
            text: `⚠️ ID tersimpan itu untuk game lain.\n\nKetik *${prefix}${game.command} <id>* dulu untuk game ini, atau ketik manual:\n*${prefix}buy ${kode} <id>*`
          }, { quoted: msg.original })
        }
        tujuan = lastId.tujuan
        dariLastId = true
      }
    }

    if (!tujuan) {
      return conn.sendMessage(msg.from, {
        text: `❌ Belum ada ID tersimpan.\n\nKetik dulu *${prefix}${game ? game.command : 'ml'} <id>${game && game.idFormat === 'zone' ? ' <zone>' : ''}*, lalu pilih nominal.\nAtau langsung: *${prefix}buy ${kode} <id>*`
      }, { quoted: msg.original })
    }

    const hargaModal = produk.price
    const hargaJual = hargaModal + calculateProfit(hargaModal) + config.hargaAdmin
    const namaProduk = produk.product_name

    const user = db.getUser(msg.sender)
    const saldo = user.saldo || 0

    if (saldo >= hargaJual) {
      // Bayar via saldo — minta konfirmasi dulu
      db.setUser(msg.sender, {
        pendingOrder: { kode: produk.buyer_sku_code, tujuan, hargaJual, hargaModal, namaProduk, via: 'saldo', createdAt: Date.now() }
      })
      await conn.sendMessage(msg.from, {
        text: `🛒 *Konfirmasi Order*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Produk:* ${namaProduk}\n*Tujuan:* ${tujuan}\n*Harga:* Rp ${toRupiah(hargaJual)}\n*Saldo:* Rp ${toRupiah(saldo)}\n\nKetik *ya* untuk konfirmasi atau *batal* untuk membatalkan.`
      }, { quoted: msg.original })
    } else {
      // Bayar via QRIS
      const kurang = hargaJual - saldo
      await conn.sendMessage(msg.from, {
        text: `⚠️ Saldo tidak cukup (Rp ${toRupiah(saldo)}). Kekurangan Rp ${toRupiah(kurang)}.\n\n⏳ Membuat QRIS...`
      }, { quoted: msg.original })

      const amount = generateUniqueNominal(hargaJual)
      const createdAt = Date.now()

      let qris
      try {
        qris = await createQris(amount, `ORD-${produk.buyer_sku_code}-${msg.sender.split('@')[0]}-${createdAt}`)
      } catch (e) {
        return conn.sendMessage(msg.from, { text: `❌ Gagal membuat QRIS: ${e.message}` }, { quoted: msg.original })
      }
      const qrisImage = await getQrisImage(qris)

      db.setUser(msg.sender, {
        pendingOrder: { kode: produk.buyer_sku_code, tujuan, hargaJual, hargaModal, namaProduk, via: 'qris', amount, createdAt, qrisId: qris.qrisId }
      })

      const infoMsg = await conn.sendMessage(msg.from, {
        text: `💳 *Pembayaran QRIS*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Produk:* ${namaProduk}\n*Tujuan:* ${tujuan}\n*Bayar:* Rp ${toRupiah(amount)}\n\n⚠️ Bayar TEPAT *Rp ${toRupiah(amount)}*\n⏰ Berlaku *5 menit*`
      }, { quoted: msg.original })
      const qrisMsg = await conn.sendImage(msg.from, qrisImage, `Bayar Rp ${toRupiah(amount)} — Berlaku 5 menit`, msg.original)

      const maxWait = 5 * 60 * 1000
      const interval = 5000
      let elapsed = 0
      const poll = setInterval(async () => {
        elapsed += interval
        if (elapsed >= maxWait) {
          clearInterval(poll)
          db.setUser(msg.sender, { pendingOrder: null })
          if (qrisMsg?.key) await conn.sendMessage(msg.from, { delete: qrisMsg.key }).catch(() => {})
          if (infoMsg?.key) await conn.sendMessage(msg.from, { delete: infoMsg.key }).catch(() => {})
          return conn.sendMessage(msg.from, { text: '⏰ Waktu pembayaran habis. Silakan order ulang.' })
        }
        try {
          const st = await checkStatus(qris.qrisId)
          if (st.status === 'EXPIRED') {
            clearInterval(poll)
            db.setUser(msg.sender, { pendingOrder: null })
            if (qrisMsg?.key) await conn.sendMessage(msg.from, { delete: qrisMsg.key }).catch(() => {})
            if (infoMsg?.key) await conn.sendMessage(msg.from, { delete: infoMsg.key }).catch(() => {})
            return conn.sendMessage(msg.from, { text: '⏰ QRIS sudah kadaluarsa. Silakan order ulang.' })
          }
          if (st.paid) {
            clearInterval(poll)
            const order = db.getUser(msg.sender).pendingOrder
            db.setUser(msg.sender, { pendingOrder: null })
            if (!order) return
            if (qrisMsg?.key) await conn.sendMessage(msg.from, { delete: qrisMsg.key }).catch(() => {})
            if (infoMsg?.key) await conn.sendMessage(msg.from, { delete: infoMsg.key }).catch(() => {})
            await prosesTransaksiDigiflazz(order.kode, order.tujuan, order.hargaJual, order.hargaModal, db, msg.sender, msg.from, conn, msg.original, true)
          }
        } catch (e) { /* lanjut */ }
      }, interval)
    }
  }
}

// Cari katalog game berdasarkan brand produk (untuk deteksi format tujuan)
function getGameByBrand(products, produk) {
  // brand produk bisa berupa brand Digiflazz langsung
  const { GAMES } = require('../../lib/gameCatalog')
  return GAMES.find(g => g.brand.toUpperCase() === String(produk.brand || '').trim().toUpperCase())
}
