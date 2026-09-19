// lib/qris.js — Pembayaran QRIS via NikiPay Gateway (apipay.halogamingzone.com)
// Dokumentasi API: <nikipayUrl>/docs
const axios = require('axios')

function getConfig() {
  return require('../config')
}

function baseUrl() {
  const { nikipayUrl } = getConfig()
  return String(nikipayUrl || '').replace(/\/$/, '')
}

function headers() {
  const { nikipayKey } = getConfig()
  if (!nikipayKey) throw new Error('nikipayKey belum diisi di config.js')
  return { 'x-api-key': nikipayKey, 'Content-Type': 'application/json' }
}

function apiError(e, fallback) {
  const d = e?.response?.data
  if (d?.message) return new Error(`${d.message}${d.code ? ` (${d.code})` : ''}`)
  return new Error(e?.message || fallback)
}

/**
 * Buat QRIS dinamis. Return: { qrisId, transactionId, amount, qrisUrl, qrisCode, expiresAt, verificationMode }
 * - qrisUrl  : gambar QR (PNG) — bisa langsung dikirim ke WhatsApp
 * - qrisCode : string EMV mentah (kalau mau generate QR sendiri)
 */
async function createQris(amount, reference) {
  const res = await axios.post(`${baseUrl()}/api/v1/qris`, {
    amount,
    reference: reference || `WA-${Date.now()}`
  }, { headers: headers(), timeout: 20000 }).catch((e) => { throw apiError(e, 'Gagal membuat QRIS') })

  const data = res.data?.data
  if (!res.data?.success || !data?.qris_id) throw new Error(res.data?.message || 'Response NikiPay tidak valid')

  return {
    qrisId: data.qris_id,
    transactionId: data.trx_id || data.qris_id,
    amount: data.amount,
    qrisUrl: `${baseUrl()}/qr/${data.qris_id}?download=1`,
    qrisCode: data.qris_code,
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 5 * 60 * 1000,
    verificationMode: data.verification_mode || 'auto'
  }
}

/** Ambil gambar QR sebagai Buffer (lebih stabil untuk dikirim Baileys). Fallback ke URL kalau gagal. */
async function getQrisImage(qris) {
  try {
    const res = await axios.get(qris.qrisUrl, { responseType: 'arraybuffer', timeout: 20000 })
    return Buffer.from(res.data)
  } catch (e) {
    return qris.qrisUrl
  }
}

/**
 * Cek status pembayaran (endpoint publik, tanpa API key).
 * Return: { paid: boolean, status: 'PENDING'|'PAID'|'EXPIRED', transaction, message }
 */
async function checkStatus(qrisId) {
  const res = await axios.get(`${baseUrl()}/api/v1/qris/${encodeURIComponent(qrisId)}/status`, {
    timeout: 15000,
    validateStatus: (s) => s < 500 // 410 = EXPIRED, tetap dibaca
  })
  const d = res.data || {}
  if (res.status === 404 || d.code === 'NOT_FOUND') return { paid: false, status: 'EXPIRED', transaction: null, message: 'QRIS tidak ditemukan' }
  return {
    paid: d.paid === true || d.status === 'PAID',
    status: d.status || 'PENDING',
    transaction: d.transaction || null,
    message: d.message || null
  }
}

/** Info akun pemilik API key: langganan, GoBiz terhubung, QRIS statis terpasang. */
async function getAccountInfo() {
  const res = await axios.get(`${baseUrl()}/api/v1/me`, { headers: headers(), timeout: 15000 })
    .catch((e) => { throw apiError(e, 'Gagal mengambil info akun NikiPay') })
  return res.data?.data || null
}

/** Nominal unik (+21..497) supaya pembayaran bersamaan tidak tertukar. */
function generateUniqueNominal(baseAmount) {
  const random = Math.floor(Math.random() * 477) + 21
  return baseAmount + random
}

/**
 * Polling status sampai PAID / EXPIRED / timeout.
 * onTick(status) dipanggil tiap interval. Return 'PAID' | 'EXPIRED' | 'TIMEOUT'.
 */
async function waitForPayment(qrisId, { maxWait = 5 * 60 * 1000, interval = 5000, onTick } = {}) {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, interval))
    try {
      const st = await checkStatus(qrisId)
      if (onTick) onTick(st)
      if (st.paid) return 'PAID'
      if (st.status === 'EXPIRED') return 'EXPIRED'
    } catch (e) { /* lanjut polling */ }
  }
  return 'TIMEOUT'
}

module.exports = { createQris, getQrisImage, checkStatus, getAccountInfo, generateUniqueNominal, waitForPayment }
