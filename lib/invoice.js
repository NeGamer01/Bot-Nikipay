// Invoice digital — generate struk transaksi sebagai gambar PNG.
// Digunakan di lib/digiflazz.js saat transaksi sukses (mengganti struk teks).
// Fallback otomatis ke struk teks lama kalau canvas gagal render.
const path = require('path')
const fs = require('fs')

let canvasLib = null
try {
  canvasLib = require('canvas')
} catch (e) {
  canvasLib = null
}

function toRupiah(x) {
  return String(Number(x) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function tglIndo(ts) {
  const d = new Date(ts || Date.now())
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const pad = n => String(n).padStart(2, '0')
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Warna tema NIKISTORE (dark + aksen emas)
const W = {
  bg: '#12151c',
  panel: '#1b1f2a',
  panel2: '#232838',
  aksen: '#f0b90b',
  aksen2: '#ffd84d',
  teks: '#f2f4f8',
  teksRedup: '#9aa3b5',
  hijau: '#22c55e',
  merah: '#ef4444',
  garis: '#2c3345'
}

const PAD = 48
const LEBAR = 820
const VALUE_X = PAD + 200
const VALUE_MAXW = LEBAR - PAD - VALUE_X
const SN_BOX_W = LEBAR - PAD * 2
const SN_MAXW = SN_BOX_W - 220 - 20 - 14

const FAM = 'sans-serif'

function fontBiasa(px) { return `400 ${px}px ${FAM}` }
function fontTebal(px) { return `700 ${px}px ${FAM}` }

// Pecah teks jadi baris yg muat di maxW.
// Teks tanpa spasi (SN, ref) dipotong per-karakter biar tetap muat.
function pecahBaris(ctx, teks, maxW, px) {
  ctx.font = fontBiasa(px)
  const s = String(teks)
  const baris = []
  let cur = ''
  // Coba pecah per kata dulu (produk ada spasinya)
  for (const k of s.split(' ')) {
    const uji = cur ? cur + ' ' + k : k
    if (ctx.measureText(uji).width > maxW && cur) {
      baris.push(cur)
      cur = k
    } else {
      cur = uji
    }
  }
  if (cur) baris.push(cur)
  // Kalau masih ada kata tunggal yg lebih panjang dari maxW, potong per char
  const out = []
  for (const b of baris) {
    if (ctx.measureText(b).width <= maxW) { out.push(b); continue }
    let s2 = b
    while (ctx.measureText(s2).width > maxW) {
      let cut = s2.length
      while (cut > 1 && ctx.measureText(s2.slice(0, cut)).width > maxW) cut--
      out.push(s2.slice(0, cut))
      s2 = s2.slice(cut)
    }
    if (s2) out.push(s2)
  }
  return out
}

/**
 * Render invoice PNG ke buffer.
 * @param {object} o - { botName, produk, tujuan, hargaJual, saldo, sn, ref, status, waktu }
 */
async function buatInvoice(o) {
  if (!canvasLib) throw new Error('canvas tidak terinstall')
  const { createCanvas } = canvasLib

  const sukses = (o.status || 'sukses').toLowerCase() === 'sukses'

  // Canvas probe untuk hitung layout
  const probe = createCanvas(LEBAR, 10)
  const px = probe.getContext('2d')

  const barisProduk = pecahBaris(px, o.produk || '-', VALUE_MAXW, 23)
  const snTeks = o.sn && o.sn !== '-' ? String(o.sn) : '-'
  const barisSN = pecahBaris(px, snTeks, SN_MAXW, 21)
  const barisRef = pecahBaris(px, o.ref || '-', VALUE_MAXW, 23)

  const barisTinggi = 30
  const HH = 118
  // Tinggi dihitung dari jumlah baris (auto-wrap)
  let y = HH + 58 + 40          // header + padding atas + baseline baris pertama
  y += 42 + (barisProduk.length - 1) * 23   // Produk
  y += 42                        // Tujuan
  y += 42 + (barisRef.length - 1) * 23      // Ref ID
  y += 6                         // jarak ke box SN
  const snBoxH = Math.max(52, barisSN.length * 30 + 22)
  y += snBoxH + 30               // box SN
  y += 40                        // garis pemisah
  y += 40                        // Total
  y += 40                        // Sisa saldo
  const TINGGI = y + 96          // footer

  const c = createCanvas(LEBAR, TINGGI)
  const x = c.getContext('2d')

  // Background
  x.fillStyle = W.bg
  x.fillRect(0, 0, LEBAR, TINGGI)

  // Header
  x.fillStyle = W.panel
  x.fillRect(0, 0, LEBAR, HH)
  x.fillStyle = W.aksen
  x.fillRect(0, HH, LEBAR, 4)

  x.fillStyle = W.aksen
  x.font = fontTebal(40)
  x.textBaseline = 'alphabetic'
  x.fillText(o.botName || 'NIKISTORE', PAD, 62)

  x.fillStyle = W.teksRedup
  x.font = fontBiasa(21)
  x.fillText('Struk Transaksi', PAD, 92)

  // Status badge
  const stTeks = sukses ? 'BERHASIL' : (o.status || 'GAGAL').toUpperCase()
  const stWarna = sukses ? W.hijau : W.merah
  x.font = fontTebal(20)
  const stW = x.measureText(stTeks).width
  const bx = LEBAR - PAD - stW - 28
  x.fillStyle = stWarna + '22'
  x.beginPath()
  x.roundRect(bx, 32, stW + 28, 40, 10)
  x.fill()
  x.fillStyle = stWarna
  x.fillText(stTeks, bx + 14, 59)

  // ── Detail ──
  y = HH + 58 + 40
  x.font = fontBiasa(23)

  const cetakLabel = (lbl, baris, px2, warna) => {
    x.fillStyle = W.teksRedup
    x.font = fontBiasa(23)
    x.fillText(lbl, PAD, y)
    x.fillStyle = warna || W.teks
    x.font = fontBiasa(px2)
    baris.forEach((b, i) => x.fillText(b, VALUE_X, y + i * 30))
    y += 42 + (baris.length - 1) * 30
  }

  cetakLabel('Produk', barisProduk, 23)
  cetakLabel('Tujuan', [String(o.tujuan || '-')], 23)
  cetakLabel('Ref ID', barisRef, 23)

  // Box SN
  y += 6
  x.fillStyle = W.panel2
  x.beginPath()
  x.roundRect(PAD, y - 8, SN_BOX_W, snBoxH, 10)
  x.fill()
  x.strokeStyle = W.aksen
  x.lineWidth = 1.5
  x.stroke()
  x.fillStyle = W.teksRedup
  x.font = fontBiasa(21)
  x.fillText('Serial Number (SN)', PAD + 20, y + 20)
  x.fillStyle = W.aksen2
  x.font = fontTebal(21)
  barisSN.forEach((b, i) => x.fillText(b, PAD + 220, y + 20 + i * 30))
  y += snBoxH + 30

  // Garis pemisah
  x.strokeStyle = W.garis
  x.lineWidth = 1
  x.beginPath()
  x.moveTo(PAD, y)
  x.lineTo(LEBAR - PAD, y)
  x.stroke()
  y += 40

  // Total
  x.fillStyle = W.teks
  x.font = fontBiasa(24)
  x.fillText('Total Dibayar', PAD, y)
  x.fillStyle = W.aksen
  x.font = fontTebal(30)
  const tot = 'Rp ' + toRupiah(o.hargaJual || 0)
  const tw = x.measureText(tot).width
  x.fillText(tot, LEBAR - PAD - tw, y)
  y += 40

  // Sisa saldo
  x.fillStyle = W.teksRedup
  x.font = fontBiasa(21)
  x.fillText('Sisa saldo kamu', PAD, y)
  const sal = 'Rp ' + toRupiah(o.saldo ?? 0)
  const sw = x.measureText(sal).width
  x.fillStyle = W.teks
  x.fillText(sal, LEBAR - PAD - sw, y)

  // Footer
  x.fillStyle = W.teksRedup
  x.font = fontBiasa(20)
  x.textAlign = 'center'
  x.fillText('Terima kasih sudah berbelanja!', LEBAR / 2, TINGGI - 56)
  x.fillStyle = '#6b7383'
  x.font = fontBiasa(18)
  x.fillText(tglIndo(o.waktu), LEBAR / 2, TINGGI - 26)
  x.textAlign = 'left'

  return c.toBuffer('image/png')
}

module.exports = { buatInvoice, pecahBaris, toRupiah, tglIndo }
