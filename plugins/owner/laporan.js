const txLogger = require('../../lib/transactionLogger')
const { toRupiah } = require('../../lib/digiflazz')

module.exports = {
  command: ['laporan', 'report', 'rekap'],
  category: 'owner',
  desc: 'Laporan transaksi harian/mingguan/bulanan',
  isOwner: true,

  async run({ conn, msg, args, text, config, prefix }) {
    const periode = args[0]?.toLowerCase() || 'hari'

    let transactions = []
    let periodeLabel = ''

    if (periode === 'minggu' || periode === 'week') {
      transactions = txLogger.getThisWeekTransactions()
      periodeLabel = 'Minggu Ini'
    } else if (periode === 'bulan' || periode === 'month') {
      transactions = txLogger.getThisMonthTransactions()
      periodeLabel = 'Bulan Ini'
    } else {
      transactions = txLogger.getTodayTransactions()
      periodeLabel = 'Hari Ini'
    }

    if (transactions.length === 0) {
      return conn.sendMessage(msg.from, {
        text: `📊 *LAPORAN ${periodeLabel.toUpperCase()}*\n\nTidak ada transaksi pada periode ini.`,
      }, { quoted: msg.original })
    }

    // Hitung statistik
    let totalDeposit = 0
    let totalOrder = 0
    let totalOrderSukses = 0
    let totalOrderGagal = 0
    let totalTransferKeluar = 0
    let totalTransferMasuk = 0
    let totalProfit = 0
    let totalOmset = 0

    const orderProducts = {}

    for (const tx of transactions) {
      if (tx.type === 'deposit') {
        totalDeposit += tx.jumlah || 0
      } else if (tx.type === 'order') {
        totalOrder++
        if (tx.status === 'sukses') {
          totalOrderSukses++
          totalOmset += tx.hargaJual || 0
          totalProfit += tx.profit || 0

          // Track produk terlaris
          const produk = tx.produk || 'Unknown'
          if (!orderProducts[produk]) {
            orderProducts[produk] = { count: 0, total: 0 }
          }
          orderProducts[produk].count++
          orderProducts[produk].total += tx.hargaJual || 0
        } else {
          totalOrderGagal++
        }
      } else if (tx.type === 'transfer_keluar') {
        totalTransferKeluar += tx.jumlah || 0
      } else if (tx.type === 'transfer_masuk') {
        totalTransferMasuk += tx.jumlah || 0
      }
    }

    // Sort produk terlaris
    const topProducts = Object.entries(orderProducts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)

    const tanggal = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let report = `📊 *LAPORAN TRANSAKSI*\n`
    report += `📅 *Periode:* ${periodeLabel}\n`
    report += `🗓️ *Tanggal:* ${tanggal}\n`
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`

    report += `💰 *DEPOSIT*\n`
    report += `Total Deposit: Rp ${toRupiah(totalDeposit)}\n\n`

    report += `🛒 *ORDER*\n`
    report += `Total Order: ${totalOrder}\n`
    report += `✅ Sukses: ${totalOrderSukses}\n`
    report += `❌ Gagal: ${totalOrderGagal}\n`
    report += `💵 Omset: Rp ${toRupiah(totalOmset)}\n`
    report += `💎 Profit: Rp ${toRupiah(totalProfit)}\n\n`

    report += `🔄 *TRANSFER*\n`
    report += `Transfer Keluar: Rp ${toRupiah(totalTransferKeluar)}\n`
    report += `Transfer Masuk: Rp ${toRupiah(totalTransferMasuk)}\n\n`

    if (topProducts.length > 0) {
      report += `🏆 *TOP 5 PRODUK*\n`
      topProducts.forEach(([produk, data], idx) => {
        report += `${idx + 1}. ${produk}\n`
        report += `   ${data.count}x order | Rp ${toRupiah(data.total)}\n`
      })
      report += `\n`
    }

    report += `━━━━━━━━━━━━━━━━━━━━\n`
    report += `_Laporan digenerate otomatis oleh sistem_`

    await conn.sendMessage(msg.from, { text: report }, { quoted: msg.original })

    // Kirim info tambahan
    const info = `💡 *Cara Menggunakan:*\n\n` +
      `• *${prefix}laporan* atau *${prefix}laporan hari* — Laporan hari ini\n` +
      `• *${prefix}laporan minggu* — Laporan minggu ini\n` +
      `• *${prefix}laporan bulan* — Laporan bulan ini`

    await conn.sendMessage(msg.from, { text: info }, { quoted: msg.original })
  }
}
