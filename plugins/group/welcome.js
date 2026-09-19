module.exports = {
  command: ['welcome'],
  category: 'group',
  desc: 'Toggle welcome message',
  isGroup: true,
  isAdmin: true,
  async run({ conn, msg, db }) {
    const group = db.getGroup(msg.from)
    const newStatus = !group.welcome
    db.setGroup(msg.from, { welcome: newStatus })
    await conn.sendMessage(msg.from, { text: `✅ Welcome message ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}` }, { quoted: msg.original })
  }
}
