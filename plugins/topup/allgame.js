const { getAvailableGames, countByCategory, chunk10 } = require('../../lib/gameCatalog')

// Daftar semua game/e-money yang AKTIF — auto-generated dari data Digiflazz.
// Brand yang semua produknya off tidak ditampilkan.
module.exports = {
  command: ['allgame', 'topup', 'game', 'listgame'],
  category: 'topup',
  desc: 'Daftar semua game & topup yang tersedia',
  async run({ conn, msg, db, config, prefix }) {
    const games = getAvailableGames('game')
    const emoney = getAvailableGames('emoney')
    const pulsaCount = countByCategory('Pulsa')
    const kuotaCount = countByCategory('Data')
    const pln = getAvailableGames('pln')
    const tv = getAvailableGames('tv')

    if (!games.length && !emoney.length && !pulsaCount && !kuotaCount) {
      return conn.sendMessage(msg.from, {
        text: `❌ Belum ada produk. Owner jalankan *${prefix}getdigi* dulu.`
      }, { quoted: msg.original })
    }

    const gameRows = games.map(g => ({
      id: `${prefix}${g.command}`,
      title: `${g.emoji} ${g.label}`,
      description: `${g.count} produk`
    }))

    // Bagi section Game jadi chunk 10 baris (batas WhatsApp)
    const gameChunks = chunk10(gameRows)
    const sections = gameChunks.map((rows, i) => ({
      title: gameChunks.length > 1 ? `🎮 Game (${i + 1}/${gameChunks.length})` : '🎮 Game',
      rows
    }))

    if (emoney.length) {
      sections.push({
        title: '💳 E-Money',
        rows: emoney.map(g => ({ id: `${prefix}${g.command}`, title: `${g.emoji} ${g.label}`, description: `${g.count} produk` }))
      })
    }

    const lainnya = []
    if (pulsaCount) lainnya.push({ id: `${prefix}pulsa`, title: '📱 Pulsa', description: `${pulsaCount} produk` })
    if (kuotaCount) lainnya.push({ id: `${prefix}kuota`, title: '📶 Kuota Internet', description: `${kuotaCount} produk` })
    for (const g of [...pln, ...tv]) lainnya.push({ id: `${prefix}${g.command}`, title: `${g.emoji} ${g.label}`, description: `${g.count} produk` })
    if (lainnya.length) sections.push({ title: '📡 Lainnya', rows: lainnya })

    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'

    const teks = `🎮 *DAFTAR TOPUP ${config.botName}*\n\n` +
      `${games.length} game • ${emoney.length} e-money • ${pulsaCount + kuotaCount} pulsa/kuota\n\n` +
      `_Pilih game atau ketik command-nya_`

    if (device === 'android') {
      await conn.sendList(msg.from, '🎮 Daftar Topup', teks, `${config.botName}`, '📋 Pilih Game', sections, msg)
    } else {
      let out = teks + '\n\n'
      for (const s of sections) {
        out += `*${s.title}*`
        s.rows.forEach((r, i) => {
          const cmd = (r.id || '').replace(prefix, '')
          out += `\n${i + 1}. ${r.title} — ${r.description} (\`${prefix}${cmd}\`)`
        })
        out += '\n\n'
      }
      await conn.sendMessage(msg.from, { text: out.trim() }, { quoted: msg.original })
    }
  }
}
