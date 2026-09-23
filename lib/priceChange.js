// lib/priceChange.js — Deteksi perubahan harga produk Digiflazz
//
// Dipanggil setiap kali .getdigi selesai mengambil data baru.
// Membandingkan harga lama vs harga baru per buyer_sku_code, lalu
// mengirim info TURUN/NAIK ke grup promosi.

const fs = require('fs')
const path = require('path')
const { toRupiah, calculateProfit } = require('./digiflazz')

const DB_PATH = path.join(__dirname, '..', 'database', 'datadigiflaz.json')

// Ambil config tanpa error saat require cycle
function getConfig() {
  return require('../config')
}

// Hitung harga jual (modal + profit + admin) untuk ditampilkan ke pelanggan
function hargaJual(modal) {
  const { hargaAdmin } = getConfig()
  return modal + calculateProfit(modal) + (hargaAdmin || 0)
}

/**
 * Bandingkan produk lama vs produk baru.
 * @returns {turun: [...], naik: [...], baru: [...], mati: [...]}
 * turun  = harga modal lebih murah dari sebelumnya
 * naik  = harga modal lebih mahal
 * baru  = sku baru yang belum ada di data lama
 * mati  = sku lama yang hilang dari data baru
 */
function diffHarga(produkLama, produkBaru) {
  const lamaMap = new Map()
  for (const p of produkLama || []) {
    if (p.buyer_sku_code) lamaMap.set(p.buyer_sku_code, p)
  }
  const baruMap = new Map()
  for (const p of produkBaru || []) {
    if (p.buyer_sku_code) baruMap.set(p.buyer_sku_code, p)
  }

  const turun = [], naik = [], baru = [], mati = []

  for (const [sku, n] of baruMap) {
    const o = lamaMap.get(sku)
    if (!o) { baru.push(n); continue }
    const hargaLama = Number(o.price) || Number(o.buyer_price) || 0
    const hargaBaru = Number(n.price) || Number(n.buyer_price) || 0
    if (hargaBaru < hargaLama) turun.push({ ...n, hargaLama, hargaBaru, selisih: hargaLama - hargaBaru })
    else if (hargaBaru > hargaLama) naik.push({ ...n, hargaLama, hargaBaru, selisih: hargaBaru - hargaLama })
  }

  for (const [sku, o] of lamaMap) {
    if (!baruMap.has(sku)) mati.push(o)
  }

  // Urutkan: turun paling besar dulu, naik paling kecil dulu
  turun.sort((a, b) => b.selisih - a.selisih)
  naik.sort((a, b) => a.selisih - b.selisih)

  return { turun, naik, baru, mati }
}

/**
 * Cek perubahan harga sebelum datadigiflaz.json ditimpa.
 * Jalankan SEBELUM write file baru.
 * @returns { adaPerubahan, produkBaru } atau null jika tidak ada data lama
 */
function cekSebelumUpdate() {
  if (!fs.existsSync(DB_PATH)) return null
  let produkLama
  try {
    produkLama = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch (e) { return null }
  return produkLama
}

/**
 * Kirim info perubahan harga ke grup promosi.
 * @param {Array} produkBaru - hasil fetch baru (sudah ditulis ke file)
 * @param {Array} produkLama - data lama (hasil cekSebelumUpdate)
 * @param {object} conn - koneksi baileys
 * @param {object} [opts] - { batasMaks: 15, kirimNaik: false }
 */
async function kirimInfoPerubahan(produkBaru, produkLama, conn, opts = {}) {
  const config = getConfig()
  const promoGroupJid = config.promoGroupJid
  if (!promoGroupJid) return { dikirim: false, alasan: 'promoGroupJid belum diisi' }

  const { turun, naik, baru } = diffHarga(produkLama, produkBaru)
  const batas = opts.batasMaks || 15
  const kirimNaik = opts.kirimNaik !== false // default true

  if (!turun.length && !baru.length && (!kirimNaik || !naik.length)) {
    return { dikirim: false, alasan: 'tidak ada perubahan harga' }
  }

  // Kelompokkan per brand supaya nama brand tidak berulang-ulang
  function kelompok(list, limit) {
    const perBrand = new Map()
    const urutan = []
    for (const p of list) {
      const b = p.brand || 'Lainnya'
      if (!perBrand.has(b)) { perBrand.set(b, []); urutan.push(b) }
      perBrand.get(b).push(p)
    }
    const ambil = []
    let sisa = 0
    for (const b of urutan) {
      const items = perBrand.get(b)
      if (ambil.length + items.length <= limit) ambil.push(...items.map(p => ({ b, p })))
      else {
        const muat = limit - ambil.length
        ambil.push(...items.slice(0, muat).map(p => ({ b, p })))
        sisa += items.length - muat
        ambil.push(...items.slice(muat + 1).map(() => ({ sisa: true })))
        break
      }
    }
    return { ambil, sisa, jumlahBrand: urutan.length }
  }

  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  let teks = `📢 *UPDATE HARGA NIKISTORE*\n📅 ${tgl}\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n`

  if (turun.length) {
    const g = kelompok(turun, batas)
    teks += `\n🔥 *${turun.length} PRODUK TURUN HARGA* (${g.jumlahBrand} game)\n`
    let brandAktif = null
    for (const it of g.ambil) {
      if (it.sisa) continue
      if (it.b !== brandAktif) { teks += `\n*${it.b}*\n`; brandAktif = it.b }
      const p = it.p
      teks += `${p.product_name}\n~~Rp${toRupiah(hargaJual(p.hargaLama))}~~ → *Rp${toRupiah(hargaJual(p.hargaBaru))}* (hemat Rp${toRupiah(p.selisih)})\n`
    }
    if (g.sisa > 0) teks += `\n_+${g.sisa} produk lainnya_`
  }

  if (kirimNaik && naik.length) {
    const g = kelompok(naik, batas)
    teks += `\n\n📈 *${naik.length} PRODUK NAIK HARGA* (${g.jumlahBrand} game)\n`
    let brandAktif = null
    for (const it of g.ambil) {
      if (it.sisa) continue
      if (it.b !== brandAktif) { teks += `\n*${it.b}*\n`; brandAktif = it.b }
      const p = it.p
      teks += `${p.product_name}\nRp${toRupiah(hargaJual(p.hargaLama))} → *Rp${toRupiah(hargaJual(p.hargaBaru))}* (+Rp${toRupiah(p.selisih)})\n`
    }
    if (g.sisa > 0) teks += `\n_+${g.sisa} produk lainnya_`
  }

  if (baru.length) {
    const g = kelompok(baru, batas)
    teks += `\n\n✨ *${baru.length} PRODUK BARU* (${g.jumlahBrand} game)\n`
    let brandAktif = null
    for (const it of g.ambil) {
      if (it.sisa) continue
      if (it.b !== brandAktif) { teks += `\n*${it.b}*\n`; brandAktif = it.b }
      const p = it.p
      teks += `${p.product_name} — *Rp${toRupiah(hargaJual(Number(p.price) || 0))}*\n`
    }
    if (g.sisa > 0) teks += `\n_+${g.sisa} produk baru lainnya_`
  }

  teks += `\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬\nKetik *${config.prefix || '.'}allgame* untuk lihat semua produk tersedia.\n_NIKISTORE • harga update otomatis dari supplier_`

  await conn.sendMessage(promoGroupJid, { text: teks })
  return { dikirim: true, turun: turun.length, naik: naik.length, baru: baru.length }
}

module.exports = {
  diffHarga,
  cekSebelumUpdate,
  kirimInfoPerubahan,
  hargaJual
}
