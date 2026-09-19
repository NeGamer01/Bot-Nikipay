const os = require('os')
const { runtime } = require('../../lib/functions')

module.exports = {
  command: ['info'],
  category: 'main',
  desc: 'Informasi bot',
  async run({ conn, msg, config }) {
    const info = `
╭─❒ *${config.botName} Info*
│
│ 🖥️ Platform: ${os.platform()} ${os.release()}
│ ⏱️ Runtime: ${runtime()}
│ 📦 Node: ${process.version}
│ 💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
│ 👤 Owner: ${config.ownerName}
│
╰─────────────
    `
    await conn.sendMessage(msg.from, { text: info.trim() }, { quoted: msg.original })
  }
}
