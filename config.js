module.exports = {
  botName: 'NIKISTORE',
  prefix: '.',
  ownerNumber: ['241862929600639'], // nomor owner
  pairingNumber: '6288226488976',
  ownerName: 'Owner',
  packName: 'NIKISTORE',
  authorName: 'WhatsApp Bot',
  menuImage: '',

  // ─── DIGIFLAZZ ───────────────────────────────────────
  digiuser: 'wolahoD7l2KW',       // Username Digiflazz
  digiapi: 'pastekan-apikey-digikamu-disiniya',        // API Key Digiflazz

  // ─── NIKIPAY GATEWAY (QRIS) ──────────────────────────
  nikipayUrl: 'https://apipay.halogamingzone.com',   // URL gateway NikiPay (tanpa / di akhir)
  nikipayKey: 'npk_106c58310299f7a70f47c22b08be36e452113b7858488602',                 // API key dari dashboard NikiPay (/app -> API Key)

  // ─── PROMO NOTIFIKASI GRUP ───────────────────────────
  promoGroupJid: '120363297880854110@g.us', // Isi dengan JID grup yang mau dikirimi notifikasi transaksi sukses (contoh: '120363xxx@g.us')

  // ─── PROFIT ──────────────────────────────────────────
  hargaAdmin: 400,
  profitSettings: {
    minPercent: 3.0,
    maxPercent: 15.0,
    priceThresholdLow: 1000,
    priceThresholdHigh: 100000
  }
}
