const { runtime, toRupiah } = require('../../lib/functions')
const { getAvailableGames, countByCategory } = require('../../lib/gameCatalog')

module.exports = {
  command: ['menu', 'help', 'h'],
  category: 'main',
  desc: 'Tampilkan menu bot',
  async run({ conn, msg, prefix, config, db, isGroup }) {
    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'
    const uptime = runtime()
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
    const nama = user.name || msg.pushName || 'Kak'
    const saldo = user.saldo || 0
    const premium = user.premium

    // ── Auto-generate dari data Digiflazz (brand 0 produk disembunyikan) ──
    const games = getAvailableGames('game')
    const emoney = getAvailableGames('emoney')
    const pln = getAvailableGames('pln')
    const tv = getAvailableGames('tv')
    const pulsaCount = countByCategory('Pulsa')
    const kuotaCount = countByCategory('Data')
    const totalProduk = games.reduce((a, g) => a + g.count, 0) + emoney.reduce((a, g) => a + g.count, 0) + pulsaCount + kuotaCount

    const header =
      `┌─────────────────────────────\n` +
      `│ 🤖 Bot  : *${config.botName}*\n` +
      `│ 👤 Nama : *${nama}*\n` +
      `│ 💰 Saldo: *Rp ${toRupiah(saldo)}*${premium ? ' (Premium ⭐)' : ''}\n` +
      `│ ⏱️ Uptime: *${uptime}*\n` +
      `│ 💾 RAM  : *${ram} MB*\n` +
      `└─────────────────────────────`

    const rowGame = g => ({ id: `${prefix}${g.command}`, title: `${g.emoji} ${g.label}`, description: `${g.count} produk` })

    // ── Android: list interaktif (max 5 section x 10 baris) ──
    if (device === 'android' && !isGroup) {
      const sections = []

      // Section 1: 10 game pertama
      if (games.length) sections.push({ title: '🎮 Top Up Game', rows: games.slice(0, 10).map(rowGame) })

      // Section 2: game sisanya (jika ada)
      if (games.length > 10) sections.push({ title: '🎮 Top Up Game (lanjutan)', rows: games.slice(10, 20).map(rowGame) })

      // Section 3: e-money + pulsa/kuota
      const pkRows = []
      for (const g of emoney) pkRows.push(rowGame(g))
      if (pulsaCount) pkRows.push({ id: `${prefix}pulsa`, title: '📱 Pulsa', description: `${pulsaCount} produk` })
      if (kuotaCount) pkRows.push({ id: `${prefix}kuota`, title: '📶 Kuota', description: `${kuotaCount} produk` })
      if (pkRows.length) sections.push({ title: '💳 E-Money & Pulsa', rows: pkRows })

      // Section 4: PLN & TV
      const utilRows = [...pln, ...tv].map(rowGame)
      if (utilRows.length) sections.push({ title: '⚡ PLN & TV', rows: utilRows })

      // Section 5: payment & lainnya
      sections.push({
        title: '💰 Payment & Lainnya',
        rows: [
          { id: `${prefix}deposit`, title: '💰 Deposit Saldo', description: saldo < 10000 ? '⚠️ Saldo rendah, isi dulu' : 'Deposit via QRIS' },
          { id: `${prefix}saldo`, title: '💳 Cek Saldo', description: `Saldo kamu Rp ${toRupiah(saldo)}` },
          { id: `${prefix}transfer`, title: '📤 Transfer Saldo', description: 'Kirim saldo ke user lain' },
          { id: `${prefix}riwayat`, title: '📋 Riwayat Transaksi', description: 'Cek riwayat transaksi' },
          { id: `${prefix}allgame`, title: '🎮 Semua Game', description: `${totalProduk} produk tersedia` },
          { id: `${prefix}info`, title: '📊 Info Bot', description: 'Informasi bot' },
          { id: `${prefix}tampilan`, title: '⚙️ Ganti Tampilan', description: device === 'android' ? 'Button (sekarang)' : 'Teks (sekarang)' }
        ]
      })

      await conn.sendList(
        msg.from,
        `✦ ${config.botName} ✦`,
        header,
        `${totalProduk} produk • ${games.length} game • Ketik ${prefix}allgame untuk daftar lengkap`,
        '📋 Buka Menu',
        sections,
        msg
      )
    } else {
      // ── iOS/teks: daftar lengkap ──
      let teks = `✦ *${config.botName}* ✦\n\n${header}\n\n`

      if (games.length) {
        teks += `🎮 *TOP UP GAME* (${games.length})\n`
        for (const g of games) teks += `• ${prefix}${g.command} — ${g.label}\n`
        teks += '\n'
      }

      const emoneyDanPulsa = emoney.length || pulsaCount || kuotaCount
      if (emoneyDanPulsa) {
        teks += `💳 *E-MONEY & PULSA*\n`
        for (const g of emoney) teks += `• ${prefix}${g.command} — ${g.label}\n`
        if (pulsaCount) teks += `• ${prefix}pulsa <nomor> — Pulsa\n`
        if (kuotaCount) teks += `• ${prefix}kuota <nomor> — Kuota Internet\n`
        teks += '\n'
      }

      const lain = [...pln, ...tv]
      if (lain.length) {
        teks += `📡 *PLN & TV*\n`
        for (const g of lain) teks += `• ${prefix}${g.command} — ${g.label}\n`
        teks += '\n'
      }

      teks += `💰 *PAYMENT*\n`
      teks += `• ${prefix}deposit <nominal> — Deposit Saldo\n`
      teks += `• ${prefix}saldo — Cek Saldo (Rp ${toRupiah(saldo)})\n`
      teks += `• ${prefix}transfer <nomor> <jumlah> — Transfer Saldo\n`
      teks += `• ${prefix}riwayat — Riwayat Transaksi\n\n`

      teks += `⚙️ *LAINNYA*\n`
      teks += `• ${prefix}allgame — Semua daftar topup\n`
      teks += `• ${prefix}buy <sku> <id> — Order langsung\n`
      teks += `• ${prefix}tampilan — Ganti tampilan\n`
      teks += `• ${prefix}info — Info bot\n`
      teks += `• ${prefix}ping — Cek kecepatan`

      await conn.sendMessage(msg.from, { text: teks.trim() }, { quoted: msg.original })
    }
  }
}
