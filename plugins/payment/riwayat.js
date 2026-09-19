const { toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['riwayat', 'history', 'mutasi'],
  category: 'payment',
  desc: 'Cek riwayat transaksi kamu',

  async run({ conn, msg, db, config, prefix }) {
    const user = db.getUser(msg.sender)
    const riwayat = user.riwayat || []

    if (riwayat.length === 0) {
      return conn.sendMessage(msg.from, {
        text: `📋 *Riwayat Transaksi*\n\nBelum ada transaksi.\n\nMulai transaksi dengan *${prefix}menu*`
      }, { quoted: msg.original })
    }

    // Ambil 10 transaksi terakhir
    const latest = riwayat.slice(0, 10)

    let text = `📋 *RIWAYAT TRANSAKSI*\n━━━━━━━━━━━━━━━━━━━━\n`
    text += `Menampilkan 10 transaksi terakhir\n\n`

    for (const tx of latest) {
      const waktu = new Date(tx.waktu).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      if (tx.type === 'transfer_keluar') {
        text += `📤 *Transfer Keluar*\n`
        text += `   Ke: ${tx.tujuan?.split('@')[0] || '-'}\n`
        text += `   Jumlah: Rp ${toRupiah(tx.jumlah)}\n`
        text += `   ${waktu}\n\n`
      } else if (tx.type === 'transfer_masuk') {
        text += `📥 *Transfer Masuk*\n`
        text += `   Dari: ${tx.dari?.split('@')[0] || '-'}\n`
        text += `   Jumlah: Rp ${toRupiah(tx.jumlah)}\n`
        text += `   ${waktu}\n\n`
      } else if (tx.type === 'order') {
        const icon = tx.status === 'sukses' ? '✅' : '❌'
        text += `${icon} *Order ${tx.produk || '-'}*\n`
        text += `   Tujuan: ${tx.tujuan || '-'}\n`
        text += `   Harga: Rp ${toRupiah(tx.hargaJual || 0)}\n`
        text += `   ${waktu}\n\n`
      } else if (tx.type === 'deposit') {
        text += `💰 *Deposit*\n`
        text += `   Jumlah: Rp ${toRupiah(tx.jumlah)}\n`
        text += `   ${waktu}\n\n`
      } else {
        text += `📝 *${tx.keterangan || 'Transaksi'}*\n`
        text += `   Rp ${toRupiah(tx.jumlah || 0)}\n`
        text += `   ${waktu}\n\n`
      }
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`
    text += `_Saldo kamu: Rp ${toRupiah(user.saldo || 0)}_`

    await conn.sendMessage(msg.from, { text }, { quoted: msg.original })
  }
}
