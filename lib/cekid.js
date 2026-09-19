/**
 * lib/cekid.js — Cek nickname / validasi ID game
 *
 * Sumber 1 (gratis): Duniagames inquiry.
 *   Hasil sniff 2026-09-12: endpoint POST /api/transaction/v1/top-up/inquiry/store
 *   WAJIB body JSON: { productId, itemId, catalogId, paymentId, product_ref, product_ref_denom, gameId, zoneId?, campaignUrl }
 *   + header `Ciam-Type: FR` dan `x-device: <uuid>`.
 *   itemId/catalogId/paymentId sering berubah → di sini diambil OTOMATIS dari
 *   /api/item-catalog/v2/browse-offer/<slug> lalu di-cache 1 jam, jadi tidak perlu hardcode.
 *   Nickname ada di data.userNameGame. ID salah → 400 "Error_Game_Id".
 *   Catatan: Mobile Legends di Duniagames statusnya "product still maintenance" (Sep 2026) → otomatis fallback.
 *
 * Sumber 2 (berbayar ±Rp5, opsional): Digiflazz produk "Cek Username" (SKU dari price list, mis. ff1 / 3321).
 *   Aktifkan lewat config.cekIdFallbackDigiflazz = { 'FREE FIRE': 'ff1', 'MOBILE LEGENDS': '3321' }
 *
 * Return selalu: { ok: boolean, nickname?: string, source?: 'duniagames'|'digiflazz', reason?: string }
 * Tidak pernah throw — supaya plugin cukup cek `res.ok`.
 */

const axios = require('axios')
const crypto = require('crypto')

const DG_API = 'https://api.duniagames.co.id/api'
const DEVICE_ID = crypto.randomUUID()
const DG_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'id',
  Origin: 'https://duniagames.co.id',
  Referer: 'https://duniagames.co.id/',
  'Ciam-Type': 'FR',
  'x-device': DEVICE_ID,
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36'
}

// slug Duniagames per game bot
const DG_SLUG = {
  'FREE FIRE': 'freefire',
  'MOBILE LEGENDS': 'mobile-legends',
  'PUBG MOBILE': 'pubg-mobile',
  'HONOR OF KINGS': 'honor-of-kings',
  'CALL OF DUTY MOBILE': 'call-of-duty-mobile',
  VALORANT: 'valorant'
}

const CACHE_TTL = 60 * 60 * 1000
const offerCache = {} // slug -> { ts, productId, itemId, catalogId, paymentId }

function log(...a) { console.log('[cekid]', ...a) }

/** Ambil kombinasi item+payment yang aktif dari katalog Duniagames (auto, tidak hardcode). */
async function getDgOffer(slug) {
  const c = offerCache[slug]
  if (c && Date.now() - c.ts < CACHE_TTL) return c

  const res = await axios.get(`${DG_API}/item-catalog/v2/browse-offer/${slug}?isConditional=true`, { headers: DG_HEADERS, timeout: 15000, validateStatus: () => true })
  const body = res.data
  if (body?.status?.code !== 0) throw new Error(body?.status?.message || 'browse-offer gagal')

  // pilih item termurah yang punya payment channel (paymentId dibutuhkan walau kita tidak bayar)
  let best = null
  for (const grp of body.data.items || []) {
    if (grp.typeName === 'flashsale') continue // flashsale sering pakai channel telco saja
    for (const it of grp.data || []) {
      const list = it.paymentChannel?.list || []
      if (!list.length) continue
      const price = Number(it.price)
      if (!best || price < best.price) {
        const pay = list.find(p => /qris|dana|gopay|ovo|shopee/i.test(p.namePaymentChannel)) || list[0]
        best = { price, itemId: it.itemIdentifier, catalogId: it.paymentChannel.catalogID, paymentId: pay.id }
      }
    }
  }
  if (!best) throw new Error('tidak ada item aktif')

  // productId numerik dari katalog produk
  const prod = await axios.get(`${DG_API}/product/catalog/v2/product?productType=all&page=1&limit=100`, { headers: DG_HEADERS, timeout: 15000 })
  const p = (prod.data?.data?.data || []).find(x => x.slug === slug)
  const productId = p ? Number(p.id) : null
  if (!productId || Number.isNaN(productId)) throw new Error('productId tidak ditemukan')

  offerCache[slug] = { ts: Date.now(), productId, ...best }
  log(`offer ${slug}:`, offerCache[slug])
  return offerCache[slug]
}

