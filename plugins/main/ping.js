module.exports = {
  command: ['ping', 'p'],
  category: 'main',
  desc: 'Cek kecepatan bot',
  async run({ conn, msg }) {
    const start = Date.now()
    await conn.sendMessage(msg.from, { text: `⚡ Pong! ${Date.now() - start}ms` }, { quoted: msg.original })
  }
}
