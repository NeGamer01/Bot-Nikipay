module.exports = {
  command: ['ceklid'],
  category: 'main',
  desc: 'Cek LID/JID sender',
  async run({ conn, msg }) {
    const sender = msg.sender
    await conn.sendMessage(msg.from, {
      text: `🔍 *Info Sender*\n\n*JID:* ${sender}\n*ID:* ${sender.split('@')[0]}\n*Type:* ${sender.endsWith('@lid') ? 'LID (tambahkan ke ownerNumber di config.js)' : 'Nomor WA biasa'}`
    }, { quoted: msg.original })
  }
}
