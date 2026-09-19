const util = require('util')

module.exports = {
  command: ['eval'],
  category: 'owner',
  desc: 'Eval JavaScript code',
  isOwner: true,
  async run({ conn, msg, text }) {
    if (!text) return conn.sendMessage(msg.from, { text: '❌ Masukkan code JavaScript' }, { quoted: msg.original })
    try {
      const result = eval(text)
      const output = util.inspect(result, { depth: 2 })
      await conn.sendMessage(msg.from, { text: `✅ Result:\n\`\`\`\n${output}\n\`\`\`` }, { quoted: msg.original })
    } catch (e) {
      await conn.sendMessage(msg.from, { text: `❌ Error:\n\`\`\`\n${e.message}\n\`\`\`` }, { quoted: msg.original })
    }
  }
}
