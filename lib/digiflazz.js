const crypto = require('crypto')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'database', 'datadigiflaz.json')
const LOG_PATH = path.join(__dirname, '..', 'database', 'digiflazz.log')

// Catat semua request/respons Digiflazz ke console + file database/digiflazz.log
function digiLog(line) {
  const entry = `[${new Date().toISOString()}] ${line}`
  console.log('[DIGI]', line)
  try { fs.appendFileSync(LOG_PATH, entry + '\n') } catch (e) { /* abaikan */ }
}

function readDigiLog(lines = 20) {
  try {
    if (!fs.existsSync(LOG_PATH)) return ''
    const all = fs.readFileSync(LOG_PATH, 'utf-8').trim().split('\n')
    return all.slice(-lines).join('\n')
  } catch (e) { return '' }
}

function getConfig() {
  return require('../config')
}

function calculateProfit(basePrice) {
  const config = getConfig()
  const { minPercent, maxPercent, priceThresholdLow, priceThresholdHigh } = config.profitSettings
  let percent
  if (basePrice <= priceThresholdLow) {
    percent = maxPercent
  } else if (basePrice >= priceThresholdHigh) {
    percent = minPercent
  } else {
    const ratio = (basePrice - priceThresholdLow) / (priceThresholdHigh - priceThresholdLow)
    percent = maxPercent - ratio * (maxPercent - minPercent)
  }
  return Math.ceil(basePrice * (percent / 100))
}

function toRupiah(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function getProdukDigi() {
  const config = getConfig()
  const { digiuser, digiapi } = config
  if (!digiuser || !digiapi) throw new Error('Kredensial Digiflazz belum diisi di config.js')

  const sign = crypto.createHash('md5').update(digiuser + digiapi + 'pricelist').digest('hex')
  const res = await axios.post('https://api.digiflazz.com/v1/price-list', {
    cmd: 'prepaid', username: digiuser, sign
  }, { headers: { 'Content-Type': 'application/json' } })

  if (!res.data?.data || !Array.isArray(res.data.data)) throw new Error('Format respons Digiflazz tidak sesuai')

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(res.data.data, null, 2))
  return res.data.data.length
}

async function cekSaldoDigi() {
  const config = getConfig()
  const { digiuser, digiapi } = config
  if (!digiuser || !digiapi) throw new Error('Kredensial Digiflazz belum diisi di config.js')

  const sign = crypto.createHash('md5').update(digiuser + digiapi + 'depo').digest('hex')
  const res = await axios.post('https://api.digiflazz.com/v1/cek-saldo', {
    cmd: 'cek-saldo', username: digiuser, sign
  }, { headers: { 'Content-Type': 'application/json' } })

  return res.data?.data?.deposit ?? 0
}

function getProdukByBrand(brand) {
  if (!fs.existsSync(DB_PATH)) return []
  const products = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  return products.filter(p =>
    p.brand?.toUpperCase() === brand.toUpperCase() &&
    p.seller_product_status === true
  ).sort((a, b) => a.price - b.price)
}

function getProdukByCategory(category) {
  if (!fs.existsSync(DB_PATH)) return []
  const products = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  return products.filter(p =>
    p.category?.toLowerCase().includes(category.toLowerCase()) &&
    p.seller_product_status === true
  ).sort((a, b) => a.price - b.price)
}