async function cekIdDuniagames(brand, gameId, zoneId = '') {
  const slug = DG_SLUG[brand.toUpperCase()]
  if (!slug) return { ok: false, reason: 'game tidak didukung duniagames' }
  try {
    const o = await getDgOffer(slug)
    const payload = {
      productId: o.productId, itemId: o.itemId, catalogId: o.catalogId, paymentId: o.paymentId,
      product_ref: 'REG', product_ref_denom: 'REG', gameId: String(gameId), campaignUrl: ''
    }
    if (zoneId) payload.zoneId = String(zoneId)
    const res = await axios.post(`${DG_API}/transaction/v1/top-up/inquiry/store`, payload, {
      headers: DG_HEADERS, timeout: 15000, validateStatus: () => true
    })
    const msg = res.data?.status?.message || ''
    const nick = res.data?.data?.userNameGame || res.data?.data?.gameDetail?.userName
    if (res.status === 200 && nick) return { ok: true, nickname: String(nick).replace(/\s+/g, ' ').trim(), source: 'duniagames' }
    if (/Error_Game_Id/i.test(msg)) return { ok: false, reason: 'ID tidak ditemukan', source: 'duniagames', final: true }
    log(`duniagames ${slug} gagal:`, res.status, msg)
    return { ok: false, reason: msg || `HTTP ${res.status}` }
  } catch (e) {
    if (/maintenance/i.test(e.message)) delete offerCache[slug]
    log(`duniagames ${slug} error:`, e.message)
    return { ok: false, reason: e.message }
  }
}

/** Fallback berbayar: Digiflazz produk "Cek Username". Hasil nickname biasanya di field sn. */
async function cekIdDigiflazz(sku, tujuan) {
  const config = require('../config')
  const { digiuser, digiapi } = config
  if (!digiuser || !digiapi || !sku) return { ok: false, reason: 'digiflazz tidak dikonfigurasi' }
  const refId = 'cek' + crypto.randomBytes(6).toString('hex')
  const sign = crypto.createHash('md5').update(digiuser + digiapi + refId).digest('hex')
  const body = { username: digiuser, buyer_sku_code: sku, customer_no: String(tujuan), ref_id: refId, sign }
  try {
    let data
    for (let i = 0; i < 6; i++) {
      const res = await axios.post('https://api.digiflazz.com/v1/transaction', body, { timeout: 20000 })
      data = res.data?.data
      const st = (data?.status || '').toLowerCase()
      if (st === 'sukses' || st === 'gagal') break
      await new Promise(r => setTimeout(r, 2000))
    }
    if ((data?.status || '').toLowerCase() === 'sukses' && data.sn) return { ok: true, nickname: data.sn, source: 'digiflazz' }
    return { ok: false, reason: data?.message || 'digiflazz gagal', source: 'digiflazz' }
  } catch (e) {
    log('digiflazz error:', e.message)
    return { ok: false, reason: e.message }
  }
}

/**
 * API utama untuk plugin.
 * @param {string} brand  'FREE FIRE' | 'MOBILE LEGENDS' | ...
 * @param {string} gameId
 * @param {string} [zoneId]
 */
async function cekId(brand, gameId, zoneId = '') {
  const dg = await cekIdDuniagames(brand, gameId, zoneId)
  if (dg.ok || dg.final) return dg

  const config = require('../config')
  const sku = config.cekIdFallbackDigiflazz?.[brand.toUpperCase()]
  if (sku) {
    const tujuan = zoneId ? `${gameId}${zoneId}` : gameId
    return cekIdDigiflazz(sku, tujuan)
  }
  return dg
}

module.exports = { cekId, cekIdDuniagames, cekIdDigiflazz, DG_SLUG }
