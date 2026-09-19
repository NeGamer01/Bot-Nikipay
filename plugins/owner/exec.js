const { exec } = require('child_process')

module.exports = {
  command: ['exec'],
  category: 'owner',
  desc: 'Execute shell command',
  isOwner: true,
  async run({ conn, msg, text }) {
    if (!text) return conn.sendMessage(msg.from, { text: '❌ Masukkan command shell' }, { quoted: msg.original })
    exec(text, (err, stdout, stderr) => {
      if (err) return conn.sendMessage(msg.from, { text: `❌ Error:\n\`\`\`\n${err.message}\n\`\`\`` }, { quoted: msg.original })
      if (stderr) return conn.sendMessage(msg.from, { text: `⚠️ Stderr:\n\`\`\`\n${stderr}\n\`\`\`` }, { quoted: msg.original })
      conn.sendMessage(msg.from, { text: `✅ Output:\n\`\`\`\n${stdout || '(no output)'}\n\`\`\`` }, { quoted: msg.original })
    })
  }
}
