module.exports = {
  command: ['device', 'setdevice', 'tampilan', 'display'],
  category: 'main',
  desc: 'Set tampilan bot (Button/Teks)',
  async run({ conn, msg, db, config }) {
    const user = db.getUser(msg.sender)
    const currentDevice = user.device
    const current = currentDevice
      ? `Tampilan kamu saat ini: *${currentDevice === 'android' ? '🔘 Button' : '📝 Teks'}*\n\n`
      : ''

    const text = `${current}Pilih tampilan yang kamu inginkan:\n\n` +
      `*1️⃣ Button (Interaktif)*\n` +
      `Tampilan dengan tombol yang bisa diklik langsung.\n` +
      `⚠️ Hanya support di *Android* dengan WhatsApp versi terbaru.\n\n` +
      `*2️⃣ Teks (Universal)*\n` +
      `Tampilan teks biasa dengan emoji.\n` +
      `✅ Support di *semua HP* termasuk iPhone/iOS dan WhatsApp lama.\n\n` +
      `Ketik *${config.prefix}button* atau *${config.prefix}text* untuk memilih:`

    await conn.sendFakeButton(
      msg.from,
      `⚙️ Pilih Tampilan Bot`,
      text,
      `${config.botName} | Bisa diubah kapan saja dengan ${config.prefix}tampilan`,
      [
        { text: `${config.prefix}button — 🔘 Button (Android)` },
        { text: `${config.prefix}text — 📝 Teks (Semua HP)` }
      ],
      msg
    )
  }
}
