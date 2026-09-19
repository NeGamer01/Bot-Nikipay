module.exports = {
  command: ['idgrup'],
  category: 'group',
  desc: 'Tampilkan ID grup',
  isGroup: true,
  async run({ conn, msg }) {
    const jid = msg.from
    await conn.sendMessage(msg.from, {
      text: `📋 *ID Grup*\n\n\`${jid}\`\n\n_Gunakan ID ini untuk config promoGroupJid di config.js_`
    }, { quoted: msg.original })
  }
}
