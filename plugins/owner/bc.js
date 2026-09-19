module.exports = {
  command: ['bc', 'broadcast'],
  category: 'owner',
  desc: 'Broadcast ke semua chat',
  isOwner: true,
  async run({ conn, msg, text }) {
    if (!text) return conn.sendMessage(msg.from, { text: '❌ Masukkan pesan broadcast' }, { quoted: msg.original })
    const chats = Object.keys(require('../../lib/database').data.chats || {})
    let success = 0, failed = 0
    for (const jid of chats) {
      try {
        await conn.sendMessage(jid, { text: `📢 *BROADCAST*\n\n${text}` })
        success++
      } catch { failed++ }
    }
    await conn.sendMessage(msg.from, { text: `✅ Broadcast selesai!\nBerhasil: ${success}\nGagal: ${failed}` }, { quoted: msg.original })
  }
}