async function prosesTransaksiDigiflazz(kode_produk, tujuan, hargaJual, hargaModal, db, sender, from, conn, quotedMsg, dibayarViaQris = false) {
  const config = getConfig()
  const { digiuser, digiapi, hargaAdmin } = config
  const sleep = ms => new Promise(r => setTimeout(r, ms))

  if (!fs.existsSync(DB_PATH)) throw new Error('Database produk Digiflazz belum ada. Jalankan .getdigi dulu.')
  const products = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  const produk = products.find(p => p.buyer_sku_code === kode_produk)
  if (!produk) throw new Error(`Produk ${kode_produk} tidak ditemukan`)

  const user = db.getUser(sender)

  if (!dibayarViaQris) {
    if (user.saldo < hargaJual) {
      throw new Error(`Saldo tidak cukup. Saldo kamu: Rp ${toRupiah(user.saldo)}, harga: Rp ${toRupiah(hargaJual)}`)
    }
    db.setUser(sender, { saldo: user.saldo - hargaJual })
  }

  const reffId = crypto.randomBytes(8).toString('hex').substr(0, 15)
  const sign = crypto.createHash('md5').update(digiuser + digiapi + reffId).digest('hex')

  try {
    await conn.sendMessage(from, {
      text: `⏳ Memproses *${produk.product_name}* untuk *${tujuan}*...\nRef: ${reffId}`
    }, { quoted: quotedMsg })
  } catch (e) {
    // Kalau quoted message expired, kirim tanpa quoted
    await conn.sendMessage(from, {
      text: `⏳ Memproses *${produk.product_name}* untuk *${tujuan}*...\nRef: ${reffId}`
    })
  }

  const reqConfig = {
    method: 'POST',
    url: 'https://api.digiflazz.com/v1/transaction',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ username: digiuser, buyer_sku_code: kode_produk, customer_no: tujuan, ref_id: reffId, sign })
  }

  let data = null
  let status = 'gagal'
  let sn = '-'
  let digiError = ''

  try {
    const res = await axios({ ...reqConfig, timeout: 30000 })
    data = res.data?.data
    status = data?.status?.toLowerCase() || 'gagal'
    sn = data?.sn || '-'
    digiLog(`REQ ref=${reffId} sku=${kode_produk} tujuan=${tujuan} -> status=${data?.status} rc=${data?.rc} msg=${data?.message} sn=${sn}`)
  } catch (e) {
    digiError = e.response ? `HTTP ${e.response.status} ${JSON.stringify(e.response.data).slice(0, 300)}` : e.message
    digiLog(`REQ ref=${reffId} sku=${kode_produk} tujuan=${tujuan} -> ERROR ${digiError}`)
    status = 'gagal'
  }

  let retries = 0
  while (status !== 'sukses' && status !== 'gagal' && retries < 250) {
    await sleep(2000)
    retries++
    try {
      const res = await axios({ ...reqConfig, timeout: 30000 })
      data = res.data?.data
      status = data?.status?.toLowerCase() || 'gagal'
      sn = data?.sn || sn
      if (retries % 15 === 0 || status !== 'pending') digiLog(`POLL#${retries} ref=${reffId} -> status=${data?.status} rc=${data?.rc} msg=${data?.message}`)
    } catch (e) { digiLog(`POLL#${retries} ref=${reffId} -> ERROR ${e.message}`) }
  }
  if (status !== 'sukses' && !digiError) digiError = data ? `rc=${data.rc} ${data.message || ''}`.trim() : 'tanpa respons'

  const userSaldo = db.getUser(sender).saldo
  const userData = db.getUser(sender)
  const chatJid = userData.chatJid || sender

  // Baca chatJid owner dari file
  let ownerChatJid = config.ownerNumber[0] + '@s.whatsapp.net'
  try {
    const ownerJidPath = path.join(__dirname, '..', 'database', 'owner_jid.json')
    if (fs.existsSync(ownerJidPath)) {
      const ownerData = JSON.parse(fs.readFileSync(ownerJidPath, 'utf-8'))
      ownerChatJid = ownerData.chatJid || ownerChatJid
    }
  } catch (e) {
    console.error('[DIGI] Gagal baca owner JID:', e.message)
  }

  const txLogger = require('./transactionLogger')

  if (status === 'sukses') {
    const profit = hargaJual - hargaModal
    const struk = `✅ *Transaksi Sukses*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Produk:* ${produk.product_name}\n*Tujuan:* ${tujuan}\n*Harga:* Rp ${toRupiah(hargaJual)}\n*SN:* ${sn}\n\n*Saldo kamu:* Rp ${toRupiah(userSaldo)}\n_${config.botName}_`
    try { await conn.sendMessage(chatJid, { text: struk }) } catch(e) { console.error('[DIGI] Gagal kirim struk user:', e.message) }
    try {
      await conn.sendMessage(ownerChatJid, {
        text: `✅ *Transaksi Sukses (Digi)*\nProduk: ${produk.product_name}\nTujuan: ${tujuan}\nHarga Jual: Rp ${toRupiah(hargaJual)}\nModal: Rp ${toRupiah(hargaModal)}\nProfit: Rp ${toRupiah(profit)}\nSN: ${sn}\nUser: @${sender.split('@')[0]}`,
        mentions: [sender]
      })
    } catch(e) { console.error('[DIGI] Gagal kirim notif owner:', e.message) }

    // Log transaksi sukses
    txLogger.log({
      type: 'order',
      status: 'sukses',
      user: sender,
      produk: produk.product_name,
      sku: kode_produk,
      tujuan,
      hargaJual,
      hargaModal,
      profit,
      sn
    })

    // Kirim notifikasi marketing ke grup (jika ada promoGroupJid di config)
    if (config.promoGroupJid) {
      try {
        const promoMsg = `🎉 *Transaksi Sukses!*\n\n🎮 *${produk.product_name}*\n✅ Berhasil diproses\n\n🙏 Terima kasih sudah belanja di *${config.botName}*!\n\n_Mau top up juga? Ketik *${config.prefix}menu* untuk mulai_`
        await conn.sendMessage(config.promoGroupJid, { text: promoMsg })
      } catch(e) { console.error('[DIGI] Gagal kirim notif promo grup:', e.message) }
    }

    // Simpan ke riwayat user
    const userData = db.getUser(sender)
    const riwayatUser = userData.riwayat || []
    riwayatUser.unshift({
      type: 'order',
      status: 'sukses',
      produk: produk.product_name,
      tujuan,
      hargaJual,
      waktu: Date.now()
    })
    db.setUser(sender, { riwayat: riwayatUser.slice(0, 50) })

    return { success: true, sn }
  } else {
    const u = db.getUser(sender)
    db.setUser(sender, { saldo: u.saldo + hargaJual })
    const userSaldoRefund = db.getUser(sender).saldo
    const gagalMsg = `❌ *Transaksi Gagal*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Produk:* ${produk.product_name}\n*Tujuan:* ${tujuan}\n\n💰 Saldo dikembalikan: Rp ${toRupiah(hargaJual)}\n*Saldo kamu:* Rp ${toRupiah(userSaldoRefund)}\n\n_Silakan coba lagi atau hubungi admin_`
    try { await conn.sendMessage(chatJid, { text: gagalMsg }) } catch(e) { console.error('[DIGI] Gagal kirim notif gagal user:', e.message) }
    try {
      await conn.sendMessage(ownerChatJid, {
        text: `❌ *Transaksi Digi Gagal*\nProduk: ${produk.product_name}\nTujuan: ${tujuan}\nRef: ${reffId}\nAlasan: ${digiError || '-'}\nUser: @${sender.split('@')[0]}\nSaldo direfund: Rp ${toRupiah(hargaJual)}\n\n_Detail: ketik .digilog_`,
        mentions: [sender]
      })
    } catch(e) { console.error('[DIGI] Gagal kirim notif gagal owner:', e.message) }

    // Log transaksi gagal
    txLogger.log({
      type: 'order',
      status: 'gagal',
      user: sender,
      produk: produk.product_name,
      sku: kode_produk,
      tujuan,
      hargaJual,
      hargaModal,
      profit: 0
    })

    // Simpan ke riwayat user (gagal)
    const userData2 = db.getUser(sender)
    const riwayatGagal = userData2.riwayat || []
    riwayatGagal.unshift({
      type: 'order',
      status: 'gagal',
      produk: produk.product_name,
      tujuan,
      hargaJual,
      waktu: Date.now()
    })
    db.setUser(sender, { riwayat: riwayatGagal.slice(0, 50) })

    return { success: false }
  }
}

module.exports = { digiLog, readDigiLog, getProdukDigi, cekSaldoDigi, getProdukByBrand, getProdukByCategory, prosesTransaksiDigiflazz, calculateProfit, toRupiah }
