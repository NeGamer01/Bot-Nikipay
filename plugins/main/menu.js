const { runtime } = require('../../lib/functions')

module.exports = {
  command: ['menu', 'help', 'h'],
  category: 'main',
  desc: 'Tampilkan menu bot',
  async run({ conn, msg, prefix, config, db, isGroup }) {
    const user = db.getUser(msg.sender)
    const device = user.device || 'ios'
    const uptime = runtime()
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)

    const caption =
      `┌─────────────────\n` +
      `│ 🤖 Bot  : *${config.botName}*\n` +
      `│ 👤 Owner: *${config.ownerName}*\n` +
      `│ 🔑 Prefix: *${prefix}*\n` +
      `│ ⏱️ Uptime: *${uptime}*\n` +
      `│ 💾 RAM  : *${ram} MB*\n` +
      `└─────────────────`

    if (device === 'android' && !isGroup) {
      await conn.sendList(
        msg.from,
        `✦ ${config.botName} ✦`,
        caption,
        `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        `📋 Buka Menu`,
        [
          {
            title: '🎮 Top Up Game',
            rows: [
              { id: `${prefix}ml`, title: '🎮 Mobile Legends', description: 'Top up diamond ML' },
              { id: `${prefix}ff`, title: '🎮 Free Fire', description: 'Top up diamond FF' },
              { id: `${prefix}pubg`, title: '🎮 PUBG Mobile', description: 'Top up UC PUBG' },
              { id: `${prefix}codm`, title: '🎮 Call of Duty Mobile', description: 'Top up CP CODM' },
              { id: `${prefix}hsr`, title: '🎮 Honkai Star Rail', description: 'Top up Oneiric Shard' },
              { id: `${prefix}genshin`, title: '🎮 Genshin Impact', description: 'Top up Genesis Crystal' },
              { id: `${prefix}hok`, title: '🎮 Honor of Kings', description: 'Top up Token HOK' },
              { id: `${prefix}valorant`, title: '🎮 Valorant', description: 'Top up VP Valorant' }
            ]
          },
          {
            title: '💳 E-Money & Pulsa',
            rows: [
              { id: `${prefix}dana`, title: '💙 DANA', description: 'Top up DANA' },
              { id: `${prefix}gopay`, title: '💚 GoPay', description: 'Top up GoPay' },
              { id: `${prefix}ovo`, title: '💜 OVO', description: 'Top up OVO' },
              { id: `${prefix}shopeepay`, title: '🧡 ShopeePay', description: 'Top up ShopeePay' },
              { id: `${prefix}pulsa`, title: '📱 Pulsa', description: 'Beli pulsa semua operator' },
              { id: `${prefix}kuota`, title: '📶 Kuota', description: 'Beli kuota internet' },
              { id: `${prefix}token`, title: '⚡ Token PLN', description: 'Beli token listrik' },
              { id: `${prefix}tv`, title: '📺 Nex Parabola', description: 'Top up Nex Parabola' }
            ]
          },
          {
            title: '💰 Payment & Lainnya',
            rows: [
              { id: `${prefix}deposit`, title: '💰 Deposit Saldo', description: 'Deposit via QRIS' },
              { id: `${prefix}saldo`, title: '💳 Cek Saldo', description: 'Cek saldo kamu' },
              { id: `${prefix}transfer`, title: '📤 Transfer Saldo', description: 'Kirim saldo ke user lain' },
              { id: `${prefix}riwayat`, title: '📋 Riwayat Transaksi', description: 'Cek riwayat transaksi' },
              { id: `${prefix}info`, title: '📊 Info Bot', description: 'Informasi bot' },
              { id: `${prefix}tampilan`, title: '⚙️ Ganti Tampilan', description: 'Button/Teks' }
            ]
          }
        ],
        msg
      )
    } else {
      const teks =
        `✦ *${config.botName}* ✦\n\n` +
        `${caption}\n\n` +
        `🎮 *TOP UP GAME*\n` +
        `• ${prefix}ml <userid> <zoneid> — Mobile Legends\n` +
        `• ${prefix}ff <id> — Free Fire\n` +
        `• ${prefix}pubg <id> — PUBG Mobile\n` +
        `• ${prefix}codm <id> — Call of Duty Mobile\n` +
        `• ${prefix}hsr <uid> <server> — Honkai Star Rail\n` +
        `• ${prefix}genshin <uid> <server> — Genshin Impact\n` +
        `• ${prefix}hok <id> — Honor of Kings\n` +
        `• ${prefix}valorant <id> — Valorant\n\n` +
        `💳 *E-MONEY & PULSA*\n` +
        `• ${prefix}dana <nomor> — DANA\n` +
        `• ${prefix}gopay <nomor> — GoPay\n` +
        `• ${prefix}ovo <nomor> — OVO\n` +
        `• ${prefix}shopeepay <nomor> — ShopeePay\n` +
        `• ${prefix}pulsa <nomor> — Pulsa\n` +
        `• ${prefix}kuota <nomor> — Kuota Internet\n` +
        `• ${prefix}token <nomor> — Token PLN\n` +
        `• ${prefix}tv <id> — Nex Parabola\n` +
        `• ${prefix}steam <id> — Steam Wallet\n\n` +
        `💰 *PAYMENT*\n` +
        `• ${prefix}deposit <nominal> — Deposit Saldo\n` +
        `• ${prefix}saldo — Cek Saldo\n` +
        `• ${prefix}transfer <nomor> <jumlah> — Transfer Saldo\n` +
        `• ${prefix}riwayat — Riwayat Transaksi\n\n` +
        `⚙️ *LAINNYA*\n` +
        `• ${prefix}buy <sku> <id> — Order langsung\n` +
        `• ${prefix}tampilan — Ganti tampilan\n` +
        `• ${prefix}info — Info bot\n` +
        `• ${prefix}ping — Cek kecepatan`

      await conn.sendMessage(msg.from, { text: teks }, { quoted: msg.original })
    }
  }
}
