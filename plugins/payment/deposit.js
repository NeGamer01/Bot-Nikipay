const { createQris, getQrisImage, generateUniqueNominal, checkStatus } = require('../../lib/qris')
const { toRupiah } = require('../../lib/digiflazz')
const { sendOwnerNotify } = require('../../lib/ownerNotify')
const txLogger = require('../../lib/transactionLogger')

module.exports = {
  command: ['deposit', 'dep'],
  category: 'payment',
  desc: 'Deposit saldo via QRIS',
  async run({ conn, msg, text, db, config, prefix }) {
    const nominal = parseInt(text.trim())
    if (!nominal || nominal < 10000) {
      return conn.sendMessage(msg.from, { text: `❌ Masukkan nominal deposit minimal Rp 10.000!\nContoh: *${prefix}deposit 50000*` }, { quoted: msg.original })
    }

    const amount = generateUniqueNominal(nominal)
    const createdAt = Date.now()

    await conn.sendMessage(msg.from, { text: '⏳ Membuat QRIS...' }, { quoted: msg.original })

    let qris
    try {
      qris = await createQris(amount, `DEP-${msg.sender.split('@')[0]}-${createdAt}`)
    } catch (e) {
      return conn.sendMessage(msg.from, { text: `❌ Gagal membuat QRIS: ${e.message}` }, { quoted: msg.original })
    }
    const qrisImage = await getQrisImage(qris)

    db.setUser(msg.sender, { pendingDeposit: { amount, nominalAsli: nominal, createdAt, type: 'deposit', qrisId: qris.qrisId } })

    const info = `💳 *DEPOSIT SALDO*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Nominal:* Rp ${toRupiah(nominal)}\n*Bayar:* Rp ${toRupiah(amount)}\n*(+${amount - nominal} kode unik)*\n\n⚠️ Bayar TEPAT *Rp ${toRupiah(amount)}*\n⏰ Berlaku *5 menit*\n\n_Scan QR di bawah ini:_`

    const infoMsg = await conn.sendMessage(msg.from, { text: info }, { quoted: msg.original })
    const qrisMsg = await conn.sendImage(msg.from, qrisImage, `Bayar Rp ${toRupiah(amount)} — Berlaku 5 menit`, msg.original)

    const maxWait = 5 * 60 * 1000
    const interval = 5000
    let elapsed = 0

    const poll = setInterval(async () => {
      elapsed += interval
      if (elapsed >= maxWait) {
        clearInterval(poll)
        db.setUser(msg.sender, { pendingDeposit: null })
        if (qrisMsg?.key) await conn.sendMessage(msg.from, { delete: qrisMsg.key }).catch(() => {})
        if (infoMsg?.key) await conn.sendMessage(msg.from, { delete: infoMsg.key }).catch(() => {})
        return conn.sendMessage(msg.from, { text: '⏰ Waktu pembayaran habis. Silakan deposit ulang.' })
      }

      try {
        const st = await checkStatus(qris.qrisId)
        if (st.status === 'EXPIRED') {
          clearInterval(poll)
          db.setUser(msg.sender, { pendingDeposit: null })
          if (qrisMsg?.key) await conn.sendMessage(msg.from, { delete: qrisMsg.key }).catch(() => {})
          if (infoMsg?.key) await conn.sendMessage(msg.from, { delete: infoMsg.key }).catch(() => {})
          return conn.sendMessage(msg.from, { text: '⏰ QRIS sudah kadaluarsa. Silakan deposit ulang.' })
        }
        if (st.paid) {
          clearInterval(poll)
          db.setUser(msg.sender, { pendingDeposit: null })

          // Hapus pesan QRIS
          if (qrisMsg?.key) await conn.sendMessage(msg.from, { delete: qrisMsg.key }).catch(() => {})
          if (infoMsg?.key) await conn.sendMessage(msg.from, { delete: infoMsg.key }).catch(() => {})

          const user = db.getUser(msg.sender)
          const saldoBaru = (user.saldo || 0) + nominal
          db.setUser(msg.sender, { saldo: saldoBaru })

          // Log transaksi deposit
          txLogger.log({
            type: 'deposit',
            status: 'sukses',
            user: msg.sender,
            jumlah: nominal,
            saldoBaru
          })

          // Simpan ke riwayat user
          const riwayatDeposit = user.riwayat || []
          riwayatDeposit.unshift({
            type: 'deposit',
            jumlah: nominal,
            saldoBaru,
            waktu: Date.now()
          })
          db.setUser(msg.sender, { riwayat: riwayatDeposit.slice(0, 50) })

          await conn.sendMessage(msg.from, {
            text: `✅ *Deposit Berhasil!*\n▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Nominal:* Rp ${toRupiah(nominal)}\n*Saldo sekarang:* Rp ${toRupiah(saldoBaru)}\n\n_${config.botName}_`
          })

          await sendOwnerNotify(conn,
            `💰 *Deposit Masuk*\nUser: @${msg.sender.split('@')[0]}\nNominal: Rp ${toRupiah(nominal)}\nSaldo baru: Rp ${toRupiah(saldoBaru)}`,
            [msg.sender]
          )
        }
      } catch (e) { /* lanjut polling */ }
    }, interval)
  }
}
